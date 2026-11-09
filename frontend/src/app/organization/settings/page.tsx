"use client"

export default function SettingsPage() {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">设置</h2>
            <p className="text-md text-muted-foreground">
              查看和管理组织设置。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
