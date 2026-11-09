import {
  BracesIcon,
  EyeIcon,
  ListTreeIcon,
  type LucideIcon,
  MessageSquareIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  UserXIcon,
} from "lucide-react"
import Link from "next/link"
import { Fragment } from "react"
import type {
  AssigneeChangedEventRead,
  AttachmentCreatedEventRead,
  AttachmentDeletedEventRead,
  CaseEventRead,
  CaseRef,
  ClosedEventRead,
  CommentCreatedEventRead,
  CommentDeletedEventRead,
  CommentReplyCreatedEventRead,
  CommentReplyDeletedEventRead,
  CommentReplyUpdatedEventRead,
  CommentUpdatedEventRead,
  DropdownValueChangedEventRead,
  FieldChangedEventRead,
  ParentChangedEventRead,
  PayloadChangedEventRead,
  PriorityChangedEventRead,
  ReopenedEventRead,
  SeverityChangedEventRead,
  StatusChangedEventRead,
  SubCasesAddedEventRead,
  SubCasesRemovedEventRead,
  TagAddedEventRead,
  TagRemovedEventRead,
  TaskAssigneeChangedEventRead,
  TaskCreatedEventRead,
  TaskDeletedEventRead,
  TaskPriorityChangedEventRead,
  TaskStatusChangedEventRead,
  TaskWorkflowChangedEventRead,
  UpdatedEventRead,
} from "@/client"
import {
  PRIORITIES,
  SEVERITIES,
  STATUSES,
} from "@/components/cases/case-categories"
import { UserHoverCard } from "@/components/cases/case-panel-common"
import { InlineDotSeparator } from "@/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { User } from "@/lib/auth"
import { caseHref } from "@/lib/cases/urls"
import { cn, formatFileSize } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

export function EventIcon({
  icon: Icon,
  className = "text-muted-foreground",
}: {
  icon: LucideIcon
  className?: string
}) {
  return (
    <div className="bg-background py-[2px]">
      <div
        className={cn(
          "rounded-full border border-muted-foreground/70 bg-background p-px",
          className
        )}
      >
        <Icon className="stroke-inherit/5 size-3 scale-75" strokeWidth={3} />
      </div>
    </div>
  )
}

export function EventActor({ user }: { user: User }) {
  return (
    <UserHoverCard user={user}>
      <span className="inline-block cursor-pointer font-medium hover:underline">
        {user.getDisplayName()}
      </span>
    </UserHoverCard>
  )
}

export function AssigneeChangedEvent({
  event,
  actor,
  userMap,
}: {
  event: AssigneeChangedEventRead
  actor: User
  userMap: Record<string, User>
}) {
  const assigneeId = event.new
  if (assigneeId) {
    if (assigneeId === actor.id) {
      return (
        <div className="flex items-center space-x-2 text-xs">
          <EventIcon icon={UserIcon} />
          <span>
            <EventActor user={actor} /> 将事件分配给自己
          </span>
        </div>
      )
    }
    return (
      <div className="flex items-center space-x-2 text-xs">
        <EventIcon icon={UserIcon} />
        <span>
          <EventActor user={actor} /> 将事件分配给{" "}
          <EventActor user={userMap[assigneeId]} />
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={UserXIcon} />
      <span>
        <EventActor user={actor} /> 取消了事件分配
      </span>
    </div>
  )
}

export function StatusChangedEvent({
  event,
  actor,
}: {
  event: StatusChangedEventRead
  actor: User
}) {
  if (event.old === event.new) {
    return null
  }
  const oldStatus = STATUSES[event.old]
  const newStatus = STATUSES[event.new]

  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={newStatus.icon} className={newStatus.color} />
      <span>
        <EventActor user={actor} /> 将状态从 {oldStatus.label} 更改为{" "}
        {newStatus.label}
      </span>
    </div>
  )
}

export function PriorityChangedEvent({
  event,
  actor,
}: {
  event: PriorityChangedEventRead
  actor: User
}) {
  if (event.old === event.new) {
    return null
  }
  const oldSeverity = PRIORITIES[event.old]
  const newPriority = PRIORITIES[event.new]

  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={newPriority.icon} className={newPriority.color} />
      <span>
        <EventActor user={actor} /> 将优先级从 {oldSeverity.label} 更改为{" "}
        {newPriority.label}
      </span>
    </div>
  )
}

