"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Info, Save } from "lucide-react"
import { useCallback, useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import type { IntegrationUpdate, ProviderRead } from "@/client"
import { ServiceAccountJsonUploader } from "@/components/service-account-json-uploader"
import { MultiTagCommandInput } from "@/components/tags-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { useIntegrationProvider } from "@/lib/hooks"
import { getProviderCredentialInputs, isMCPProvider } from "@/lib/providers"
import { useWorkspaceId } from "@/providers/workspace-id"

type EndpointHelp = ProviderRead["authorization_endpoint_help"]

const hasHelpContent = (help: EndpointHelp): boolean => {
  if (help == null) {
    return false
  }
  if (Array.isArray(help)) {
    return help.some((item) => item.trim().length > 0)
  }
  return help.trim().length > 0
}

const renderHelpContent = (help: EndpointHelp) => {
  if (help == null) {
    return null
  }
  const raw = Array.isArray(help) ? help.join("\n") : help
  const sanitized = raw
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim()

  if (sanitized.length === 0) {
    return null
  }
  const blocks = sanitized.split(/\n{2,}/)
  return blocks.length > 1 ? (
    <div className="space-y-2 text-left whitespace-pre-line">
      {blocks.map((block, index) => (
        <p key={`help-block-${index}`}>{block}</p>
      ))}
    </div>
  ) : (
    <p className="text-left whitespace-pre-line">{sanitized}</p>
  )
}

const createOAuthSchema = (clientSecretMaxLength: number) =>
  z.object({
    client_id: z
      .string()
      .trim()
      .max(512, { message: "客户端 ID 不能超过 512 个字符" })
      .optional(),
    client_secret: z
      .string()
      .trim()
      .max(clientSecretMaxLength, {
        message: `客户端密钥不能超过 ${clientSecretMaxLength} 个字符`,
      })
      .optional(),
    scopes: z.array(z.string().trim().min(1)).optional(),
    authorization_endpoint: z
      .string()
      .trim()
      .url({ message: "请输入有效的 HTTPS URL" })
      .refine((value) => value.toLowerCase().startsWith("https://"), {
        message: "授权端点必须使用 HTTPS",
      }),
    token_endpoint: z
      .string()
      .trim()
      .url({ message: "请输入有效的 HTTPS URL" })
      .refine((value) => value.toLowerCase().startsWith("https://"), {
        message: "令牌端点必须使用 HTTPS",
      }),
  })

type OAuthSchema = z.infer<ReturnType<typeof createOAuthSchema>>

interface ProviderConfigFormProps {
  provider: ProviderRead
  onSuccess?: () => void
  additionalButtons?: React.ReactNode
  formId?: string
  formRef?: React.Ref<HTMLFormElement>
  hideActions?: boolean
  submitLabel?: string
  submitIcon?: React.ReactNode
}

export function ProviderConfigForm({
  provider,
  onSuccess,
  additionalButtons,
  formId,
  formRef,
  hideActions = false,
  submitLabel,
  submitIcon,
}: ProviderConfigFormProps) {
  const workspaceId = useWorkspaceId()
  const isMCP = isMCPProvider(provider)
  const {
    metadata: { id, service_account_json: serviceAccountJson },
    scopes: { default: defaultScopes },
    grant_type: grantType,
    default_authorization_endpoint: providerDefaultAuth,
    default_token_endpoint: providerDefaultToken,
    authorization_endpoint_help: providerAuthHelp,
    token_endpoint_help: providerTokenHelp,
  } = provider

  const isServiceAccountProvider = serviceAccountJson ?? false
  const credentialInputs = getProviderCredentialInputs(provider)
  const clientIdInput = credentialInputs?.clientId
  const clientSecretInput = credentialInputs?.clientSecret
  const isMultilineSecret = clientSecretInput?.multiline ?? false
  const clientSecretMaxLength =
    isServiceAccountProvider || isMultilineSecret ? 16384 : 512
  const validationSchema = useMemo(
    () => createOAuthSchema(clientSecretMaxLength),
    [clientSecretMaxLength]
  )

  const {
    integration,
    integrationIsLoading,
    updateIntegration,
    updateIntegrationIsPending,
  } = useIntegrationProvider({
    providerId: id,
    workspaceId,
    grantType,
  })

  const defaultValues = useMemo<OAuthSchema>(() => {
    const fallbackScopes = integration?.requested_scopes ?? defaultScopes ?? []
    return {
      client_id: integration?.client_id ?? "",
      client_secret: "",
      scopes: fallbackScopes,
      authorization_endpoint:
        integration?.authorization_endpoint ?? providerDefaultAuth ?? "",
      token_endpoint: integration?.token_endpoint ?? providerDefaultToken ?? "",
    }
  }, [integration, defaultScopes, providerDefaultAuth, providerDefaultToken])

  const form = useForm<OAuthSchema>({
    resolver: zodResolver(validationSchema),
    defaultValues,
  })

  // Sync saved values that load after mount without clobbering user edits.
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form])

  const onSubmit = useCallback(
    async (data: OAuthSchema) => {
      const params: IntegrationUpdate = {
        client_id: data.client_id?.trim() || undefined,
        client_secret: data.client_secret?.trim() || undefined,
        scopes: data.scopes?.length ? data.scopes : undefined,
        authorization_endpoint: data.authorization_endpoint,
        token_endpoint: data.token_endpoint,
        grant_type: grantType,
      }

      await updateIntegration(params)
      onSuccess?.()
    },
    [grantType, onSuccess, updateIntegration]
  )

  const hasAuthHelp = hasHelpContent(providerAuthHelp)
  const hasTokenHelp = hasHelpContent(providerTokenHelp)

  const defaultScopesList = useMemo(
    () => (defaultScopes ?? []).filter((scope) => scope.trim().length > 0),
    [defaultScopes]
  )
  const watchedScopes = useWatch({
    control: form.control,
    name: "scopes",
  })
  const scopesValue = watchedScopes ?? []
  const normalizedDefaultScopes = useMemo(
    () => [...defaultScopesList].sort(),
    [defaultScopesList]
  )
  const defaultScopeSuggestions = useMemo(
    () =>
      defaultScopesList.map((scope) => ({
        id: scope,
        label: scope,
        value: scope,
      })),
    [defaultScopesList]
  )
  const normalizedScopesValue = useMemo(
    () => [...scopesValue].sort(),
    [scopesValue]
  )
  const isAtDefaultScopes = useMemo(() => {
    if (normalizedDefaultScopes.length === 0) {
      return normalizedScopesValue.length === 0
    }
    if (normalizedDefaultScopes.length !== normalizedScopesValue.length) {
      return false
    }
    return normalizedDefaultScopes.every(
      (scope, index) => scope === normalizedScopesValue[index]
    )
  }, [normalizedDefaultScopes, normalizedScopesValue])

  const watchedAuthEndpoint = useWatch({
    control: form.control,
    name: "authorization_endpoint",
  })
  const watchedTokenEndpoint = useWatch({
    control: form.control,
    name: "token_endpoint",
  })
  const authEndpointValue = watchedAuthEndpoint ?? ""
  const tokenEndpointValue = watchedTokenEndpoint ?? ""
  const defaultAuthEndpoint = providerDefaultAuth ?? ""
  const defaultTokenEndpoint = providerDefaultToken ?? ""
  const isAtDefaultEndpoints = useMemo(() => {
    return (
      authEndpointValue.trim() === defaultAuthEndpoint.trim() &&
      tokenEndpointValue.trim() === defaultTokenEndpoint.trim()
    )
  }, [
    authEndpointValue,
    tokenEndpointValue,
    defaultAuthEndpoint,
    defaultTokenEndpoint,
  ])

  const handleResetScopes = useCallback(() => {
    const nextValue = defaultScopesList.length > 0 ? [...defaultScopesList] : []
    form.setValue("scopes", nextValue, {
      shouldDirty: !isAtDefaultScopes,
      shouldTouch: true,
    })
    form.clearErrors("scopes")
    void form.trigger("scopes")
  }, [defaultScopesList, form, isAtDefaultScopes])

  const handleResetEndpoints = useCallback(() => {
    form.setValue("authorization_endpoint", defaultAuthEndpoint, {
      shouldDirty: !isAtDefaultEndpoints,
      shouldTouch: true,
    })
    form.setValue("token_endpoint", defaultTokenEndpoint, {
      shouldDirty: !isAtDefaultEndpoints,
      shouldTouch: true,
    })
    form.clearErrors("authorization_endpoint")
    form.clearErrors("token_endpoint")
    void form.trigger("authorization_endpoint")
    void form.trigger("token_endpoint")
  }, [defaultAuthEndpoint, defaultTokenEndpoint, form, isAtDefaultEndpoints])

  const clientIdLabel =
    clientIdInput?.label ??
    (isServiceAccountProvider ? "服务账号邮箱（可选）" : "客户端 ID")
  const clientIdPlaceholder =
    clientIdInput?.placeholder ??
    (isServiceAccountProvider
      ? "service-account@project.iam.gserviceaccount.com"
      : "输入客户端 ID")
  const clientIdDescription =
    clientIdInput?.description ??
    (isServiceAccountProvider
      ? "留空则使用上传密钥中的服务账号邮箱。"
      : "OAuth 应用的客户端标识符，留空将移除已存储的凭据。")

  const clientSecretLabel =
    clientSecretInput?.label ??
    (isServiceAccountProvider ? "服务账号 JSON 密钥" : "客户端密钥")
  const clientSecretPlaceholder =
    clientSecretInput?.placeholder ??
    (isServiceAccountProvider
      ? "拖放 JSON 密钥（.json）或选择文件"
      : "输入客户端密钥")
  const clientSecretDescription =
    clientSecretInput?.description ??
    (isServiceAccountProvider
      ? "提供从 Google Cloud 下载的 JSON 密钥，留空则保留现有密钥。"
      : "添加或轮换 OAuth 客户端密钥，提交空值将保留现有密钥。")
  const hasExistingSecret =
    integration?.status !== undefined
      ? integration.status !== "not_configured"
      : false

  if (integrationIsLoading) {
    return <ProviderConfigFormSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      <Form {...form}>
        <form
          id={formId}
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <div className="space-y-4">
            <h3 className="font-medium">客户端凭据</h3>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{clientIdLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={clientIdPlaceholder}
                      />
                    </FormControl>
                    <FormMessage />
                    <FormDescription className="text-xs">
                      {clientIdDescription}
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{clientSecretLabel}</FormLabel>
                    <FormControl>
                      {isServiceAccountProvider ? (
                        <ServiceAccountJsonUploader
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onError={(message) => {
                            form.setError("client_secret", {
                              type: "manual",
                              message,
                            })
                          }}
                          onClearError={() => {
                            form.clearErrors("client_secret")
                          }}
                          onDetectedEmail={(email) => {
                            const currentClientId = form
                              .getValues("client_id")
                              ?.trim()
                            if (
                              (!currentClientId ||
                                currentClientId.length === 0) &&
                              email
                            ) {
                              form.setValue("client_id", email, {
                                shouldDirty: true,
                                shouldTouch: true,
                              })
                            }
                          }}
                          placeholder={clientSecretPlaceholder}
                          existingConfigured={hasExistingSecret}
                          hasError={Boolean(
                            form.formState.errors.client_secret
                          )}
                        />
                      ) : isMultilineSecret ? (
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          placeholder={clientSecretPlaceholder}
                          className="min-h-32 font-mono text-xs"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      ) : (
                        <Input
                          {...field}
                          type="password"
                          value={field.value ?? ""}
                          placeholder={clientSecretPlaceholder}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    <FormDescription className="text-xs">
                      {clientSecretDescription}
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">端点</h3>
              {(defaultAuthEndpoint.length > 0 ||
                defaultTokenEndpoint.length > 0 ||
                authEndpointValue.length > 0 ||
                tokenEndpointValue.length > 0) && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-0"
                  onClick={handleResetEndpoints}
                  disabled={isAtDefaultEndpoints}
                >
                  重置端点
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {!isMCP && (hasAuthHelp || hasTokenHelp) && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {hasAuthHelp && (
                      <div>
                        <div className="font-medium mb-1">授权端点：</div>
                        {renderHelpContent(providerAuthHelp)}
                      </div>
                    )}
                    {hasAuthHelp && hasTokenHelp && <div className="mt-3" />}
                    {hasTokenHelp && (
                      <div>
                        <div className="font-medium mb-1">令牌端点：</div>
                        {renderHelpContent(providerTokenHelp)}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="authorization_endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权端点</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={providerDefaultAuth ?? "https://..."}
                      />
                    </FormControl>
                    <FormMessage />
                    <FormDescription className="text-xs">
                      发起提供商的 OAuth 授权流程。除非需要自定义授权
                      URL，否则保留默认值。
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="token_endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>令牌端点</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder={providerDefaultToken ?? "https://..."}
                      />
                    </FormControl>
                    <FormMessage />
                    <FormDescription className="text-xs">
                      在提供商处将授权码交换为令牌。除非需要其他令牌
                      URL，否则保留默认值。
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">权限范围</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    默认权限范围
                  </span>
                </div>
                {defaultScopesList.length ? (
                  <div className="flex flex-wrap gap-1">
                    {defaultScopesList.map((scope) => (
                      <Badge
                        key={scope}
                        variant="secondary"
                        className="text-xs"
                      >
                        {scope}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    未提供默认权限范围。
                  </span>
                )}
              </div>

              <FormField
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>OAuth 权限范围</FormLabel>
                      {(defaultScopesList.length > 0 ||
                        scopesValue.length > 0) && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="px-0"
                          onClick={handleResetScopes}
                          disabled={isAtDefaultScopes}
                        >
                          重置权限范围
                        </Button>
                      )}
                    </div>
                    <FormControl>
                      <MultiTagCommandInput
                        value={field.value ?? []}
                        onChange={field.onChange}
                        suggestions={defaultScopeSuggestions}
                        searchKeys={["label", "value"]}
                        allowCustomTags
                        placeholder={"添加权限范围"}
                      />
                    </FormControl>
                    <FormMessage />
                    <FormDescription className="text-xs">
                      配置此集成的 OAuth 权限范围。
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>
          {!hideActions && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant={
                  integration?.status === "configured" ? "outline" : "default"
                }
                className="gap-2"
                disabled={updateIntegrationIsPending}
              >
                {submitIcon ?? <Save className="h-4 w-4" />}
                {submitLabel ?? "保存配置"}
              </Button>
              {additionalButtons}
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}

export function ProviderConfigFormSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-4 p-6">
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-8 w-full rounded-md bg-muted" />
        <div className="h-8 w-full rounded-md bg-muted" />
        <div className="h-8 w-full rounded-md bg-muted" />
        <div className="mt-4 flex gap-3">
          <div className="h-10 w-32 rounded-md bg-muted" />
          <div className="h-10 w-24 rounded-md bg-muted" />
        </div>
      </div>
    </div>
  )
}
