"use client"

import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { AgentPresetRead } from "@/client"
import { CopyButton } from "@/components/copy-button"
import { ProviderIcon } from "@/components/icons"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
  useAgentChannelTokens,
  useCreateAgentChannelToken,
  useDeleteAgentChannelToken,
  useRotateAgentChannelToken,
  useStartSlackOAuth,
} from "@/hooks"
import { useEntitlements } from "@/hooks/use-entitlements"
import { copyToClipboard } from "@/lib/utils"

type SetupMethod = "existing" | "new"
type DialogStage = "choose" | "guide" | "connect"
const PROVISIONAL_BOT_TOKEN = "__tracecat_pending_bot_token__"
const PROVISIONAL_SIGNING_SECRET_PREFIX = "__tracecat_pending_signing_secret__"
type SlackChannelConfig = {
  slack_bot_token: string
  slack_signing_secret: string
  slack_client_id?: string | null
  slack_client_secret?: string | null
}

export function buildSlackManifest({
  endpointUrl,
  oauthRedirectUrl,
  appName,
  includeEventSubscriptions,
}: {
  endpointUrl: string
  oauthRedirectUrl: string
  appName: string
  includeEventSubscriptions: boolean
}): Record<string, unknown> {
  const settings: Record<string, unknown> = {
    interactivity: includeEventSubscriptions
      ? { is_enabled: true, request_url: endpointUrl }
      : { is_enabled: false },
    org_deploy_enabled: false,
    socket_mode_enabled: false,
    token_rotation_enabled: false,
  }
  if (includeEventSubscriptions) {
    settings.event_subscriptions = {
      request_url: endpointUrl,
      bot_events: ["app_mention"],
    }
  }

  return {
    display_information: {
      name: appName,
      description: "Tracecat 外部渠道智能体",
      background_color: "#111827",
    },
    features: {
      app_home: {
        home_tab_enabled: false,
        messages_tab_enabled: true,
        messages_tab_read_only_enabled: true,
      },
      bot_user: {
        display_name: appName,
        always_online: true,
      },
    },
    oauth_config: {
      scopes: {
        bot: [
          "app_mentions:read",
          "channels:history",
          "chat:write",
          "chat:write.customize",
          "groups:history",
          "im:history",
          "mpim:history",
          "reactions:read",
          "reactions:write",
          "users:read",
          "users:read.email",
        ],
      },
      redirect_urls: [oauthRedirectUrl],
    },
    settings,
  }
}

function buildSlackOAuthRedirectUrlFromEndpoint(endpointUrl: string): string {
  const marker = "/agent/channels/slack/"
  const markerIndex = endpointUrl.indexOf(marker)
  if (markerIndex === -1) {
    return endpointUrl
  }
  const base = endpointUrl.slice(0, markerIndex)
  return `${base}${marker}oauth/callback`
}

