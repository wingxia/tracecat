"use client"

import { OrgSettingsAgentForm } from "@/components/organization/org-settings-agent"

export default function AgentSettingsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">配置</h2>
            <p className="text-base text-muted-foreground">
              为组织的智能体配置 AI 模型和凭据。
            </p>
          </div>
        </div>

        <OrgSettingsAgentForm />
      </div>
    </div>
  )
}
