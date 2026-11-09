import type { ProviderRead } from "@/client"

/**
 * Check if a provider is an MCP (Model Context Protocol) provider.
 * MCP providers follow the naming convention of ending with "_mcp".
 */
export function isMCPProvider(provider: ProviderRead): boolean {
  return provider.metadata.id.endsWith("_mcp")
}

/**
 * Check if a provider is a custom workspace OAuth provider.
 * Custom providers follow the naming convention of starting with "custom_".
 * Legacy providers may start with "custom-" (hyphen).
 * This is enforced by the backend when creating custom providers.
 */
export function isCustomProvider(provider: ProviderRead): boolean {
  const providerId = provider.metadata.id
  return (
    typeof providerId === "string" &&
    (providerId.startsWith("custom_") || providerId.startsWith("custom-"))
  )
}

export interface CredentialInputOverride {
  label: string
  description: string
  placeholder: string
  multiline?: boolean
}

export interface ProviderCredentialInputs {
  clientId: CredentialInputOverride
  clientSecret: CredentialInputOverride
}

/**
 * Client credential input overrides for providers whose credentials are not
 * a standard OAuth client ID and secret.
 */
export function getProviderCredentialInputs(
  provider: ProviderRead | undefined
): ProviderCredentialInputs | undefined {
  if (
    provider?.metadata.id === "github_app" &&
    provider.grant_type === "client_credentials"
  ) {
    return {
      clientId: {
        label: "客户端 ID 或应用 ID",
        description: "在 GitHub 应用的设置页面查找。",
        placeholder: "Iv23li… 或 123456",
      },
      clientSecret: {
        label: "私钥",
        description:
          "粘贴在 GitHub 应用设置页面生成的私钥（.pem）。留空可保留现有密钥。",
        placeholder: "-----BEGIN RSA PRIVATE KEY-----",
        multiline: true,
      },
    }
  }
  return undefined
}
