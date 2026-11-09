"use client"

import { ChevronRightIcon, Loader2 } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import type {
  ScimActivationReviewRead,
  ScimGroupTransitionRead,
  ScimReviewPeople,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatRelative } from "@/lib/time"
import { cn } from "@/lib/utils"

type Section = "leave" | "lose" | "join" | "to_idp" | "to_manual"

type PersonLine = { key: string; email: string; note?: string }

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function Avatar({ email, stacked }: { email: string; stacked?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground",
        stacked && "-ml-2 border-2 border-background first:ml-0"
      )}
    >
      {(email[0] ?? "?").toUpperCase()}
    </span>
  )
}

/** People rows; scrolls once expanded past the preview. */
function PeopleList({
  lines,
  expanded,
  loading,
}: {
  lines: PersonLine[]
  expanded: boolean
  loading: boolean
}) {
  return (
    <div
      className={cn(
        "divide-y rounded-md border",
        expanded && "max-h-72 overflow-y-auto"
      )}
    >
      {lines.map((line) => (
        <div key={line.key} className="flex items-center gap-2.5 px-3 py-2">
          <Avatar email={line.email} />
          <span className="min-w-0 flex-1 truncate text-sm">
            {line.email || "用户详情不可用"}
          </span>
          {line.note ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {line.note}
            </span>
          ) : null}
        </div>
      ))}
      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          正在加载所有人…
        </div>
      ) : null}
    </div>
  )
}

/** A collapsed summary line that opens its people list. */
function CollapsedRow({
  open,
  onToggle,
  leading,
  label,
  hint,
  trailing,
  children,
}: {
  open: boolean
  onToggle: () => void
  leading?: ReactNode
  label: string
  /** Why this happens, shown on hovering the label. */
  hint?: string
  trailing: string
  children: ReactNode
}) {
  const hintId = useId()
  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={hint ? hintId : undefined}
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
        {leading}
        <span className="min-w-0 flex-1 truncate">
          {hint ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted underline-offset-2">
                  {label}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{hint}</TooltipContent>
            </Tooltip>
          ) : (
            label
          )}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {trailing}
        </span>
        {hint ? (
          <span id={hintId} className="sr-only">
            {hint}
          </span>
        ) : null}
      </button>
      {open ? children : null}
    </div>
  )
}

function groupNote(group: ScimGroupTransitionRead, activation: boolean) {
  if (activation) {
    return group.added_sources.length > 0
      ? `来自 ${group.added_sources.join("、")}`
      : null
  }
  const parts = [
    group.added_sources.length > 0
      ? `已添加 ${group.added_sources.join(", ")}`
      : null,
    group.removed_sources.length > 0
      ? `已移除 ${group.removed_sources.join(", ")}`
      : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}

/** Explain that a first mapping replaces the group's manual membership. */
function TakeoverNote({ group }: { group: ScimGroupTransitionRead }) {
  const sources = group.added_sources.join(", ")
  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      将由 IdP 管理。
      {group.lost > 0 ? (
        <>
          {" "}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="cursor-help underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                移除 {group.lost} 位此前添加的成员。
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              成员关系现在来源于 {sources}
              。此前添加到此用户组但不在以下组中的成员： {sources} 将被移除。
            </TooltipContent>
          </Tooltip>
        </>
      ) : null}
    </p>
  )
}

