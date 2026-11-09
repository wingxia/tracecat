"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { DialogProps } from "@radix-ui/react-dialog"
import {
  Braces,
  CheckCheckIcon,
  CopyIcon,
  FileKey2,
  FileTextIcon,
  InfoIcon,
  KeyRoundIcon,
  PlusCircle,
  ShieldCheck,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react"
import React from "react"
import {
  type ArrayPath,
  type FieldPath,
  useFieldArray,
  useForm,
} from "react-hook-form"
import { z } from "zod"
import type { SecretCreate, SecretDefinition } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { CreateSecretTooltip } from "@/components/secrets/create-secret-tooltip"
import { sshKeyRegex } from "@/components/ssh-keys/ssh-key-utils"
import { SshPrivateKeyField } from "@/components/ssh-keys/ssh-private-key-field"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
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
import { AwsSecretReferenceForm } from "@/components/workspaces/aws-secret-reference-form"
import {
  SecretSourcePicker,
  type SecretSourceValue,
} from "@/components/workspaces/secret-source-picker"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useAwsAssumeRoleAccess, useWorkspaceSecrets } from "@/lib/hooks"
import { cn, copyToClipboard } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

const pemCertificateRegex =
  /-----BEGIN CERTIFICATE-----(?:\r?\n)[A-Za-z0-9+/=\s]+(?:\r?\n)-----END CERTIFICATE-----/

const AWS_ROLE_ARN_KEY = "AWS_ROLE_ARN"
const OKTA_SECRET_NAME = "okta"
const OKTA_MIN_DPOP_KEY_ROTATION_SECONDS = 3600
const OKTA_MAX_DPOP_KEY_ROTATION_SECONDS = 90 * 24 * 3600
const oktaPrivateKeyFileExtensionRegex = /\.(json|pem)$/i

type OktaAuthMethod = "ssws" | "bearer" | "private_key"

const oktaAuthMethodOptions: {
  value: OktaAuthMethod
  label: string
}[] = [
  {
    value: "ssws",
    label: "API 令牌",
  },
  {
    value: "bearer",
    label: "Bearer 令牌",
  },
  {
    value: "private_key",
    label: "私钥",
  },
]

function isOktaCredential(values: { type: string; name: string }) {
  return values.type === "custom" && values.name === OKTA_SECRET_NAME
}

function isValidOktaPrivateKeyJwk(value: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return false
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return false
  }
  const jwk = parsed as Record<string, unknown>
  // Okta private-key auth only supports RSA, and signing requires the private
  // exponent `d` plus the public params `n`/`e`. A public-only or non-JWK
  // object parses as JSON but fails inside the Okta SDK at action-run time.
  const hasField = (field: string) =>
    typeof jwk[field] === "string" && (jwk[field] as string).length > 0
  return jwk.kty === "RSA" && hasField("n") && hasField("e") && hasField("d")
}

function isValidOktaPrivateKey(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return false
  }
  if (trimmed.startsWith("{")) {
    return isValidOktaPrivateKeyJwk(trimmed)
  }
  return sshKeyRegex.test(trimmed)
}

function buildAwsTrustPolicy(args: {
  tracecatAwsPrincipalArn: string
  externalId: string
}) {
  return JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            AWS: args.tracecatAwsPrincipalArn,
          },
          Action: "sts:AssumeRole",
          Condition: {
            StringEquals: {
              "sts:ExternalId": args.externalId,
            },
          },
        },
      ],
    },
    null,
    2
  )
}

function shouldSuppressAwsAssumeRoleError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false
  }

  const status =
    "status" in error && typeof error.status === "number" ? error.status : null
  const body =
    "body" in error && typeof error.body === "object" && error.body
      ? error.body
      : null
  const detail =
    body && "detail" in body && typeof body.detail === "string"
      ? body.detail
      : null

  return (
    status === 503 &&
    detail === "AWS AssumeRole access is not available right now."
  )
}

function highlightJson(json: string): React.ReactNode[] {
  const tokenRegex =
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  const tokens: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(json)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(json.slice(lastIndex, match.index))
    }

    const [value] = match
    const isKey = Boolean(match[2])
    let className = "text-amber-700 dark:text-amber-300"

    if (isKey) {
      className = "text-sky-700 dark:text-sky-300"
    } else if (value.startsWith('"')) {
      className = "text-emerald-700 dark:text-emerald-300"
    } else if (match[3]) {
      className = "text-violet-700 dark:text-violet-300"
    }

    tokens.push(
      <span key={`${match.index}-${value}`} className={className}>
        {value}
      </span>
    )
    lastIndex = match.index + value.length
  }

  if (lastIndex < json.length) {
    tokens.push(json.slice(lastIndex))
  }

  return tokens
}