function SetupListItem({
  index,
  title,
  description,
  action,
}: {
  index: number
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded border px-3 py-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
        {index}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function SlackChannelPanel({
  workspaceId,
  preset,
}: {
  workspaceId: string
  preset: AgentPresetRead | null
}) {
  const { hasEntitlement, isLoading: isLoadingEntitlements } = useEntitlements()
  const channelsEnabled = hasEntitlement("agent_channels")

  if (isLoadingEntitlements) {
    return <CenteredSpinner />
  }

  if (!channelsEnabled) {
    return (
      <div className="size-full p-6">
        <Alert>
          <AlertTitle>仅限企业版</AlertTitle>
          <AlertDescription>智能体渠道需要相应的功能权益。</AlertDescription>
        </Alert>
      </div>
    )
  }

  const { tokens, tokensIsLoading, tokensError } = useAgentChannelTokens(
    workspaceId,
    {
      enabled: Boolean(preset?.id),
      agentPresetId: preset?.id,
      channelType: "slack",
    }
  )

  const { createChannelToken, createChannelTokenIsPending } =
    useCreateAgentChannelToken(workspaceId)
  const { rotateChannelToken, rotateChannelTokenIsPending } =
    useRotateAgentChannelToken(workspaceId)
  const { deleteChannelToken, deleteChannelTokenIsPending } =
    useDeleteAgentChannelToken(workspaceId)
  const { startSlackOAuth, startSlackOAuthIsPending } =
    useStartSlackOAuth(workspaceId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogStage, setDialogStage] = useState<DialogStage>("choose")
  const [setupMethod, setSetupMethod] = useState<SetupMethod | null>(null)
  const [slackClientId, setSlackClientId] = useState("")
  const [slackClientSecret, setSlackClientSecret] = useState("")
  const [slackSigningSecret, setSlackSigningSecret] = useState("")
  const [provisionedTokenId, setProvisionedTokenId] = useState<string | null>(
    null
  )
  const [provisionedEndpointUrl, setProvisionedEndpointUrl] = useState("")

  const token = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return null
    }
    const activeToken = tokens.find((item) => item.is_active)
    return activeToken ?? tokens[0]
  }, [tokens])

  const tokenId = token?.id ?? provisionedTokenId
  const endpointUrl = token?.endpoint_url ?? provisionedEndpointUrl
  const tokenConfig = token?.config as SlackChannelConfig | undefined
  const oauthRedirectUrl = useMemo(() => {
    if (!endpointUrl) {
      return ""
    }
    return buildSlackOAuthRedirectUrlFromEndpoint(endpointUrl)
  }, [endpointUrl])
  const manifestText = useMemo(() => {
    if (!endpointUrl) {
      return ""
    }
    return JSON.stringify(
      buildSlackManifest({
        endpointUrl,
        oauthRedirectUrl,
        appName: preset?.name ?? "Tracecat",
        includeEventSubscriptions: true,
      }),
      null,
      2
    )
  }, [endpointUrl, oauthRedirectUrl, preset?.name, setupMethod])

  const isBusy =
    createChannelTokenIsPending ||
    rotateChannelTokenIsPending ||
    deleteChannelTokenIsPending ||
    startSlackOAuthIsPending

  useEffect(() => {
    if (!token) {
      setSlackClientId("")
      setSlackClientSecret("")
      setSlackSigningSecret("")
      return
    }
    setProvisionedTokenId(null)
    setProvisionedEndpointUrl("")
    setSlackClientId(tokenConfig?.slack_client_id ?? "")
    setSlackClientSecret(tokenConfig?.slack_client_secret ?? "")
    const signingSecretValue = tokenConfig?.slack_signing_secret.startsWith(
      PROVISIONAL_SIGNING_SECRET_PREFIX
    )
      ? ""
      : (tokenConfig?.slack_signing_secret ?? "")
    setSlackSigningSecret(signingSecretValue)
  }, [token, tokenConfig])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    const url = new URL(window.location.href)
    const slackConnectStatus = url.searchParams.get("slack_connect")
    if (!slackConnectStatus) {
      return
    }
    const message = url.searchParams.get("slack_message")
    if (slackConnectStatus === "success") {
      toast({
        title: "Slack 应用已连接",
        description: "渠道令牌现已生效。",
      })
    } else {
      toast({
        title: "连接 Slack 应用失败",
        description: message || "无法完成 Slack OAuth 流程。",
        variant: "destructive",
      })
    }
    url.searchParams.delete("slack_connect")
    url.searchParams.delete("slack_message")
    window.history.replaceState({}, "", url.toString())
  }, [])

  if (!preset) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
        请先保存智能体预设，再配置外部渠道。
      </div>
    )
  }

  if (tokensIsLoading) {
    return <CenteredSpinner />
  }

  if (tokensError) {
    const detail =
      typeof tokensError.body?.detail === "string"
        ? tokensError.body.detail
        : tokensError.message
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>无法加载渠道设置</AlertTitle>
          <AlertDescription>{detail}</AlertDescription>
        </Alert>
      </div>
    )
  }

  async function handleConnectToSlack(): Promise<void> {
    const presetId = preset?.id
    if (!presetId) {
      return
    }
    const clientId = slackClientId.trim()
    const clientSecret = slackClientSecret.trim()
    const signingSecret = slackSigningSecret.trim()
    if (!clientId || !clientSecret || !signingSecret) {
      toast({
        title: "缺少必填字段",
        description: "客户端 ID、客户端密钥和签名密钥不能为空。",
        variant: "destructive",
      })
      return
    }
    if (typeof window === "undefined") {
      return
    }
    try {
      const response = await startSlackOAuth({
        tokenId: tokenId ?? undefined,
        agentPresetId: presetId,
        clientId,
        clientSecret,
        signingSecret,
        returnUrl: window.location.href,
      })
      window.location.assign(response.authorization_url)
    } catch {
      return
    }
  }

  async function handleRotate(): Promise<void> {
    if (!token) {
      return
    }
    try {
      await rotateChannelToken({ tokenId: token.id })
    } catch {
      return
    }
  }

  async function handleDelete(): Promise<void> {
    if (!token) {
      return
    }
    try {
      await deleteChannelToken({ tokenId: token.id })
      setProvisionedTokenId(null)
      setProvisionedEndpointUrl("")
    } catch {
      return
    }
  }

  function handleCopyManifest(): void {
    if (!manifestText) {
      return
    }
    void copyToClipboard({
      value: manifestText,
      message: "已复制 Slack 应用清单",
    })
  }

  function resetDialogState(): void {
    setDialogStage("choose")
    setSetupMethod(null)
  }

  async function handleNextFromDialog(): Promise<void> {
    if (dialogStage === "guide") {
      setDialogStage("connect")
      return
    }

    await handleConnectToSlack()
  }

  async function handleSelectMethod(method: SetupMethod): Promise<void> {
    setSetupMethod(method)
    const presetId = preset?.id
    if (!presetId) {
      return
    }
    if (tokenId) {
      setDialogStage(method === "new" ? "guide" : "connect")
      return
    }

    try {
      const createdToken = await createChannelToken({
        agent_preset_id: presetId,
        channel_type: "slack",
        config: {
          slack_bot_token: PROVISIONAL_BOT_TOKEN,
          slack_signing_secret: `${PROVISIONAL_SIGNING_SECRET_PREFIX}${crypto.randomUUID()}`,
        },
        is_active: false,
      })
      setProvisionedTokenId(createdToken.id)
      setProvisionedEndpointUrl(createdToken.endpoint_url)
      setDialogStage(method === "new" ? "guide" : "connect")
    } catch {
      return
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 px-4 pt-4 pb-16">
        <div className="rounded border">
          <div className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded border bg-muted/30">
              <ProviderIcon providerId="slack" className="size-7 p-0.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">自定义 Slack 应用</p>
              <p className="text-xs text-muted-foreground">
                处理 `app_mention` 事件并在线程中回复。
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
              {token ? "管理" : "连接"}
            </Button>
          </div>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              resetDialogState()
            }
          }}
        >
          <DialogContent size="lg" className="max-w-xl">
            <DialogHeader>
              <DialogTitle
                className={
                  dialogStage === "choose"
                    ? "text-xl font-semibold tracking-tight leading-tight"
                    : ""
                }
              >
                {dialogStage === "choose"
                  ? "你希望如何将 Slack 应用连接到此智能体？"
                  : "设置指南"}
              </DialogTitle>
              {dialogStage === "guide" ? (
                <DialogDescription>
                  按照以下步骤创建 Slack 应用。
                </DialogDescription>
              ) : null}
              {dialogStage === "connect" ? (
                <DialogDescription>
                  输入 Slack 应用凭据以开始 OAuth 安装。
                </DialogDescription>
              ) : null}
            </DialogHeader>
            <DialogBody>
              {dialogStage === "choose" ? (
                <div className="space-y-5">
                  <button
                    type="button"
                    className="group flex w-full items-center gap-4 rounded-lg border px-4 py-4 text-left transition-colors hover:bg-muted/20"
                    disabled={isBusy}
                    onClick={() => void handleSelectMethod("new")}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/20">
                      <Plus className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium tracking-tight">
                        创建应用
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        使用预填清单创建 Slack 应用
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      选择
                    </span>
                  </button>

                  <button
                    type="button"
                    className="group flex w-full items-center gap-4 rounded-lg border px-4 py-4 text-left transition-colors hover:bg-muted/20"
                    disabled={isBusy}
                    onClick={() => void handleSelectMethod("existing")}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/20">
                      <ArrowLeftRight className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium tracking-tight">
                        现有应用
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        将现有 Slack 应用连接到此智能体
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      选择
                    </span>
                  </button>
                </div>
              ) : null}

              {dialogStage === "guide" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      在 Tracecat 中
                    </p>
                    <SetupListItem
                      index={1}
                      title={"导出应用清单"}
                      description={"复制为此智能体预设生成的清单。"}
                      action={
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopyManifest}
                          disabled={!manifestText}
                        >
                          复制
                        </Button>
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      在 Slack 中
                    </p>
                    <SetupListItem
                      index={2}
                      title={"从清单创建应用"}
                      description={
                        "打开 Slack Apps，选择 Create New App，再选择 From an app manifest。"
                      }
                      action={
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href="https://api.slack.com/apps"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="mr-2 size-4" />
                            打开
                          </a>
                        </Button>
                      }
                    />
                    <SetupListItem
                      index={3}
                      title={"安装应用"}
                      description={
                        "将应用安装到工作空间。在 Tracecat 中连接应用凭据后，再添加事件订阅。"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      返回 Tracecat
                    </p>
                    <SetupListItem
                      index={4}
                      title={"点击“下一步”继续"}
                      description={"继续连接客户端 ID、客户端密钥和签名密钥。"}
                    />
                  </div>
                </div>
              ) : null}

              {dialogStage === "connect" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">端点 URL</label>
                    <Input
                      readOnly
                      value={endpointUrl}
                      placeholder={"初次连接后显示"}
                    />
                    {endpointUrl ? (
                      <CopyButton
                        value={endpointUrl}
                        toastMessage="已复制端点 URL"
                        tooltipMessage="复制端点 URL"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      OAuth 重定向 URL
                    </label>
                    <Input
                      readOnly
                      value={oauthRedirectUrl}
                      placeholder={"初次连接后显示"}
                    />
                    {oauthRedirectUrl ? (
                      <CopyButton
                        value={oauthRedirectUrl}
                        toastMessage="已复制 OAuth 重定向 URL"
                        tooltipMessage="复制 OAuth 重定向 URL"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">客户端 ID</label>
                    <Input
                      value={slackClientId}
                      onChange={(event) => setSlackClientId(event.target.value)}
                      disabled={isBusy}
                      placeholder="1234567890.1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">客户端密钥</label>
                    <Input
                      type="password"
                      value={slackClientSecret}
                      onChange={(event) =>
                        setSlackClientSecret(event.target.value)
                      }
                      disabled={isBusy}
                      placeholder={"Slack 应用客户端密钥"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">签名密钥</label>
                    <Input
                      type="password"
                      value={slackSigningSecret}
                      onChange={(event) =>
                        setSlackSigningSecret(event.target.value)
                      }
                      disabled={isBusy}
                      placeholder={"Slack 签名密钥"}
                    />
                  </div>
                  {token ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleRotate()}
                        disabled={isBusy}
                      >
                        <RefreshCw className="mr-2 size-4" />
                        轮换端点
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDelete()}
                        disabled={isBusy}
                      >
                        断开连接
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {dialogStage !== "choose" ? (
                <>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (dialogStage === "guide") {
                          setDialogStage("choose")
                          return
                        }
                        if (dialogStage === "connect") {
                          setDialogStage(
                            setupMethod === "new" ? "guide" : "choose"
                          )
                        }
                      }}
                    >
                      <ArrowLeft className="mr-2 size-4" />
                      返回
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleNextFromDialog()}
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      {dialogStage === "connect" ? "连接 Slack" : "下一页"}
                    </Button>
                  </div>
                </>
              ) : null}
            </DialogBody>
          </DialogContent>
        </Dialog>

        {token?.is_active ? (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle2 className="size-4" />
            Slack 集成已连接。
          </div>
        ) : null}
      </div>
    </ScrollArea>
  )
}
