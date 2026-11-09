"use client"

import {
  CalendarSearchIcon,
  FileInputIcon,
  type LucideIcon,
  ShapesIcon,
  WorkflowIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { $TriggerType, type TriggerType } from "@/client"
import { ActionEventPane } from "@/components/builder/events/events-selected-action"
import {
  WorkflowEvents,
  WorkflowEventsHeader,
} from "@/components/builder/events/events-workflow"
import { Spinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { WorkflowExecutionReadCompact } from "@/lib/event-history"
import { useLastExecution } from "@/lib/hooks"
import { useWorkflowBuilder } from "@/providers/builder"
import { useWorkflow } from "@/providers/workflow"

// Define the available trigger types for UI generation
const AVAILABLE_TRIGGER_TYPES: readonly TriggerType[] = $TriggerType.enum

export type EventsSidebarTabs =
  | "workflow-events"
  | "action-input"
  | "action-result"

/** A single tab in the workflow events viewer. */
export interface EventsTabItem {
  value: EventsSidebarTabs
  label: string
  icon: LucideIcon
  content: ReactNode
}

/**
 * Resolution of the execution to show in an events viewer. Returns a `node` to
 * render directly while the last execution is loading, errored, or absent;
 * otherwise an `executionId` ready to fetch detailed events for.
 */
export type ResolvedLastExecution =
  | { status: "pending"; node: ReactNode }
  | { status: "ready"; executionId: string }

/** Centered spinner with a status message, used across events viewers. */
export function EventsLoading({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2">
      <span className="text-xs text-muted-foreground">{message}</span>
      <Spinner className="size-6" />
    </div>
  )
}

/**
 * Resolve which execution an events viewer should display for the workflow in
 * context: a directly-triggered run if present, otherwise the last execution
 * matching the user's selected trigger types. Shared by the builder events
 * sidebar and the embedded workflow artifact so their loading, error, and empty
 * states stay in sync.
 *
 * Pass ``pollIntervalMs`` to poll the latest-execution list while mounted, so a
 * run started outside this view (e.g. a chat agent calling
 * ``core.workflow.execute``) is discovered and shown live without an explicit
 * cache invalidation tying the run back to this panel.
 */
export function useResolvedLastExecution(
  pollIntervalMs?: number
): ResolvedLastExecution {
  const { workflowId } = useWorkflow()
  const { currentExecutionId } = useWorkflowBuilder()
  const [selectedTriggerTypes] = useLocalStorage<TriggerType[]>(
    // v2: `form` joined the trigger types. A stored v1 selection predates it
    // and would hide form runs, so everyone starts again from all types.
    "selected-trigger-types-v2",
    [...AVAILABLE_TRIGGER_TYPES]
  )

  const { lastExecution, lastExecutionIsLoading, lastExecutionError } =
    useLastExecution({
      // Prefer the direct execution id (e.g. a run just triggered) over the query.
      workflowId: currentExecutionId ? undefined : workflowId,
      triggerTypes: selectedTriggerTypes,
      // Only poll for discovery when a direct run isn't already pinned.
      refetchInterval: currentExecutionId ? undefined : pollIntervalMs,
    })

  const executionId = currentExecutionId || lastExecution?.id

  if (!currentExecutionId && lastExecutionIsLoading) {
    return {
      status: "pending",
      node: <EventsLoading message={"正在获取最近的执行记录…"} />,
    }
  }

  if (!currentExecutionId && lastExecutionError) {
    return {
      status: "pending",
      node: (
        <AlertNotification
          level="error"
          message={`加载上次执行记录出错：${lastExecutionError.message}`}
        />
      ),
    }
  }

  if (!executionId) {
    return { status: "pending", node: <NoWorkflowRuns /> }
  }

  return { status: "ready", executionId }
}

/** Empty state shown when a workflow has never run. */
function NoWorkflowRuns() {
  return (
    <div className="flex h-full items-center justify-center">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WorkflowIcon />
          </EmptyMedia>
          <EmptyTitle>暂无工作流运行记录</EmptyTitle>
          <EmptyDescription>运行工作流以开始使用</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

/**
 * Build the tab descriptors (Events / Input / Result) for a workflow
 * execution. The header switches to its compact form when `embedded`.
 */
export function buildEventsTabItems({
  execution,
  embedded = false,
}: {
  execution: WorkflowExecutionReadCompact
  embedded?: boolean
}): EventsTabItem[] {
  const tabItems: EventsTabItem[] = [
    {
      value: "workflow-events",
      label: "执行事件",
      icon: CalendarSearchIcon,
      content: (
        <>
          <WorkflowEventsHeader execution={execution} embedded={embedded} />
          <WorkflowEvents events={execution.events} status={execution.status} />
        </>
      ),
    },
    {
      value: "action-input",
      label: "输入",
      icon: FileInputIcon,
      content: <ActionEventPane execution={execution} type="input" />,
    },
    {
      value: "action-result",
      label: "结果",
      icon: ShapesIcon,
      content: <ActionEventPane execution={execution} type="result" />,
    },
  ]
  return tabItems
}
