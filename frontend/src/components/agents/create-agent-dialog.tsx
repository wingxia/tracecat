"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import z from "zod"
import { Spinner } from "@/components/loading/spinner"
import { useSettingsModal } from "@/components/settings/settings-modal-context"
import { Button } from "@/components/ui/button"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateAgentPreset,
  useMoveAgentPreset,
} from "@/hooks/use-agent-presets"
import { useEntitlements } from "@/hooks/use-entitlements"
import { uniqueAgentPresetName } from "@/lib/agent-preset-name"
import { useUserScopes, useWorkspaceAgentModels } from "@/lib/hooks"
import { hasGrantedScope } from "@/lib/scopes"
import { useWorkspaceId } from "@/providers/workspace-id"

const createAgentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "名称不能为空")
    .max(120, "名称不能超过 120 个字符"),
  description: z.string().max(1000).optional(),
})

type CreateAgentFormValues = z.infer<typeof createAgentSchema>

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath?: string | null
  /** Installed library skills to bind to the new agent. */
  librarySkills?: string[]
  /** Prefilled agent name. */
  defaultName?: string
  /** When set, a taken name is numbered instead of rejected. */
  takenSlugs?: string[]
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  currentPath,
  librarySkills,
  defaultName,
  takenSlugs,
}: CreateAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CreateAgentDialogContent
          currentPath={currentPath}
          onOpenChange={onOpenChange}
          librarySkills={librarySkills}
          defaultName={defaultName}
          takenSlugs={takenSlugs}
        />
      ) : null}
    </Dialog>
  )
}

function CreateAgentDialogContent({
  currentPath,
  onOpenChange,
  librarySkills,
  defaultName,
  takenSlugs,
}: {
  currentPath?: string | null
  onOpenChange: (open: boolean) => void
  librarySkills?: string[]
  defaultName?: string
  takenSlugs?: string[]
}) {
  const workspaceId = useWorkspaceId()
  const router = useRouter()
  const { setOpen: setSettingsOpen, setActiveSection } = useSettingsModal()
  const { userScopes } = useUserScopes()
  const canAdministerOrg = hasGrantedScope(
    "org:update",
    new Set(userScopes?.scopes ?? [])
  )
  const { userScopes: workspaceScopes } = useUserScopes(workspaceId)
  const canAdministerWorkspace = hasGrantedScope(
    "workspace:update",
    new Set(workspaceScopes?.scopes ?? [])
  )
  const {
    models,
    defaultCatalogId,
    hasOrgDefault,
    modelsLoading,
    modelsError,
  } = useWorkspaceAgentModels(workspaceId)
  const { createAgentPreset, createAgentPresetIsPending } =
    useCreateAgentPreset(workspaceId)
  const { moveAgentPreset, moveAgentPresetIsPending } =
    useMoveAgentPreset(workspaceId)
  const { hasEntitlement } = useEntitlements()
  const foldersEnabled = hasEntitlement("agent_addons")

  const initialAgentModel = useMemo(() => {
    // The server resolves legacy settings and workspace access; null means no usable default.
    if (!models || !defaultCatalogId) return null
    return models.find((model) => model.id === defaultCatalogId) ?? null
  }, [defaultCatalogId, models])

  const methods = useForm<CreateAgentFormValues>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: defaultName ?? "",
      description: "",
    },
  })

  const handleSubmit = async (values: CreateAgentFormValues) => {
    if (!initialAgentModel) {
      return
    }

    try {
      const preset = await createAgentPreset({
        name: takenSlugs
          ? uniqueAgentPresetName(values.name, takenSlugs)
          : values.name,
        model_provider: initialAgentModel.model_provider,
        model_name: initialAgentModel.model_name,
        catalog_id: initialAgentModel.id,
        base_url: initialAgentModel.custom_provider_base_url ?? undefined,
        description: values.description || undefined,
        library_skills: librarySkills?.length ? librarySkills : undefined,
      })
      const targetFolderPath =
        foldersEnabled && currentPath && currentPath !== "/"
          ? currentPath
          : null
      if (targetFolderPath) {
        try {
          await moveAgentPreset({
            presetId: preset.id,
            folder_path: targetFolderPath,
          })
        } catch {
          // Move hook already toasts; continue to open the created preset.
        }
      }
      methods.reset()
      onOpenChange(false)
      router.push(`/workspaces/${workspaceId}/agents/${preset.id}`)
    } catch (error) {
      console.error("Failed to create agent:", error)
    }
  }

  if (modelsError) {
    return (
      <DialogContent size="sm" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>无法加载模型</DialogTitle>
          <DialogDescription>
            无法加载此工作空间可用的模型，请稍后重试。
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    )
  }

  if (modelsLoading || !models) {
    return (
      <DialogContent size="sm" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>正在加载模型</DialogTitle>
          <DialogDescription>正在加载此工作空间可用的模型。</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex justify-center py-4" aria-label={"正在加载模型"}>
            <Spinner className="size-6" />
          </div>
        </DialogBody>
      </DialogContent>
    )
  }

  if (!initialAgentModel) {
    // A legacy name may remain after its model is disabled organization-wide.
    let description: string
    if (hasOrgDefault) {
      description = canAdministerWorkspace
        ? "此工作空间未启用组织默认模型。请在工作空间的 AI 模型设置中启用后再创建智能体。"
        : "此工作空间未启用组织默认模型。请联系工作空间管理员启用后再创建智能体。"
    } else {
      description = canAdministerOrg
        ? "请先在组织设置中选择默认模型，再创建智能体。"
        : "请先联系组织管理员配置默认模型，再创建智能体。"
    }

    return (
      <DialogContent size="sm" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {hasOrgDefault ? "启用默认模型" : "设置模型提供商"}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {hasOrgDefault && canAdministerWorkspace ? (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setActiveSection("workspace-models")
                setSettingsOpen(true)
              }}
            >
              配置工作空间模型
            </Button>
          </DialogFooter>
        ) : null}
        {!hasOrgDefault && canAdministerOrg ? (
          <DialogFooter>
            <Button asChild variant="outline">
              <Link
                href="/organization/settings/agent"
                onClick={() => onOpenChange(false)}
              >
                配置模型
              </Link>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    )
  }

  return (
    <DialogContent size="lg" className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>创建智能体</DialogTitle>
        <DialogDescription>
          为智能体填写名称和可选描述。创建后可以更改模型。
          {librarySkills?.length
            ? ` 初始已关联 ${librarySkills.join(", ")}。`
            : null}
        </DialogDescription>
      </DialogHeader>
      <Form {...methods}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={methods.handleSubmit(handleSubmit)}
        >
          <DialogBody>
            <FormField
              control={methods.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">名称</FormLabel>
                  <FormControl>
                    <Input
                      className="text-sm"
                      placeholder={"我的智能体"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={methods.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">
                    描述 <span className="text-muted-foreground">（可选）</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[60px] resize-none text-sm"
                      placeholder={"此智能体的用途是什么？"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              type="submit"
              disabled={
                createAgentPresetIsPending ||
                moveAgentPresetIsPending ||
                modelsLoading
              }
            >
              创建智能体
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