function JsonSyntaxBlock({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    void copyToClipboard({
      value,
      message: "已复制信任策略。",
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative overflow-hidden rounded-md border bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 z-10 size-6"
        onClick={handleCopy}
        aria-label={"复制信任策略"}
      >
        {copied ? (
          <CheckCheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </Button>
      <pre className="overflow-x-auto p-3 pr-10 font-mono text-xs leading-relaxed text-foreground">
        <code>{highlightJson(value)}</code>
      </pre>
    </div>
  )
}

const validatePemField = (
  value: string | undefined,
  ctx: z.RefinementCtx,
  path: string[],
  requiredMessage: string,
  invalidMessage: string,
  regex: RegExp
) => {
  if (!value?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: requiredMessage,
    })
    return
  }
  if (!regex.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: invalidMessage,
    })
  }
}

const createSecretSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "名称不能为空。")
      .max(100, "名称不能超过 100 个字符。")
      .default(""),
    description: z.string().max(255).default(""),
    environment: z
      .string()
      .nullable()
      .transform((val) => val || "default"), // "default" if null or empty
    type: z.enum(["custom", "ssh_key", "mtls", "ca_cert"]).default("custom"),
    keys: z
      .array(
        z.object({
          key: z.string().optional(),
          value: z.string().optional(),
          isOptional: z.boolean().optional(),
        })
      )
      .default([]),
    private_key: z.string().optional(),
    tls_certificate: z.string().optional(),
    tls_private_key: z.string().optional(),
    ca_certificate: z.string().optional(),
    okta_auth_method: z.enum(["ssws", "bearer", "private_key"]).default("ssws"),
    okta_base_url: z.string().optional(),
    okta_api_token: z.string().optional(),
    okta_access_token: z.string().optional(),
    okta_service_token: z.string().optional(),
    okta_client_id: z.string().optional(),
    okta_scopes: z.string().optional(),
    okta_kid: z.string().optional(),
    okta_private_key: z.string().optional(),
    okta_dpop_enabled: z.boolean().default(false),
    okta_dpop_key_rotation_interval: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (isOktaCredential(values)) {
      if (
        values.okta_auth_method === "ssws" &&
        !values.okta_api_token?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["okta_api_token"],
          message: "Okta API 令牌不能为空。",
        })
      }
      if (
        values.okta_auth_method === "bearer" &&
        !values.okta_access_token?.trim() &&
        !values.okta_service_token?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["okta_access_token"],
          message: "访问令牌或服务令牌不能为空。",
        })
      }
      if (values.okta_auth_method === "private_key") {
        if (!values.okta_client_id?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["okta_client_id"],
            message: "客户端 ID 不能为空。",
          })
        }
        if (!values.okta_scopes?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["okta_scopes"],
            message: "权限范围不能为空。",
          })
        }
        if (!isValidOktaPrivateKey(values.okta_private_key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["okta_private_key"],
            message: "私钥必须是 PEM 块或 RSA 私钥 JWK（kty、n、e、d）。",
          })
        }

        const rotationInterval = values.okta_dpop_key_rotation_interval?.trim()
        if (values.okta_dpop_enabled && rotationInterval) {
          const seconds = Number(rotationInterval)
          if (!Number.isInteger(seconds)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["okta_dpop_key_rotation_interval"],
              message: "轮换间隔必须是整数。",
            })
          } else if (
            seconds < OKTA_MIN_DPOP_KEY_ROTATION_SECONDS ||
            seconds > OKTA_MAX_DPOP_KEY_ROTATION_SECONDS
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["okta_dpop_key_rotation_interval"],
              message: "轮换间隔必须在 3600 至 7776000 秒之间。",
            })
          }
        }
      }
    } else if (values.type === "custom") {
      if (!values.keys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keys"],
          message: "至少需要一个键。",
        })
      }
      values.keys.forEach((item, index) => {
        if (!item.key?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["keys", index, "key"],
            message: "键不能为空。",
          })
        }
        // Only validate value if it's not an optional field from a template
        // or if user has entered something
        if (!item.isOptional && !item.value?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["keys", index, "value"],
            message: "值不能为空。",
          })
        }
      })
    }

    if (values.type === "ssh_key") {
      validatePemField(
        values.private_key,
        ctx,
        ["private_key"],
        "SSH 私钥不能为空。",
        "SSH 私钥格式无效，必须包含 PEM 头尾标记。",
        sshKeyRegex
      )
    }

    if (values.type === "mtls") {
      validatePemField(
        values.tls_certificate,
        ctx,
        ["tls_certificate"],
        "TLS 证书不能为空。",
        "TLS 证书格式无效，必须包含 PEM 头尾标记。",
        pemCertificateRegex
      )
      validatePemField(
        values.tls_private_key,
        ctx,
        ["tls_private_key"],
        "TLS 私钥不能为空。",
        "TLS 私钥格式无效，必须包含 PEM 头尾标记。",
        sshKeyRegex
      )
    }

    if (values.type === "ca_cert") {
      validatePemField(
        values.ca_certificate,
        ctx,
        ["ca_certificate"],
        "CA 证书不能为空。",
        "CA 证书格式无效，必须包含 PEM 头尾标记。",
        pemCertificateRegex
      )
    }
  })

