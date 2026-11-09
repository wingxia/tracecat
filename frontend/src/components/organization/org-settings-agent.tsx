"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Loader2, MoreVertical } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  type AgentCatalogRead,
  type AgentCustomProviderCreate,
  type AgentCustomProviderRead,
  type AgentCustomProviderUpdate,
  type AgentModelAccessRead,
  type ApiError,
  type AzureAICatalogCreate,
  type AzureOpenAICatalogCreate,
  agentDeleteProviderCredentials,
  agentRefreshProviderModels,
  agentSubscribeBedrockModel,
  type BedrockCatalogCreate,
  type BedrockSubscriptionRead,
  createCatalogEntry,
  createCustomProvider,
  deleteCatalogEntry,
  deleteCustomProvider,
  disableModel,
  enableModel,
  listCatalog,
  listCustomProviders,
  listEnabledModels,
  refreshCustomProviderCatalog,
  updateCatalogEntry,
  updateCustomProvider,
  type VertexAICatalogCreate,
  validateCustomProviderConnection,
} from "@/client"
import { ProviderIcon } from "@/components/icons"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { AgentCredentialsDialog } from "@/components/organization/org-agent-credentials-dialog"
import {
  RbacListContainer,
  RbacListItem,
} from "@/components/organization/rbac-list-item"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { useDebounce } from "@/hooks"
import { useEntitlements } from "@/hooks/use-entitlements"
import { getApiErrorDetail, retryHandler } from "@/lib/errors"
import {
  useAgentDefaultModel,
  useModelProvidersStatus,
  useProviderCredentialConfigs,
} from "@/lib/hooks"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"
import { cn } from "@/lib/utils"

const CURSOR_PAGE_SIZE = 100

const customProviderSchema = z
  .object({
    displayName: z.string().trim().min(1, "名称不能为空"),
    baseUrl: z.union([z.string().url(), z.literal(""), z.undefined()]),
    apiKeyHeader: z.string().trim().optional(),
    apiKey: z.string().optional(),
    customHeadersJson: z.string().optional(),
    passthrough: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const raw = value.customHeadersJson?.trim()
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "自定义请求头必须是 JSON 对象。",
          path: ["customHeadersJson"],
        })
        return
      }
      for (const [key, headerValue] of Object.entries(parsed)) {
        if (typeof key !== "string" || typeof headerValue !== "string") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "自定义请求头的键和值必须都是字符串。",
            path: ["customHeadersJson"],
          })
          return
        }
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "自定义请求头必须是有效的 JSON。",
        path: ["customHeadersJson"],
      })
    }
  })

type CustomProviderFormValues = z.infer<typeof customProviderSchema>

const DEFAULT_CUSTOM_PROVIDER_VALUES: CustomProviderFormValues = {
  displayName: "",
  baseUrl: "",
  apiKeyHeader: "",
  apiKey: "",
  customHeadersJson: "",
  passthrough: false,
}

const CLOUD_CATALOG_PROVIDERS = [
  "bedrock",
  "azure_openai",
  "azure_ai",
  "vertex_ai",
] as const

type CloudCatalogProvider = (typeof CLOUD_CATALOG_PROVIDERS)[number]

function isCloudCatalogProvider(
  provider: string
): provider is CloudCatalogProvider {
  return (CLOUD_CATALOG_PROVIDERS as readonly string[]).includes(provider)
}

const bedrockCloudModelSchema = z.object({
  provider: z.literal("bedrock"),
  model_name: z.string().trim().min(1, "模型名称不能为空"),
  display_name: z.string().trim().optional(),
  inference_profile_id: z.string().trim().optional(),
  model_id: z.string().trim().optional(),
  use_converse: z.boolean().default(false),
})

const azureOpenAICloudModelSchema = z.object({
  provider: z.literal("azure_openai"),
  model_name: z.string().trim().min(1, "模型名称不能为空"),
  display_name: z.string().trim().optional(),
  deployment_name: z.string().trim().min(1, "部署名称不能为空"),
})

const azureAICloudModelSchema = z.object({
  provider: z.literal("azure_ai"),
  model_name: z.string().trim().min(1, "模型名称不能为空"),
  display_name: z.string().trim().optional(),
  azure_ai_model_name: z.string().trim().min(1, "Azure AI 模型名称不能为空"),
})

const vertexAICloudModelSchema = z.object({
  provider: z.literal("vertex_ai"),
  model_name: z.string().trim().min(1, "模型名称不能为空"),
  display_name: z.string().trim().optional(),
  vertex_model: z.string().trim().min(1, "Vertex 模型不能为空"),
})

const cloudCatalogModelSchema = z
  .discriminatedUnion("provider", [
    bedrockCloudModelSchema,
    azureOpenAICloudModelSchema,
    azureAICloudModelSchema,
    vertexAICloudModelSchema,
  ])
  .superRefine((value, ctx) => {
    if (value.provider === "bedrock") {
      const hasProfile = !!value.inference_profile_id
      const hasModelId = !!value.model_id
      if (hasProfile && hasModelId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "推理配置 ID 和模型 ID 最多填写一个。",
          path: ["inference_profile_id"],
        })
      } else if (!hasProfile && !hasModelId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "推理配置 ID 和模型 ID 必须且只能填写一个。",
          path: ["inference_profile_id"],
        })
      }
    }
  })

type CloudCatalogModelFormValues = z.infer<typeof cloudCatalogModelSchema>

function getCatalogMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!metadata) {
    return ""
  }
  const value = metadata[key]
  return typeof value === "string" ? value : ""
}

function buildCloudCatalogDefaults(
  provider: CloudCatalogProvider,
  entry: AgentCatalogRead | null
): CloudCatalogModelFormValues {
  const metadata = entry?.model_metadata ?? null
  const displayName = getCatalogMetadataString(metadata, "display_name")
  const modelName = entry?.model_name ?? ""
  switch (provider) {
    case "bedrock":
      return {
        provider: "bedrock",
        model_name: modelName,
        display_name: displayName,
        inference_profile_id: getCatalogMetadataString(
          metadata,
          "inference_profile_id"
        ),
        model_id: getCatalogMetadataString(metadata, "model_id"),
        use_converse: metadata?.use_converse === true,
      }
    case "azure_openai":
      return {
        provider: "azure_openai",
        model_name: modelName,
        display_name: displayName,
        deployment_name: getCatalogMetadataString(metadata, "deployment_name"),
      }
    case "azure_ai":
      return {
        provider: "azure_ai",
        model_name: modelName,
        display_name: displayName,
        azure_ai_model_name: getCatalogMetadataString(
          metadata,
          "azure_ai_model_name"
        ),
      }
    case "vertex_ai":
      return {
        provider: "vertex_ai",
        model_name: modelName,
        display_name: displayName,
        vertex_model: getCatalogMetadataString(metadata, "vertex_model"),
      }
  }
}

function buildCatalogCreatePayload(
  values: CloudCatalogModelFormValues
):
  | BedrockCatalogCreate
  | AzureOpenAICatalogCreate
  | AzureAICatalogCreate
  | VertexAICatalogCreate {
  const displayName = values.display_name?.trim() || null
  switch (values.provider) {
    case "bedrock":
      return {
        model_provider: "bedrock",
        model_name: values.model_name,
        display_name: displayName,
        inference_profile_id: values.inference_profile_id || null,
        model_id: values.model_id || null,
        use_converse: values.use_converse,
      }
    case "azure_openai":
      return {
        model_provider: "azure_openai",
        model_name: values.model_name,
        display_name: displayName,
        deployment_name: values.deployment_name,
      }
    case "azure_ai":
      return {
        model_provider: "azure_ai",
        model_name: values.model_name,
        display_name: displayName,
        azure_ai_model_name: values.azure_ai_model_name,
      }
    case "vertex_ai":
      return {
        model_provider: "vertex_ai",
        model_name: values.model_name,
        display_name: displayName,
        vertex_model: values.vertex_model,
      }
    default:
      throw new Error(
        `Unsupported cloud provider: ${(values as { provider: string }).provider}`
      )
  }
}

function buildCatalogUpdatePayload(values: CloudCatalogModelFormValues) {
  const displayName = values.display_name?.trim() || null
  switch (values.provider) {
    case "bedrock":
      return {
        model_provider: "bedrock" as const,
        display_name: displayName,
        inference_profile_id: values.inference_profile_id || null,
        model_id: values.model_id || null,
        use_converse: values.use_converse,
      }
    case "azure_openai":
      return {
        model_provider: "azure_openai" as const,
        display_name: displayName,
        deployment_name: values.deployment_name,
      }
    case "azure_ai":
      return {
        model_provider: "azure_ai" as const,
        display_name: displayName,
        azure_ai_model_name: values.azure_ai_model_name,
      }
    case "vertex_ai":
      return {
        model_provider: "vertex_ai" as const,
        display_name: displayName,
        vertex_model: values.vertex_model,
      }
    default:
      throw new Error(
        `Unsupported cloud provider: ${(values as { provider: string }).provider}`
      )
  }
}

function getCloudProviderLabel(provider: CloudCatalogProvider): string {
  switch (provider) {
    case "bedrock":
      return "AWS Bedrock"
    case "azure_openai":
      return "Azure OpenAI"
    case "azure_ai":
      return "Azure AI"
    case "vertex_ai":
      return "Google Vertex AI"
  }
}

type ModelSelection = {
  source_id: string | null
  model_provider: string
  model_name: string
}

