"use client"

import { Loader2, LockIcon, TextSearchIcon } from "lucide-react"
import { useRef, useState } from "react"
import type { TableSearchDisplayState } from "@/client"
import { TableSearchLockedModal } from "@/components/tables/table-search-column-control"
import { useTableSearchContext } from "@/components/tables/table-search-context"
import { TableSearchProgress } from "@/components/tables/table-search-progress"
import { badgeVariants } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { useTableSearch } from "@/hooks/use-table-search"
import { useGetTable } from "@/lib/hooks"
import { cn } from "@/lib/utils"

type TableSearchState = Pick<
  ReturnType<typeof useTableSearch>,
  "configuration" | "provider"
>

const STATUS_LABELS: Record<TableSearchDisplayState, string> = {
  disabled: "关闭",
  unavailable: "不可用",
  indexing: "正在建立索引",
  ready: "就绪",
  updating: "正在建立索引",
  needs_attention: "需要处理",
}

const TONE_CLASS_NAMES: Record<string, string> = {
  需要处理: "border-amber-500",
  关闭: "text-muted-foreground",
  不可用: "text-muted-foreground",
}

const PENDING_LABELS = new Set(["正在检查状态", "正在建立索引"])

/** Derive the status label shown for a table's semantic search index. */
export function tableSearchStatusLabel({
  configuration,
  provider,
}: TableSearchState) {
  const selected = (configuration.data?.selected_column_ids?.length ?? 0) > 0
  if (configuration.isPending || provider.isPending) return "正在检查状态"
  if (configuration.error || provider.error) return "需要处理"
  if (!provider.data?.available || provider.data.state === "paused")
    return "不可用"
  if (selected && provider.data.reindex_required) return "正在建立索引"
  return STATUS_LABELS[configuration.data?.status ?? "disabled"]
}

function problemMessage({ configuration, provider }: TableSearchState) {
  if (configuration.error || provider.error) return "无法加载搜索状态。"
  if (provider.isPending) return null
  if (provider.data?.state === "paused") return "语义搜索已暂停。"
  if (!provider.data?.available) return "尚未配置嵌入模型提供商。"
  return null
}

/** Show a table's semantic search status in the page header, with details on hover or click. */
export function TableSearchBadge() {
  const search = useTableSearchContext()
  const { table } = useGetTable(
    { tableId: search?.tableId ?? "", workspaceId: search?.workspaceId ?? "" },
    { enabled: search?.canRead === true && search.entitled }
  )
  const [open, setOpen] = useState(false)
  const [lockedOpen, setLockedOpen] = useState(false)
  const hovering = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()
  if (!search?.canRead) return null
  if (search.locked)
    return (
      <>
        <button
          type="button"
          aria-label={"语义搜索：仅限企业版"}
          className={cn(
            badgeVariants({ variant: "outline" }),
            "h-7 gap-1.5 whitespace-nowrap px-2 font-medium text-muted-foreground focus:ring-0 focus-visible:ring-1"
          )}
          onClick={() => setLockedOpen(true)}
        >
          <LockIcon className="size-3" />
          语义搜索
        </button>
        <TableSearchLockedModal
          open={lockedOpen}
          onOpenChange={setLockedOpen}
        />
      </>
    )
  if (!search.entitled) return null
  const hoverProps = {
    onPointerEnter: () => {
      clearTimeout(closeTimer.current)
      hovering.current = true
      setOpen(true)
    },
    onPointerLeave: () => {
      hovering.current = false
      closeTimer.current = setTimeout(() => setOpen(false), 150)
    },
  }
  const { configuration, provider, canUpdate } = search
  const label = tableSearchStatusLabel(search)
  const pending = PENDING_LABELS.has(label)
  const selectedColumnIds = configuration.data?.selected_column_ids ?? []
  const selected = selectedColumnIds.length > 0
  const selectedColumnNames = table?.columns
    .filter((column) => selectedColumnIds.includes(column.id))
    .map((column) => column.name)
  const index = configuration.data?.index
  const destination = provider.data?.configuration
  const problem = problemMessage(search)
  const Icon = pending ? Loader2 : TextSearchIcon
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`语义搜索：${label}`}
          className={cn(
            badgeVariants({ variant: "outline" }),
            "h-7 cursor-default gap-1.5 whitespace-nowrap px-2 font-medium focus:ring-0 focus-visible:ring-1",
            TONE_CLASS_NAMES[label]
          )}
          {...hoverProps}
          onClick={(event) => {
            // Open only; hovering already opened it, so a click must not toggle it shut.
            event.preventDefault()
            setOpen(true)
          }}
        >
          <Icon className={cn("size-3", pending && "animate-spin")} />
          {label === "就绪" ? `${selectedColumnIds.length} 语义搜索` : label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 space-y-1 p-3 text-xs"
        {...hoverProps}
        onOpenAutoFocus={(event) => {
          // Move focus inside only for keyboard and click opens.
          if (hovering.current) event.preventDefault()
        }}
      >
        <p className="font-medium">语义搜索</p>
        {destination && (
          <p className="text-muted-foreground">
            模型： {destination.provider} / {destination.model}
          </p>
        )}
        {selected && (
          <p className="text-muted-foreground">
            列： {selectedColumnNames?.join(", ")}
          </p>
        )}
        {selected && index && (
          <p className="text-muted-foreground">
            {index.ready ?? 0} 就绪 · {index.pending ?? 0} 等待 ·{" "}
            {index.failed ?? 0} 失败 · {index.empty ?? 0} 空
          </p>
        )}
        {problem && (
          <p role="alert" className="text-muted-foreground">
            {problem}
          </p>
        )}
        {selected && canUpdate && (index?.failed ?? 0) > 0 && (
          <div className="pt-2 text-muted-foreground">
            <TableSearchProgress />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
