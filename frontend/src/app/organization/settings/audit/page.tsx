"use client"

import { OrgSettingsAuditForm } from "@/components/organization/org-settings-audit"

export default function AuditSettingsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">审计日志</h2>
            <p className="text-base text-muted-foreground">
              将审计日志发送到日志收集端点。
            </p>
          </div>
        </div>

        <OrgSettingsAuditForm />
      </div>
    </div>
  )
}