export function SeverityChangedEvent({
  event,
  actor,
}: {
  event: SeverityChangedEventRead
  actor: User
}) {
  if (event.old === event.new) {
    return null
  }
  const oldSeverity = SEVERITIES[event.old]
  const newSeverity = SEVERITIES[event.new]

  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={newSeverity.icon} className={newSeverity.color} />
      <span>
        <EventActor user={actor} /> 将严重程度从 {oldSeverity.label} 更改为{" "}
        {newSeverity.label}
      </span>
    </div>
  )
}

export function CaseReopenedEvent({
  event,
  actor,
}: {
  event: ReopenedEventRead
  actor: User
}) {
  const newStatus = STATUSES[event.new]
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={newStatus.icon} className={newStatus.color} />
      <span>
        <EventActor user={actor} /> 重新打开事件，状态为 {newStatus.label}
      </span>
    </div>
  )
}

export function CaseViewedEvent({
  event: _event,
  actor,
}: {
  event: CaseEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={EyeIcon} />
      <span>
        <EventActor user={actor} /> 查看了事件
      </span>
    </div>
  )
}

export function CaseClosedEvent({
  event,
  actor,
}: {
  event: ClosedEventRead
  actor: User
}) {
  const newStatus = STATUSES[event.new]
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={newStatus.icon} className={newStatus.color} />
      <span>
        <EventActor user={actor} /> 关闭了事件
      </span>
    </div>
  )
}

