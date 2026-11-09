"use client"

import type { AxiosError } from "axios"
import { ChevronDownIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import TracecatIcon from "public/icon.png"
// Error components must be Client Components
import { useEffect } from "react"
import { ApiError } from "@/client"
import { type AlertLevel, AlertNotification } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type ErrorProps = Error & { digest?: string }

export default function Error({
  error,
}: {
  error: ErrorProps | AxiosError | ApiError
}) {
  const refined = refineError(error)
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("log error", error)
  }, [error])

  if (refined.customComponent) {
    return refined.customComponent
  }

  const { headline, level, message, action } = refined
  return (
    <main className="container flex size-full max-w-[400px] flex-col items-center justify-center space-y-4">
      <Image src={TracecatIcon} alt="Tracecat" className="mb-4 size-16" />
      <h1 className="text-2xl font-medium">{headline}</h1>
      {action}
      {message ? <AlertNotification level={level} message={message} /> : null}
    </main>
  )
}
export type CustomError = {
  headline: string
  level: AlertLevel
  message: React.ReactNode | null
  action: React.ReactNode
  customComponent?: React.ReactNode
}
function refineError(error: ErrorProps): CustomError {
  if (error instanceof ApiError) {
    return apiErrorHandler(error)
  } else {
    return unexpectedError(error)
  }
}

function GoHome() {
  const router = useRouter()
  return (
    <Button variant="outline" onClick={() => router.replace("/")}>
      返回首页
    </Button>
  )
}

function unexpectedError(error: ErrorProps | AxiosError): CustomError {
  console.log("HANDLING ERROR", error)
  return {
    headline: "发生错误，请稍后重试",
    level: "error",
    message: error.message,
    action: <GoHome />,
  }
}

function getErrorLevel(status: number): AlertLevel {
  if (Math.floor(status / 100) === 4) {
    return "error"
  }
  return "warning"
}

interface ScopeError {
  error: {
    code: string
    message: string
    required_scopes: string[]
    missing_scopes?: string[]
  }
}

function isScopeError(body: unknown): body is ScopeError {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as ScopeError).error === "object" &&
    (body as ScopeError).error !== null &&
    "code" in (body as ScopeError).error &&
    (body as ScopeError).error.code === "insufficient_scope" &&
    Array.isArray((body as ScopeError).error.missing_scopes)
  )
}

function PermissionDeniedPage({ body }: { body: unknown }) {
  const router = useRouter()
  const missingScopes = isScopeError(body)
    ? (body.error.missing_scopes ?? [])
    : []

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <Image src={TracecatIcon} alt="Tracecat" className="mb-6 size-12" />

        <h1 className="mb-2 text-xl font-semibold tracking-tight">
          访问被拒绝
        </h1>

        <p className="mb-6 text-sm text-muted-foreground">
          你没有访问此资源的权限。
          {missingScopes.length > 0 &&
            " Contact your administrator to request access."}
        </p>

        {missingScopes.length > 0 && (
          <Collapsible className="mb-6 w-full">
            <CollapsibleTrigger className="group flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <span>缺少权限</span>
              <ChevronDownIcon className="size-3 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {missingScopes.map((scope) => (
                  <span
                    key={scope}
                    className="inline-flex items-center rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Button variant="outline" size="sm" onClick={() => router.replace("/")}>
          前往首页
        </Button>
      </div>
    </main>
  )
}

function apiErrorHandler(error: ApiError): CustomError {
  const level = getErrorLevel(error.status)
  switch (error.status) {
    case 401:
      return {
        headline: "会话已过期",
        level,
        message: "请重新登录。",
        action: <GoHome />,
      }
    case 403:
      return {
        headline: "访问被拒绝",
        level,
        message: "",
        action: null,
        customComponent: <PermissionDeniedPage body={error.body} />,
      }
    case 404:
      return {
        headline: "未找到资源",
        level,
        message: "你要查找的资源不存在。",
        action: <GoHome />,
      }
    case 428:
      return {
        headline: "需要组织",
        level: "info",
        message: "此流程需要组织专属链接。",
        action: <GoHome />,
      }
    case 503:
      return {
        headline: "服务不可用",
        level,
        message: "服务暂不可用，请稍后重试。",
        action: <GoHome />,
      }
    default:
      return {
        headline: "发生意外错误。",
        level,
        message: (
          <div className="space-y-4">
            <b>{error.message}</b>
            <pre className="whitespace-pre-wrap break-all">
              {typeof error.body === "string"
                ? error.body
                : JSON.stringify(error.body, null, 2)}
            </pre>
          </div>
        ),
        action: <GoHome />,
      }
  }
}
