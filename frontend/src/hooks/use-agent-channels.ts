import { useMemo } from "react"
import {
  type AgentChannelBotRead,
  type AgentChannelTokenCreate,
  type AgentChannelTokenRead,
  type AgentChannelTokenUpdate,
  agentChannelBotsCreateBot,
  agentChannelBotsDisconnectBot,
  agentChannelBotsListBots,
  agentChannelBotsRotateBotEndpoint,
  agentChannelBotsStartSlackBotOauth,
  agentChannelsCreateChannelToken,
  agentChannelsDeleteChannelToken,
  agentChannelsListChannelTokens,
  agentChannelsRotateChannelToken,
  agentChannelsStartSlackOauth,
  agentChannelsUpdateChannelToken,
  type ChannelType,
  type SlackOAuthStartRequest as ClientSlackOAuthStartRequest,
  type SlackBotOAuthStartResponse,
  type SlackOAuthStartResponse,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import {
  getApiErrorDetail,
  retryHandler,
  type TracecatApiError,
} from "@/lib/errors"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"

const PROVISIONAL_BOT_TOKEN = "__tracecat_pending_bot_token__"
const PROVISIONAL_SIGNING_SECRET_PREFIX = "__tracecat_pending_signing_secret__"

type ListChannelTokenParams = {
  agentPresetId?: string
  channelType?: ChannelType
  enabled?: boolean
}

export function useAgentChannelTokens(
  workspaceId?: string,
  { agentPresetId, channelType, enabled = true }: ListChannelTokenParams = {}
) {
  const {
    data: tokens,
    isLoading: tokensIsLoading,
    error: tokensError,
    refetch: refetchTokens,
  } = useQuery<Array<AgentChannelTokenRead>, TracecatApiError>({
    queryKey: ["agent-channel-tokens", workspaceId, agentPresetId, channelType],
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error("workspaceId is required to list channel tokens")
      }
      return await agentChannelsListChannelTokens({
        workspaceId,
        agentPresetId,
        channelType,
      })
    },
    enabled: enabled && Boolean(workspaceId),
    retry: retryHandler,
  })

  return {
    tokens,
    tokensIsLoading,
    tokensError,
    refetchTokens,
  }
}