export function CaseUpdatedEvent({
  event,
  actor,
}: {
  event: UpdatedEventRead
  actor: User
}) {
  switch (event.field) {
    case "summary":
      return (
        <div className="flex items-center space-x-2 text-xs">
          <EventIcon icon={PencilIcon} />
          <span>
            <EventActor user={actor} />{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">
                    {event.new ? `将摘要更改为 ${event.new}` : "移除了摘要"}
                  </span>
                </TooltipTrigger>
                {event.old && (
                  <TooltipContent>
                    <p>此前： {event.old}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </span>
        </div>
      )
    default:
      return null
  }
}

export function FieldsChangedEvent({
  event,
  actor,
  caseFieldDisplayNameById,
}: {
  event: FieldChangedEventRead
  actor: User
  caseFieldDisplayNameById: ReadonlyMap<string, string>
}) {
  return (
    <TooltipProvider>
      <div className="flex items-center space-x-2 text-xs">
        <EventIcon icon={BracesIcon} />
        <div className="flex flex-wrap items-center gap-1">
          <span>
            <EventActor user={actor} /> 更改了字段
          </span>
          {event.changes.map(({ field, old, new: newVal }, index) => (
            <Fragment key={`${field}-${index}`}>
              <InlineDotSeparator />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="max-w-32 truncate text-xs hover:cursor-default hover:underline">
                    {caseFieldDisplayNameById.get(field) ?? field}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="flex items-center gap-1">
                    {!!old && (
                      <>
                        <span>{JSON.stringify(old)}</span>
                        <span>→</span>
                      </>
                    )}
                    {!!newVal && <span>{JSON.stringify(newVal)}</span>}
                  </span>
                </TooltipContent>
              </Tooltip>
            </Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}

export function AttachmentCreatedEvent({
  event,
  actor,
}: {
  event: AttachmentCreatedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PaperclipIcon} />
      <span>
        <EventActor user={actor} /> 上传了{" "}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default font-medium hover:underline">
                {event.file_name}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p>大小： {formatFileSize(event.size)}</p>
                <p>类型： {event.content_type}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    </div>
  )
}

export function AttachmentDeletedEvent({
  event,
  actor,
}: {
  event: AttachmentDeletedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={TrashIcon} className="text-red-600 bg-red-50" />
      <span>
        <EventActor user={actor} /> 删除了{" "}
        <span className="font-medium">{event.file_name}</span>
      </span>
    </div>
  )
}

export function PayloadChangedEvent({
  event,
  actor,
}: {
  event: PayloadChangedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> 更新了数据载荷
      </span>
    </div>
  )
}

export function CommentCreatedEvent({
  event: _event,
  actor,
}: {
  event: CommentCreatedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={MessageSquareIcon} />
      <span>
        <EventActor user={actor} /> 创建了评论
      </span>
    </div>
  )
}

export function CommentReplyCreatedEvent({
  event: _event,
  actor,
}: {
  event: CommentReplyCreatedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={MessageSquareIcon} />
      <span>
        <EventActor user={actor} /> 回复了评论
      </span>
    </div>
  )
}

export function CommentUpdatedEvent({
  event: _event,
  actor,
}: {
  event: CommentUpdatedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> 编辑了评论
      </span>
    </div>
  )
}

export function CommentReplyUpdatedEvent({
  event: _event,
  actor,
}: {
  event: CommentReplyUpdatedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> 编辑了回复
      </span>
    </div>
  )
}

export function CommentDeletedEvent({
  event: _event,
  actor,
}: {
  event: CommentDeletedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={TrashIcon} />
      <span>
        <EventActor user={actor} /> 删除了评论
      </span>
    </div>
  )
}

export function CommentReplyDeletedEvent({
  event: _event,
  actor,
}: {
  event: CommentReplyDeletedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={TrashIcon} />
      <span>
        <EventActor user={actor} /> 删除了回复
      </span>
    </div>
  )
}

// Task events

export function TaskCreatedEvent({
  event,
  actor,
}: {
  event: TaskCreatedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PlusIcon} />
      <span>
        <EventActor user={actor} /> 创建了任务{" "}
        <span className="font-medium">{event.title}</span>
      </span>
    </div>
  )
}

export function TaskDeletedEvent({
  event,
  actor,
}: {
  event: TaskDeletedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={TrashIcon} className="text-red-600 bg-red-50" />
      <span>
        <EventActor user={actor} /> 删除了任务
        {event.title ? (
          <span>
            {" "}
            <span className="font-medium">{event.title}</span>
          </span>
        ) : null}
      </span>
    </div>
  )
}

const TASK_STATUS_LABELS: Record<
  "todo" | "in_progress" | "completed" | "blocked",
  string
> = {
  todo: "待办",
  in_progress: "处理中",
  completed: "已完成",
  blocked: "受阻",
}

export function TaskStatusChangedEvent({
  event,
  actor,
}: {
  event: TaskStatusChangedEventRead
  actor: User
}) {
  if (event.old === event.new) return null
  const oldStatus = TASK_STATUS_LABELS[event.old]
  const newStatus = TASK_STATUS_LABELS[event.new]
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> 更改了{" "}
        <span className="font-medium max-w-32 inline-block truncate align-bottom">
          {event.title}
        </span>{" "}
        状态： {oldStatus} → {newStatus}
      </span>
    </div>
  )
}

export function TaskAssigneeChangedEvent({
  event,
  actor,
  userMap,
}: {
  event: TaskAssigneeChangedEventRead
  actor: User
  userMap: Record<string, User>
}) {
  const oldAssignee = event.old ? userMap[event.old] : null
  const newAssignee = event.new ? userMap[event.new] : null

  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> {newAssignee ? "分配了" : "取消分配了"}{" "}
        <span className="font-medium max-w-32 inline-block truncate align-bottom">
          {event.title}
        </span>{" "}
        {newAssignee ? (
          <>
            更改为 <EventActor user={newAssignee} />
          </>
        ) : oldAssignee ? (
          <>
            来自 <EventActor user={oldAssignee} />
          </>
        ) : null}
      </span>
    </div>
  )
}

export function TaskPriorityChangedEvent({
  event,
  actor,
}: {
  event: TaskPriorityChangedEventRead
  actor: User
}) {
  if (event.old === event.new) return null
  const oldPriority = PRIORITIES[event.old]
  const newPriority = PRIORITIES[event.new]
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> 更改了{" "}
        <span className="font-medium max-w-32 inline-block truncate align-bottom">
          {event.title}
        </span>{" "}
        优先级： {oldPriority.label} → {newPriority.label}
      </span>
    </div>
  )
}

export function DropdownValueChangedEvent({
  event,
  actor,
}: {
  event: DropdownValueChangedEventRead
  actor: User
}) {
  const oldLabel = event.old_option_label
  const newLabel = event.new_option_label

  if (oldLabel && newLabel) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        <EventIcon icon={PencilIcon} />
        <span>
          <EventActor user={actor} /> 更改了 {event.definition_name} 来自{" "}
          {oldLabel} 更改为 {newLabel}
        </span>
      </div>
    )
  }

  if (newLabel) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        <EventIcon icon={PencilIcon} />
        <span>
          <EventActor user={actor} /> 设置了 {event.definition_name} 更改为{" "}
          {newLabel}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> 清除了 {event.definition_name}
        {oldLabel ? `（此前为 ${oldLabel}）` : ""}
      </span>
    </div>
  )
}

