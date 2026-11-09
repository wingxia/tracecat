"use client"

import { PlatformRegistryVersionsTable } from "@/components/admin/platform-registry-versions-table"

export default function AdminRegistryVersionsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">版本</h2>
            <p className="text-base text-muted-foreground">
              所有仓库的注册表版本。提升某个版本可将其设为当前使用的版本。
            </p>
          </div>
        </div>

        <PlatformRegistryVersionsTable />
      </div>
    </div>
  )
}
