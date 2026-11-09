"use client"

import { PlatformBuildInfo } from "@/components/admin/platform-build-info"

export default function AdminBuildPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">构建信息</h2>
            <p className="text-base text-muted-foreground">
              当前部署的版本和构建详情。
            </p>
          </div>
        </div>

        <PlatformBuildInfo />
      </div>
    </div>
  )
}
