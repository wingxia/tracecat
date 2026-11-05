import type { AgentChannelBotRead, AgentChannelTokenRead } from "@/client"
import {
  buildSlackOAuthRedirectUrlFromEndpoint,
  connectionFromBot,
  connectionFromToken,
  pickBot,
} from "@/hooks/use-agent-channels"

function bot(
  overrides: Partial<AgentChannelBotRead> = {}
): AgentChannelBotRead {
  return {
    id: "bot-1",
    workspace_id: "ws",
    agent_preset_id: "preset",
    provider: "slack",
    status: "active",
    provider_tenant_id: "T1",
    provider_enterprise_id: null,
    provider_app_id: "A1",
    provider_bot_user_id: "UBOT",
    granted_scopes: ["chat:write"],
    missing_scopes: ["users:read"],
    update_needed: true,
    manifest_version: 1,
    client_id: "123.456",
    has_bot_token: true,
    has_signing_secret: true,
    has_client_secret: true,
    endpoint_url: "https://api.example.com/agent/channels/slack/abc.def",
    oauth_redirect_url:
      "https://api.example.com/agent/channel-bots/slack/oauth/callback",
    created_at: "2026-11-05T00:00:00Z",
    updated_at: "2026-11-05T00:00:00Z",
    ...overrides,
  }
}

describe("Slack channel connections", () => {
  it("reads a legacy token as today's panel did", () => {
    const token = {
      id: "token-1",
      endpoint_url: "https://api.example.com/agent/channels/slack/abc.def",
      is_active: false,
      config: { slack_client_id: "123.456" },
    } as AgentChannelTokenRead
    expect(connectionFromToken(token)).toEqual({
      id: "token-1",
      endpointUrl: token.endpoint_url,
      oauthRedirectUrl:
        "https://api.example.com/agent/channels/slack/oauth/callback",
      isActive: false,
      isConnected: true,
      clientId: "123.456",
      missingScopes: [],
    })
  })

  it("uses the bot's own redirect URL and reports missing scopes", () => {
    const connection = connectionFromBot(bot())
    expect(connection.oauthRedirectUrl).toBe(bot().oauth_redirect_url)
    expect(connection.missingScopes).toEqual(["users:read"])
    expect(connection.isActive && connection.isConnected).toBe(true)
  })

  it("reads a disconnected bot as not connected", () => {
    const connection = connectionFromBot(bot({ status: "disconnected" }))
    expect(connection.isConnected).toBe(false)
    expect(connection.isActive).toBe(false)
  })

  it("manages the active bot, else the newest still connected", () => {
    const gone = bot({ id: "gone", status: "disconnected" })
    const pending = bot({ id: "pending", status: "needs_reconnect" })
    const active = bot({ id: "active" })
    expect(pickBot([gone, pending, active])?.id).toBe("active")
    expect(pickBot([gone, pending])?.id).toBe("pending")
    expect(pickBot([gone])?.id).toBe("gone")
    expect(pickBot([])).toBeUndefined()
  })

  it("leaves a URL without the Slack channel path alone", () => {
    expect(buildSlackOAuthRedirectUrlFromEndpoint("https://x.test/y")).toBe(
      "https://x.test/y"
    )
  })
})
