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
import { type SlackChannelConnection, useSlackChannelConnection } from "@/hooks"
import { useEntitlements } from "@/hooks/use-entitlements"
import { getApiErrorDetail } from "@/lib/errors"
import { copyToClipboard } from "@/lib/utils"

type SetupMethod = "existing" | "new"
type DialogStage = "choose" | "guide" | "connect"

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
      description: "Tracecat external channel agent",
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
          <AlertTitle>Enterprise only</AlertTitle>
          <AlertDescription>
            Agent channels require the agent channels entitlement.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const {
    connection,
    isLoading,
    error,
    isBusy,
    provision,
    rotate,
    disconnect,
    startOAuth,
  } = useSlackChannelConnection(workspaceId, preset?.id)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogStage, setDialogStage] = useState<DialogStage>("choose")
  const [setupMethod, setSetupMethod] = useState<SetupMethod | null>(null)
  const [slackClientId, setSlackClientId] = useState("")
  const [slackClientSecret, setSlackClientSecret] = useState("")
  const [slackSigningSecret, setSlackSigningSecret] = useState("")
  const [provisioned, setProvisioned] = useState<SlackChannelConnection | null>(
    null
  )

  const current = connection ?? provisioned
  const connectionId = current?.id ?? null
  const endpointUrl = current?.endpointUrl ?? ""
  const oauthRedirectUrl = current?.oauthRedirectUrl ?? ""
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

  useEffect(() => {
    if (!connection) {
      setSlackClientId("")
      setSlackClientSecret("")
      setSlackSigningSecret("")
      return
    }
    setProvisioned(null)
    // Secrets are never read back, so only the client ID is prefilled.
    setSlackClientId(connection.clientId)
    setSlackClientSecret("")
    setSlackSigningSecret("")
  }, [connection])

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
        title: "Slack App connected",
        description: "Your channel token is now active.",
      })
    } else {
      toast({
        title: "Slack App connection failed",
        description: message || "Unable to complete Slack OAuth flow.",
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
        Save this agent preset before configuring external channels.
      </div>
    )
  }

  if (isLoading) {
    return <CenteredSpinner />
  }

  if (error) {
    const detail = getApiErrorDetail(error) ?? error.message
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Unable to load channel settings</AlertTitle>
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
        title: "Missing fields",
        description:
          "Client ID, client secret, and signing secret are required.",
        variant: "destructive",
      })
      return
    }
    if (typeof window === "undefined") {
      return
    }
    try {
      const authorizationUrl = await startOAuth({
        connectionId: connectionId ?? undefined,
        agentPresetId: presetId,
        clientId,
        clientSecret,
        signingSecret,
        returnUrl: window.location.href,
      })
      window.location.assign(authorizationUrl)
    } catch {
      return
    }
  }

  async function handleRotate(): Promise<void> {
    if (!connection) {
      return
    }
    try {
      await rotate(connection.id)
    } catch {
      return
    }
  }

  async function handleDelete(): Promise<void> {
    if (!connection) {
      return
    }
    try {
      await disconnect(connection.id)
      setProvisioned(null)
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
      message: "Slack manifest copied",
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
    if (connectionId) {
      setDialogStage(method === "new" ? "guide" : "connect")
      return
    }

    try {
      setProvisioned(await provision(presetId))
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
              <p className="text-sm font-medium">Custom Slack App</p>
              <p className="text-xs text-muted-foreground">
                Handle `app_mention` events and respond in-thread.
              </p>
            </div>
            <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
              {connection?.isConnected ? "Manage" : "Connect"}
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
                  ? "How would you like to connect your Slack app to this agent?"
                  : "Setup guide"}
              </DialogTitle>
              {dialogStage === "guide" ? (
                <DialogDescription>
                  Follow these steps to create a new Slack app.
                </DialogDescription>
              ) : null}
              {dialogStage === "connect" ? (
                <DialogDescription>
                  Enter your Slack app credentials to start OAuth install.
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
                        Create app
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Create a new Slack App using a pre-filled manifest
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      Choose
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
                        Existing App
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Connect an existing Slack App to this agent
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      Choose
                    </span>
                  </button>
                </div>
              ) : null}

              {dialogStage === "guide" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      In Tracecat
                    </p>
                    <SetupListItem
                      index={1}
                      title="Export app manifest"
                      description="Copy the manifest generated for this agent preset."
                      action={
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopyManifest}
                          disabled={!manifestText}
                        >
                          Copy
                        </Button>
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      In Slack
                    </p>
                    <SetupListItem
                      index={2}
                      title="Create app from manifest"
                      description="Open Slack Apps, choose Create New App, then select From an app manifest."
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
                            Open
                          </a>
                        </Button>
                      }
                    />
                    <SetupListItem
                      index={3}
                      title="Install the app"
                      description="Install to your workspace. You will add Event Subscriptions after connecting app credentials in Tracecat."
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Back in Tracecat
                    </p>
                    <SetupListItem
                      index={4}
                      title='Continue with "Next"'
                      description="Proceed to connect your Client ID, client secret, and signing secret."
                    />
                  </div>
                </div>
              ) : null}

              {dialogStage === "connect" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Endpoint URL</label>
                    <Input
                      readOnly
                      value={endpointUrl}
                      placeholder="Will appear after initial connect"
                    />
                    {endpointUrl ? (
                      <CopyButton
                        value={endpointUrl}
                        toastMessage="Endpoint URL copied"
                        tooltipMessage="Copy endpoint URL"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      OAuth redirect URL
                    </label>
                    <Input
                      readOnly
                      value={oauthRedirectUrl}
                      placeholder="Will appear after initial connect"
                    />
                    {oauthRedirectUrl ? (
                      <CopyButton
                        value={oauthRedirectUrl}
                        toastMessage="OAuth redirect URL copied"
                        tooltipMessage="Copy OAuth redirect URL"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Client ID</label>
                    <Input
                      value={slackClientId}
                      onChange={(event) => setSlackClientId(event.target.value)}
                      disabled={isBusy}
                      placeholder="1234567890.1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Client secret</label>
                    <Input
                      type="password"
                      value={slackClientSecret}
                      onChange={(event) =>
                        setSlackClientSecret(event.target.value)
                      }
                      disabled={isBusy}
                      placeholder="Slack App client secret"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      Signing secret
                    </label>
                    <Input
                      type="password"
                      value={slackSigningSecret}
                      onChange={(event) =>
                        setSlackSigningSecret(event.target.value)
                      }
                      disabled={isBusy}
                      placeholder="Slack signing secret"
                    />
                  </div>
                  {connection?.isConnected ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleRotate()}
                        disabled={isBusy}
                      >
                        <RefreshCw className="mr-2 size-4" />
                        Rotate endpoint
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDelete()}
                        disabled={isBusy}
                      >
                        Disconnect
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
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleNextFromDialog()}
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      {dialogStage === "connect" ? "Connect to Slack" : "Next"}
                    </Button>
                  </div>
                </>
              ) : null}
            </DialogBody>
          </DialogContent>
        </Dialog>

        {connection?.isActive ? (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle2 className="size-4" />
            Slack integration connected.
          </div>
        ) : null}
        {connection && connection.missingScopes.length > 0 ? (
          <Alert>
            <AlertTitle>Update needed</AlertTitle>
            <AlertDescription>
              Update the Slack app from the latest manifest, then connect again
              to grant: {connection.missingScopes.join(", ")}.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </ScrollArea>
  )
}
