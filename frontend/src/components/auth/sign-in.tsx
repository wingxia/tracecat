"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"
import TracecatIcon from "public/icon.png"
import type React from "react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { AuthDiscoverResponse } from "@/client"
import { ApiError, authDiscoverAuthMethod } from "@/client"
import { OidcOAuthButton } from "@/components/auth/oauth-buttons"
import { SamlSSOButton } from "@/components/auth/saml"
import { Icons } from "@/components/icons"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useAuthActions } from "@/hooks/use-auth"
import { setPostAuthReturnUrlCookie, startOidcLogin } from "@/lib/auth-login"
import { sanitizeReturnUrl } from "@/lib/auth-return-url"
import { getApiErrorDetail } from "@/lib/errors"
import { useAppInfo } from "@/lib/hooks"
import { cn } from "@/lib/utils"

interface SignInProps extends React.HTMLProps<HTMLDivElement> {
  returnUrl?: string | null
  organizationSlug?: string | null
}

function buildSignUpPath(
  returnUrl?: string | null,
  organizationSlug?: string | null
): string {
  const params = new URLSearchParams()
  const sanitizedReturnUrl = sanitizeReturnUrl(returnUrl)
  if (sanitizedReturnUrl) {
    params.set("returnUrl", sanitizedReturnUrl)
  }
  if (organizationSlug) {
    params.set("org", organizationSlug)
  }
  const query = params.toString()
  return query ? `/sign-up?${query}` : "/sign-up"
}

async function startSamlLogin(
  returnUrl?: string | null,
  nextUrl?: string | null
): Promise<void> {
  // Use the org-scoped next_url from discovery when available so the
  // backend can resolve the correct organization for SAML login.
  const loginUrl = nextUrl ?? "/api/auth/saml/login"
  const res = await fetch(loginUrl, { credentials: "include" })
  if (!res.ok) {
    throw new Error(`SAML login request failed: ${res.status}`)
  }
  const { redirect_url } = (await res.json()) as { redirect_url: string }
  setPostAuthReturnUrlCookie(returnUrl)
  window.location.href = redirect_url
}

export function SignIn({
  className,
  returnUrl,
  organizationSlug,
}: SignInProps) {
  const { appInfo, appInfoIsLoading, appInfoError } = useAppInfo()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveredMethod, setDiscoveredMethod] = useState<"basic" | null>(null)
  const [discoveredEmail, setDiscoveredEmail] = useState("")
  const signUpPath = buildSignUpPath(returnUrl, organizationSlug)

  if (appInfoIsLoading) {
    return <CenteredSpinner />
  }
  if (appInfoError) {
    throw appInfoError
  }

  const allowedAuthTypes: string[] = appInfo?.auth_allowed_types ?? []
  const showBasicAuth = allowedAuthTypes.includes("basic")
  const showOidcAuth = allowedAuthTypes.includes("oidc")
  const oidcProviderLabel = "第三方登录"
  const oidcProviderIcon = "login"
  // Keep a manual SAML entry point for single-tenant self-hosted setups.
  // In multi-tenant mode, SAML login requires org context and should only be
  // initiated from org-scoped discovery `next_url` links.
  const showSingleTenantSamlAuth =
    allowedAuthTypes.includes("saml") &&
    appInfo?.saml_enabled &&
    !appInfo?.ee_multi_tenant
  const showAlternativeAuthActions =
    (discoveredMethod === null && showOidcAuth) || showSingleTenantSamlAuth
  const onDiscover = async (email: string) => {
    setIsDiscovering(true)
    setDiscoveredEmail(email)
    try {
      const data: AuthDiscoverResponse = await authDiscoverAuthMethod({
        requestBody: {
          email,
          ...(organizationSlug ? { org: organizationSlug } : {}),
        },
      })

      if (data.method === "basic") {
        if (!showBasicAuth) {
          throw new Error("密码登录未启用")
        }
        setDiscoveredMethod("basic")
        return
      }
      if (data.method === "oidc") {
        if (!showOidcAuth) {
          throw new Error("OIDC 登录未启用")
        }
        await startOidcLogin(returnUrl)
        return
      }
      if (data.method === "saml") {
        if (appInfo?.ee_multi_tenant && !data.next_url) {
          throw new Error("多租户模式下，SAML 登录需要组织上下文")
        }
        await startSamlLogin(returnUrl, data.next_url)
        return
      }
      throw new Error(`Unsupported authentication method: ${data.method}`)
    } catch (error) {
      console.error("Error discovering auth method", error)
      toast({
        title: "无法继续",
        description: "无法确定此邮箱的身份验证方式。",
      })
    } finally {
      setIsDiscovering(false)
    }
  }

  return (
    <div
      className={cn(
        "container flex size-full items-center justify-center",
        className
      )}
    >
      <div className="flex w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
        <CardHeader className="items-center space-y-2 text-center">
          <Image src={TracecatIcon} alt="Tracecat" className="mb-8 size-16" />
          <CardTitle className="text-2xl">登录你的账号</CardTitle>
          <CardDescription>
            {discoveredMethod === "basic"
              ? "输入密码以继续"
              : "输入工作邮箱以继续"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-col space-y-2">
          {discoveredMethod === "basic" ? (
            <BasicLoginForm initialEmail={discoveredEmail} />
          ) : (
            <EmailDiscoveryForm
              isLoading={isDiscovering}
              onSubmit={onDiscover}
            />
          )}
          {showAlternativeAuthActions && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative my-6 flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或使用以下方式登录
                </span>
              </div>
            </div>
          )}
          {discoveredMethod === null && showOidcAuth && (
            <OidcOAuthButton
              className="w-full"
              returnUrl={returnUrl}
              providerLabel={oidcProviderLabel}
              providerIcon={oidcProviderIcon}
            />
          )}
          {showSingleTenantSamlAuth && (
            <SamlSSOButton className="w-full" returnUrl={returnUrl} />
          )}
        </CardContent>
        {showBasicAuth && (
          <CardFooter className="flex items-center justify-center text-sm text-muted-foreground">
            <div className="mt-4 text-center">
              还没有账号？{" "}
              <Link href={signUpPath} className="underline">
                注册
              </Link>
            </div>
          </CardFooter>
        )}
      </div>
    </div>
  )
}

