"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import Cookies from "js-cookie"
import { useState } from "react"
import type { tracecat_ee__admin__organizations__schemas__OrgRead as OrgRead } from "@/client"
import { AdminOrgDeleteDialog } from "@/components/admin/admin-org-delete-dialog"
import { AdminOrgDomainsDialog } from "@/components/admin/admin-org-domains-dialog"
import { AdminOrgInvitationsDialog } from "@/components/admin/admin-org-invitations-dialog"
import { AdminOrgRegistryDialog } from "@/components/admin/admin-org-registry-dialog"
import { AdminOrgTierDialog } from "@/components/admin/admin-org-tier-dialog"
import { AdminOrganizationEditDialog } from "@/components/admin/admin-organization-edit-dialog"
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableToolbarProps,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAdminOrganizations, useAdminOrgTiers } from "@/hooks/use-admin"
import { useAppInfo } from "@/lib/hooks"

export function AdminOrganizationsTable() {
  const [editOrgId, setEditOrgId] = useState<string | null>(null)
  const [tierOrgId, setTierOrgId] = useState<string | null>(null)
  const [domainsOrgId, setDomainsOrgId] = useState<string | null>(null)
  const [invitationsOrgId, setInvitationsOrgId] = useState<string | null>(null)
  const [registryOrgId, setRegistryOrgId] = useState<string | null>(null)
  const [deleteOrg, setDeleteOrg] = useState<OrgRead | null>(null)
  const { appInfo } = useAppInfo()
  const multiTenantEnabled = appInfo?.ee_multi_tenant === true
  const { organizations } = useAdminOrganizations()
  const orgIds = organizations?.map((org) => org.id) ?? []
  const { orgTiersByOrgId, isLoading: orgTiersLoading } =
    useAdminOrgTiers(orgIds)

  return (
    <>
      <DataTable
        data={organizations ?? []}
        initialSortingState={[{ id: "name", desc: false }]}
        columns={[
          {
            accessorKey: "name",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"名称"}
              />
            ),
            cell: ({ row }) => (
              <button
                type="button"
                className="text-xs font-medium hover:underline"
                onClick={() => setEditOrgId(row.original.id)}
              >
                {row.getValue<OrgRead["name"]>("name")}
              </button>
            ),
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "slug",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"标识"}
              />
            ),
            cell: ({ row }) => (
              <div className="text-xs font-mono text-muted-foreground">
                {row.getValue<OrgRead["slug"]>("slug")}
              </div>
            ),
            enableSorting: true,
            enableHiding: false,
          },
          {
            id: "tier",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"套餐"}
              />
            ),
            cell: ({ row }) => {
              const orgTier = orgTiersByOrgId.get(row.original.id)
              const tier = orgTier?.tier

              if (tier) {
                return (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{tier.display_name}</span>
                  </div>
                )
              }

              if (orgTiersLoading) {
                return (
                  <span className="text-xs text-muted-foreground">加载中…</span>
                )
              }

              return <span className="text-xs text-muted-foreground">默认</span>
            },
            enableSorting: false,
            enableHiding: false,
          },
          {
            accessorKey: "is_active",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"已启用"}
              />
            ),
            cell: ({ row }) => (
              <div className="text-xs">
                {row.getValue<OrgRead["is_active"]>("is_active")
                  ? "已启用"
                  : "已停用"}
              </div>
            ),
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "created_at",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"创建时间"}
              />
            ),
            cell: ({ row }) => {
              const createdAt =
                row.getValue<OrgRead["created_at"]>("created_at")
              const date = new Date(createdAt)
              return (
                <div className="text-xs text-muted-foreground">
                  {date.toLocaleDateString("zh-CN")}
                </div>
              )
            },
            enableSorting: true,
            enableHiding: false,
          },
          {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="size-8 p-0">
                      <span className="sr-only">打开菜单</span>
                      <DotsHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        Cookies.set("tracecat:active-org-id", row.original.id, {
                          sameSite: "lax",
                          secure:
                            typeof window !== "undefined" &&
                            window.location.protocol === "https:",
                        })
                        window.location.assign("/workspaces")
                      }}
                    >
                      进入组织
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        navigator.clipboard.writeText(row.original.id)
                      }
                    >
                      复制 ID
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setEditOrgId(row.original.id)}
                    >
                      编辑组织
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setTierOrgId(row.original.id)}
                    >
                      管理套餐
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setDomainsOrgId(row.original.id)}
                    >
                      管理域名
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setInvitationsOrgId(row.original.id)}
                    >
                      管理邀请
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setRegistryOrgId(row.original.id)}
                    >
                      管理注册表
                    </DropdownMenuItem>
                    {multiTenantEnabled && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-600"
                          onSelect={() => setDeleteOrg(row.original)}
                        >
                          删除组织
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            },
          },
        ]}
        toolbarProps={defaultToolbarProps}
      />
      {editOrgId && (
        <AdminOrganizationEditDialog
          orgId={editOrgId}
          open
          onOpenChange={() => setEditOrgId(null)}
        />
      )}
      {tierOrgId && (
        <AdminOrgTierDialog
          orgId={tierOrgId}
          open
          onOpenChange={() => setTierOrgId(null)}
        />
      )}
      {domainsOrgId && (
        <AdminOrgDomainsDialog
          orgId={domainsOrgId}
          open
          onOpenChange={() => setDomainsOrgId(null)}
        />
      )}
      {invitationsOrgId && (
        <AdminOrgInvitationsDialog
          orgId={invitationsOrgId}
          open
          onOpenChange={() => setInvitationsOrgId(null)}
        />
      )}
      {registryOrgId && (
        <AdminOrgRegistryDialog
          orgId={registryOrgId}
          open
          onOpenChange={() => setRegistryOrgId(null)}
        />
      )}
      {deleteOrg && (
        <AdminOrgDeleteDialog
          org={deleteOrg}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleteOrg(null)
            }
          }}
        />
      )}
    </>
  )
}

const defaultToolbarProps: DataTableToolbarProps<OrgRead> = {
  filterProps: {
    placeholder: "筛选组织…",
    column: "name",
  },
}
