"use client"

import { IPAllowlistSettingsForm } from "@/components/organization/org-settings-security"
import { useAdminSecuritySettings } from "@/hooks/use-admin"

export function PlatformSecuritySettings() {
  return (
    <IPAllowlistSettingsForm
      {...useAdminSecuritySettings()}
      enforcementDescription="仅允许从下方允许列表中的 IP 范围访问平台管理控制台和 API。组织访问不受影响。启用限制前，列表必须涵盖你当前的 IP。"
    />
  )
}