type CreateSecretForm = z.infer<typeof createSecretSchema>

interface CreateCredentialDialogProps extends DialogProps {
  template?: SecretDefinition | null
  onOpenChange: (open: boolean) => void
  className?: string
}

export function CreateCredentialDialog({
  template = null,
  open,
  onOpenChange,
  children,
  className,
}: CreateCredentialDialogProps) {
  const selectedTool = template
  const workspaceId = useWorkspaceId()
  const { createSecret } = useWorkspaceSecrets(workspaceId, {
    listEnabled: false,
  })
  const isAwsAssumeRoleTemplate = Boolean(
    selectedTool &&
      [
        ...(selectedTool.keys ?? []),
        ...(selectedTool.optional_keys ?? []),
      ].includes(AWS_ROLE_ARN_KEY)
  )
  const {
    awsAssumeRoleAccess,
    awsAssumeRoleAccessError,
    awsAssumeRoleAccessIsLoading,
  } = useAwsAssumeRoleAccess(workspaceId, {
    enabled: open && isAwsAssumeRoleTemplate,
  })

  // Form handling
  const methods = useForm<CreateSecretForm>({
    resolver: zodResolver(createSecretSchema),
    defaultValues: {
      name: "",
      description: "",
      environment: "",
      type: "custom",
      keys: [{ key: "", value: "" }],
      private_key: "",
      tls_certificate: "",
      tls_private_key: "",
      ca_certificate: "",
      okta_auth_method: "ssws",
      okta_base_url: "",
      okta_api_token: "",
      okta_access_token: "",
      okta_service_token: "",
      okta_client_id: "",
      okta_scopes: "",
      okta_kid: "",
      okta_private_key: "",
      okta_dpop_enabled: false,
      okta_dpop_key_rotation_interval: "",
    },
  })

  // Reset form when dialog opens
  React.useEffect(() => {
    if (!open) return
    if (selectedTool) {
      // Use the declared secret_type from the template definition, narrowed
      // to the form-supported subset (excludes github_app).
      const declaredType = selectedTool.secret_type ?? "custom"
      const formTypes = new Set<string>([
        "custom",
        "ssh_key",
        "mtls",
        "ca_cert",
      ])
      const effectiveType = (
        formTypes.has(declaredType) ? declaredType : "custom"
      ) as "custom" | "ssh_key" | "mtls" | "ca_cert"

      const initialKeys = [
        ...(selectedTool.keys || []).map((key) => ({
          key,
          value: "",
          isOptional: false,
        })),
        ...(selectedTool.optional_keys || []).map((key) => ({
          key,
          value: "",
          isOptional: true,
        })),
      ]

      methods.reset({
        name: selectedTool.name,
        description: "",
        environment: "default",
        type: effectiveType,
        keys: initialKeys.length > 0 ? initialKeys : [{ key: "", value: "" }],
        private_key: "",
        tls_certificate: "",
        tls_private_key: "",
        ca_certificate: "",
        okta_auth_method: "ssws",
        okta_base_url: "",
        okta_api_token: "",
        okta_access_token: "",
        okta_service_token: "",
        okta_client_id: "",
        okta_scopes: "",
        okta_kid: "",
        okta_private_key: "",
        okta_dpop_enabled: false,
        okta_dpop_key_rotation_interval: "",
      })
      return
    }
    methods.reset({
      name: "",
      description: "",
      environment: "",
      type: "custom",
      keys: [{ key: "", value: "" }],
      private_key: "",
      tls_certificate: "",
      tls_private_key: "",
      ca_certificate: "",
      okta_auth_method: "ssws",
      okta_base_url: "",
      okta_api_token: "",
      okta_access_token: "",
      okta_service_token: "",
      okta_client_id: "",
      okta_scopes: "",
      okta_kid: "",
      okta_private_key: "",
      okta_dpop_enabled: false,
      okta_dpop_key_rotation_interval: "",
    })
  }, [open, selectedTool, methods])

  const { hasEntitlement } = useEntitlements()
  // The store picker lists stores via a secret:read route.
  const canReadSecrets = useScopeCheck("secret:read") === true
  const externalSecretStoresEnabled =
    hasEntitlement("external_secret_stores") && canReadSecrets
  const credentialSourceId = React.useId()
  const [secretSource, setSecretSource] =
    React.useState<SecretSourceValue>(null)
  React.useEffect(() => {
    if (open) {
      setSecretSource(null)
    }
  }, [open])

  const { control, register } = methods
  const secretType = methods.watch("type")
  const isAwsReference =
    secretType === "custom" &&
    externalSecretStoresEnabled &&
    secretSource !== null
  const secretName = methods.watch("name")
  const isOktaCredentialForm = isOktaCredential({
    type: secretType,
    name: secretName,
  })
  const oktaAuthMethod = methods.watch("okta_auth_method")
  const oktaDpopEnabled = methods.watch("okta_dpop_enabled")
  const isTemplateSecret = Boolean(selectedTool)
  const roleArn =
    methods
      .watch("keys")
      .find((item) => item.key === AWS_ROLE_ARN_KEY)
      ?.value?.trim() ?? ""
  const awsTrustPolicy = awsAssumeRoleAccess
    ? buildAwsTrustPolicy({
        tracecatAwsPrincipalArn: awsAssumeRoleAccess.tracecat_aws_principal_arn,
        externalId: awsAssumeRoleAccess.external_id,
      })
    : ""
  const shouldHideAwsAssumeRoleNote = shouldSuppressAwsAssumeRoleError(
    awsAssumeRoleAccessError
  )
  const oktaPrivateKeyFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const oktaPrivateKeyReadIdRef = React.useRef(0)
  const [oktaPrivateKeyFileName, setOktaPrivateKeyFileName] = React.useState<
    string | null
  >(null)
  const [isOktaPrivateKeyDragOver, setIsOktaPrivateKeyDragOver] =
    React.useState(false)

  const resetOktaPrivateKeyFileInput = React.useCallback(() => {
    if (oktaPrivateKeyFileInputRef.current) {
      oktaPrivateKeyFileInputRef.current.value = ""
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      return
    }

    oktaPrivateKeyReadIdRef.current += 1
    setOktaPrivateKeyFileName(null)
    setIsOktaPrivateKeyDragOver(false)
    resetOktaPrivateKeyFileInput()
  }, [open, resetOktaPrivateKeyFileInput])

  const handleOktaPrivateKeyFile = React.useCallback(
    (file: File | undefined) => {
      if (!file) {
        return
      }

      const readId = oktaPrivateKeyReadIdRef.current + 1
      oktaPrivateKeyReadIdRef.current = readId

      if (!oktaPrivateKeyFileExtensionRegex.test(file.name)) {
        setOktaPrivateKeyFileName(null)
        methods.setValue("okta_private_key", "", {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        })
        methods.setError("okta_private_key", {
          type: "manual",
          message: "请上传 .pem 或 .json 文件。",
        })
        resetOktaPrivateKeyFileInput()
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        if (readId !== oktaPrivateKeyReadIdRef.current) {
          return
        }

        const privateKey =
          typeof reader.result === "string" ? reader.result : ""

        methods.clearErrors("okta_private_key")
        methods.setValue("okta_private_key", privateKey, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
        setOktaPrivateKeyFileName(file.name)
        resetOktaPrivateKeyFileInput()
      }
      reader.onerror = () => {
        if (readId !== oktaPrivateKeyReadIdRef.current) {
          return
        }

        setOktaPrivateKeyFileName(null)
        methods.setValue("okta_private_key", "", {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        })
        methods.setError("okta_private_key", {
          type: "manual",
          message: "读取上传的私钥文件失败。",
        })
        resetOktaPrivateKeyFileInput()
      }

      reader.readAsText(file)
    },
    [methods, resetOktaPrivateKeyFileInput]
  )

  const handleOktaPrivateKeyInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleOktaPrivateKeyFile(event.target.files?.[0])
    },
    [handleOktaPrivateKeyFile]
  )

  const handleOktaPrivateKeyDrop = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsOktaPrivateKeyDragOver(false)
      handleOktaPrivateKeyFile(event.dataTransfer.files?.[0])
      event.dataTransfer.clearData()
    },
    [handleOktaPrivateKeyFile]
  )

  const handleOktaPrivateKeyDragOver = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      setIsOktaPrivateKeyDragOver(true)
    },
    []
  )

  const handleOktaPrivateKeyDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      const relatedTarget = event.relatedTarget
      if (
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return
      }
      setIsOktaPrivateKeyDragOver(false)
    },
    []
  )

  const handleOktaPrivateKeyFileChoose = React.useCallback(() => {
    oktaPrivateKeyFileInputRef.current?.click()
  }, [])

  const renderTextareaField = (
    name: FieldPath<CreateSecretForm>,
    label: string,
    placeholder: string
  ) => (
    <FormField
      key={name}
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="text-sm">{label}</FormLabel>
          <FormControl>
            <Textarea
              className="h-36 text-sm"
              placeholder={placeholder}
              {...register(name)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const buildOktaSecretKeys = (values: CreateSecretForm) => {
    const keys: { key: string; value: string }[] = []
    const addKey = (key: string, value: string | undefined) => {
      const trimmed = value?.trim()
      if (trimmed) {
        keys.push({ key, value: trimmed })
      }
    }

    addKey("OKTA_BASE_URL", values.okta_base_url)

    switch (values.okta_auth_method) {
      case "ssws":
        addKey("OKTA_API_TOKEN", values.okta_api_token)
        break
      case "bearer":
        addKey("OKTA_ACCESS_TOKEN", values.okta_access_token)
        addKey("OKTA_SERVICE_TOKEN", values.okta_service_token)
        break
      case "private_key":
        addKey("OKTA_CLIENT_ID", values.okta_client_id)
        addKey("OKTA_SCOPES", values.okta_scopes)
        addKey("OKTA_KID", values.okta_kid)
        addKey("OKTA_PRIVATE_KEY", values.okta_private_key)
        if (values.okta_dpop_enabled) {
          keys.push({ key: "OKTA_DPOP_ENABLED", value: "true" })
          addKey(
            "OKTA_DPOP_KEY_ROTATION_INTERVAL",
            values.okta_dpop_key_rotation_interval
          )
        }
        break
    }

    return keys
  }

  const onSubmit = async (values: CreateSecretForm) => {
    const { private_key, tls_certificate, tls_private_key, ca_certificate } =
      values
    const { type, keys } = values
    const secretName = selectedTool?.name ?? values.name

    let secretKeys: { key: string; value: string }[] = []

    switch (type) {
      case "ssh_key":
        secretKeys = [{ key: "PRIVATE_KEY", value: private_key || "" }]
        break
      case "mtls":
        secretKeys = [
          { key: "TLS_CERTIFICATE", value: tls_certificate || "" },
          { key: "TLS_PRIVATE_KEY", value: tls_private_key || "" },
        ]
        break
      case "ca_cert":
        secretKeys = [{ key: "CA_CERTIFICATE", value: ca_certificate || "" }]
        break
      default:
        if (secretName === OKTA_SECRET_NAME) {
          secretKeys = buildOktaSecretKeys(values)
        } else {
          // Filter out optional keys with empty values
          secretKeys = keys
            .filter((k) => !k.isOptional || (k.value && k.value.trim() !== ""))
            .map(({ key, value }) => ({
              key: key || "",
              value: value || "",
            }))
        }
        break
    }

    if (type === "custom" && secretKeys.length === 0) {
      toast({
        title: "未提供键",
        description: "请至少提供一个键值。",
        variant: "destructive",
      })
      return
    }

    const secret: SecretCreate = {
      description: values.description,
      environment: values.environment,
      name: secretName,
      type,
      keys: secretKeys,
    }
    try {
      await createSecret(secret)
      onOpenChange(false)
      toast({
        title: "已创建密钥",
        description: `已成功创建密钥“${secretName}”。`,
      })
      methods.reset()
    } catch (error) {
      console.log(error)
    }
  }

  const onValidationFailed = () => {
    console.error("Form validation failed")
    toast({
      title: "表单校验失败",
      description: "添加新密钥时发生校验错误。",
    })
  }

  const inputKey = "keys"
  const typedKey = inputKey as FieldPath<CreateSecretForm>
  const { fields, append, remove } = useFieldArray<CreateSecretForm>({
    control,
    name: inputKey as ArrayPath<CreateSecretForm>,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent size="xl" className={className}>
        <DialogHeader>
          <DialogTitle>
            {selectedTool ? `配置 ${selectedTool.name}` : "创建凭据"}
          </DialogTitle>
        </DialogHeader>

        {(!isAwsReference ||
          (secretType === "custom" && externalSecretStoresEnabled)) && (
          <div className="shrink-0 space-y-3 border-b p-4">
            {!isAwsReference && <CreateSecretTooltip />}
            {secretType === "custom" && externalSecretStoresEnabled && (
              <div className="space-y-2">
                <Label htmlFor={credentialSourceId}>密钥来源</Label>
                <SecretSourcePicker
                  id={credentialSourceId}
                  workspaceId={workspaceId}
                  value={secretSource}
                  onChange={setSecretSource}
                />
              </div>
            )}
          </div>
        )}
        {isAwsReference ? (
          <AwsSecretReferenceForm
            storeId={secretSource ?? undefined}
            initialName={selectedTool?.name}
            initialKeys={[
              ...(selectedTool?.keys ?? []),
              ...(selectedTool?.optional_keys ?? []),
            ]}
            onSaved={() => onOpenChange(false)}
          />
        ) : (
          <Form {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit, onValidationFailed)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <DialogBody>
                <FormField
                  key="name"
                  control={control}
                  name="name"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm">名称</FormLabel>
                      {isTemplateSecret && (
                        <FormDescription className="text-sm">
                          此名称由所选模板固定。
                        </FormDescription>
                      )}
                      <FormControl>
                        <Input
                          className="text-sm"
                          placeholder={"名称（蛇形命名）"}
                          readOnly={isTemplateSecret}
                          aria-readonly={isTemplateSecret}
                          {...register("name")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  key="description"
                  control={control}
                  name="description"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm">描述</FormLabel>
                      <FormDescription className="text-sm">
                        此密钥的描述。
                      </FormDescription>
                      <FormControl>
                        <Input
                          className="text-sm"
                          placeholder={"描述"}
                          {...register("description")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  key="environment"
                  control={control}
                  name="environment"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm">环境</FormLabel>
                      <FormDescription className="text-sm">
                        工作流的目标执行环境。
                      </FormDescription>
                      <FormControl>
                        <Input
                          className="text-sm"
                          placeholder={"默认环境：“default”"}
                          {...register("environment")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!selectedTool && (
                  <FormField
                    key="type"
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">输入</FormLabel>
                        <FormDescription className="text-sm">
                          选择密钥存储方式。
                        </FormDescription>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder={"选择类型"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="custom">
                              <span className="flex items-center gap-2">
                                <Braces className="size-4" />
                                键值对
                              </span>
                            </SelectItem>
                            <SelectItem value="ssh_key">
                              <span className="flex items-center gap-2">
                                <FileKey2 className="size-4" />
                                SSH 私钥
                              </span>
                            </SelectItem>
                            <SelectItem value="mtls">
                              <span className="flex items-center gap-2">
                                <KeyRoundIcon className="size-4" />
                                mTLS 证书 + 密钥
                              </span>
                            </SelectItem>
                            <SelectItem value="ca_cert">
                              <span className="flex items-center gap-2">
                                <ShieldCheck className="size-4" />
                                CA 证书
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {secretType === "custom" && isOktaCredentialForm && (
                  <div className="space-y-4">
                    <FormField
                      key="okta_auth_method"
                      control={control}
                      name="okta_auth_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            身份验证方式
                          </FormLabel>
                          <Select
                            onValueChange={(value) => {
                              const authMethod = value as OktaAuthMethod
                              field.onChange(authMethod)
                              methods.clearErrors([
                                "okta_api_token",
                                "okta_access_token",
                                "okta_service_token",
                                "okta_client_id",
                                "okta_scopes",
                                "okta_private_key",
                                "okta_dpop_key_rotation_interval",
                              ])
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder={"选择身份验证方式"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {oktaAuthMethodOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      key="okta_base_url"
                      control={control}
                      name="okta_base_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">组织 URL</FormLabel>
                          <FormControl>
                            <Input
                              className="text-sm"
                              placeholder="https://dev-123456.okta.com"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-sm">
                            动作已传入组织 URL 时可留空。
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {oktaAuthMethod === "ssws" && (
                      <FormField
                        key="okta_api_token"
                        control={control}
                        name="okta_api_token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">API 令牌</FormLabel>
                            <FormControl>
                              <Input
                                className="text-sm"
                                placeholder={"Okta SSWS API 令牌"}
                                type="password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {oktaAuthMethod === "bearer" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          key="okta_access_token"
                          control={control}
                          name="okta_access_token"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                访问令牌
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="text-sm"
                                  placeholder={"OAuth 访问令牌"}
                                  type="password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          key="okta_service_token"
                          control={control}
                          name="okta_service_token"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                服务令牌
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="text-sm"
                                  placeholder={"OAuth 服务令牌"}
                                  type="password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {oktaAuthMethod === "private_key" && (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            key="okta_client_id"
                            control={control}
                            name="okta_client_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">
                                  客户端 ID
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="text-sm"
                                    placeholder={"Okta OAuth 客户端 ID"}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            key="okta_scopes"
                            control={control}
                            name="okta_scopes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm">
                                  权限范围
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="text-sm"
                                    placeholder="okta.users.read okta.groups.read"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription className="text-sm">
                                  以空格或逗号分隔。
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          key="okta_kid"
                          control={control}
                          name="okta_kid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">密钥 ID</FormLabel>
                              <FormControl>
                                <Input
                                  className="text-sm"
                                  placeholder={"可选的 JWK 密钥 ID"}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          key="okta_dpop_enabled"
                          control={control}
                          name="okta_dpop_enabled"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <FormLabel className="text-sm">
                                    DPoP
                                  </FormLabel>
                                  <FormDescription className="text-sm">
                                    启用持有证明令牌。
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked)
                                      if (!checked) {
                                        methods.clearErrors(
                                          "okta_dpop_key_rotation_interval"
                                        )
                                      }
                                    }}
                                  />
                                </FormControl>
                              </div>
                              {oktaDpopEnabled && (
                                <FormField
                                  key="okta_dpop_key_rotation_interval"
                                  control={control}
                                  name="okta_dpop_key_rotation_interval"
                                  render={({ field: intervalField }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">
                                        密钥轮换间隔
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          className="text-sm"
                                          inputMode="numeric"
                                          placeholder="86400"
                                          {...intervalField}
                                        />
                                      </FormControl>
                                      <FormDescription className="text-sm">
                                        秒数，可选；SDK 默认为 86400。
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </FormItem>
                          )}
                        />

                        <FormField
                          key="okta_private_key"
                          control={control}
                          name="okta_private_key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">私钥</FormLabel>
                              <input
                                ref={oktaPrivateKeyFileInputRef}
                                type="file"
                                accept=".pem,.json,application/json"
                                className="hidden"
                                onChange={handleOktaPrivateKeyInputChange}
                              />
                              <div
                                onDrop={handleOktaPrivateKeyDrop}
                                onDragEnter={handleOktaPrivateKeyDragOver}
                                onDragOver={handleOktaPrivateKeyDragOver}
                                onDragLeave={handleOktaPrivateKeyDragLeave}
                                className={cn(
                                  "rounded-md transition-colors",
                                  isOktaPrivateKeyDragOver &&
                                    "ring-1 ring-inset ring-ring"
                                )}
                              >
                                <FormControl>
                                  <Textarea
                                    className="h-36 font-mono text-xs"
                                    placeholder="-----BEGIN PRIVATE KEY-----"
                                    {...field}
                                    onChange={(event) => {
                                      oktaPrivateKeyReadIdRef.current += 1
                                      setOktaPrivateKeyFileName(null)
                                      methods.clearErrors("okta_private_key")
                                      field.onChange(event)
                                    }}
                                  />
                                </FormControl>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <FormDescription className="text-sm">
                                  粘贴 PEM 或 JWK JSON，或将 .pem/.json
                                  文件拖入此字段。
                                </FormDescription>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleOktaPrivateKeyFileChoose}
                                >
                                  <UploadCloudIcon className="mr-2 size-4" />
                                  {oktaPrivateKeyFileName
                                    ? "替换文件"
                                    : "上传文件"}
                                </Button>
                              </div>
                              {oktaPrivateKeyFileName && (
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileTextIcon className="size-3.5" />
                                  {oktaPrivateKeyFileName}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}

                {secretType === "custom" && !isOktaCredentialForm && (
                  <FormField
                    key={inputKey}
                    control={control}
                    name={typedKey}
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-sm">键</FormLabel>
                        {isAwsAssumeRoleTemplate && (
                          <div className="space-y-3">
                            {awsAssumeRoleAccess ? (
                              <>
                                <Alert>
                                  <InfoIcon className="size-4" />
                                  <AlertTitle className="text-xs">
                                    跨角色 AWS 访问
                                  </AlertTitle>
                                  <AlertDescription className="space-y-3 text-xs">
                                    <p>
                                      设置 <code>AWS_ROLE_ARN</code> 为目标 AWS
                                      账号中的角色。Tracecat 使用下方主体和外部
                                      ID 代入该角色。{" "}
                                      <code>AWS_ROLE_SESSION_NAME</code>{" "}
                                      不会使用，请勿添加。
                                    </p>
                                    <dl className="grid gap-2 md:grid-cols-[140px_1fr]">
                                      <dt className="text-muted-foreground">
                                        Tracecat 账号
                                      </dt>
                                      <dd className="break-all font-mono text-foreground">
                                        {
                                          awsAssumeRoleAccess.tracecat_aws_account_id
                                        }
                                      </dd>
                                      <dt className="text-muted-foreground">
                                        主体 ARN
                                      </dt>
                                      <dd className="break-all font-mono text-foreground">
                                        {
                                          awsAssumeRoleAccess.tracecat_aws_principal_arn
                                        }
                                      </dd>
                                      <dt className="text-muted-foreground">
                                        外部 ID
                                      </dt>
                                      <dd className="break-all font-mono text-foreground">
                                        {awsAssumeRoleAccess.external_id}
                                      </dd>
                                      <dt className="text-muted-foreground">
                                        目标角色
                                      </dt>
                                      <dd className="break-all font-mono text-foreground">
                                        {roleArn || "在下方粘贴 AWS_ROLE_ARN"}
                                      </dd>
                                    </dl>
                                  </AlertDescription>
                                </Alert>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">
                                    信任策略
                                  </Label>
                                  <JsonSyntaxBlock value={awsTrustPolicy} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  在第三方账号中创建角色，添加上述信任策略，再将角色
                                  ARN 粘贴到 <code>AWS_ROLE_ARN</code>.
                                </p>
                              </>
                            ) : awsAssumeRoleAccessIsLoading ? (
                              <p className="text-xs text-muted-foreground">
                                正在加载 AWS 角色访问详情…
                              </p>
                            ) : shouldHideAwsAssumeRoleNote ? null : (
                              <p className="text-xs text-destructive">
                                {awsAssumeRoleAccessError?.message ||
                                  "无法加载 AWS 角色访问详情。"}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col space-y-2">
                          {fields.map((field, index) => {
                            const isTemplateKey = Boolean(
                              selectedTool &&
                                (selectedTool.keys?.includes(field.key || "") ||
                                  selectedTool.optional_keys?.includes(
                                    field.key || ""
                                  ))
                            )
                            const keyRegistration = register(
                              `${inputKey}.${index}.key` as const,
                              {
                                required: true,
                              }
                            )
                            const valueRow = (
                              <div className="flex w-full items-center gap-2">
                                {!isTemplateKey && (
                                  <FormControl className="flex-1">
                                    <Input
                                      id={`key-${index}`}
                                      className="text-sm"
                                      {...keyRegistration}
                                      placeholder={"键"}
                                    />
                                  </FormControl>
                                )}
                                <FormControl className="flex-1">
                                  <Input
                                    id={`value-${index}`}
                                    className="text-sm"
                                    {...register(
                                      `${inputKey}.${index}.value` as const,
                                      {
                                        required: !field.isOptional,
                                      }
                                    )}
                                    placeholder={
                                      field.isOptional ? "值（可选）" : "值"
                                    }
                                    type="password"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => remove(index)}
                                  disabled={
                                    isTemplateKey ||
                                    (!selectedTool && fields.length === 1)
                                  }
                                >
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              </div>
                            )
                            if (!isTemplateKey) {
                              return (
                                <div key={`${field.id}.${index}`}>
                                  {valueRow}
                                </div>
                              )
                            }
                            return (
                              <div
                                key={`${field.id}.${index}`}
                                className="flex w-full flex-col gap-1.5"
                              >
                                <Label
                                  htmlFor={`value-${index}`}
                                  className="break-all font-mono text-xs text-muted-foreground"
                                >
                                  {field.key}
                                </Label>
                                <input type="hidden" {...keyRegistration} />
                                {valueRow}
                              </div>
                            )
                          })}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ key: "", value: "" })}
                            className="space-x-2 text-xs"
                          >
                            <PlusCircle className="mr-2 size-4" />
                            添加条目
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {secretType === "ssh_key" && (
                  <SshPrivateKeyField
                    control={control}
                    register={register}
                    name="private_key"
                  />
                )}
                {secretType === "mtls" && (
                  <>
                    {renderTextareaField(
                      "tls_certificate",
                      "TLS 证书",
                      "-----BEGIN CERTIFICATE-----"
                    )}
                    {renderTextareaField(
                      "tls_private_key",
                      "TLS 私钥",
                      "-----BEGIN PRIVATE KEY-----"
                    )}
                  </>
                )}
                {secretType === "ca_cert" &&
                  renderTextareaField(
                    "ca_certificate",
                    "CA 证书",
                    "-----BEGIN CERTIFICATE-----"
                  )}
              </DialogBody>
              <DialogFooter>
                <Button size="sm" type="submit">
                  <KeyRoundIcon className="mr-2 size-4" />
                  创建凭据
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