export function TaskWorkflowChangedEvent({
  event,
  actor,
}: {
  event: TaskWorkflowChangedEventRead
  actor: User
}) {
  if (event.old === event.new) return null
  const hasOld = !!event.old
  const hasNew = !!event.new

  if (!hasOld && hasNew) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        <EventIcon icon={PencilIcon} />
        <span>
          <EventActor user={actor} /> 将工作流关联到{" "}
          <span className="font-medium max-w-32 inline-block truncate align-bottom">
            {event.title}
          </span>
        </span>
      </div>
    )
  }

  if (hasOld && !hasNew) {
    return (
      <div className="flex items-center space-x-2 text-xs">
        <EventIcon icon={PencilIcon} />
        <span>
          <EventActor user={actor} /> 移除了工作流关联，对象为{" "}
          <span className="font-medium max-w-32 inline-block truncate align-bottom">
            {event.title}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={PencilIcon} />
      <span>
        <EventActor user={actor} /> 更改了工作流，对象为{" "}
        <span className="font-medium max-w-32 inline-block truncate align-bottom">
          {event.title}
        </span>
      </span>
    </div>
  )
}

// Tag events

function CaseRefLink({ caseRef }: { caseRef: CaseRef }) {
  const workspaceId = useWorkspaceId()
  return (
    <Link
      href={caseHref(workspaceId, caseRef.id)}
      className="font-medium hover:underline"
    >
      {caseRef.short_id}
    </Link>
  )
}

function CaseRefList({ caseRefs }: { caseRefs: CaseRef[] }) {
  const shown = caseRefs.slice(0, 3)
  return (
    <>
      {shown.map((caseRef, index) => (
        <Fragment key={caseRef.id}>
          {index > 0 && ", "}
          <CaseRefLink caseRef={caseRef} />
        </Fragment>
      ))}
      {caseRefs.length > shown.length &&
        ` 等另外 ${caseRefs.length - shown.length} 项`}
    </>
  )
}

function ParentChangeDescription({ event }: { event: ParentChangedEventRead }) {
  if (event.new && event.old) {
    return (
      <>
        将此事件移出 <CaseRefLink caseRef={event.old} /> 更改为{" "}
        <CaseRefLink caseRef={event.new} />
      </>
    )
  }
  if (event.new) {
    return (
      <>
        将此事件归入 <CaseRefLink caseRef={event.new} />
      </>
    )
  }
  if (event.old) {
    return (
      <>
        将此事件移出 <CaseRefLink caseRef={event.old} />
      </>
    )
  }
  return <>将此事件从父事件中移出</>
}

/** Activity row for a case being grouped under, moved to, or removed from a parent. */
export function ParentChangedEvent({
  event,
  actor,
}: {
  event: ParentChangedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={ListTreeIcon} />
      <span>
        <EventActor user={actor} /> <ParentChangeDescription event={event} />
      </span>
    </div>
  )
}

export function SubCasesAddedEvent({
  event,
  actor,
}: {
  event: SubCasesAddedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={ListTreeIcon} />
      <span>
        <EventActor user={actor} /> 添加了子事件
        {event.sub_cases.length === 1 ? " " : ""}
        <CaseRefList caseRefs={event.sub_cases} />
      </span>
    </div>
  )
}

export function SubCasesRemovedEvent({
  event,
  actor,
}: {
  event: SubCasesRemovedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={ListTreeIcon} className="text-red-600 bg-red-50" />
      <span>
        <EventActor user={actor} /> 移除了子事件
        {event.sub_cases.length === 1 ? " " : ""}
        <CaseRefList caseRefs={event.sub_cases} />
      </span>
    </div>
  )
}

export function TagAddedEvent({
  event,
  actor,
}: {
  event: TagAddedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={TagIcon} />
      <span>
        <EventActor user={actor} /> 添加了标签{" "}
        <span className="font-medium">{event.tag_name}</span>
      </span>
    </div>
  )
}

export function TagRemovedEvent({
  event,
  actor,
}: {
  event: TagRemovedEventRead
  actor: User
}) {
  return (
    <div className="flex items-center space-x-2 text-xs">
      <EventIcon icon={TagIcon} className="text-red-600 bg-red-50" />
      <span>
        <EventActor user={actor} /> 移除了标签{" "}
        <span className="font-medium">{event.tag_name}</span>
      </span>
    </div>
  )
}