function groupCounts(group: ScimGroupTransitionRead): string {
  const parts = [
    group.gained > 0 ? `新增 ${group.gained} 人` : null,
    group.lost > 0 ? `移除 ${group.lost} 人` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : "成员关系无变化"
}

function reviewSummary(
  activation: boolean,
  joinCount: number,
  loseCount: number
): string {
  if (activation) {
    const joins = `${joinCount} 人将加入组织`
    return loseCount > 0
      ? `${joins}，${loseCount} 人将失去访问权限。`
      : `${joins}。`
  }
  if (loseCount > 0) {
    return `${loseCount} 人将失去用户组访问权限。`
  }
  return "没有人会失去访问权限。"
}

function isTruncated(people: ScimReviewPeople): boolean {
  return people.items.length < people.count
}

/**
 * Review who activation or a batch of mapping changes affects, then confirm.
 *
 * Lists arrive as previews with true counts. "Show all" asks the parent for
 * the full review once; every list then reads from it.
 */
export function ScimReviewDialog({
  review,
  activation,
  complete,
  loadingAll,
  lastRequestAt,
  pending,
  onShowAll,
  onClose,
  onConfirm,
}: {
  review: ScimActivationReviewRead
  activation: boolean
  complete: boolean
  loadingAll: boolean
  lastRequestAt?: string | null
  pending: boolean
  onShowAll: () => void
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [open, setOpen] = useState<Set<Section>>(new Set())

  function toggle(section: Section, people: ScimReviewPeople[]) {
    const next = new Set(open)
    if (next.has(section)) {
      next.delete(section)
    } else {
      next.add(section)
      if (!complete && people.some(isTruncated)) onShowAll()
    }
    setOpen(next)
  }

  const leaving = activation
    ? review.leaving
    : { count: 0, items: [] as ScimReviewPeople["items"] }
  const joining = activation
    ? review.joining
    : { count: 0, items: [] as ScimReviewPeople["items"] }
  const loseCount = leaving.count + review.losing.count
  const losses = [
    {
      section: "leave" as const,
      people: leaving,
      label: `${leaving.count} 人将离开组织`,
      hint: "身份提供商将他们标记为不活跃，因此启用 SCIM 后会将他们从此组织中移除。",
      lines: leaving.items.map((person) => ({
        key: `leave-${person.user_id}`,
        email: person.email,
      })),
    },
    {
      section: "lose" as const,
      people: review.losing,
      label: `${review.losing.count} 人将失去用户组访问权限`,
      hint: "身份提供商中的对应用户组不包含这些成员，因此他们将从映射的 Tracecat 用户组中移除。",
      lines: review.losing.items.map((person) => ({
        key: `lose-${person.user_id}`,
        email: person.email,
        note: `已从 ${(person.groups ?? []).join("、")} 移除`,
      })),
    },
  ].filter((loss) => loss.people.count > 0)
  const loseLines: PersonLine[] = losses.flatMap((loss) => loss.lines)
  const moves = [
    {
      section: "to_idp" as const,
      people: review.to_idp,
      label: `${review.to_idp.count} 位手动成员将改为由 IdP 管理`,
    },
    {
      section: "to_manual" as const,
      people: review.to_manual,
      label: `${review.to_manual.count} 位 IdP 成员将改为手动管理`,
    },
  ].filter((move) => move.people.count > 0)

  const missingLabels = [
    ...loseLines,
    ...moves.flatMap((move) => move.people.items),
    ...joining.items,
  ].some((line) => !line.email)
  const changeCount = review.groups.reduce(
    (total, group) =>
      total + group.added_sources.length + group.removed_sources.length,
    0
  )
  const lastRequest = formatRelative(lastRequestAt)
  const summary = reviewSummary(activation, joining.count, loseCount)
  const confirmLabel = activation
    ? `为 ${joining.count} 位用户启用`
    : `应用 ${changeCount} 项更改`
  const nothingChanges =
    loseCount === 0 &&
    joining.count === 0 &&
    moves.length === 0 &&
    review.groups.length === 0

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onClose()
      }}
    >
      <DialogContent size="lg" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {activation ? "激活 SCIM 用户配置" : "审核映射更改"}
          </DialogTitle>
          <DialogDescription className="text-foreground/80">
            {summary}
          </DialogDescription>
          <p className="text-xs text-muted-foreground">
            {lastRequest ? `身份提供商最近一次请求：${lastRequest}。` : null}
            来自其他角色和用户组的访问权限保持不变。
          </p>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-6">
            {loseCount > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  失去访问权限 · {loseCount}
                </h3>
                {losses.map((loss) => (
                  <CollapsedRow
                    key={loss.section}
                    open={open.has(loss.section)}
                    onToggle={() => toggle(loss.section, [loss.people])}
                    leading={
                      <span className="flex shrink-0">
                        {loss.lines.slice(0, 4).map((line) => (
                          <Avatar key={line.key} email={line.email} stacked />
                        ))}
                      </span>
                    }
                    label={loss.label}
                    hint={loss.hint}
                    trailing={open.has(loss.section) ? "隐藏" : "显示全部"}
                  >
                    <PeopleList
                      lines={loss.lines}
                      expanded
                      loading={loadingAll}
                    />
                  </CollapsedRow>
                ))}
              </section>
            )}

            {joining.count > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold">
                  加入组织 · {joining.count}
                </h3>
                <CollapsedRow
                  open={open.has("join")}
                  onToggle={() => toggle("join", [joining])}
                  leading={
                    <span className="flex shrink-0">
                      {joining.items.slice(0, 4).map((person) => (
                        <Avatar
                          key={person.user_id}
                          email={person.email}
                          stacked
                        />
                      ))}
                    </span>
                  }
                  label={`来自目录的 ${plural(joining.count, "person", "people")}`}
                  trailing={open.has("join") ? "隐藏" : "显示全部"}
                >
                  <PeopleList
                    lines={joining.items.map((person) => ({
                      key: person.user_id,
                      email: person.email,
                    }))}
                    expanded
                    loading={loadingAll}
                  />
                </CollapsedRow>
              </section>
            )}

            {review.groups.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold">用户组访问权限</h3>
                <div className="divide-y rounded-md border">
                  {review.groups.map((group) => {
                    const note = groupNote(group, activation)
                    return (
                      <div key={group.group_id} className="px-3 py-2.5">
                        <div className="flex items-baseline gap-3">
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="font-medium">
                              {group.group_name}
                            </span>
                            {note ? (
                              <span className="text-muted-foreground">
                                {" "}
                                {note}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {groupCounts(group)}
                          </span>
                        </div>
                        {group.takes_over ? (
                          <TakeoverNote group={group} />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {moves.map((move) => (
              <CollapsedRow
                key={move.section}
                open={open.has(move.section)}
                onToggle={() => toggle(move.section, [move.people])}
                label={move.label}
                trailing="访问权限不变"
              >
                <PeopleList
                  lines={move.people.items.map((person) => ({
                    key: person.user_id,
                    email: person.email,
                    note: (person.groups ?? []).join(", "),
                  }))}
                  expanded
                  loading={loadingAll}
                />
              </CollapsedRow>
            ))}

            {nothingChanges && (
              <p className="text-sm text-muted-foreground">
                所有人的访问权限均保持不变。
              </p>
            )}
          </div>

          {missingLabels && (
            <p role="alert" className="text-sm text-destructive">
              无法加载受影响用户的详情，请关闭此审核并重试后再确认。
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            disabled={pending || loadingAll || missingLabels}
            onClick={() => {
              void onConfirm().catch(() => {})
            }}
          >
            {pending ? "应用中…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
