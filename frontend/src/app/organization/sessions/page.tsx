"use client"

import { OrgSessionsTable } from "@/components/organization/org-sessions-table"

export default function SessionsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">组织会话</h2>
            <p className="text-md text-muted-foreground">管理组织用户会话。</p>
          </div>
          <div className="ml-auto flex items-center space-x-2"></div>
        </div>
        <div className="space-y-4">
          <>
            <h6 className="text-sm font-semibold">管理会话</h6>
            <OrgSessionsTable />
          </>
        </div>
      </div>
    </div>
  )
}
