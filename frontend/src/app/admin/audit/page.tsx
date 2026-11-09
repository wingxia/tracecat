"use client"

import { PlatformAuditSettings } from "@/components/admin/platform-audit-settings"

export default function AdminAuditSettingsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">审计日志</h2>
            <p className="text-base text-muted-foreground">
              将平台审计日志发送到日志收集端点。
            </p>
          </div>
        </div>

        <PlatformAuditSettings />
      </div>
    </div>
  )
}
