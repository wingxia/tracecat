"use client"

import {
  AlertCircleIcon,
  ClockIcon,
  LoaderCircleIcon,
  MousePointerClickIcon,
} from "lucide-react"

import type {
  CaseCommentAgentAttributionRead,
  CaseCommentAgentInvocationRead,
  CaseCommentMentionRead,
} from "@/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCaseChatSession } from "@/hooks/use-case-chat-session"

function CaseCommentAgentAvatar({ presetName }: { presetName: string }) {
  return (
    <Avatar
      role="img"
      aria-label={`${presetName} 的智能体头像`}
      className="size-5"
    >
      <AvatarFallback className="text-muted-foreground">
        <MousePointerClickIcon aria-hidden="true" className="size-3" />
      </AvatarFallback>
    </Avatar>
  )
}

function ViewAgentSession({
  presetName,
  sessionId,
}: {
  presetName: string
  sessionId: string
}) {
  const { openChatSession } = useCaseChatSession()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 shrink-0 px-1.5 text-xs text-muted-foreground"
      aria-label={`查看 ${presetName} 会话`}
      onClick={() => openChatSession(sessionId)}
    >
      查看会话
    </Button>
  )
}

/** Render the snapshotted agent identity for a generated comment reply. */
export function CaseCommentAgentAttribution({
  attribution,
}: {
  attribution: CaseCommentAgentAttributionRead
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <CaseCommentAgentAvatar presetName={attribution.preset_name} />
      <span className="truncate text-sm font-medium text-foreground">
        {attribution.preset_name}
      </span>
      <Badge
        variant="secondary"
        className="h-5 shrink-0 rounded-full px-1.5 text-[10px] leading-none"
      >
        智能体
      </Badge>
      {attribution.session_id ? (
        <ViewAgentSession
          presetName={attribution.preset_name}
          sessionId={attribution.session_id}
        />
      ) : null}
    </div>
  )
}

function ActiveInvocationStatus({
  invocation,
}: {
  invocation: CaseCommentAgentInvocationRead
}) {
  const running = invocation.status === "running"

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
    >
      <CaseCommentAgentAvatar presetName={invocation.preset_name} />
      {running ? (
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-3.5 animate-spin"
        />
      ) : (
        <ClockIcon aria-hidden="true" className="size-3.5 animate-pulse" />
      )}
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-foreground">
          {invocation.preset_name}
        </span>{" "}
        {running ? "正在思考…" : "正在准备…"}
      </span>
      {running && invocation.session_id ? (
        <ViewAgentSession
          presetName={invocation.preset_name}
          sessionId={invocation.session_id}
        />
      ) : null}
    </div>
  )
}

function FailedInvocationStatus({
  invocation,
}: {
  invocation: CaseCommentAgentInvocationRead
}) {
  return (
    <div role="alert" className="flex min-w-0 items-start gap-2 text-sm">
      <CaseCommentAgentAvatar presetName={invocation.preset_name} />
      <AlertCircleIcon
        aria-hidden="true"
        className="mt-0.5 size-3.5 shrink-0 text-destructive"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium text-destructive">
          {invocation.preset_name} 未能完成。
        </p>
        <p className="whitespace-pre-wrap break-words text-muted-foreground">
          {invocation.error?.message ?? "智能体无法完成请求。"}
        </p>
        <p className="text-xs text-muted-foreground">
          再次提及 {invocation.preset_name} 以重试。
        </p>
      </div>
      {invocation.session_id ? (
        <ViewAgentSession
          presetName={invocation.preset_name}
          sessionId={invocation.session_id}
        />
      ) : null}
    </div>
  )
}

function InvocationStatus({
  invocation,
}: {
  invocation: CaseCommentAgentInvocationRead
}) {
  switch (invocation.status) {
    case "pending":
    case "running":
      return <ActiveInvocationStatus invocation={invocation} />
    case "failed":
      return <FailedInvocationStatus invocation={invocation} />
    case "succeeded":
      return null
  }
}

/** Render non-successful agent invocations in persisted mention order. */
export function CaseCommentAgentInvocationList({
  mentions,
}: {
  mentions: CaseCommentMentionRead[] | undefined
}) {
  const invocations =
    mentions?.flatMap(({ invocation }) => (invocation ? [invocation] : [])) ??
    []
  const visibleInvocations = invocations.filter(
    ({ status }) => status !== "succeeded"
  )

  if (visibleInvocations.length === 0) {
    return null
  }

  return (
    <div aria-label={"智能体活动"} className="space-y-2 pt-1">
      {visibleInvocations.map((invocation) => (
        <InvocationStatus key={invocation.id} invocation={invocation} />
      ))}
    </div>
  )
}
