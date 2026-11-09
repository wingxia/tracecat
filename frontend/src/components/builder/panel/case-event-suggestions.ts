import type { CaseEventType } from "@/client"
import type { Suggestion } from "@/components/tags-input"

export const CASE_EVENT_SUGGESTIONS: Suggestion[] = [
  {
    id: "case_created",
    label: "已创建事件",
    value: "case_created",
    group: "事件",
  },
  {
    id: "case_updated",
    label: "已更新事件",
    value: "case_updated",
    group: "事件",
  },
  {
    id: "case_closed",
    label: "已关闭事件",
    value: "case_closed",
    group: "事件",
  },
  {
    id: "case_reopened",
    label: "已重新打开事件",
    value: "case_reopened",
    group: "事件",
  },
  {
    id: "case_viewed",
    label: "已查看事件",
    value: "case_viewed",
    group: "事件",
  },
  {
    id: "comment_created",
    label: "已创建评论",
    value: "comment_created",
    group: "评论",
  },
  {
    id: "comment_updated",
    label: "已更新评论",
    value: "comment_updated",
    group: "评论",
  },
  {
    id: "comment_deleted",
    label: "已删除评论",
    value: "comment_deleted",
    group: "评论",
  },
  {
    id: "comment_reply_created",
    label: "已创建回复",
    value: "comment_reply_created",
    group: "评论",
  },
  {
    id: "comment_reply_updated",
    label: "已更新回复",
    value: "comment_reply_updated",
    group: "评论",
  },
  {
    id: "comment_reply_deleted",
    label: "已删除回复",
    value: "comment_reply_deleted",
    group: "评论",
  },
  {
    id: "status_changed",
    label: "状态已更改",
    value: "status_changed",
    group: "字段",
  },
  {
    id: "priority_changed",
    label: "优先级已更改",
    value: "priority_changed",
    group: "字段",
  },
  {
    id: "severity_changed",
    label: "严重程度已更改",
    value: "severity_changed",
    group: "字段",
  },
  {
    id: "fields_changed",
    label: "字段已更改",
    value: "fields_changed",
    group: "字段",
  },
  {
    id: "assignee_changed",
    label: "负责人已更改",
    value: "assignee_changed",
    group: "字段",
  },
  {
    id: "payload_changed",
    label: "数据载荷已更改",
    value: "payload_changed",
    group: "字段",
  },
  {
    id: "attachment_created",
    label: "已添加附件",
    value: "attachment_created",
    group: "附件",
  },
  {
    id: "attachment_deleted",
    label: "已移除附件",
    value: "attachment_deleted",
    group: "附件",
  },
  {
    id: "tag_added",
    label: "已添加标签",
    value: "tag_added",
    group: "标签",
  },
  {
    id: "tag_removed",
    label: "已移除标签",
    value: "tag_removed",
    group: "标签",
  },
  {
    id: "task_created",
    label: "已创建任务",
    value: "task_created",
    group: "任务",
  },
  {
    id: "task_deleted",
    label: "已删除任务",
    value: "task_deleted",
    group: "任务",
  },
  {
    id: "task_status_changed",
    label: "任务状态已更改",
    value: "task_status_changed",
    group: "任务",
  },
  {
    id: "task_priority_changed",
    label: "任务优先级已更改",
    value: "task_priority_changed",
    group: "任务",
  },
  {
    id: "task_workflow_changed",
    label: "任务工作流已更改",
    value: "task_workflow_changed",
    group: "任务",
  },
  {
    id: "task_assignee_changed",
    label: "任务负责人已更改",
    value: "task_assignee_changed",
    group: "任务",
  },
  {
    id: "dropdown_value_changed",
    label: "下拉选项值已更改",
    value: "dropdown_value_changed",
    group: "下拉选项",
  },
  {
    id: "parent_changed",
    label: "父事件已更改",
    value: "parent_changed",
    group: "子事件",
  },
  {
    id: "sub_cases_added",
    label: "已添加子事件",
    value: "sub_cases_added",
    group: "子事件",
  },
  {
    id: "sub_cases_removed",
    label: "已移除子事件",
    value: "sub_cases_removed",
    group: "子事件",
  },
]

const CASE_EVENT_LABELS = new Map<string, string>(
  CASE_EVENT_SUGGESTIONS.map(({ value, label }) => [value, label])
)

export function getCaseEventLabel(value: CaseEventType): string {
  return (
    CASE_EVENT_LABELS.get(value) ??
    value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  )
}
