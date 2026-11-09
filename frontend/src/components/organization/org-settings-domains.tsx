"use client"

import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { Badge } from "@/components/ui/badge"
import { useOrgDomains } from "@/hooks/use-org-domains"

function formatVerificationMethod(method: string): string {
  if (method === "platform_admin") {
    return "由平台分配"
  }
  return method.replaceAll("_", " ")
}

export function OrgSettingsDomains() {
  const { domains, isLoading, error } = useOrgDomains()

  if (isLoading) {
    return <CenteredSpinner />
  }
  if (error) {
    return (
      <AlertNotification
        level="error"
        message={`加载组织域名出错：${error.message}`}
      />
    )
  }

  if (!domains || domains.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        尚未分配域名，请联系平台管理员添加。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {domains.map((domain) => (
        <div
          key={domain.id}
          className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{domain.domain}</p>
            <p className="text-xs text-muted-foreground">
              验证状态： {formatVerificationMethod(domain.verification_method)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {domain.is_primary && <Badge variant="secondary">主要</Badge>}
            <Badge variant={domain.is_active ? "secondary" : "outline"}>
              {domain.is_active ? "已启用" : "已停用"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
