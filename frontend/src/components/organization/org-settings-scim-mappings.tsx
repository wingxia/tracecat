"use client"

import {
  AlertTriangleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import type {
  ExternalGroupMappingRead,
  ExternalGroupRead,
  ScimConnectionStatus,
} from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckIndicator } from "@/components/ui/check-indicator"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useScimExternalGroups, useScimMappings } from "@/hooks/use-scim"
import { useRbacGroups } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/** A mapping the admin has proposed but not applied. */
export type ScimMappingDraft = Pick<
  ExternalGroupMappingRead,
  | "external_group_id"
  | "external_group_display_name"
  | "group_id"
  | "group_name"
>

type Target = ScimMappingDraft & { mapping?: ExternalGroupMappingRead }

function ErrorAlert({ title, children }: { title: string; children?: string }) {
  return (
    <Alert>
      <AlertTriangleIcon className="size-4 !text-destructive" />
      <AlertTitle className="text-destructive">{title}</AlertTitle>
      {children ? <AlertDescription>{children}</AlertDescription> : null}
    </Alert>
  )
}

/**
 * Map synced IdP groups onto Tracecat groups, one row per IdP group.
 *
 * Every change is a local draft. Pending connections apply drafts on
 * activation; active ones apply them together after one review.
 */
export function OrgSettingsScimMappings({
  connected,
  status,
  revoked,
  drafts,
  removals,
  reviewIsPending,
  onAdd,
  onRemove,
  onDiscardDrafts,
  onReviewChanges,
}: {
  connected: boolean
  status?: ScimConnectionStatus
  revoked: boolean
  drafts: ScimMappingDraft[]
  removals: ExternalGroupMappingRead[]
  reviewIsPending: boolean
  onAdd: (draft: ScimMappingDraft) => void
  onRemove: (
    draft: ScimMappingDraft,
    mapping?: ExternalGroupMappingRead
  ) => void
  onDiscardDrafts: () => void
  onReviewChanges: () => void
}) {
  const canManage = useScopeCheck("org:scim:manage") === true
  const isPending = status === "pending"
  const canEdit = canManage && !revoked && (isPending || status === "active")

  const [query, setQuery] = useState("")

  const {
    externalGroups,
    externalGroupsIsLoading,
    externalGroupsError,
    externalGroupsHasNextPage,
    externalGroupsIsFetchingNextPage,
    fetchNextExternalGroups,
  } = useScimExternalGroups({ poll: isPending && !revoked })
  const {
    mappings,
    mappingsIsLoading,
    mappingsError,
    mappingsHasNextPage,
    mappingsIsFetchingNextPage,
    fetchNextMappings,
  } = useScimMappings()
  const mappingsIncomplete =
    !isPending && (Boolean(mappingsHasNextPage) || Boolean(mappingsError))
  const {
    groups,
    isLoading: groupsIsLoading,
    error: groupsError,
  } = useRbacGroups()

  const header = (
    <div className="flex items-end gap-4">
      <div className="flex-1 space-y-1">
        <h3 className="text-lg font-medium">用户组映射</h3>
        <p className="text-sm text-muted-foreground">
          未映射的用户组不会授予任何访问权限。
        </p>
      </div>
      {externalGroups && externalGroups.length > 0 ? (
        <div className="relative w-60">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={"搜索用户组"}
            aria-label={"搜索用户组"}
            className="h-8 pl-8 text-sm"
          />
        </div>
      ) : null}
    </div>
  )

  if (!connected) {
    return (
      <div className="space-y-4">
        {header}
        <Empty className="gap-4 rounded-lg border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>请先连接 SCIM</EmptyTitle>
            <EmptyDescription>
              在上方生成连接令牌，再在身份提供商中配置
              Tracecat。推送的用户组会显示在此处供你映射。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  // A pending connection edits drafts only, so live mappings cannot block it.
  if (
    externalGroupsIsLoading ||
    (!isPending && mappingsIsLoading) ||
    groupsIsLoading
  ) {
    return (
      <div className="space-y-4">
        {header}
        <CenteredSpinner />
      </div>
    )
  }

  if (
    (externalGroupsError && !externalGroups?.length) ||
    (!isPending && mappingsError && !mappings?.length) ||
    groupsError
  ) {
    return (
      <div className="space-y-4">
        {header}
        <ErrorAlert title={"无法加载用户组映射"}>
          请重新加载页面后重试。
        </ErrorAlert>
      </div>
    )
  }

  const allGroups = externalGroups ?? []
  const tracecatGroups = groups ?? []

  function targetsFor(group: ExternalGroupRead): Target[] {
    if (isPending) {
      return drafts.filter((draft) => draft.external_group_id === group.id)
    }
    const removed = new Set(removals.map((mapping) => mapping.id))
    const live: Target[] = (mappings ?? [])
      .filter(
        (mapping) =>
          mapping.external_group_id === group.id && !removed.has(mapping.id)
      )
      .map((mapping) => ({ ...mapping, mapping }))
    return [
      ...live,
      ...drafts.filter((draft) => draft.external_group_id === group.id),
    ]
  }

  const rows = allGroups.map((group) => ({ group, targets: targetsFor(group) }))
  const needle = query.trim().toLowerCase()
  const visibleRows = rows.filter(
    (row) => !needle || row.group.display_name.toLowerCase().includes(needle)
  )

  return (
    <div className="space-y-4">
      {header}
      {status === "disabled" && (
        <ErrorAlert title={"SCIM 已断开"}>生成新令牌以重新连接。</ErrorAlert>
      )}
      {revoked && status !== "disabled" && (
        <ErrorAlert title={"令牌已撤销"}>
          更改 SCIM 配置前，请先轮换令牌。
        </ErrorAlert>
      )}

      {allGroups.length === 0 ? (
        <Empty className="gap-4 rounded-lg border py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>暂无已同步用户组</EmptyTitle>
            <EmptyDescription>
              在身份提供商中将用户组分配给 Tracecat
              应用。推送完成后会显示在此处。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>IdP 用户组</TableHead>
                <TableHead className="w-24">成员</TableHead>
                <TableHead className="w-8" />
                <TableHead className="w-[320px]">Tracecat 用户组</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map(({ group, targets }) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  <TableCell className="align-top font-medium">
                    <RowLine>{group.display_name}</RowLine>
                  </TableCell>
                  <TableCell className="align-top text-muted-foreground">
                    <RowLine>{group.member_count}</RowLine>
                  </TableCell>
                  <TableCell className="align-top px-0">
                    <RowLine className="justify-center">
                      <ArrowRightIcon className="size-4 text-muted-foreground/60" />
                    </RowLine>
                  </TableCell>
                  <TableCell className="align-top">
                    {mappingsIncomplete ? (
                      <RowLine className="text-muted-foreground">
                        加载全部映射以查看选择。
                      </RowLine>
                    ) : (
                      <TargetPicker
                        group={group}
                        targets={targets}
                        tracecatGroups={tracecatGroups}
                        disabled={!canEdit || reviewIsPending}
                        onAdd={onAdd}
                        onRemove={(target) => {
                          onRemove(target, target.mapping)
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    没有匹配的用户组。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <ListFooter
            isPending={isPending}
            changeCount={drafts.length + removals.length}
            reviewIsPending={reviewIsPending || mappingsIncomplete}
            onDiscardDrafts={onDiscardDrafts}
            onReviewChanges={onReviewChanges}
            externalGroupsError={Boolean(externalGroupsError)}
            externalGroupsHasNextPage={Boolean(externalGroupsHasNextPage)}
            externalGroupsIsFetchingNextPage={externalGroupsIsFetchingNextPage}
            fetchNextExternalGroups={() => void fetchNextExternalGroups()}
            mappingsError={Boolean(mappingsError)}
            mappingsHasNextPage={Boolean(mappingsHasNextPage)}
            mappingsIsFetchingNextPage={mappingsIsFetchingNextPage}
            fetchNextMappings={() => void fetchNextMappings()}
          />
        </div>
      )}
    </div>
  )
}

/** Centers a cell's content on the picker's first line. */
function RowLine({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex h-9 items-center", className)}>{children}</div>
  )
}

/** One picker per IdP group: shows its Tracecat groups, toggles each one. */
function TargetPicker({
  group,
  targets,
  tracecatGroups,
  disabled,
  onAdd,
  onRemove,
}: {
  group: ExternalGroupRead
  targets: Target[]
  tracecatGroups: { id: string; name: string }[]
  disabled: boolean
  onAdd: (draft: ScimMappingDraft) => void
  onRemove: (target: Target) => void
}) {
  const [open, setOpen] = useState(false)
  const names = targets
    .map((target) => target.group_name)
    .sort((a, b) => a.localeCompare(b))
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          aria-label={`${group.display_name} 的 Tracecat 用户组`}
          className={cn(
            "h-auto min-h-9 w-full items-start justify-between whitespace-normal px-3 py-[7px] font-normal shadow-none",
            names.length === 0 &&
              "border-dashed bg-muted/30 text-muted-foreground"
          )}
        >
          <span className="flex min-w-0 flex-col text-left">
            {names.length === 0 ? (
              <span>未映射</span>
            ) : (
              names.map((name) => (
                <span key={name} className="truncate">
                  {name}
                </span>
              ))
            )}
          </span>
          <span className="flex h-5 items-center">
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput
            placeholder={"搜索 Tracecat 用户组"}
            className="text-sm"
          />
          <CommandList>
            <CommandEmpty>未找到用户组。</CommandEmpty>
            <CommandGroup>
              {tracecatGroups.map((candidate) => {
                const target = targets.find(
                  (item) => item.group_id === candidate.id
                )
                return (
                  <CommandItem
                    key={candidate.id}
                    value={candidate.id}
                    keywords={[candidate.name]}
                    onSelect={() => {
                      if (target) {
                        onRemove(target)
                        return
                      }
                      onAdd({
                        external_group_id: group.id,
                        external_group_display_name: group.display_name,
                        group_id: candidate.id,
                        group_name: candidate.name,
                      })
                    }}
                  >
                    <CheckIndicator checked={Boolean(target)} />
                    <span className="truncate">{candidate.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ListFooter({
  isPending,
  changeCount,
  reviewIsPending,
  onDiscardDrafts,
  onReviewChanges,
  externalGroupsError,
  externalGroupsHasNextPage,
  externalGroupsIsFetchingNextPage,
  fetchNextExternalGroups,
  mappingsError,
  mappingsHasNextPage,
  mappingsIsFetchingNextPage,
  fetchNextMappings,
}: {
  isPending: boolean
  changeCount: number
  reviewIsPending: boolean
  onDiscardDrafts: () => void
  onReviewChanges: () => void
  externalGroupsError: boolean
  externalGroupsHasNextPage: boolean
  externalGroupsIsFetchingNextPage: boolean
  fetchNextExternalGroups: () => void
  mappingsError: boolean
  mappingsHasNextPage: boolean
  mappingsIsFetchingNextPage: boolean
  fetchNextMappings: () => void
}) {
  const showDrafts = changeCount > 0
  const showMappingPages = !isPending && (mappingsHasNextPage || mappingsError)
  if (
    !showDrafts &&
    !showMappingPages &&
    !externalGroupsHasNextPage &&
    !externalGroupsError
  ) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-3 border-t bg-muted/30 px-4 py-2.5 text-sm">
      {showDrafts ? (
        <span className="flex-1 text-muted-foreground">
          {changeCount} {changeCount === 1 ? "项草稿将生效" : "项草稿将生效"}{" "}
          {isPending ? "，时间为激活后。" : "，时间为审核后。"}
        </span>
      ) : (
        <span className="flex-1" />
      )}
      {externalGroupsError && (
        <span role="alert" className="text-muted-foreground">
          无法加载更多用户组。
        </span>
      )}
      {(externalGroupsHasNextPage || externalGroupsError) && (
        <Button
          variant="outline"
          size="sm"
          disabled={externalGroupsIsFetchingNextPage}
          onClick={fetchNextExternalGroups}
        >
          {externalGroupsIsFetchingNextPage
            ? "正在加载用户组…"
            : "加载更多用户组"}
        </Button>
      )}
      {!isPending && mappingsError && (
        <span role="alert" className="text-muted-foreground">
          无法加载更多映射。
        </span>
      )}
      {showMappingPages && (
        <Button
          variant="outline"
          size="sm"
          disabled={mappingsIsFetchingNextPage}
          onClick={fetchNextMappings}
        >
          {mappingsIsFetchingNextPage ? "正在加载映射…" : "加载更多映射"}
        </Button>
      )}
      {showDrafts && (
        <Button
          variant="ghost"
          size="sm"
          disabled={reviewIsPending}
          onClick={onDiscardDrafts}
        >
          放弃草稿
        </Button>
      )}
      {showDrafts && !isPending && (
        <Button size="sm" disabled={reviewIsPending} onClick={onReviewChanges}>
          审核更改
        </Button>
      )}
    </div>
  )
}
