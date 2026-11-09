"use client"

import { KeyRound, Trash2 } from "lucide-react"
import { useState } from "react"
import { RecoveryCodes } from "@/components/auth/recovery-codes"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useSecurityKeys } from "@/hooks/use-mfa"
import { getApiErrorDetail } from "@/lib/errors"
import { useQuery } from "@/lib/query"
import {
  getMfaStatus,
  MFA_STATUS_QUERY_KEY,
  registerSecurityKey,
} from "@/lib/webauthn"

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("zh-CN") : "从未"
}

export function SecuritySettings() {
  const { data: status } = useQuery({
    queryKey: MFA_STATUS_QUERY_KEY,
    queryFn: getMfaStatus,
  })
  const {
    credentials,
    isLoading,
    refresh,
    deleteCredential,
    deletePending,
    regenerateRecoveryCodes,
    regeneratePending,
  } = useSecurityKeys()
  const [name, setName] = useState("")
  const [registering, setRegistering] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const addKey = async () => {
    setRegistering(true)
    try {
      const result = await registerSecurityKey(name.trim() || "安全密钥")
      setName("")
      if (result.recovery_codes?.length) {
        setRecoveryCodes(result.recovery_codes)
      }
      await refresh()
      toast({ title: "已添加安全密钥" })
    } catch (error) {
      toast({
        title: "添加安全密钥失败",
        description:
          getApiErrorDetail(error) ??
          (error instanceof Error ? error.message : "请重试。"),
        variant: "destructive",
      })
    } finally {
      setRegistering(false)
    }
  }

  if (isLoading) {
    return <CenteredSpinner />
  }

  const hasKeys = (credentials?.length ?? 0) > 0
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">安全密钥与通行密钥</h3>
        <p className="text-sm text-muted-foreground">
          使用硬件安全密钥（如
          YubiKey）或浏览器、密码管理器中的通行密钥登录。添加后，每次登录都需要验证。
          {status?.required_by_policy &&
            " Your organization requires at least one."}
        </p>
        {status && !status.webauthn_available && (
          <p className="text-sm text-destructive">
            {status.webauthn_unavailable_reason}
          </p>
        )}
      </div>

      <div className="divide-y rounded-md border">
        {hasKeys ? (
          credentials?.map((credential) => (
            <div
              key={credential.id}
              className="flex items-center justify-between gap-4 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {credential.name}
                    </span>
                    <Badge variant="secondary">
                      {credential.backup_eligible
                        ? "已同步的通行密钥"
                        : "安全密钥"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    已添加 {formatDate(credential.created_at)} · 上次使用{" "}
                    {formatDate(credential.last_used_at)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`移除 ${credential.name}`}
                disabled={deletePending}
                onClick={() =>
                  void deleteCredential(credential.id).catch(() => undefined)
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="p-3 text-sm text-muted-foreground">暂无安全密钥。</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          aria-label={"新安全密钥名称"}
          placeholder={"名称，例如 YubiKey 5C"}
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          onClick={addKey}
          disabled={registering || status?.webauthn_available === false}
        >
          {registering ? "正在等待密钥…" : "添加安全密钥"}
        </Button>
      </div>

      {hasKeys && (
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">恢复码</h3>
            <p className="text-sm text-muted-foreground">
              {status?.recovery_codes_remaining ?? 0}{" "}
              个未使用。生成新恢复码后，旧恢复码会失效。
            </p>
          </div>
          {recoveryCodes && <RecoveryCodes codes={recoveryCodes} />}
          <Button
            variant="outline"
            disabled={regeneratePending}
            onClick={async () => {
              try {
                setRecoveryCodes(await regenerateRecoveryCodes())
              } catch {
                // Toast is shown by the mutation.
              }
            }}
          >
            生成新恢复码
          </Button>
        </div>
      )}
    </div>
  )
}
