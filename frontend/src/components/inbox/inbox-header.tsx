"use client"

import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  FilterIcon,
  HashIcon,
  LayersIcon,
  XIcon,
} from "lucide-react"
import type { AgentSessionEntity } from "@/client"
import { ListHeaderSearch } from "@/components/list-header-search"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DateFilterValue } from "@/hooks/use-inbox"
import { cn } from "@/lib/utils"

const ENTITY_TYPE_OPTIONS: Array<{
  value: AgentSessionEntity | "all"
  label: string
}> = [
  { value: "all", label: "所有类型" },
  { value: "case", label: "事件" },
  { value: "agent_preset", label: "智能体预设" },
  { value: "agent_preset_builder", label: "智能体预设编辑器" },
  { value: "workflow", label: "工作流" },
  { value: "copilot", label: "助手" },
  { value: "approval", label: "审批" },
  { value: "external_channel", label: "外部渠道" },
]

const LIMIT_OPTIONS = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 50, label: "50" },
]

const DATE_FILTER_OPTIONS: Array<{
  value: DateFilterValue
  label: string
}> = [
  { value: null, label: "不限时间" },
  { value: "1d", label: "1 天前" },
  { value: "3d", label: "3 天前" },
  { value: "1w", label: "1 周前" },
  { value: "1m", label: "1 个月前" },
]

interface InboxHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  entityType: AgentSessionEntity | "all"
  onEntityTypeChange: (type: AgentSessionEntity | "all") => void
  limit: number
  onLimitChange: (limit: number) => void
  updatedAfter: DateFilterValue
  onUpdatedAfterChange: (value: DateFilterValue) => void
  createdAfter: DateFilterValue
  onCreatedAfterChange: (value: DateFilterValue) => void
  caseId: string | null
  onClearCaseFilter: () => void
}

export function InboxHeader({
  searchQuery,
  onSearchChange,
  entityType,
  onEntityTypeChange,
  limit,
  onLimitChange,
  updatedAfter,
  onUpdatedAfterChange,
  createdAfter,
  onCreatedAfterChange,
  caseId,
  onClearCaseFilter,
}: InboxHeaderProps) {
  // Count only non-default filters (don't count limit since it always has a value)
  const activeFilterCount =
    (entityType !== "all" ? 1 : 0) +
    (updatedAfter !== null ? 1 : 0) +
    (createdAfter !== null ? 1 : 0) +
    (caseId ? 1 : 0)

  return (
    <header className="flex h-10 shrink-0 items-center gap-3 border-b pl-3 pr-4">
      <ListHeaderSearch
        placeholder={"搜索会话…"}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      >
        {caseId ? (
          <div
            className="flex h-6 max-w-56 items-center gap-1.5 rounded-md border bg-muted/40 px-2 text-xs"
            title={caseId}
          >
            <span className="shrink-0 text-muted-foreground">已按事件筛选</span>
            <span className="truncate font-mono">{caseId.slice(0, 8)}</span>
            <button
              type="button"
              aria-label={"清除事件筛选"}
              className="ml-0.5 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={onClearCaseFilter}
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ) : null}
      </ListHeaderSearch>

      {/* Right section: Filter dropdown */}
      <div className="flex items-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                "hover:bg-muted text-foreground"
              )}
            >
              <FilterIcon className="size-3.5" />
              <span>筛选</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Type filter submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <LayersIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="shrink-0">输入</span>
                {entityType !== "all" && (
                  <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType)
                      ?.label ?? entityType}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-40">
                  {ENTITY_TYPE_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onEntityTypeChange(option.value)}
                      className="flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {entityType === option.value && (
                        <CheckIcon className="size-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            {/* Updated filter submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="shrink-0">更新时间</span>
                {updatedAfter && (
                  <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {DATE_FILTER_OPTIONS.find((o) => o.value === updatedAfter)
                      ?.label ?? updatedAfter}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-32">
                  {DATE_FILTER_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value ?? "any"}
                      onClick={() => onUpdatedAfterChange(option.value)}
                      className="flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {updatedAfter === option.value && (
                        <CheckIcon className="size-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            {/* Created filter submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="shrink-0">创建时间</span>
                {createdAfter && (
                  <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {DATE_FILTER_OPTIONS.find((o) => o.value === createdAfter)
                      ?.label ?? createdAfter}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-32">
                  {DATE_FILTER_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value ?? "any"}
                      onClick={() => onCreatedAfterChange(option.value)}
                      className="flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {createdAfter === option.value && (
                        <CheckIcon className="size-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            {/* Limit filter submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <HashIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="shrink-0">限制</span>
                <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {limit}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-24">
                  {LIMIT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onLimitChange(option.value)}
                      className="flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {limit === option.value && (
                        <CheckIcon className="size-4" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