export function useCreateAgentChannelToken(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: createChannelToken,
    isPending: createChannelTokenIsPending,
    error: createChannelTokenError,
  } = useMutation<
    AgentChannelTokenRead,
    TracecatApiError,
    AgentChannelTokenCreate
  >({
    mutationFn: async (requestBody) =>
      await agentChannelsCreateChannelToken({
        workspaceId,
        requestBody,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-channel-tokens", workspaceId],
      })
      toast({
        title: "Channel token created",
        description: "Slack endpoint is ready.",
      })
    },
    onError: (error) => {
      const detail =
        typeof error.body?.detail === "string"
          ? error.body.detail
          : "Failed to create channel token."
      toast({
        title: "Create failed",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    createChannelToken,
    createChannelTokenIsPending,
    createChannelTokenError,
  }
}

export function useUpdateAgentChannelToken(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateChannelToken,
    isPending: updateChannelTokenIsPending,
    error: updateChannelTokenError,
  } = useMutation<
    AgentChannelTokenRead,
    TracecatApiError,
    { tokenId: string; requestBody: AgentChannelTokenUpdate }
  >({
    mutationFn: async ({ tokenId, requestBody }) =>
      await agentChannelsUpdateChannelToken({
        workspaceId,
        tokenId,
        requestBody,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-channel-tokens", workspaceId],
      })
      toast({
        title: "Channel token updated",
        description: "Slack channel settings saved.",
      })
    },
    onError: (error) => {
      const detail =
        typeof error.body?.detail === "string"
          ? error.body.detail
          : "Failed to update channel token."
      toast({
        title: "Update failed",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    updateChannelToken,
    updateChannelTokenIsPending,
    updateChannelTokenError,
  }
}

export function useRotateAgentChannelToken(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: rotateChannelToken,
    isPending: rotateChannelTokenIsPending,
    error: rotateChannelTokenError,
  } = useMutation<AgentChannelTokenRead, TracecatApiError, { tokenId: string }>(
    {
      mutationFn: async ({ tokenId }) =>
        await agentChannelsRotateChannelToken({
          workspaceId,
          tokenId,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["agent-channel-tokens", workspaceId],
        })
        toast({
          title: "Endpoint rotated",
          description: "Use the new endpoint URL in Slack configuration.",
        })
      },
      onError: (error) => {
        const detail =
          typeof error.body?.detail === "string"
            ? error.body.detail
            : "Failed to rotate channel token."
        toast({
          title: "Rotate failed",
          description: detail,
          variant: "destructive",
        })
      },
    }
  )

  return {
    rotateChannelToken,
    rotateChannelTokenIsPending,
    rotateChannelTokenError,
  }
}

export function useDeleteAgentChannelToken(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: deleteChannelToken,
    isPending: deleteChannelTokenIsPending,
    error: deleteChannelTokenError,
  } = useMutation<void, TracecatApiError, { tokenId: string }>({
    mutationFn: async ({ tokenId }) =>
      await agentChannelsDeleteChannelToken({
        workspaceId,
        tokenId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-channel-tokens", workspaceId],
      })
      toast({
        title: "Channel token deleted",
        description: "Slack endpoint has been revoked.",
      })
    },
    onError: (error) => {
      const detail =
        typeof error.body?.detail === "string"
          ? error.body.detail
          : "Failed to delete channel token."
      toast({
        title: "Delete failed",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    deleteChannelToken,
    deleteChannelTokenIsPending,
    deleteChannelTokenError,
  }
}

type SlackOAuthStartArgs = {
  tokenId?: string
  agentPresetId: string
  clientId: string
  clientSecret: string
  signingSecret: string
  returnUrl: string
}

export function useStartSlackOAuth(workspaceId: string) {
  const {
    mutateAsync: startSlackOAuth,
    isPending: startSlackOAuthIsPending,
    error: startSlackOAuthError,
  } = useMutation<
    SlackOAuthStartResponse,
    TracecatApiError,
    SlackOAuthStartArgs
  >({
    mutationFn: async (params) => {
      const requestBody: ClientSlackOAuthStartRequest = {
        agent_preset_id: params.agentPresetId,
        client_id: params.clientId.trim(),
        client_secret: params.clientSecret.trim(),
        signing_secret: params.signingSecret.trim(),
        return_url: params.returnUrl,
      }
      if (params.tokenId) {
        requestBody.token_id = params.tokenId
      }
      return await agentChannelsStartSlackOauth({
        workspaceId,
        requestBody,
      })
    },
    onError: (error) => {
      const detail =
        typeof error.body?.detail === "string"
          ? error.body.detail
          : "Failed to start Slack connect flow."
      toast({
        title: "Slack connect failed",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    startSlackOAuth,
    startSlackOAuthIsPending,
    startSlackOAuthError,
  }
}

/**
 * Switches the Slack channel panel from legacy channel tokens to channel bots.
 * ENG-2380 flips it when `/agent/channel-bots` takes over.
 */
export const CHANNEL_BOTS_API_ENABLED = false

const SLACK_CHANNEL_PATH = "/agent/channels/slack/"

/** Today's OAuth redirect URL, derived from a legacy token's endpoint URL. */
export function buildSlackOAuthRedirectUrlFromEndpoint(
  endpointUrl: string
): string {
  const markerIndex = endpointUrl.indexOf(SLACK_CHANNEL_PATH)
  if (markerIndex === -1) {
    return endpointUrl
  }
  return `${endpointUrl.slice(0, markerIndex)}${SLACK_CHANNEL_PATH}oauth/callback`
}

/** An agent's Slack connection, from either the token or the bot API. */
export type SlackChannelConnection = {
  id: string
  endpointUrl: string
  oauthRedirectUrl: string
  /** Routes events now. */
  isActive: boolean
  /** Installed or mid-install; false once disconnected. */
  isConnected: boolean
  clientId: string
  /** Scopes to grant by reinstalling; empty for legacy tokens. */
  missingScopes: Array<string>
}

/** A legacy token as a connection. */
export function connectionFromToken(
  token: AgentChannelTokenRead
): SlackChannelConnection {
  return {
    id: token.id,
    endpointUrl: token.endpoint_url,
    oauthRedirectUrl: buildSlackOAuthRedirectUrlFromEndpoint(
      token.endpoint_url
    ),
    isActive: token.is_active,
    isConnected: true,
    clientId: token.config.slack_client_id ?? "",
    missingScopes: [],
  }
}

/** A bot as a connection; a disconnected bot reads as not connected. */
export function connectionFromBot(
  bot: AgentChannelBotRead
): SlackChannelConnection {
  return {
    id: bot.id,
    endpointUrl: bot.endpoint_url,
    oauthRedirectUrl: bot.oauth_redirect_url,
    isActive: bot.status === "active",
    isConnected: bot.status !== "disconnected",
    clientId: bot.client_id ?? "",
    missingScopes: bot.missing_scopes,
  }
}

/** The bot the panel manages: the active one, else the newest still connected. */
export function pickBot(
  bots: Array<AgentChannelBotRead>
): AgentChannelBotRead | undefined {
  return (
    bots.find((bot) => bot.status === "active") ??
    bots.find((bot) => bot.status !== "disconnected") ??
    bots[0]
  )
}

/** Reads and actions on an agent's Slack connection, for either API. */
export type SlackConnectionApi = {
  connection: SlackChannelConnection | null
  isLoading: boolean
  error: TracecatApiError | null
  isBusy: boolean
  /** Reserve an endpoint before the Slack app exists. */
  provision: (presetId: string) => Promise<SlackChannelConnection>
  rotate: (connectionId: string) => Promise<void>
  disconnect: (connectionId: string) => Promise<void>
  /** Start OAuth and return Slack's authorization URL. */
  startOAuth: (params: SlackConnectionOAuthArgs) => Promise<string>
}

type SlackConnectionOAuthArgs = Omit<SlackOAuthStartArgs, "tokenId"> & {
  connectionId?: string
}

function useLegacySlackConnection(
  workspaceId: string,
  agentPresetId: string | undefined
): SlackConnectionApi {
  const { tokens, tokensIsLoading, tokensError } = useAgentChannelTokens(
    workspaceId,
    { enabled: Boolean(agentPresetId), agentPresetId, channelType: "slack" }
  )
  const { createChannelToken, createChannelTokenIsPending } =
    useCreateAgentChannelToken(workspaceId)
  const { rotateChannelToken, rotateChannelTokenIsPending } =
    useRotateAgentChannelToken(workspaceId)
  const { deleteChannelToken, deleteChannelTokenIsPending } =
    useDeleteAgentChannelToken(workspaceId)
  const { startSlackOAuth, startSlackOAuthIsPending } =
    useStartSlackOAuth(workspaceId)

  // Stable across renders, so the panel's form resets only when the data changes.
  const connection = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return null
    }
    return connectionFromToken(
      tokens.find((item) => item.is_active) ?? tokens[0]
    )
  }, [tokens])

  return {
    connection,
    isLoading: tokensIsLoading,
    error: tokensError,
    isBusy:
      createChannelTokenIsPending ||
      rotateChannelTokenIsPending ||
      deleteChannelTokenIsPending ||
      startSlackOAuthIsPending,
    provision: async (presetId) =>
      connectionFromToken(
        await createChannelToken({
          agent_preset_id: presetId,
          channel_type: "slack",
          config: {
            slack_bot_token: PROVISIONAL_BOT_TOKEN,
            slack_signing_secret: `${PROVISIONAL_SIGNING_SECRET_PREFIX}${crypto.randomUUID()}`,
          },
          is_active: false,
        })
      ),
    rotate: async (connectionId) => {
      await rotateChannelToken({ tokenId: connectionId })
    },
    disconnect: async (connectionId) => {
      await deleteChannelToken({ tokenId: connectionId })
    },
    startOAuth: async ({ connectionId, ...params }) =>
      (await startSlackOAuth({ ...params, tokenId: connectionId }))
        .authorization_url,
  }
}

function useBotMutation<TVariables>(
  workspaceId: string,
  mutationFn: (variables: TVariables) => Promise<AgentChannelBotRead>,
  messages: { title: string; description: string; failure: string }
) {
  const queryClient = useQueryClient()
  return useMutation<AgentChannelBotRead, TracecatApiError, TVariables>({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-channel-bots", workspaceId],
      })
      toast({ title: messages.title, description: messages.description })
    },
    onError: (error) => {
      toast({
        title: messages.failure,
        description: getApiErrorDetail(error) ?? `${messages.failure}.`,
        variant: "destructive",
      })
    },
  })
}

function useBotSlackConnection(
  workspaceId: string,
  agentPresetId: string | undefined
): SlackConnectionApi {
  const bots = useQuery<Array<AgentChannelBotRead>, TracecatApiError>({
    queryKey: ["agent-channel-bots", workspaceId, agentPresetId],
    queryFn: async () =>
      await agentChannelBotsListBots({
        workspaceId,
        agentPresetId,
        provider: "slack",
      }),
    enabled: Boolean(agentPresetId),
    retry: retryHandler,
  })
  const create = useBotMutation(
    workspaceId,
    async (presetId: string) =>
      await agentChannelBotsCreateBot({
        workspaceId,
        requestBody: { agent_preset_id: presetId, provider: "slack" },
      }),
    {
      title: "Channel bot created",
      description: "Slack endpoint is ready.",
      failure: "Create failed",
    }
  )
  const rotate = useBotMutation(
    workspaceId,
    async (botId: string) =>
      await agentChannelBotsRotateBotEndpoint({ workspaceId, botId }),
    {
      title: "Endpoint rotated",
      description: "Use the new endpoint URL in Slack configuration.",
      failure: "Rotate failed",
    }
  )
  const disconnect = useBotMutation(
    workspaceId,
    async (botId: string) =>
      await agentChannelBotsDisconnectBot({ workspaceId, botId }),
    {
      title: "Slack disconnected",
      description: "The Slack endpoint stopped accepting events.",
      failure: "Disconnect failed",
    }
  )
  const startOAuth = useMutation<
    SlackBotOAuthStartResponse,
    TracecatApiError,
    SlackConnectionOAuthArgs
  >({
    mutationFn: async (params) =>
      await agentChannelBotsStartSlackBotOauth({
        workspaceId,
        requestBody: {
          bot_id: params.connectionId ?? null,
          agent_preset_id: params.agentPresetId,
          client_id: params.clientId.trim(),
          client_secret: params.clientSecret.trim(),
          signing_secret: params.signingSecret.trim(),
          return_url: params.returnUrl,
        },
      }),
    onError: (error) => {
      toast({
        title: "Slack connect failed",
        description:
          getApiErrorDetail(error) ?? "Failed to start Slack connect flow.",
        variant: "destructive",
      })
    },
  })

  const connection = useMemo(() => {
    const bot = pickBot(bots.data ?? [])
    return bot ? connectionFromBot(bot) : null
  }, [bots.data])

  return {
    connection,
    isLoading: bots.isLoading,
    error: bots.error,
    isBusy:
      create.isPending ||
      rotate.isPending ||
      disconnect.isPending ||
      startOAuth.isPending,
    provision: async (presetId) =>
      connectionFromBot(await create.mutateAsync(presetId)),
    rotate: async (botId) => {
      await rotate.mutateAsync(botId)
    },
    disconnect: async (botId) => {
      await disconnect.mutateAsync(botId)
    },
    startOAuth: async (params) =>
      (await startOAuth.mutateAsync(params)).authorization_url,
  }
}

/**
 * The agent's Slack connection on the API `CHANNEL_BOTS_API_ENABLED` selects.
 * Chosen once at module load, so hook order never changes between renders.
 */
export const useSlackChannelConnection = CHANNEL_BOTS_API_ENABLED
  ? useBotSlackConnection
  : useLegacySlackConnection
