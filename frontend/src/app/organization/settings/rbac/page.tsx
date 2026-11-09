"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CenteredSpinner } from "@/components/loading/spinner"
import { OrgRbacAssignments } from "@/components/organization/org-rbac-assignments"
import { OrgRbacGroups } from "@/components/organization/org-rbac-groups"
import { OrgRbacRoles } from "@/components/organization/org-rbac-roles"
import { OrgRbacScopes } from "@/components/organization/org-rbac-scopes"
import { OrgRbacUserAssignments } from "@/components/organization/org-rbac-user-assignments"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEntitlements } from "@/hooks/use-entitlements"

type RbacTab =
  | "roles"
  | "groups"
  | "scopes"
  | "assignments"
  | "user-assignments"

export default function RbacSettingsPage() {
  const router = useRouter()
  const { hasEntitlement, isLoading } = useEntitlements()
  const rbacEnabled = hasEntitlement("rbac_addons")
  const [activeTab, setActiveTab] = useState<RbacTab>("roles")

  useEffect(() => {
    if (!isLoading && !rbacEnabled) {
      router.replace("/organization/members")
    }
  }, [isLoading, rbacEnabled, router])

  if (isLoading || !rbacEnabled) {
    return <CenteredSpinner />
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1200px] flex-col space-y-8 py-6">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">访问控制</h2>
            <p className="text-md text-muted-foreground">
              管理组织的角色、用户组和权限。通过权限范围配置细粒度访问控制，并向用户和用户组分配权限。
            </p>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as RbacTab)}
          className="w-full"
        >
          <TabsList className="inline-flex h-auto w-auto justify-start gap-0 rounded-none border-b border-border/30 bg-transparent p-0">
            <TabsTrigger
              value="roles"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              角色
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              用户组
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              用户组授权
            </TabsTrigger>
            <TabsTrigger
              value="user-assignments"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              用户授权
            </TabsTrigger>
            <TabsTrigger
              value="scopes"
              className="rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              权限范围
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-6">
            <OrgRbacRoles />
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <OrgRbacGroups />
          </TabsContent>

          <TabsContent value="assignments" className="mt-6">
            <OrgRbacAssignments />
          </TabsContent>

          <TabsContent value="user-assignments" className="mt-6">
            <OrgRbacUserAssignments />
          </TabsContent>

          <TabsContent value="scopes" className="mt-6">
            <OrgRbacScopes />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
