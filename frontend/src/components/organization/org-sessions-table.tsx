"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { useCallback, useState } from "react"
import type { SessionRead } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
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
import { Dialog } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getRelativeTime } from "@/lib/event-history"
import { useSessions } from "@/lib/hooks"

export function OrgSessionsTable() {
  const [selectedSession, setSelectedSession] = useState<SessionRead | null>(
    null
  )
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false)
  const canRemoveSession = useScopeCheck("org:member:remove")
  const { sessions, deleteSession } = useSessions()

  const handleRevokeSession = useCallback(async () => {
    if (!selectedSession) {
      return
    }
    try {
      await deleteSession({ sessionId: selectedSession.id })
    } catch (error) {
      console.error("Error deleting session", error)
    }
  }, [selectedSession, deleteSession])

  // Since this is the org members table, should only superusers be able to change roles?
  return (
    <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedSession(null)
          }
        }}
      >
        <DataTable
          data={sessions}
          initialSortingState={[{ id: "created_at", desc: true }]}
          columns={[
            {
              accessorKey: "user_email",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"邮箱"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs">
                  {row.getValue<SessionRead["user_email"]>("user_email")}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "created_at",
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={"创建时间"} />
              ),
              cell: ({ row }) => {
                const createdAt =
                  row.getValue<SessionRead["created_at"]>("created_at")
                const date = new Date(createdAt)
                const ago = getRelativeTime(date)
                return (
                  <div className="space-x-2 text-xs">
                    <span>{date.toLocaleString("zh-CN")}</span>
                    <span className="text-muted-foreground">({ago})</span>
                  </div>
                )
              },
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "last_seen_at",
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={"最近出现"} />
              ),
              cell: ({ row }) => {
                const lastSeenAt =
                  row.getValue<SessionRead["last_seen_at"]>("last_seen_at")
                if (!lastSeenAt) {
                  return <div className="text-xs text-muted-foreground">-</div>
                }
                const date = new Date(lastSeenAt)
                return (
                  <div className="space-x-2 text-xs">
                    <span>{date.toLocaleString("zh-CN")}</span>
                    <span className="text-muted-foreground">
                      ({getRelativeTime(date)})
                    </span>
                  </div>
                )
              },
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "ip_address",
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={"IP 地址"} />
              ),
              cell: ({ row }) => (
                <div className="font-mono text-xs">
                  {row.getValue<SessionRead["ip_address"]>("ip_address") ?? "-"}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "user_agent",
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={"用户代理"} />
              ),
              cell: ({ row }) => {
                const userAgent =
                  row.getValue<SessionRead["user_agent"]>("user_agent")
                if (!userAgent) {
                  return <div className="text-xs text-muted-foreground">-</div>
                }
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="max-w-[240px] truncate text-xs">
                        {userAgent}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[480px] break-all">
                      {userAgent}
                    </TooltipContent>
                  </Tooltip>
                )
              },
              enableSorting: false,
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
                          navigator.clipboard.writeText(row.original.user_id)
                        }
                      >
                        复制用户 ID
                      </DropdownMenuItem>
                      {canRemoveSession === true && (
                        <DropdownMenuGroup>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-rose-500 focus:text-rose-600"
                              onClick={() => setSelectedSession(row.original)}
                            >
                              撤销会话
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuGroup>
                      )}
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
            <AlertDialogTitle>撤销会话</AlertDialogTitle>
            <AlertDialogDescription>
              确定要撤销以下用户的会话：{" "}
              <span className="font-semibold">
                {selectedSession?.user_email}
              </span>{" "}
              ，创建于{" "}
              <span className="font-semibold">
                {selectedSession &&
                  new Date(selectedSession.created_at).toLocaleString("zh-CN")}
              </span>
              。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRevokeSession}
            >
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

const defaultToolbarProps: DataTableToolbarProps<SessionRead> = {
  filterProps: {
    placeholder: "按用户邮箱筛选会话…",
    column: "user_email",
  },
}
