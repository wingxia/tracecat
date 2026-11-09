"use client"

import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react"
import React from "react"
import {
  ApiError,
  type AwsSecretResolutionErrorCode,
  type SecretReferenceCheckResult,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  describeApiError,
  useAwsSecretReferences,
} from "@/hooks/use-secret-stores"
import { cn } from "@/lib/utils"

/** Short label and fix hint for each sanitized check failure code. */
export const CHECK_ERROR_MESSAGES: Record<
  AwsSecretResolutionErrorCode,
  { label: string; hint: string }
> = {
  store_disabled: {
    label: "存储已禁用",
    hint: "密钥存储已禁用，请联系组织管理员启用。",
  },
  store_not_authorized: {
    label: "存储未授权",
    hint: "此工作空间未获准使用该密钥存储，请联系组织管理员授权。",
  },
  assume_role_failed: {
    label: "无法代入角色",
    hint: "Tracecat 无法代入存储的 IAM 角色。请检查角色信任策略是否允许 Tracecat 主体，并包含存储的外部 ID。",
  },
  access_denied: {
    label: "访问被拒绝",
    hint: "存储的 IAM 角色无法读取此密钥。请为密钥授予 secretsmanager:GetSecretValue 权限；若使用客户管理的密钥，还需授予 kms:Decrypt 权限。",
  },
  not_found: {
    label: "未找到密钥",
    hint: "存储所在区域中不存在此名称或 ARN 的密钥，请检查拼写和区域。",
  },
  decryption_failed: {
    label: "解密失败",
    hint: "AWS 无法解密密钥，请为存储的 IAM 角色授予密钥所用 KMS 密钥的 kms:Decrypt 权限。",
  },
  throttled: {
    label: "请求限流",
    hint: "AWS 限制了请求频率，请稍后重试。",
  },
  timeout: {
    label: "已超时",
    hint: "AWS 响应超时，请稍后重试。",
  },
  binary_value: {
    label: "二进制密钥",
    hint: "密钥存储的是二进制值，目前仅支持文本（SecretString）值。",
  },
  malformed_json: {
    label: "非 JSON",
    hint: "密钥值不是 JSON 对象。请使用整段字符串映射，或将值存储为 JSON 对象。",
  },
  missing_field: {
    label: "缺少 JSON 字段",
    hint: "密钥值缺少已映射的 JSON 字段，请检查映射中的字段名称。",
  },
  non_string_field: {
    label: "字段不是字符串",
    hint: "映射的 JSON 字段不是字符串，目前仅支持映射顶层字符串字段。",
  },
  invalid_mapping: {
    label: "请求被拒绝",
    hint: "AWS 拒绝了请求，密钥可能已计划删除，或者名称或 ARN 无效。",
  },
  region_mismatch: {
    label: "区域不匹配",
    hint: "密钥 ARN 的区域与存储区域不同，请使用存储所在区域的密钥。",
  },
  unknown: {
    label: "检查失败",
    hint: "检查因未知原因失败。请重试，若问题持续，请联系支持团队。",
  },
}

/** Result of the most recent check, held only for this page view. */
export type AwsReferenceCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "ok"; resolvedKeys: string[] }
  | { status: "failed"; label: string; hint: string; detail: string | null }

/**
 * Runs a server-side reference check for an AWS-backed secret. The result is
 * only a sanitized ok/failure plus resolved key names; the browser never sees
 * the remote value.
 */
export function useAwsSecretReferenceCheck(
  workspaceId: string,
  secretId: string
) {
  const { checkReference } = useAwsSecretReferences(workspaceId)
  const [state, setState] = React.useState<AwsReferenceCheckState>({
    status: "idle",
  })

  async function run() {
    setState({ status: "checking" })
    let result: SecretReferenceCheckResult
    try {
      result = await checkReference(secretId)
    } catch (error) {
      result = {
        ok: false,
        message:
          error instanceof ApiError
            ? describeApiError(error)
            : "无法执行检查，请重试。",
      }
    }
    if (result.ok) {
      setState({ status: "ok", resolvedKeys: result.resolved_keys ?? [] })
      return
    }
    const failure = result.error_code
      ? CHECK_ERROR_MESSAGES[result.error_code]
      : null
    setState({
      status: "failed",
      label: failure?.label ?? "检查失败",
      hint: failure?.hint ?? result.message ?? "无法执行检查。",
      // The API message carries the AWS error code; keep it for troubleshooting.
      detail: failure ? (result.message ?? null) : null,
    })
  }

  return { state, run }
}

/** Check state and runner for one AWS-backed secret. */
export type AwsSecretReferenceCheck = ReturnType<
  typeof useAwsSecretReferenceCheck
>

/** Gives a list row its own check state without a component per row type. */
export function AwsSecretReferenceCheckScope({
  workspaceId,
  secretId,
  children,
}: {
  workspaceId: string
  secretId: string
  children: (check: AwsSecretReferenceCheck) => React.ReactNode
}) {
  return children(useAwsSecretReferenceCheck(workspaceId, secretId))
}

/** One button for the check and its result. Clicking it checks again. */
export function AwsSecretReferenceCheckButton({
  state,
  onCheck,
}: {
  state: AwsReferenceCheckState
  onCheck: () => void
}) {
  let label = "检查访问权限"
  let icon: React.ReactNode = null
  let title = "检查 Tracecat 是否可读取此密钥"
  if (state.status === "checking") {
    label = "检查中…"
    icon = <Loader2Icon className="size-3.5 animate-spin" />
  } else if (state.status === "ok") {
    label = "Reachable"
    icon = <CheckCircle2Icon className="size-3.5 text-green-600" />
    title = `已解析的键：${state.resolvedKeys.join("、")}。点击重新检查。`
  } else if (state.status === "failed") {
    label = state.label
    icon = <XCircleIcon className="size-3.5 text-destructive" />
    title = "点击重新检查。"
  }
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 gap-1 border-input bg-background px-2.5 text-[11px] text-foreground hover:bg-muted"
      disabled={state.status === "checking"}
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onCheck()
      }}
    >
      {icon}
      {label}
    </Button>
  )
}

/** The fix for a failed check, shown under the row. */
export function AwsSecretReferenceCheckHint({
  state,
  className,
}: {
  state: AwsReferenceCheckState
  className?: string
}) {
  if (state.status !== "failed") return null
  return (
    <p
      className={cn("text-xs text-muted-foreground", className)}
      title={state.detail ?? undefined}
    >
      {state.hint}
    </p>
  )
}
