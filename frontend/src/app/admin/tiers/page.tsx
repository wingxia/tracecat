"use client"

import { AlertTriangleIcon } from "lucide-react"
import { AdminTiersTable } from "@/components/admin/admin-tiers-table"
import { CreateTierDialog } from "@/components/admin/create-tier-dialog"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAdminTiers } from "@/hooks/use-admin"

export default function AdminTiersPage() {
  const { isLoading, error } = useAdminTiers(true)

  if (isLoading) {
    return <CenteredSpinner />
  }

  if (error) {
    return <div className="text-center text-muted-foreground">加载套餐失败</div>
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">套餐</h2>
            <p className="text-base text-muted-foreground">
              管理套餐和资源限制。
            </p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <CreateTierDialog />
          </div>
        </div>
        <Alert variant="warning">
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>需要企业版许可证</AlertTitle>
          <AlertDescription>
            此页面的所有套餐设置仅适用于企业版，未来版本将要求许可证密钥。
          </AlertDescription>
        </Alert>
        <AdminTiersTable />
      </div>
    </div>
  )
}
