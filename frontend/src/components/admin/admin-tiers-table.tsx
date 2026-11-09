"use client"

import {
  CheckIcon,
  Cross2Icon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons"
import { useState } from "react"
import type { TierRead } from "@/client"
import { AdminTierEditDialog } from "@/components/admin/admin-tier-edit-dialog"
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableToolbarProps,
} from "@/components/data-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { useAdminTiers } from "@/hooks/use-admin"
import { TIER_ENTITLEMENTS } from "@/lib/tier-entitlements"

export function AdminTiersTable() {
  const [editTierId, setEditTierId] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<TierRead | null>(null)
  const { tiers, deleteTier } = useAdminTiers()

  const handleDeleteTier = async () => {
    if (selectedTier) {
      try {
        await deleteTier(selectedTier.id)
        toast({
          title: "已删除套餐",
          description: `已删除 ${selectedTier.display_name}。`,
        })
      } catch (error) {
        console.error("Failed to delete tier", error)
        toast({
          title: "删除套餐失败",
          description: "此套餐可能仍分配给某些组织，请先移除所有分配关系。",
          variant: "destructive",
        })
      } finally {
        setSelectedTier(null)
      }
    }
  }

  return (
    <>
      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedTier(null)
          }
        }}
      >
        <DataTable
          data={tiers ?? []}
          columns={[
            {
              accessorKey: "display_name",
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
                  onClick={() => setEditTierId(row.original.id)}
                >
                  {row.getValue<TierRead["display_name"]>("display_name")}
                </button>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "is_default",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"默认"}
                />
              ),
              cell: ({ row }) =>
                row.getValue<TierRead["is_default"]>("is_default") ? (
                  <div className="flex items-center text-xs font-medium">
                    <CheckIcon aria-label={"默认套餐"} className="size-4" />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">-</div>
                ),
              enableSorting: true,
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
              cell: ({ row }) => {
                const isActive =
                  row.getValue<TierRead["is_active"]>("is_active")
                return (
                  <div className="flex items-center text-xs">
                    {isActive ? (
                      <CheckIcon aria-label={"启用的套餐"} className="size-4" />
                    ) : (
                      <Cross2Icon
                        aria-label={"停用的套餐"}
                        className="size-4 text-muted-foreground"
                      />
                    )}
                  </div>
                )
              },
              enableSorting: true,
              enableHiding: false,
            },
            {
              id: "entitlements",
              accessorFn: (row) =>
                getEnabledEntitlements(row)
                  .map((item) => item.label)
                  .join(", "),
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"功能权益"}
                />
              ),
              cell: ({ row }) => {
                const enabledEntitlements = getEnabledEntitlements(row.original)
                return (
                  <div className="text-xs text-muted-foreground">
                    {enabledEntitlements.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {enabledEntitlements.map((item) => (
                          <span key={item.key}>{item.label}</span>
                        ))}
                      </div>
                    ) : (
                      "无"
                    )}
                  </div>
                )
              },
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "max_concurrent_workflows",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"最大工作流数"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs text-muted-foreground">
                  {row.getValue<TierRead["max_concurrent_workflows"]>(
                    "max_concurrent_workflows"
                  ) ?? "不限制"}
                </div>
              ),
              enableSorting: true,
              enableHiding: true,
            },
            {
              accessorKey: "max_action_executions_per_workflow",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"每个工作流的最大动作数"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs text-muted-foreground">
                  {row.getValue<TierRead["max_action_executions_per_workflow"]>(
                    "max_action_executions_per_workflow"
                  ) ?? "不限制"}
                </div>
              ),
              enableSorting: true,
              enableHiding: true,
            },
            {
              accessorKey: "api_rate_limit",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"API 速率限制"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs text-muted-foreground">
                  {row.getValue<TierRead["api_rate_limit"]>("api_rate_limit") ??
                    "不限制"}
                </div>
              ),
              enableSorting: true,
              enableHiding: true,
            },
            {
              id: "actions",
              enableHiding: false,
              cell: ({ row }) => {
                const tier = row.original

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
                        onClick={() => navigator.clipboard.writeText(tier.id)}
                      >
                        复制 ID
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEditTierId(tier.id)}>
                        编辑套餐
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-600"
                          disabled={tier.is_default}
                          onClick={() => setSelectedTier(tier)}
                        >
                          {tier.is_default ? "无法删除默认套餐" : "删除"}
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              },
            },
          ]}
          toolbarProps={defaultToolbarProps}
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除套餐</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除套餐“
              {selectedTier?.display_name}
              ”吗？此操作无法撤销。使用此套餐的组织需要重新分配套餐。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteTier}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {editTierId && (
        <AdminTierEditDialog
          tierId={editTierId}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditTierId(null)
            }
          }}
        />
      )}
    </>
  )
}

const defaultToolbarProps: DataTableToolbarProps<TierRead> = {
  filterProps: {
    placeholder: "筛选套餐…",
    column: "display_name",
  },
}

function getEnabledEntitlements(tier: TierRead) {
  return TIER_ENTITLEMENTS.filter(
    (entitlement) => tier.entitlements[entitlement.key] === true
  )
}
