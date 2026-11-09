"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangleIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { SAMLSettingsUpdate } from "@/client"
import { CopyButton } from "@/components/copy-button"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { Switch } from "@/components/ui/switch"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useOrgDomains } from "@/hooks/use-org-domains"
import { useAppInfo, useOrgSamlSettings } from "@/lib/hooks"

const ssoFormSchema = z.object({
  saml_enabled: z.boolean(),
  saml_enforced: z.boolean(),
  saml_idp_metadata_url: z.string().url().nullish(),
  saml_sp_acs_url: z.string().url().nullish(),
})

type SsoFormValues = z.infer<typeof ssoFormSchema>

export function OrgSettingsSsoForm() {
  const { appInfo } = useAppInfo()
  const { domains } = useOrgDomains()
  const {
    samlSettings,
    samlSettingsIsLoading,
    samlSettingsError,
    updateSamlSettings,
    updateSamlSettingsIsPending,
  } = useOrgSamlSettings()
  const methods = useForm<SsoFormValues>({
    resolver: zodResolver(ssoFormSchema),
    values: {
      saml_enabled: samlSettings?.saml_enabled ?? false,
      saml_enforced: samlSettings?.saml_enforced ?? false,
      saml_idp_metadata_url: samlSettings?.saml_idp_metadata_url,
      saml_sp_acs_url: samlSettings?.saml_sp_acs_url,
    },
  })

  const isSamlAllowed = appInfo?.auth_allowed_types.includes("saml")
  const requiresDomainGuard = appInfo?.ee_multi_tenant ?? false
  const hasActiveDomains = Boolean(domains?.some((domain) => domain.is_active))
  const samlEnabled = methods.watch("saml_enabled")

  const canEnableSaml = !requiresDomainGuard || hasActiveDomains
  const onSubmit = async (data: SsoFormValues) => {
    if (requiresDomainGuard && !hasActiveDomains && data.saml_enabled) {
      console.error(
        "Refusing to enable SAML without at least one active org domain in multi-tenant mode"
      )
      return
    }
    const conditional: Partial<SAMLSettingsUpdate> = {}
    if (isSamlAllowed) {
      conditional.saml_enabled = data.saml_enabled
      conditional.saml_enforced = data.saml_enabled && data.saml_enforced
    }
    try {
      await updateSamlSettings({
        requestBody: {
          saml_idp_metadata_url: data.saml_idp_metadata_url,
          ...conditional,
        },
      })
    } catch (error) {
      console.error("Failed to update SAML settings", error)
    }
  }

  if (samlSettingsIsLoading) {
    return <CenteredSpinner />
  }
  if (samlSettingsError || !samlSettings) {
    return (
      <AlertNotification
        level="error"
        message={`加载 SAML 设置出错：${samlSettingsError?.message || "未知错误"}`}
      />
    )
  }

  const failedKeys = samlSettings.decryption_failed_keys ?? []

  return (
    <Form {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        {failedKeys.length > 0 && (
          <Alert>
            <AlertTriangleIcon className="size-4 !text-destructive" />
            <AlertTitle className="text-destructive">
              无法解密组织设置
            </AlertTitle>
            <AlertDescription>
              部分加密值无法解密，所属设置为 {failedKeys.join(", ")}
              。请重新配置并保存这些设置。
            </AlertDescription>
          </Alert>
        )}
        {requiresDomainGuard && !hasActiveDomains && (
          <Alert>
            <AlertTriangleIcon className="size-4 !text-destructive" />
            <AlertTitle className="text-destructive">需要域名限制</AlertTitle>
            <AlertDescription>
              启用 SAML 单点登录前必须配置域名白名单，请联系 Tracecat
              平台管理员为组织设置。
            </AlertDescription>
          </Alert>
        )}
        <FormField
          control={methods.control}
          name="saml_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>启用 SAML 单点登录</FormLabel>
                <FormDescription>为组织启用 SAML 单点登录。</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canEnableSaml && !field.value}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={methods.control}
          name="saml_enforced"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>强制使用 SAML 单点登录</FormLabel>
                <FormDescription>
                  启用后，此组织的用户必须通过 SAML
                  验证身份，匹配邮箱域名的密码登录将被禁用。
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={(!canEnableSaml && !field.value) || !samlEnabled}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={methods.control}
          name="saml_idp_metadata_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IdP 元数据 URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://tenant.provider.com/app/hash/sso/saml/metadata"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>身份提供商提供的元数据 URL。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* NOTE: This is read only, set by the platform */}
        <FormField
          control={methods.control}
          name="saml_sp_acs_url"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="flex items-center gap-2">
                <span>服务提供商 ACS URL</span>
                <TooltipProvider>
                  {field.value && (
                    <CopyButton
                      value={field.value}
                      toastMessage="已将服务提供商 ACS URL 复制到剪贴板"
                    />
                  )}
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="http://localhost/auth/saml/acs"
                  {...field}
                  value={field.value ?? ""}
                  disabled
                />
              </FormControl>
              <FormDescription>
                身份验证成功后，服务提供商通过此端点接收并处理 IdP 发来的 SAML
                断言。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={updateSamlSettingsIsPending}>
          更新单点登录设置
        </Button>
      </form>
    </Form>
  )
}
