"use client"

import { Plus } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { OrgSettingsServiceAccounts } from "@/components/organization/org-settings-service-accounts"
import { Button } from "@/components/ui/button"

const CREATE_SERVICE_ACCOUNT_PARAM = "createServiceAccount"

export default function OrganizationServiceAccountsPage() {
  const canCreateServiceAccounts = useScopeCheck("org:service_account:create")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">服务账号</h2>
            <p className="text-base text-muted-foreground">
              创建和管理组织范围内的机器身份。
            </p>
          </div>
          {canCreateServiceAccounts === true && pathname ? (
            <div className="ml-auto flex items-start">
              <Button
                variant="outline"
                size="sm"
                className="h-7 bg-background"
                onClick={() => {
                  const params = new URLSearchParams(searchParams?.toString())
                  params.set(
                    CREATE_SERVICE_ACCOUNT_PARAM,
                    Date.now().toString()
                  )
                  router.replace(`${pathname}?${params.toString()}`, {
                    scroll: false,
                  })
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                创建服务账号
              </Button>
            </div>
          ) : null}
        </div>
        <OrgSettingsServiceAccounts />
      </div>
    </div>
  )
}