const discoverySchema = z.object({
  email: z.string().email().min(3, { message: "必填" }),
})

type DiscoveryFormValues = z.infer<typeof discoverySchema>

function EmailDiscoveryForm({
  isLoading,
  onSubmit,
}: {
  isLoading: boolean
  onSubmit: (email: string) => Promise<void>
}) {
  const form = useForm<DiscoveryFormValues>({
    resolver: zodResolver(discoverySchema),
    defaultValues: { email: "" },
  })

  const handleSubmit = async (values: DiscoveryFormValues) => {
    await onSubmit(values.email)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">邮箱</FormLabel>
                <FormControl>
                  <Input placeholder="user@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className="w-full text-sm" disabled={isLoading} type="submit">
            {isLoading && (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            )}
            继续
          </Button>
        </div>
      </form>
    </Form>
  )
}

const basicLoginSchema = z.object({
  email: z.string().email().min(3, { message: "必填" }),
  password: z.string().min(12, "密码至少需要 12 个字符"),
})

type BasicLoginFormValues = z.infer<typeof basicLoginSchema>

export function BasicLoginForm({ initialEmail }: { initialEmail?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthActions()
  const form = useForm<BasicLoginFormValues>({
    resolver: zodResolver(basicLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  useEffect(() => {
    if (initialEmail) {
      form.setValue("email", initialEmail)
    }
  }, [form, initialEmail])

  const onSubmit = async (values: BasicLoginFormValues) => {
    try {
      setIsLoading(true)
      await login({
        formData: {
          username: values.email,
          password: values.password,
        },
      })
    } catch (error) {
      console.error("Error signing in", error)
      const forbiddenDetail =
        error instanceof ApiError && error.status === 403
          ? getApiErrorDetail(error)
          : null
      toast({
        title: "登录出错",
        description: forbiddenDetail ?? "请检查邮箱和密码后重试",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex w-full flex-col space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">邮箱</FormLabel>
                    <FormControl>
                      <Input placeholder="user@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">密码</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
          <Button className="w-full text-sm" disabled={isLoading} type="submit">
            {isLoading && (
              <Icons.spinner className="mr-2 size-4 animate-spin" />
            )}
            登录
          </Button>
        </div>
      </form>
    </Form>
  )
}