interface ModelCatalogEntry {
  id: string
  source_id: string | null
  source_name: string | null
  source_type: string
  model_provider: string
  model_name: string
  metadata: Record<string, unknown> | null
  base_url: string | null
  enabled: boolean
  readiness_message?: string | null
  runtime_target_configured?: boolean
}

interface BuiltInCatalogEntry extends ModelCatalogEntry {
  enableable?: boolean
  ready?: boolean
  credential_provider?: string | null
  credential_label?: string | null
  credentials_configured?: boolean
  organization_id?: string | null
  metadata_display_name?: string | null
  bedrock_subscription_status?: BedrockSubscriptionStatus | null
}

type BedrockSubscriptionStatus = BedrockSubscriptionRead["status"]

const BEDROCK_SUBSCRIPTION_LABELS: Record<
  BedrockSubscriptionStatus,
  string | null
> = {
  subscribed: "Subscribed",
  not_subscribed: "未订阅",
  pending: "订阅待处理",
  not_authorized: "未授权",
  unavailable: "此区域不可用",
  error: "订阅错误",
  unknown: null,
}

const BEDROCK_SUBSCRIBABLE_STATUSES: ReadonlySet<BedrockSubscriptionStatus> =
  new Set(["not_subscribed", "error", "unknown"])

function getBedrockSubscriptionStatus(
  metadata: Record<string, unknown> | null | undefined
): BedrockSubscriptionStatus | null {
  const subscription = metadata?.bedrock_subscription
  if (!subscription || typeof subscription !== "object") {
    return null
  }
  const status = (subscription as Record<string, unknown>).status
  return typeof status === "string" && status in BEDROCK_SUBSCRIPTION_LABELS
    ? (status as BedrockSubscriptionStatus)
    : null
}

function BedrockSubscriptionBadge({
  status,
}: {
  status: BedrockSubscriptionStatus
}) {
  const label = BEDROCK_SUBSCRIPTION_LABELS[status]
  if (!label) {
    return null
  }
  return (
    <Badge
      className={cn(
        "shrink-0 font-medium",
        status === "subscribed" &&
          "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
        status === "pending" &&
          "border-amber-500/40 text-amber-700 dark:text-amber-400",
        (status === "not_subscribed" ||
          status === "not_authorized" ||
          status === "error") &&
          "border-red-500/40 text-red-600 dark:text-red-400",
        status === "unavailable" && "text-muted-foreground"
      )}
      variant="outline"
    >
      {label}
    </Badge>
  )
}

interface BuiltInProviderConnection {
  provider: string
  label: string
  source_type: string
  credentials_configured: boolean
  base_url?: string | null
  runtime_target?: string | null
  discovery_status: string
  last_refreshed_at?: string | null
  last_error?: string | null
  discovered_models: BuiltInCatalogEntry[]
}

interface CustomSourceRead {
  id: string
  type: string
  flavor?: string | null
  display_name: string
  base_url?: string | null
  api_key_configured: boolean
  api_key_header?: string | null
  api_version?: string | null
  discovery_status: string
  last_refreshed_at?: string | null
  last_error?: string | null
}

interface CustomSourceCard extends CustomSourceRead {
  models: ModelCatalogEntry[]
  provider: AgentCustomProviderRead
}

function getModelSelectionKey(selection: {
  source_id?: string | null
  model_provider?: string | null
  model_name?: string | null
}): string {
  return `${selection.source_id ?? "platform"}::${selection.model_provider ?? ""}::${selection.model_name ?? ""}`
}

function toModelSelection(
  model: Pick<ModelCatalogEntry, "source_id" | "model_provider" | "model_name">
): ModelSelection {
  return {
    source_id: model.source_id ?? null,
    model_provider: model.model_provider,
    model_name: model.model_name,
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseCustomHeaders(
  value: string | null | undefined
): Record<string, string> | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  return JSON.parse(trimmed) as Record<string, string>
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "从未"
  }
  return new Date(value).toLocaleString("zh-CN")
}

function formatStatus(value?: string | null): string {
  if (!value) {
    return "未知"
  }
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

/**
 * Display order for built-in providers. Providers missing from this list are
 * appended after it in their API order.
 */
const PROVIDER_DISPLAY_ORDER: readonly string[] = [
  "openai",
  "anthropic",
  "bedrock",
  "azure_openai",
  "azure_ai",
  "gemini",
  "vertex_ai",
  "mistral",
  "ollama",
  "vllm",
  "litellm",
  "openrouter",
]

/**
 * Built-in providers that expose an OpenAI-compatible `/models` endpoint and
 * support re-discovering their catalog from the org credentials.
 */
const GATEWAY_PROVIDERS: ReadonlySet<string> = new Set([
  "ollama",
  "vllm",
  "litellm",
  "openrouter",
])

function isGatewayProvider(provider: string): boolean {
  return GATEWAY_PROVIDERS.has(provider)
}

function supportsModelRefresh(provider: string): boolean {
  return isGatewayProvider(provider) || provider === "bedrock"
}

function providerDisplayRank(provider: string, fallbackIndex: number): number {
  const index = PROVIDER_DISPLAY_ORDER.indexOf(provider)
  if (index === -1) {
    return PROVIDER_DISPLAY_ORDER.length + fallbackIndex
  }
  return index
}

function getProviderDisplayLabel(provider: string): string {
  if (isCloudCatalogProvider(provider)) {
    return getCloudProviderLabel(provider)
  }

  switch (provider) {
    case "anthropic":
      return "Anthropic"
    case "gemini":
      return "Google Gemini"
    case "mistral":
      return "Mistral AI"
    case "openai":
      return "OpenAI"
    case "ollama":
      return "Ollama"
    case "vllm":
      return "vLLM"
    case "litellm":
      return "LiteLLM"
    case "openrouter":
      return "OpenRouter"
    case "custom-model-provider":
      return "自定义"
    default:
      return formatStatus(provider)
  }
}

function getProviderIconId(provider?: string | null): string {
  switch (provider) {
    case "anthropic":
      return "anthropic"
    case "azure_ai":
    case "azure_openai":
      return "microsoft"
    case "bedrock":
      return "amazon-bedrock"
    case "gemini":
    case "vertex_ai":
      return "google"
    case "mistral":
      return "mistral"
    case "openai":
      return "openai"
    case "ollama":
      return "ollama"
    case "vllm":
      return "vllm"
    case "litellm":
      return "litellm"
    case "openrouter":
      return "openrouter"
    default:
      return "custom"
  }
}

function normalizeSourceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
}

function getCustomSourceTypeLabel(type: string): string {
  switch (type) {
    case "manual_custom":
      return "手动自定义"
    case "openai_compatible_gateway":
      return "兼容 OpenAI"
    default:
      return type.replaceAll("_", " ")
  }
}

function getCustomSourceFlavorLabel(flavor?: string | null): string | null {
  if (!flavor) {
    return null
  }
  switch (flavor) {
    case "generic_openai_compatible":
      return "通用 OpenAI 兼容接口"
    case "ollama":
      return "Ollama"
    case "vllm":
      return "vLLM"
    case "manual":
      return "手动"
    default:
      return flavor.replaceAll("_", " ")
  }
}

function getMetadataNumber(metadata: unknown, key: string): number | null {
  if (!metadata || typeof metadata !== "object") {
    return null
  }
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function getMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null
  }
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === "string" && value.trim() ? value : null
}

function formatTokenCount(value: number | null): string {
  if (value == null) {
    return "n/a"
  }
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value)
}

function getModelContextLabel(model: { metadata?: unknown | null }): string {
  return formatTokenCount(getMetadataNumber(model.metadata, "max_input_tokens"))
}

function getModelOutputLabel(model: { metadata?: unknown | null }): string {
  return formatTokenCount(
    getMetadataNumber(model.metadata, "max_output_tokens") ??
      getMetadataNumber(model.metadata, "max_tokens")
  )
}

function getModelModeLabel(model: { metadata?: unknown | null }): string {
  return getMetadataString(model.metadata, "mode") ?? "n/a"
}

function getModelLabel(model: Pick<ModelCatalogEntry, "model_name">): string {
  return model.model_name
}

function getCustomSourceModelTitle(
  model: Pick<ModelCatalogEntry, "model_name" | "metadata">
): string {
  return (
    getMetadataString(model.metadata, "display_name") ??
    getMetadataString(model.metadata, "name") ??
    model.model_name
  )
}

function getModelSourceLabel(
  model: Pick<ModelCatalogEntry, "source_id" | "source_name" | "model_provider">
): string {
  return (
    model.source_name ??
    (model.source_id ? "自定义" : getProviderDisplayLabel(model.model_provider))
  )
}

function getCustomSourceIconId(
  source: Pick<CustomSourceRead, "type" | "flavor">
): string {
  switch (source.flavor) {
    case "ollama":
      return "ollama"
    case "vllm":
      return "vllm"
    case "manual":
      return "manual-custom-source"
    default:
      return source.type === "manual_custom" ? "manual-custom-source" : "custom"
  }
}

function inferCustomSourceFlavor(
  provider: Pick<AgentCustomProviderRead, "base_url" | "display_name">
): string | null {
  const candidates = [provider.display_name, provider.base_url ?? ""].map(
    normalizeSourceName
  )

  if (candidates.some((candidate) => candidate.includes("ollama"))) {
    return "ollama"
  }
  if (candidates.some((candidate) => candidate.includes("vllm"))) {
    return "vllm"
  }
  return null
}

