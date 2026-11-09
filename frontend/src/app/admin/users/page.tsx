"use client"

import { AdminUsersTable } from "@/components/admin/admin-users-table"
import { CenteredSpinner } from "@/components/loading/spinner"
import { useAdminUsers } from "@/hooks/use-admin"

export default function AdminUsersPage() {
  const { isLoading, error } = useAdminUsers()

  if (isLoading) {
    return <CenteredSpinner />
  }

  if (error) {
    return <div className="text-center text-muted-foreground">加载用户失败</div>
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">用户</h2>
            <p className="text-base text-muted-foreground">
              管理平台用户和超级用户权限。
            </p>
          </div>
        </div>
        <AdminUsersTable />
      </div>
    </div>
  )
}
