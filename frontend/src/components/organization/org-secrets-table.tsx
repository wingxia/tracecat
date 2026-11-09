"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { useState } from "react"
import type { SecretReadMinimal } from "@/client"
import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import {
  DeleteOrgSecretAlertDialog,
  DeleteOrgSecretAlertDialogTrigger,
} from "@/components/organization/org-secret-delete"
import {
  UpdateOrgSecretDialog,
  UpdateOrgSecretDialogTrigger,
} from "@/components/organization/org-secret-update"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOrgSecrets } from "@/lib/hooks"

export function OrgSecretsTable() {
  const { orgSecrets, orgSecretsIsLoading, orgSecretsError } = useOrgSecrets()
  const [selectedSecret, setSelectedSecret] =
    useState<SecretReadMinimal | null>(null)
  if (orgSecretsIsLoading) {
    return <CenteredSpinner />
  }
  if (orgSecretsError || !orgSecrets) {
    return (
      <AlertNotification
        level="error"
        message={`加载密钥出错：${orgSecretsError?.message || "Secrets undefined"}`}
      />
    )
  }

  return (
    <DeleteOrgSecretAlertDialog
      selectedSecret={selectedSecret}
      setSelectedSecret={setSelectedSecret}
    >
      <UpdateOrgSecretDialog
        selectedSecret={selectedSecret}
        setSelectedSecret={setSelectedSecret}
      >
        <DataTable
          data={orgSecrets}
          columns={[
            {
              accessorKey: "name",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"密钥名称"}
                />
              ),
              cell: ({ row }) => (
                <div className="font-mono text-xs">
                  {row.getValue<SecretReadMinimal["name"]>("name")}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "description",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"描述"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs">
                  {row.getValue<SecretReadMinimal["description"]>(
                    "description"
                  ) || "-"}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "environment",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"环境"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs">
                  {row.getValue<SecretReadMinimal["environment"]>(
                    "environment"
                  ) || "-"}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "keys",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"密钥字段"}
                />
              ),
              cell: ({ row }) => {
                const keys = row.getValue<SecretReadMinimal["keys"]>("keys")
                return (
                  <div className="flex-auto space-x-4 text-xs">
                    {keys.map((key, idx) => (
                      <Badge
                        variant="secondary"
                        className="font-mono text-xs"
                        key={idx}
                      >
                        {key}
                      </Badge>
                    ))}
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
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          navigator.clipboard.writeText(row.original.id)
                        }
                      >
                        复制密钥 ID
                      </DropdownMenuItem>

                      <UpdateOrgSecretDialogTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => {
                            if (!row.original) {
                              console.error("No secret to edit")
                              return
                            }
                            setSelectedSecret(row.original)
                            console.debug(
                              "Selected secret to edit",
                              row.original
                            )
                          }}
                        >
                          编辑
                        </DropdownMenuItem>
                      </UpdateOrgSecretDialogTrigger>

                      <DeleteOrgSecretAlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-600"
                          onClick={() => {
                            setSelectedSecret(row.original)
                            console.debug(
                              "Selected secret to delete",
                              row.original
                            )
                          }}
                        >
                          删除
                        </DropdownMenuItem>
                      </DeleteOrgSecretAlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              },
            },
          ]}
          toolbarProps={{
            filterProps: {
              placeholder: "按名称筛选密钥…",
              column: "name",
            },
          }}
        />
      </UpdateOrgSecretDialog>
    </DeleteOrgSecretAlertDialog>
  )
}