function canEnableBuiltInCatalogModel(model: BuiltInCatalogEntry): boolean {
  return (
    model.enabled ||
    (typeof model.enableable === "boolean"
      ? model.enableable
      : typeof model.ready === "boolean"
        ? model.ready
        : true)
  )
}

function ProviderMetaPill({
  active = false,
  children,
}: {
  active?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium",
        active
          ? "border-border bg-muted/50 text-foreground"
          : "border-border/60 bg-background text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}

function getProviderDialogDefaults(
  provider: AgentCustomProviderRead | null
): CustomProviderFormValues {
  if (!provider) {
    return DEFAULT_CUSTOM_PROVIDER_VALUES
  }
  return {
    displayName: provider.display_name,
    baseUrl: provider.base_url ?? "",
    apiKeyHeader: provider.api_key_header ?? "",
    apiKey: "",
    customHeadersJson: "",
    passthrough: provider.passthrough,
  }
}

function buildProviderCreatePayload(
  values: CustomProviderFormValues
): AgentCustomProviderCreate {
  return {
    display_name: values.displayName.trim(),
    base_url: normalizeOptional(values.baseUrl),
    api_key_header: normalizeOptional(values.apiKeyHeader),
    api_key: normalizeOptional(values.apiKey),
    custom_headers: parseCustomHeaders(values.customHeadersJson),
    passthrough: values.passthrough,
  }
}

function buildProviderUpdatePayload(
  values: CustomProviderFormValues
): AgentCustomProviderUpdate {
  const payload: AgentCustomProviderUpdate = {
    display_name: values.displayName.trim(),
    base_url: normalizeOptional(values.baseUrl),
    api_key_header: normalizeOptional(values.apiKeyHeader),
    passthrough: values.passthrough,
  }

  const apiKey = normalizeOptional(values.apiKey)
  if (apiKey) {
    payload.api_key = apiKey
  }
  const customHeaders = parseCustomHeaders(values.customHeadersJson)
  if (customHeaders) {
    payload.custom_headers = customHeaders
  }

  return payload
}

async function fetchAllProviders(): Promise<AgentCustomProviderRead[]> {
  const items: AgentCustomProviderRead[] = []
  let cursor: string | undefined

  do {
    const response = await listCustomProviders({
      cursor,
      limit: CURSOR_PAGE_SIZE,
    })
    items.push(...response.items)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return items
}

async function fetchAllCatalogEntries(): Promise<AgentCatalogRead[]> {
  const items: AgentCatalogRead[] = []
  let cursor: string | undefined

  do {
    const response = await listCatalog({
      cursor,
      limit: CURSOR_PAGE_SIZE,
    })
    items.push(...response.items)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return items
}

async function fetchAllEnabledModels(): Promise<AgentModelAccessRead[]> {
  const items: AgentModelAccessRead[] = []
  let cursor: string | undefined

  do {
    const response = await listEnabledModels({
      cursor,
      limit: CURSOR_PAGE_SIZE,
    })
    items.push(...response.items)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return items
}

function CustomProviderDialog({
  provider,
  open,
  onOpenChange,
}: {
  provider: AgentCustomProviderRead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const form = useForm<CustomProviderFormValues>({
    resolver: zodResolver(customProviderSchema),
    mode: "onBlur",
    defaultValues: getProviderDialogDefaults(provider),
  })

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const hasCustomHeadersError = !!form.formState.errors.customHeadersJson

  useEffect(() => {
    form.reset(getProviderDialogDefaults(provider))
    setAdvancedOpen(false)
  }, [form, provider, open])

  useEffect(() => {
    if (hasCustomHeadersError) {
      setAdvancedOpen(true)
    }
  }, [hasCustomHeadersError])

  const saveMutation = useMutation({
    mutationFn: async (values: CustomProviderFormValues) => {
      if (provider) {
        return await updateCustomProvider({
          providerId: provider.id,
          requestBody: buildProviderUpdatePayload(values),
        })
      }
      return await createCustomProvider({
        requestBody: buildProviderCreatePayload(values),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization", "agent-providers"],
      })
      onOpenChange(false)
      toast({
        title: provider ? "已更新自定义来源" : "已创建自定义来源",
        description: provider ? "已保存自定义来源配置。" : "已创建自定义来源。",
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: provider ? "更新失败" : "创建失败",
        description: getApiErrorDetail(error) ?? "无法保存自定义来源。",
        variant: "destructive",
      })
    },
  })

  const validateMutation = useMutation({
    mutationFn: async (values: CustomProviderFormValues) =>
      await validateCustomProviderConnection({
        requestBody: buildProviderCreatePayload(values),
      }),
    onSuccess: (result) => {
      toast({
        title: result.valid ? "连接正常" : "连接失败",
        description: result.valid
          ? "提供商已成功响应。"
          : "提供商未能成功响应。",
        variant: result.valid ? "default" : "destructive",
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: "连接测试失败",
        description: getApiErrorDetail(error) ?? "无法验证自定义来源。",
        variant: "destructive",
      })
    },
  })

  async function handleValidate() {
    const valid = await form.trigger()
    if (!valid) {
      if (form.formState.errors.customHeadersJson) {
        setAdvancedOpen(true)
      }
      return
    }
    await validateMutation.mutateAsync(form.getValues())
  }

  async function handleSubmit(values: CustomProviderFormValues) {
    await saveMutation.mutateAsync(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {provider ? "编辑自定义来源" : "添加自定义来源"}
          </DialogTitle>
          <DialogDescription>
            配置兼容 OpenAI 的自定义端点。自动发现会读取该来源的{" "}
            <code>/models</code> 端点。
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, () => {
              if (form.formState.errors.customHeadersJson) setAdvancedOpen(true)
            })}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={"本地网关"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>基础 URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="http://localhost:11434/v1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="apiKeyHeader"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>身份验证请求头</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Authorization" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>身份验证值</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder={
                              provider ? "留空以保留已保存的值" : "sk-••••••••"
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  默认为{" "}
                  <code className="bg-muted rounded px-1 py-0.5 font-mono">
                    Authorization: Bearer &lt;value&gt;
                  </code>{" "}
                  （未设置请求头时）。
                </p>
              </div>

              <FormField
                control={form.control}
                name="passthrough"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                    <div className="space-y-1">
                      <FormLabel className="text-sm">直通模式</FormLabel>
                      <FormDescription>
                        推荐用于自有网关（LiteLLM、vLLM 等）。跳过 Tracecat
                        转换，直接将请求转发到你的端点。
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm [&[data-state=open]>svg]:rotate-180">
                  <ChevronDown className="size-4 transition-transform duration-200" />
                  高级
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-3">
                    <FormField
                      control={form.control}
                      name="customHeadersJson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>附加请求头</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="min-h-28 font-mono text-xs"
                              placeholder='{"X-Custom-Header":"value"}'
                            />
                          </FormControl>
                          <FormDescription>
                            可选的 JSON 对象，为每次请求附加静态请求头。用于上述
                            API 密钥未覆盖的非认证请求头。保存新 JSON
                            会替换旧值。
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </DialogBody>
            <DialogFooter>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={saveMutation.isPending || validateMutation.isPending}
                onClick={() => void handleValidate()}
              >
                {validateMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                测试连接
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={saveMutation.isPending || validateMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {provider ? "保存来源" : "添加来源"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function CustomSourceModelRow({
  disabled,
  model,
  onToggle,
}: {
  disabled: boolean
  model: ModelCatalogEntry
  onToggle: (model: ModelCatalogEntry) => Promise<void>
}) {
  const title = getCustomSourceModelTitle(model)
  const showModelName = title !== model.model_name
  const contextLabel = getModelContextLabel(model)
  const outputLabel = getModelOutputLabel(model)
  const modeLabel = getModelModeLabel(model)
  const sourceLabel = getModelSourceLabel(model)
  const detailParts = [
    sourceLabel,
    showModelName ? model.model_name : null,
    modeLabel !== "n/a" ? modeLabel : null,
  ].filter(Boolean)
  const capabilityParts = [
    contextLabel !== "n/a" ? `${contextLabel} ctx` : null,
    outputLabel !== "n/a" ? `${outputLabel} out` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          <Badge variant="outline">{model.model_provider}</Badge>
          {model.base_url ? <Badge variant="outline">自定义 URL</Badge> : null}
        </div>
        {detailParts.length ? (
          <p className="truncate text-xs text-muted-foreground">
            {detailParts.join(" · ")}
          </p>
        ) : null}
        {capabilityParts.length ? (
          <p className="truncate text-xs text-muted-foreground">
            {capabilityParts.join(" · ")}
          </p>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={"模型操作"}
            disabled={disabled}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              void onToggle(model)
            }}
          >
            {model.enabled ? "禁用" : "启用"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
              try {
                await navigator.clipboard.writeText(model.id)
                toast({
                  title: "已复制",
                  description: `已将目录 ID ${model.id} 复制到剪贴板。`,
                })
              } catch {
                toast({
                  title: "复制失败",
                  description: "无法将目录 ID 复制到剪贴板。",
                  variant: "destructive",
                })
              }
            }}
          >
            复制目录 ID
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ProviderAllowlistModelRow({
  canManageModels,
  disabled,
  model,
  showCapabilityColumns,
  onToggle,
  onEdit,
  onDelete,
  onSubscribe,
}: {
  canManageModels: boolean
  disabled: boolean
  model: BuiltInCatalogEntry
  showCapabilityColumns: boolean
  onToggle: (model: ModelCatalogEntry) => Promise<void>
  onEdit?: (model: BuiltInCatalogEntry) => void
  onDelete?: (model: BuiltInCatalogEntry) => void
  onSubscribe?: (model: BuiltInCatalogEntry) => Promise<void>
}) {
  const [subscribePending, setSubscribePending] = useState(false)
  const subscriptionStatus = model.bedrock_subscription_status ?? null
  const canSubscribe =
    canManageModels &&
    onSubscribe !== undefined &&
    model.organization_id != null &&
    model.credentials_configured === true &&
    subscriptionStatus !== null &&
    BEDROCK_SUBSCRIBABLE_STATUSES.has(subscriptionStatus)
  const canEnable = canEnableBuiltInCatalogModel(model)
  const statusMessage = model.readiness_message
  const isCloudCatalogModel = isCloudCatalogProvider(model.model_provider)
  const isOrgScoped = model.organization_id != null
  const showOverflowMenu =
    isOrgScoped && isCloudCatalogModel && (onEdit || onDelete)
  const displayName = model.metadata_display_name?.trim()

  return (
    <div className="border-b border-border/40 py-3 last:border-b-0">
      <div
        className={cn(
          "grid gap-3 sm:items-center sm:gap-4",
          showCapabilityColumns
            ? canManageModels
              ? "sm:grid-cols-[minmax(0,1fr)_88px_88px_7rem_2rem]"
              : "sm:grid-cols-[minmax(0,1fr)_88px_88px_2rem]"
            : canManageModels
              ? "sm:grid-cols-[minmax(0,1fr)_7rem_2rem]"
              : "sm:grid-cols-[minmax(0,1fr)_2rem]"
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <p
              className="min-w-0 truncate text-sm font-medium"
              title={displayName || getModelLabel(model)}
            >
              {displayName || getModelLabel(model)}
            </p>
            {subscriptionStatus ? (
              <BedrockSubscriptionBadge status={subscriptionStatus} />
            ) : null}
            {canSubscribe ? (
              <Button
                className="h-6 shrink-0 px-2 text-xs"
                disabled={disabled || subscribePending}
                onClick={async () => {
                  setSubscribePending(true)
                  try {
                    await onSubscribe(model)
                  } finally {
                    setSubscribePending(false)
                  }
                }}
                size="sm"
                variant="outline"
              >
                {subscribePending ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : null}
                订阅
              </Button>
            ) : null}
          </div>
          {displayName ? (
            <p
              className="truncate text-xs text-muted-foreground"
              title={model.model_name}
            >
              {model.model_name}
            </p>
          ) : null}
          {showCapabilityColumns ? (
            <p className="text-xs text-muted-foreground sm:hidden">
              {getModelContextLabel(model)} 上下文 {"·"}{" "}
              {getModelOutputLabel(model)} 输出
            </p>
          ) : null}
          {statusMessage ? (
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
          ) : null}
        </div>
        {showCapabilityColumns ? (
          <>
            <p className="hidden text-right text-xs text-muted-foreground sm:block">
              {getModelContextLabel(model)}
            </p>
            <p className="hidden text-right text-xs text-muted-foreground sm:block">
              {getModelOutputLabel(model)}
            </p>
          </>
        ) : null}
        {canManageModels ? (
          <div className="flex items-center justify-center">
            <Button
              className="w-24"
              disabled={disabled || !canEnable}
              onClick={() => {
                void onToggle(model)
              }}
              size="sm"
              variant={model.enabled ? "secondary" : "outline"}
            >
              {model.enabled ? "不允许" : "允许"}
            </Button>
          </div>
        ) : null}
        <div className="flex items-center justify-end">
          {showOverflowMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={"模型操作"}
                  disabled={disabled}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onSelect={() => onEdit(model)}>
                    编辑
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <DropdownMenuItem onSelect={() => onDelete(model)}>
                    删除
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ProviderConnectionItem({
  canManageModels,
  disabled,
  enabledCount,
  isExpanded,
  onAddCatalogModel,
  onConfigureProvider,
  onDeleteCatalogModel,
  onDeleteCredentials,
  onDisableAllModels,
  onEditCatalogModel,
  onEnableAllModels,
  onExpandedChange,
  onRefreshModels,
  onSubscribeModel,
  onToggleModel,
  provider,
  refreshPending = false,
}: {
  canManageModels: boolean
  disabled: boolean
  enabledCount: number
  isExpanded: boolean
  onAddCatalogModel?: (provider: string) => void
  onConfigureProvider: (provider: string) => void
  onRefreshModels?: (provider: string) => void
  onSubscribeModel?: (model: BuiltInCatalogEntry) => Promise<void>
  refreshPending?: boolean
  onDeleteCatalogModel?: (model: BuiltInCatalogEntry) => void
  onDeleteCredentials: (provider: string, label: string) => Promise<void>
  onDisableAllModels: (provider: string, label: string) => Promise<void>
  onEditCatalogModel?: (model: BuiltInCatalogEntry) => void
  onEnableAllModels: (provider: string, label: string) => Promise<void>
  onExpandedChange: (expanded: boolean) => void
  onToggleModel: (model: ModelCatalogEntry) => Promise<void>
  provider: BuiltInProviderConnection
}) {
  const [catalogQueryInput, setCatalogQueryInput] = useState("")
  const [allowAllOverride, setAllowAllOverride] = useState<boolean | null>(null)
  const [enabledCountOverride, setEnabledCountOverride] = useState<
    number | null
  >(null)
  const [isWhitelistMode, setIsWhitelistMode] = useState(false)
  const [catalogQuery] = useDebounce(catalogQueryInput.trim(), 250)

  const allProviderModels = provider.discovered_models
  const providerModels = useMemo(() => {
    if (!catalogQuery) {
      return allProviderModels
    }
    const normalizedQuery = catalogQuery.toLowerCase()
    return allProviderModels.filter((model) => {
      const sourceName = getModelSourceLabel(model)
      return (
        model.model_name.toLowerCase().includes(normalizedQuery) ||
        model.metadata_display_name?.toLowerCase().includes(normalizedQuery) ||
        model.model_provider.toLowerCase().includes(normalizedQuery) ||
        sourceName.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [allProviderModels, catalogQuery])

  useEffect(() => {
    setCatalogQueryInput("")
    setAllowAllOverride(null)
    setEnabledCountOverride(null)
    setIsWhitelistMode(false)
  }, [provider.provider])

  const selectableProviderModelCount = allProviderModels.filter((model) =>
    canEnableBuiltInCatalogModel(model)
  ).length
  const enabledSelectableProviderCount = enabledCountOverride ?? enabledCount
  const allSelectableAllowed =
    selectableProviderModelCount > 0 &&
    enabledSelectableProviderCount === selectableProviderModelCount
  const allowAllChecked =
    !isWhitelistMode && (allowAllOverride ?? allSelectableAllowed)
  const showCapabilityColumns = !isCloudCatalogProvider(provider.provider)
  const subtitle = provider.credentials_configured
    ? provider.base_url || provider.runtime_target
      ? [provider.base_url, provider.runtime_target].filter(Boolean).join(" · ")
      : "已连接"
    : "未连接"

  return (
    <RbacListItem
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {provider.credentials_configured ? (
            <ProviderMetaPill active={enabledSelectableProviderCount > 0}>
              {enabledSelectableProviderCount} 已启用
            </ProviderMetaPill>
          ) : null}
          {onRefreshModels && provider.credentials_configured ? (
            <Button
              disabled={disabled || refreshPending}
              onClick={() => onRefreshModels(provider.provider)}
              size="sm"
              variant="outline"
            >
              {refreshPending ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : null}
              刷新模型
            </Button>
          ) : null}
          {onAddCatalogModel && provider.credentials_configured ? (
            <Button
              disabled={disabled}
              onClick={() => onAddCatalogModel(provider.provider)}
              size="sm"
              variant="outline"
            >
              添加模型
            </Button>
          ) : null}
          <Button
            onClick={() => onConfigureProvider(provider.provider)}
            size="sm"
            variant="outline"
          >
            {provider.credentials_configured ? "配置" : "连接"}
          </Button>
        </div>
      }
      badges={null}
      icon={
        <ProviderIcon
          className="size-8 rounded-md"
          providerId={getProviderIconId(provider.provider)}
        />
      }
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      reserveExpandSpace
      subtitle={subtitle}
      title={provider.label}
    >
      <div className="space-y-4">
        {provider.credentials_configured ? (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void onDeleteCredentials(provider.provider, provider.label)
              }}
              size="sm"
              variant="outline"
            >
              断开连接
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">连接 {provider.label}</p>
                <p className="text-xs text-muted-foreground">
                  请先使用上方“连接”操作添加组织凭据，再启用这些模型供组织使用。
                </p>
              </div>
            </div>
          </div>
        )}

        {provider.last_error ? (
          <div className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
            {provider.last_error}
          </div>
        ) : null}

        {canManageModels ? (
          <div className="rounded-lg border px-4 py-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">模型访问</p>
                <p className="text-xs text-muted-foreground">
                  {allowAllChecked
                    ? `允许所有可选的 ${provider.label} 模型。关闭后可管理白名单。`
                    : `通过白名单选择哪些 ${provider.label} 模型可用于默认模型和预设。`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-xs font-medium",
                    allowAllChecked
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  全部允许
                </span>
                <Switch
                  checked={allowAllChecked}
                  disabled={
                    disabled ||
                    !provider.credentials_configured ||
                    !selectableProviderModelCount
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setIsWhitelistMode(false)
                      setAllowAllOverride(true)
                      setEnabledCountOverride(selectableProviderModelCount)
                      void onEnableAllModels(
                        provider.provider,
                        provider.label
                      ).catch(() => {
                        setAllowAllOverride(null)
                        setEnabledCountOverride(null)
                      })
                      return
                    }
                    setIsWhitelistMode(true)
                    setAllowAllOverride(false)
                    setEnabledCountOverride(0)
                    void onDisableAllModels(
                      provider.provider,
                      provider.label
                    ).catch(() => {
                      setIsWhitelistMode(false)
                      setAllowAllOverride(null)
                      setEnabledCountOverride(null)
                    })
                  }}
                  size="md"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProviderMetaPill active={enabledSelectableProviderCount > 0}>
                {selectableProviderModelCount
                  ? `已启用 ${enabledSelectableProviderCount}/${selectableProviderModelCount} 个模型`
                  : provider.credentials_configured
                    ? "暂无可选模型"
                    : "连接后管理平台模型"}
              </ProviderMetaPill>
            </div>
          </div>
        ) : null}

        {provider.credentials_configured ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                className="focus-visible:ring-0 focus-visible:ring-offset-0"
                onChange={(event) => {
                  setCatalogQueryInput(event.target.value)
                }}
                placeholder={`搜索 ${provider.label} 模型`}
                value={catalogQueryInput}
              />
              {catalogQueryInput.trim() ? (
                <Button
                  onClick={() => {
                    setCatalogQueryInput("")
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  清除
                </Button>
              ) : null}
            </div>
            {providerModels.length ? (
              <ScrollArea className="h-96 rounded-lg border">
                <div className="px-4">
                  <div
                    className={cn(
                      "hidden gap-4 border-b border-border/40 py-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid",
                      showCapabilityColumns
                        ? canManageModels
                          ? "grid-cols-[minmax(0,1fr)_88px_88px_7rem_2rem]"
                          : "grid-cols-[minmax(0,1fr)_88px_88px_2rem]"
                        : canManageModels
                          ? "grid-cols-[minmax(0,1fr)_7rem_2rem]"
                          : "grid-cols-[minmax(0,1fr)_2rem]"
                    )}
                  >
                    <span>模型</span>
                    {showCapabilityColumns ? (
                      <>
                        <span className="text-right">上下文</span>
                        <span className="text-right">输出</span>
                      </>
                    ) : null}
                    {canManageModels ? (
                      <span className="text-center">访问</span>
                    ) : null}
                    <span aria-hidden="true" />
                  </div>
                  {providerModels.map((model) => (
                    <ProviderAllowlistModelRow
                      canManageModels={canManageModels}
                      disabled={disabled}
                      key={getModelSelectionKey(toModelSelection(model))}
                      model={model}
                      onDelete={onDeleteCatalogModel}
                      onEdit={onEditCatalogModel}
                      onSubscribe={onSubscribeModel}
                      showCapabilityColumns={showCapabilityColumns}
                      onToggle={async (nextModel) => {
                        const nextCountDelta = nextModel.enabled ? -1 : 1
                        setAllowAllOverride(null)
                        setEnabledCountOverride((current) =>
                          Math.min(
                            selectableProviderModelCount ||
                              Number.POSITIVE_INFINITY,
                            Math.max(
                              0,
                              (current ?? enabledCount) + nextCountDelta
                            )
                          )
                        )
                        try {
                          await onToggleModel(nextModel)
                        } catch {
                          setEnabledCountOverride(null)
                        }
                      }}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                {catalogQueryInput.trim()
                  ? `没有匹配的 ${provider.label} 模型。`
                  : "此提供商目前没有可选模型。"}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            连接此提供商后，允许组织应当使用的平台模型。
          </div>
        )}
      </div>
    </RbacListItem>
  )
}

interface CloudCatalogModelDialogProps {
  provider: CloudCatalogProvider | null
  entry: AgentCatalogRead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create or edit an org-scoped cloud catalog entry for Bedrock, Azure OpenAI,
 * Azure AI, or Vertex AI.
 */
function CloudCatalogModelDialog({
  provider,
  entry,
  open,
  onOpenChange,
}: CloudCatalogModelDialogProps) {
  const queryClient = useQueryClient()
  const activeProvider = provider ?? "bedrock"
  const form = useForm<CloudCatalogModelFormValues>({
    resolver: zodResolver(cloudCatalogModelSchema),
    mode: "onBlur",
    defaultValues: buildCloudCatalogDefaults(activeProvider, entry),
  })

  useEffect(() => {
    if (!open || !provider) {
      return
    }
    form.reset(buildCloudCatalogDefaults(provider, entry))
  }, [form, provider, entry, open])

  const saveMutation = useMutation({
    mutationFn: async (values: CloudCatalogModelFormValues) => {
      if (entry) {
        return await updateCatalogEntry({
          catalogId: entry.id,
          requestBody: buildCatalogUpdatePayload(values),
        })
      }
      return await createCatalogEntry({
        requestBody: buildCatalogCreatePayload(values),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "agent-catalog"],
      })
      onOpenChange(false)
      toast({
        title: entry ? "已更新模型" : "已添加模型",
        description: entry ? "已保存目录条目。" : "已添加目录条目。",
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: entry ? "更新失败" : "添加失败",
        description: getApiErrorDetail(error) ?? "无法保存目录条目。",
        variant: "destructive",
      })
    },
  })

  async function handleSubmit(values: CloudCatalogModelFormValues) {
    await saveMutation.mutateAsync(values)
  }

  if (!provider) {
    return null
  }

  const label = getCloudProviderLabel(provider)
  const isEdit = entry !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `编辑 ${label} 模型` : `添加 ${label} 模型`}
          </DialogTitle>
          <DialogDescription>
            {provider === "bedrock"
              ? "引用 Bedrock 推理配置或直接模型 ID。"
              : provider === "azure_openai"
                ? "将目录条目映射到 Azure OpenAI 部署。"
                : provider === "azure_ai"
                  ? "将目录条目映射到 Azure AI 模型名称。"
                  : "将目录条目映射到 Vertex AI 模型。"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="model_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>模型名称</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isEdit}
                        placeholder={"例如 claude-sonnet-4"}
                      />
                    </FormControl>
                    <FormDescription>
                      供预设和默认模型选择使用的目录标识，创建后无法更改。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>显示名称</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={"可选的易读标签"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {provider === "bedrock" ? (
                <>
                  <FormField
                    control={form.control}
                    name="inference_profile_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>推理配置 ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="us.anthropic.claude-sonnet-4-20250514-v1:0"
                          />
                        </FormControl>
                        <FormDescription>
                          较新模型需要此项。请填写此项或直接模型 ID，二选一。
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>模型 ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="anthropic.claude-3-haiku-20240307-v1:0"
                          />
                        </FormControl>
                        <FormDescription>
                          旧版按需模型使用的直接模型 ID。
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="use_converse"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                        <div className="space-y-1">
                          <FormLabel className="text-sm">
                            使用 Converse API
                          </FormLabel>
                          <FormDescription>
                            强制使用 Bedrock Converse API，而非
                            InvokeModel。需要 Converse API 的模型应启用此项。
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              {provider === "azure_openai" ? (
                <FormField
                  control={form.control}
                  name="deployment_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部署名称</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="gpt-4o" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {provider === "azure_ai" ? (
                <FormField
                  control={form.control}
                  name="azure_ai_model_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Azure AI 模型名称</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="claude-sonnet-4-5" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {provider === "vertex_ai" ? (
                <FormField
                  control={form.control}
                  name="vertex_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vertex 模型</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="gemini-3-flash" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {isEdit ? "保存模型" : "添加模型"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Organization agent settings using the `feat/llm-provider-v2` layout, backed
 * by the current backend and OpenAPI surface.
 */
export function OrgSettingsAgentForm() {
  const queryClient = useQueryClient()
  const { hasEntitlement } = useEntitlements()
  const agentAddonsEnabled = hasEntitlement("agent_addons")
  const [credentialsProvider, setCredentialsProvider] = useState<string | null>(
    null
  )
  const [editingProvider, setEditingProvider] =
    useState<AgentCustomProviderRead | null>(null)
  const [deletingProvider, setDeletingProvider] =
    useState<AgentCustomProviderRead | null>(null)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [customProviderDialogOpen, setCustomProviderDialogOpen] =
    useState(false)
  const [cloudModelDialog, setCloudModelDialog] = useState<{
    provider: CloudCatalogProvider
    entry: AgentCatalogRead | null
  } | null>(null)
  const [deletingCatalogEntry, setDeletingCatalogEntry] =
    useState<AgentCatalogRead | null>(null)

  const { providerConfigs, providerConfigsLoading, providerConfigsError } =
    useProviderCredentialConfigs()
  const {
    providersStatus,
    isLoading: providersStatusLoading,
    error: providersStatusError,
  } = useModelProvidersStatus()
  const {
    defaultModelSelection,
    defaultModelLoading,
    defaultModelError,
    updateDefaultModel,
    isUpdating,
  } = useAgentDefaultModel()

  const {
    data: customProviders,
    isLoading: customProvidersLoading,
    error: customProvidersError,
  } = useQuery<AgentCustomProviderRead[], ApiError>({
    queryKey: ["organization", "agent-providers"],
    queryFn: fetchAllProviders,
    retry: retryHandler,
  })

  const {
    data: catalogEntries,
    isLoading: catalogEntriesLoading,
    error: catalogEntriesError,
  } = useQuery<AgentCatalogRead[], ApiError>({
    queryKey: ["organization", "agent-catalog"],
    queryFn: fetchAllCatalogEntries,
    retry: retryHandler,
  })

  const {
    data: enabledAccessRows,
    isLoading: enabledAccessRowsLoading,
    error: enabledAccessRowsError,
  } = useQuery<AgentModelAccessRead[], ApiError>({
    queryKey: ["organization", "agent-model-access"],
    queryFn: fetchAllEnabledModels,
    retry: retryHandler,
  })

  const providerConfigsByProvider = useMemo(
    () =>
      new Map(
        (providerConfigs ?? []).map((providerConfig) => [
          providerConfig.provider,
          providerConfig,
        ])
      ),
    [providerConfigs]
  )

  const orgEnabledAccessRows = useMemo(
    () => (enabledAccessRows ?? []).filter((row) => row.workspace_id === null),
    [enabledAccessRows]
  )
  const enabledCatalogIdToAccess = useMemo(
    () => new Map(orgEnabledAccessRows.map((row) => [row.catalog_id, row])),
    [orgEnabledAccessRows]
  )

  const customProvidersById = useMemo(
    () =>
      new Map(
        (customProviders ?? []).map((provider) => [provider.id, provider])
      ),
    [customProviders]
  )

  const orgEnabledCatalogEntries = useMemo(
    () =>
      (catalogEntries ?? []).filter((entry) =>
        enabledCatalogIdToAccess.has(entry.id)
      ),
    [catalogEntries, enabledCatalogIdToAccess]
  )

  const defaultModelOptions = useMemo(
    () =>
      [...orgEnabledCatalogEntries]
        .sort((left, right) => left.model_name.localeCompare(right.model_name))
        .map((entry) => {
          const customProvider = entry.custom_provider_id
            ? customProvidersById.get(entry.custom_provider_id)
            : null
          const sourceLabel =
            customProvider?.display_name ??
            providerConfigsByProvider.get(entry.model_provider)?.label ??
            entry.model_provider
          return {
            catalog_id: entry.id,
            model_name: entry.model_name,
            model_provider: entry.model_provider,
            source_label: sourceLabel,
          }
        }),
    [orgEnabledCatalogEntries, customProvidersById, providerConfigsByProvider]
  )
  const currentDefaultModelOption =
    defaultModelOptions.find(
      (model) => model.catalog_id === defaultModelSelection?.catalog_id
    ) ?? null
  const builtInCatalogEntries = useMemo(
    () =>
      (catalogEntries ?? []).filter(
        (entry) => entry.custom_provider_id === null
      ),
    [catalogEntries]
  )
  const builtInProviders = useMemo(() => {
    const entriesByProvider = new Map<string, AgentCatalogRead[]>()

    for (const entry of builtInCatalogEntries) {
      const current = entriesByProvider.get(entry.model_provider)
      if (current) {
        current.push(entry)
      } else {
        entriesByProvider.set(entry.model_provider, [entry])
      }
    }

    return [...(providerConfigs ?? [])]
      .filter(
        // The custom-model-provider slug has its own dedicated "Custom
        // sources" section below; excluding it from the built-in provider
        // list prevents a duplicate card.
        (providerConfig) => providerConfig.provider !== "custom-model-provider"
      )
      .map((providerConfig, index) => ({ providerConfig, index }))
      .sort(
        (left, right) =>
          providerDisplayRank(left.providerConfig.provider, left.index) -
          providerDisplayRank(right.providerConfig.provider, right.index)
      )
      .map(({ providerConfig }): BuiltInProviderConnection => {
        const credentialsConfigured =
          providersStatus?.[providerConfig.provider] ?? false
        const discoveredModels = [
          ...(entriesByProvider.get(providerConfig.provider) ?? []),
        ]
          .sort((left, right) =>
            left.model_name.localeCompare(right.model_name)
          )
          .map(
            (entry): BuiltInCatalogEntry => ({
              id: entry.id,
              source_id: null,
              source_name:
                providerConfig.label ??
                getProviderDisplayLabel(entry.model_provider),
              source_type:
                entry.organization_id === null ? "platform" : "organization",
              model_provider: entry.model_provider,
              model_name: entry.model_name,
              metadata: entry.model_metadata,
              base_url: null,
              enabled: enabledCatalogIdToAccess.has(entry.id),
              enableable: credentialsConfigured,
              ready: credentialsConfigured,
              credentials_configured: credentialsConfigured,
              credential_provider: providerConfig.provider,
              credential_label: providerConfig.label,
              organization_id: entry.organization_id,
              metadata_display_name: getCatalogMetadataString(
                entry.model_metadata,
                "display_name"
              ),
              bedrock_subscription_status:
                entry.model_provider === "bedrock"
                  ? getBedrockSubscriptionStatus(entry.model_metadata)
                  : null,
              readiness_message: credentialsConfigured
                ? null
                : "请先连接此提供商，再允许使用其平台模型。",
            })
          )

        return {
          provider: providerConfig.provider,
          label: providerConfig.label,
          source_type: "platform",
          credentials_configured: credentialsConfigured,
          base_url: null,
          runtime_target: null,
          discovery_status: discoveredModels.length ? "loaded" : "unknown",
          last_refreshed_at: null,
          last_error: null,
          discovered_models: discoveredModels,
        }
      })
  }, [
    enabledCatalogIdToAccess,
    builtInCatalogEntries,
    providerConfigs,
    providersStatus,
  ])
  const builtInProvidersById = useMemo(
    () =>
      new Map(
        builtInProviders.map((provider) => [provider.provider, provider])
      ),
    [builtInProviders]
  )
  const customSourceCards = useMemo(() => {
    const catalogByProviderId = new Map<string, AgentCatalogRead[]>()

    for (const entry of catalogEntries ?? []) {
      if (!entry.custom_provider_id) {
        continue
      }
      const current = catalogByProviderId.get(entry.custom_provider_id)
      if (current) {
        current.push(entry)
      } else {
        catalogByProviderId.set(entry.custom_provider_id, [entry])
      }
    }

    return [...(customProviders ?? [])]
      .sort((left, right) =>
        left.display_name.localeCompare(right.display_name)
      )
      .map((provider): CustomSourceCard => {
        const sourceFlavor = inferCustomSourceFlavor(provider)
        const providerEntries = [
          ...(catalogByProviderId.get(provider.id) ?? []),
        ]
          .sort((left, right) =>
            left.model_name.localeCompare(right.model_name)
          )
          .map(
            (entry): ModelCatalogEntry => ({
              id: entry.id,
              source_id: provider.id,
              source_name: provider.display_name,
              source_type: "openai_compatible_gateway",
              model_provider: entry.model_provider,
              model_name: entry.model_name,
              metadata: entry.model_metadata,
              base_url: provider.base_url,
              enabled: enabledCatalogIdToAccess.has(entry.id),
            })
          )

        return {
          id: provider.id,
          type: "openai_compatible_gateway",
          flavor: sourceFlavor,
          display_name: provider.display_name,
          base_url: provider.base_url,
          api_key_configured: false,
          api_key_header: provider.api_key_header,
          discovery_status: providerEntries.length ? "loaded" : "unknown",
          last_refreshed_at: provider.last_refreshed_at,
          last_error: null,
          models: providerEntries,
          provider,
        }
      })
  }, [catalogEntries, customProviders, enabledCatalogIdToAccess])

  const pageLoading =
    !providerConfigs &&
    !customProviders &&
    !catalogEntries &&
    !enabledAccessRows &&
    (providerConfigsLoading ||
      providersStatusLoading ||
      customProvidersLoading ||
      catalogEntriesLoading ||
      enabledAccessRowsLoading ||
      defaultModelLoading)

  function invalidateOrganizationAgentQueries() {
    void queryClient.invalidateQueries({
      queryKey: ["organization", "agent-providers"],
    })
    void queryClient.invalidateQueries({
      queryKey: ["organization", "agent-catalog"],
    })
    void queryClient.invalidateQueries({
      queryKey: ["organization", "agent-model-access"],
    })
  }

  function invalidateBuiltInAgentQueries() {
    void queryClient.invalidateQueries({
      queryKey: ["agent-providers-status"],
    })
    void queryClient.invalidateQueries({
      queryKey: ["agent-default-model"],
    })
    void queryClient.invalidateQueries({
      queryKey: ["organization", "agent-model-access"],
    })
  }

  const credentialDeleteMutation = useMutation({
    mutationFn: async (provider: string) =>
      await agentDeleteProviderCredentials({ provider }),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateBuiltInAgentQueries()
    },
  })
  const refreshProviderMutation = useMutation({
    mutationFn: async (providerId: string) =>
      await refreshCustomProviderCatalog({ providerId }),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateOrganizationAgentQueries()
    },
  })
  const refreshBuiltInProviderMutation = useMutation({
    mutationFn: async (provider: string) =>
      await agentRefreshProviderModels({ provider }),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateOrganizationAgentQueries()
      invalidateBuiltInAgentQueries()
    },
  })
  const subscribeBedrockModelMutation = useMutation({
    mutationFn: async (catalogId: string) =>
      await agentSubscribeBedrockModel({ catalogId }),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateOrganizationAgentQueries()
      invalidateBuiltInAgentQueries()
    },
  })
  const deleteCustomProviderMutation = useMutation({
    mutationFn: async (providerId: string) =>
      await deleteCustomProvider({ providerId }),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateOrganizationAgentQueries()
    },
  })
  const deleteCatalogEntryMutation = useMutation({
    mutationFn: async (catalogId: string) =>
      await deleteCatalogEntry({ catalogId }),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateOrganizationAgentQueries()
    },
  })
  const toggleCatalogAccessMutation = useMutation({
    mutationFn: async (model: ModelCatalogEntry) => {
      const existingAccess = enabledCatalogIdToAccess.get(model.id)
      if (existingAccess) {
        await disableModel({ accessId: existingAccess.id })
        return
      }
      await enableModel({
        requestBody: {
          catalog_id: model.id,
        },
      })
    },
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "agent-model-access"],
      })
    },
  })
  const bulkCatalogAccessMutation = useMutation({
    mutationFn: async ({
      accessIdsToDisable,
      catalogIdsToEnable,
    }: {
      accessIdsToDisable: string[]
      catalogIdsToEnable: string[]
    }) => {
      if (catalogIdsToEnable.length) {
        await Promise.all(
          catalogIdsToEnable.map(
            async (catalogId) =>
              await enableModel({
                requestBody: {
                  catalog_id: catalogId,
                },
              })
          )
        )
      }
      if (accessIdsToDisable.length) {
        await Promise.all(
          accessIdsToDisable.map(
            async (accessId) => await disableModel({ accessId })
          )
        )
      }
    },
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "agent-model-access"],
      })
    },
  })

  async function handleDeleteBuiltInCredentials(
    provider: string,
    label: string
  ) {
    if (!window.confirm(`删除此组织已保存的 ${label} 凭据？`)) {
      return
    }

    try {
      await credentialDeleteMutation.mutateAsync(provider)
      toast({
        title: "已删除凭据",
        description: `已移除 ${label} 凭据。`,
      })
    } catch (error) {
      toast({
        title: `删除 ${label} 凭据失败`,
        description: getApiErrorDetail(error) ?? "无法删除提供商凭据。",
        variant: "destructive",
      })
    }
  }

  async function handleDefaultModelChange(catalogId: string) {
    try {
      await updateDefaultModel(catalogId)
      toast({
        title: "已更新默认模型",
      })
    } catch (error) {
      toast({
        title: "更新失败",
        description: getApiErrorDetail(error) ?? "无法更新默认模型。",
        variant: "destructive",
      })
    }
  }

  async function handleModelToggle(model: ModelCatalogEntry) {
    try {
      await toggleCatalogAccessMutation.mutateAsync(model)
    } catch (error) {
      toast({
        title: `${model.enabled ? "禁用" : "启用"} ${getModelLabel(model)} 失败`,
        description: getApiErrorDetail(error) ?? "无法更新模型访问权限。",
        variant: "destructive",
      })
      throw error
    }
  }

  async function handleEnableAllProviderModels(
    providerId: string,
    label: string
  ) {
    const provider = builtInProvidersById.get(providerId)
    if (!provider) {
      return
    }

    const catalogIdsToEnable = provider.discovered_models
      .filter((model) => canEnableBuiltInCatalogModel(model) && !model.enabled)
      .map((model) => model.id)

    try {
      await bulkCatalogAccessMutation.mutateAsync({
        accessIdsToDisable: [],
        catalogIdsToEnable,
      })
      toast({
        title: "已更新提供商访问权限",
        description: catalogIdsToEnable.length
          ? `现在允许所有可选的 ${label} 模型。`
          : `所有可选的 ${label} 模型均已允许。`,
      })
    } catch (error) {
      toast({
        title: `更新 ${label} 模型访问权限失败`,
        description: getApiErrorDetail(error) ?? "无法更新模型访问权限。",
        variant: "destructive",
      })
      throw error
    }
  }

  async function handleDisableAllProviderModels(
    providerId: string,
    label: string
  ) {
    const provider = builtInProvidersById.get(providerId)
    if (!provider) {
      return
    }

    const accessIdsToDisable = provider.discovered_models.flatMap((model) => {
      const access = enabledCatalogIdToAccess.get(model.id)
      return access ? [access.id] : []
    })

    try {
      await bulkCatalogAccessMutation.mutateAsync({
        accessIdsToDisable,
        catalogIdsToEnable: [],
      })
      toast({
        title: "已更新提供商访问权限",
        description: accessIdsToDisable.length
          ? `已从白名单中移除所有 ${label} 模型。`
          : `当前未允许任何 ${label} 模型。`,
      })
    } catch (error) {
      toast({
        title: `更新 ${label} 模型访问权限失败`,
        description: getApiErrorDetail(error) ?? "无法更新模型访问权限。",
        variant: "destructive",
      })
      throw error
    }
  }

  async function handleRefreshBuiltInProvider(provider: string) {
    const label = getProviderDisplayLabel(provider)
    try {
      const result = await refreshBuiltInProviderMutation.mutateAsync(provider)
      toast({
        title: `已刷新 ${label} 模型`,
        description: `已发现 ${result.models_discovered} 个模型。`,
      })
    } catch (error) {
      toast({
        title: `刷新 ${label} 模型失败`,
        description:
          getApiErrorDetail(error) ??
          (provider === "bedrock"
            ? "无法列出 AWS Bedrock 模型。"
            : "无法访问提供商的 /models 端点。"),
        variant: "destructive",
      })
    }
  }

  async function handleSubscribeBedrockModel(model: BuiltInCatalogEntry) {
    if (!model.id) {
      return
    }
    const name = model.metadata_display_name || model.model_name
    try {
      const result = await subscribeBedrockModelMutation.mutateAsync(model.id)
      toast({
        title:
          result.status === "subscribed"
            ? `已订阅 ${name}`
            : `已请求订阅 ${name}`,
        description:
          result.status === "subscribed"
            ? "模型已可使用。"
            : "AWS 可能需要几分钟来激活模型访问权限。",
      })
    } catch (error) {
      toast({
        title: `订阅 ${name} 失败`,
        description:
          getApiErrorDetail(error) ??
          "请检查 AWS 凭据是否具有 aws-marketplace:Subscribe 权限。",
        variant: "destructive",
      })
    }
  }

  async function handleRefreshCustomProvider(source: CustomSourceCard) {
    try {
      await refreshProviderMutation.mutateAsync(source.id)
      toast({
        title: "已刷新自定义来源",
        description: `已更新 ${source.display_name}。`,
      })
    } catch (error) {
      toast({
        title: `刷新 ${source.display_name} 失败`,
        description: getApiErrorDetail(error) ?? "无法刷新自定义提供商目录。",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteCustomProvider(provider: AgentCustomProviderRead) {
    try {
      await deleteCustomProviderMutation.mutateAsync(provider.id)
      toast({
        title: "已删除自定义来源",
        description: `已移除 ${provider.display_name}。`,
      })
    } catch (error) {
      toast({
        title: `删除 ${provider.display_name} 失败`,
        description: getApiErrorDetail(error) ?? "无法删除自定义提供商。",
        variant: "destructive",
      })
    }
  }

  function handleProviderCredentialsSaved() {
    invalidateBuiltInAgentQueries()
    toast({
      title: selectedCredentialsConfigured ? "已更新凭据" : "提供商已连接",
      description: "已保存提供商凭据。",
    })
  }

  function handleOpenAddCatalogModel(providerSlug: string) {
    if (!isCloudCatalogProvider(providerSlug)) {
      return
    }
    setCloudModelDialog({ provider: providerSlug, entry: null })
  }

  function handleOpenEditCatalogModel(model: BuiltInCatalogEntry) {
    if (!isCloudCatalogProvider(model.model_provider)) {
      return
    }
    const source = (catalogEntries ?? []).find((entry) => entry.id === model.id)
    if (!source) {
      return
    }
    setCloudModelDialog({
      provider: model.model_provider,
      entry: source,
    })
  }

  function handleOpenDeleteCatalogModel(model: BuiltInCatalogEntry) {
    const source = (catalogEntries ?? []).find((entry) => entry.id === model.id)
    if (!source) {
      return
    }
    setDeletingCatalogEntry(source)
  }

  async function handleConfirmDeleteCatalogEntry(entry: AgentCatalogRead) {
    try {
      await deleteCatalogEntryMutation.mutateAsync(entry.id)
      toast({
        title: "已删除模型",
        description: `已从目录移除 ${entry.model_name}。`,
      })
    } catch (error) {
      toast({
        title: "删除失败",
        description: getApiErrorDetail(error) ?? "无法删除目录条目。",
        variant: "destructive",
      })
    } finally {
      setDeletingCatalogEntry(null)
    }
  }

  if (pageLoading) {
    return <CenteredSpinner />
  }

  const pageError =
    providerConfigsError ??
    providersStatusError ??
    customProvidersError ??
    catalogEntriesError ??
    enabledAccessRowsError ??
    defaultModelError
  const providerSectionLoading =
    providerConfigsLoading ||
    providersStatusLoading ||
    catalogEntriesLoading ||
    enabledAccessRowsLoading
  const customSourcesSectionLoading =
    customProvidersLoading || catalogEntriesLoading || enabledAccessRowsLoading
  const defaultModelSectionLoading =
    defaultModelLoading ||
    catalogEntriesLoading ||
    enabledAccessRowsLoading ||
    providersStatusLoading ||
    providerConfigsLoading
  const isSelectionUpdating =
    toggleCatalogAccessMutation.isPending ||
    bulkCatalogAccessMutation.isPending ||
    isUpdating
  const selectedCredentialsConfigured = credentialsProvider
    ? (providersStatus?.[credentialsProvider] ?? false)
    : false

  return (
    <div className="space-y-12">
      {pageError ? (
        <AlertNotification
          level="error"
          message={getApiErrorDetail(pageError) ?? "无法加载智能体设置。"}
        />
      ) : null}

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">默认模型</h3>
          <p className="text-sm text-muted-foreground">
            从组织已启用的模型中选择组织级默认模型。
          </p>
        </div>

        {defaultModelSectionLoading ? (
          <CenteredSpinner />
        ) : !defaultModelOptions.length ? (
          <p className="text-sm text-muted-foreground">
            请先在下方启用至少一个模型，再选择默认模型。
          </p>
        ) : (
          <Select
            disabled={isSelectionUpdating}
            onValueChange={(catalogId) => {
              if (catalogId === defaultModelSelection?.catalog_id) {
                return
              }
              void handleDefaultModelChange(catalogId)
            }}
            value={currentDefaultModelOption?.catalog_id ?? ""}
          >
            <SelectTrigger className="h-12 px-4 [&>svg]:shrink-0">
              {currentDefaultModelOption ? (
                <div className="flex min-w-0 items-center gap-3 text-left">
                  <ProviderIcon
                    className="size-5 rounded-sm p-0.5"
                    providerId={getProviderIconId(
                      currentDefaultModelOption.model_provider
                    )}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {currentDefaultModelOption.model_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {currentDefaultModelOption.source_label}
                    </span>
                  </div>
                </div>
              ) : (
                <SelectValue placeholder={"选择默认模型"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {defaultModelOptions.map((model) => {
                const isSelected =
                  model.catalog_id === defaultModelSelection?.catalog_id

                return (
                  <SelectItem key={model.catalog_id} value={model.catalog_id}>
                    <div className="flex min-w-0 items-start gap-3 py-1">
                      <ProviderIcon
                        className="mt-0.5 size-5 rounded-sm p-0.5"
                        providerId={getProviderIconId(model.model_provider)}
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {model.model_name}
                          </span>
                          {isSelected ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              当前默认值
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {model.source_label}
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}

        {isSelectionUpdating ? (
          <p className="text-xs text-muted-foreground">正在保存更改…</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">提供商连接</h3>
            <p className="text-sm text-muted-foreground">
              连接并打开提供商，然后启用供工作空间使用的组织级模型。
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {agentAddonsEnabled
              ? "平台模型目录保持共享，各工作空间仍可在组织启用的模型中进一步限制可用范围。"
              : "在此连接提供商。升级后可管理组织级模型的启用状态。"}
          </p>
        </div>
        <div className="space-y-4">
          {providerSectionLoading ? (
            <CenteredSpinner />
          ) : builtInProviders.length ? (
            <RbacListContainer>
              {builtInProviders.map((provider) => {
                const enabledCount = provider.discovered_models.filter(
                  (model) => model.enabled
                ).length

                const isCloudProvider = isCloudCatalogProvider(
                  provider.provider
                )
                const supportsCatalogAuthoring = isCloudProvider
                const canManageModels = agentAddonsEnabled
                return (
                  <ProviderConnectionItem
                    canManageModels={canManageModels}
                    disabled={
                      isSelectionUpdating || credentialDeleteMutation.isPending
                    }
                    enabledCount={enabledCount}
                    isExpanded={expandedProvider === provider.provider}
                    key={provider.provider}
                    onAddCatalogModel={
                      supportsCatalogAuthoring
                        ? handleOpenAddCatalogModel
                        : undefined
                    }
                    onConfigureProvider={setCredentialsProvider}
                    onDeleteCatalogModel={
                      supportsCatalogAuthoring
                        ? handleOpenDeleteCatalogModel
                        : undefined
                    }
                    onDeleteCredentials={handleDeleteBuiltInCredentials}
                    onDisableAllModels={handleDisableAllProviderModels}
                    onEditCatalogModel={
                      supportsCatalogAuthoring
                        ? handleOpenEditCatalogModel
                        : undefined
                    }
                    onEnableAllModels={handleEnableAllProviderModels}
                    onExpandedChange={(expanded) => {
                      setExpandedProvider(expanded ? provider.provider : null)
                    }}
                    onRefreshModels={
                      supportsModelRefresh(provider.provider)
                        ? handleRefreshBuiltInProvider
                        : undefined
                    }
                    onSubscribeModel={
                      provider.provider === "bedrock"
                        ? handleSubscribeBedrockModel
                        : undefined
                    }
                    onToggleModel={handleModelToggle}
                    provider={provider}
                    refreshPending={refreshBuiltInProviderMutation.isPending}
                  />
                )
              })}
            </RbacListContainer>
          ) : (
            <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
              暂无可用的平台提供商。
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">自定义来源</h3>
            <p className="text-sm text-muted-foreground">
              添加其他兼容 OpenAI 的网关。Ollama、vLLM、LiteLLM 和 OpenRouter
              已作为内置提供商列于上方。
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingProvider(null)
              setCustomProviderDialogOpen(true)
            }}
            variant="outline"
          >
            添加自定义来源
          </Button>
        </div>

        {customSourcesSectionLoading ? (
          <CenteredSpinner />
        ) : customSourceCards.length ? (
          <div className="space-y-4">
            {customSourceCards.map((source) => (
              <Card key={source.id}>
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <ProviderIcon
                        className="size-8 rounded-md"
                        providerId={getCustomSourceIconId(source)}
                      />
                      <div className="space-y-2">
                        <CardTitle>{source.display_name}</CardTitle>
                        <CardDescription>
                          {getCustomSourceTypeLabel(source.type)}
                          {getCustomSourceFlavorLabel(source.flavor)
                            ? ` · ${getCustomSourceFlavorLabel(source.flavor)}`
                            : ""}
                          {` · ${formatStatus(source.discovery_status)}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={
                          refreshProviderMutation.isPending ||
                          deleteCustomProviderMutation.isPending
                        }
                        onClick={() => {
                          setEditingProvider(source.provider)
                          setCustomProviderDialogOpen(true)
                        }}
                        size="sm"
                        variant="outline"
                      >
                        编辑
                      </Button>
                      <Button
                        disabled={
                          refreshProviderMutation.isPending ||
                          deleteCustomProviderMutation.isPending
                        }
                        onClick={() => {
                          void handleRefreshCustomProvider(source)
                        }}
                        size="sm"
                        variant="outline"
                      >
                        刷新
                      </Button>
                      <Button
                        disabled={
                          refreshProviderMutation.isPending ||
                          deleteCustomProviderMutation.isPending
                        }
                        onClick={() => setDeletingProvider(source.provider)}
                        size="sm"
                        variant="outline"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <p>上次刷新： {formatDateTime(source.last_refreshed_at)}</p>
                    {source.base_url ? (
                      <p>
                        基础 URL：{" "}
                        <span className="font-mono">{source.base_url}</span>
                      </p>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {source.last_error ? (
                    <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
                      {source.last_error}
                    </div>
                  ) : null}

                  {!source.base_url ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      刷新此自定义端点前，请先设置基础 URL。
                    </div>
                  ) : null}

                  {source.models.length ? (
                    <>
                      {!agentAddonsEnabled ? (
                        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                          升级后可启用或禁用指定来源的模型，供预设和默认模型选择使用。
                        </div>
                      ) : null}
                      {source.models.map((model) => (
                        <CustomSourceModelRow
                          disabled={!agentAddonsEnabled || isSelectionUpdating}
                          key={getModelSelectionKey(toModelSelection(model))}
                          model={model}
                          onToggle={handleModelToggle}
                        />
                      ))}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      刷新此来源后，启用需要用于预设和默认模型的条目。
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">暂无自定义来源</p>
                <p className="text-sm text-muted-foreground">
                  仅在平台提供商和共享模型目录无法满足需求、需要自定义端点时使用自定义来源。
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <AgentCredentialsDialog
        isOpen={credentialsProvider !== null}
        onClose={() => setCredentialsProvider(null)}
        onSuccess={handleProviderCredentialsSaved}
        provider={credentialsProvider}
        providerConfigured={selectedCredentialsConfigured}
      />

      <CustomProviderDialog
        provider={editingProvider}
        open={customProviderDialogOpen}
        onOpenChange={(open) => {
          setCustomProviderDialogOpen(open)
          if (!open) {
            setEditingProvider(null)
          }
        }}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingProvider(null)
          }
        }}
        open={deletingProvider !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除自定义来源</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProvider
                ? `从组织删除 ${deletingProvider.display_name} 吗？从此来源发现的模型将不再可选。`
                : "从组织删除此自定义来源吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingProvider) {
                  void handleDeleteCustomProvider(deletingProvider)
                }
                setDeletingProvider(null)
              }}
              variant="destructive"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CloudCatalogModelDialog
        entry={cloudModelDialog?.entry ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setCloudModelDialog(null)
          }
        }}
        open={cloudModelDialog !== null}
        provider={cloudModelDialog?.provider ?? null}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCatalogEntry(null)
          }
        }}
        open={deletingCatalogEntry !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除目录模型</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCatalogEntry
                ? `从目录删除 ${deletingCatalogEntry.model_name} 吗？此模型对应的工作空间访问记录也会被移除。`
                : "删除此目录条目吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCatalogEntryMutation.isPending}
              onClick={() => {
                if (deletingCatalogEntry) {
                  void handleConfirmDeleteCatalogEntry(deletingCatalogEntry)
                }
              }}
              variant="destructive"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
