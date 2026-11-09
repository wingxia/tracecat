"use client"

import { LockIcon, SearchXIcon, TextSearchIcon } from "lucide-react"
import type { MouseEvent } from "react"
import type { TableColumnRead } from "@/client"
import { Spinner } from "@/components/loading/spinner"
import { LockedFeatureModal } from "@/components/locked-feature-modal"
import { useTableSearchContext } from "@/components/tables/table-search-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"

function isTextColumn(column: TableColumnRead) {
  return column.type.toUpperCase() === "TEXT"
}

/** Enterprise only dialog shown when an unentitled org opens semantic search. */
export function TableSearchLockedModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <LockedFeatureModal
      open={open}
      onOpenChange={onOpenChange}
      title={"仅限企业版"}
      description={"语义搜索仅适用于企业版套餐。"}
      bullets={[]}
    />
  )
}

/** Column menu item that opens the enable or disable vector search confirm. */
export function TableSearchColumnMenuItem({
  column,
  onSelectAction,
}: {
  column: TableColumnRead
  onSelectAction: (enabled: boolean) => void
}) {
  const search = useTableSearchContext()
  if (!search?.canRead || !isTextColumn(column)) return null
  if (search.locked)
    return (
      <DropdownMenuItem
        className="py-1 text-xs text-foreground/80"
        onSelect={() => onSelectAction(true)}
      >
        <TextSearchIcon className="mr-2 size-3 group-hover/item:text-accent-foreground" />
        启用向量搜索
        <LockIcon className="ml-3 size-3 text-muted-foreground" />
      </DropdownMenuItem>
    )
  if (!search.entitled) return null
  const { configuration, provider, selection, retry, canUpdate } = search
  const selected =
    configuration.data?.selected_column_ids?.includes(column.id) ?? false
  const unavailable =
    !provider.data?.available || provider.data.state === "paused"
  const Icon = selected ? SearchXIcon : TextSearchIcon
  return (
    <DropdownMenuItem
      className="py-1 text-xs text-foreground/80"
      disabled={
        !canUpdate ||
        selection.isPending ||
        retry.isPending ||
        configuration.isFetching ||
        !configuration.data ||
        Boolean(configuration.error) ||
        ((unavailable || Boolean(provider.error)) && !selected)
      }
      onSelect={() => onSelectAction(!selected)}
    >
      <Icon className="mr-2 size-3 group-hover/item:text-accent-foreground" />
      {selected ? "禁用向量搜索" : "启用向量搜索"}
    </DropdownMenuItem>
  )
}

/** Confirm adding a TEXT column to, or removing it from, vector search. */
export function TableSearchColumnDialog({
  column,
  enabled,
  open,
  onOpenChange,
}: {
  column: TableColumnRead
  enabled: boolean
  open: boolean
  onOpenChange: () => void
}) {
  const search = useTableSearchContext()
  if (!search?.canRead || !isTextColumn(column)) return null
  if (search.locked)
    return enabled ? (
      <TableSearchLockedModal
        open={open}
        onOpenChange={(next) => !next && onOpenChange()}
      />
    ) : null
  if (!search.entitled) return null
  const { provider, selection } = search
  const destination = provider.data?.configuration
  const title = enabled ? "启用向量搜索" : "禁用向量搜索"
  const Icon = enabled ? TextSearchIcon : SearchXIcon

  const handleConfirm = async (event: MouseEvent) => {
    // Keep the dialog open until the write is confirmed.
    event.preventDefault()
    try {
      await selection.mutateAsync({ columnId: column.id, enabled })
      toast({
        title: enabled ? "已启用向量搜索" : "已禁用向量搜索",
        description: enabled
          ? "已开始为此列建立索引。"
          : "此列已不参与向量搜索。",
      })
      onOpenChange()
    } catch {
      // The mutation's own error handler shows the failure toast.
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={() => {
        if (!selection.isPending) {
          onOpenChange()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {enabled
              ? `将为列 ${column.name} 中的文本建立向量搜索索引。`
              : `将从向量搜索中移除列 ${column.name}，并为其余列重建索引。`}
            {enabled &&
              destination &&
              ` 文本将发送至 ${destination.provider} / ${destination.model}。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={selection.isPending}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={selection.isPending}
            variant={enabled ? undefined : "destructive"}
          >
            {selection.isPending ? (
              <>
                <Spinner />
                {enabled ? "启用中…" : "禁用中…"}
              </>
            ) : (
              <>
                <Icon className="mr-2 size-4" />
                {title}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
