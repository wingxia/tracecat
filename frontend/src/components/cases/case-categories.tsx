import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CircleHelpIcon,
  CircleIcon,
  CirclePauseIcon,
  FlagTriangleRightIcon,
  InfoIcon,
  SignalHighIcon,
  SignalIcon,
  SignalMediumIcon,
  TrafficConeIcon,
} from "lucide-react"
import type { CasePriority, CaseSeverity, CaseStatus } from "@/client"

import type { CaseBadgeProps } from "@/components/cases/case-badge"

const palette = {
  gray: "bg-muted/50 text-muted-foreground",
  yellow: "bg-yellow-500/10 text-yellow-700",
  orange: "bg-orange-500/10 text-orange-700",
  red: "bg-red-500/10 text-red-700",
  fuchsia: "bg-fuchsia-500/10 text-fuchsia-700",
  emerald: "bg-green-500/10 text-green-700",
  sky: "bg-blue-500/10 text-blue-700",
  violet: "bg-violet-500/10 text-violet-700",
  slate: "bg-muted text-muted-foreground",
}

export const STATUSES: Record<CaseStatus, CaseBadgeProps<CaseStatus>> = {
  new: {
    value: "new",
    label: "新建",
    icon: FlagTriangleRightIcon,
    color: palette.yellow,
  },
  in_progress: {
    value: "in_progress",
    label: "处理中",
    icon: TrafficConeIcon,
    color: palette.sky,
  },
  on_hold: {
    value: "on_hold",
    label: "挂起",
    icon: CirclePauseIcon,
    color: palette.orange,
  },
  resolved: {
    value: "resolved",
    label: "已解决",
    icon: CheckCircleIcon,
    color: palette.emerald,
  },
  closed: {
    value: "closed",
    label: "已关闭",
    icon: CheckCircleIcon,
    color: palette.violet,
  },
  other: {
    value: "other",
    label: "其他",
    icon: CircleIcon,
    color: palette.gray,
  },
  unknown: {
    value: "unknown",
    label: "未知",
    icon: CircleHelpIcon,
    color: palette.slate,
  },
} as const

export const PRIORITIES: Record<CasePriority, CaseBadgeProps<CasePriority>> = {
  unknown: {
    label: "未知",
    value: "unknown",
    icon: CircleHelpIcon,
    color: palette.gray,
  },
  low: {
    label: "低",
    value: "low",
    icon: SignalMediumIcon,
    color: palette.yellow,
  },
  medium: {
    label: "中",
    value: "medium",
    icon: SignalHighIcon,
    color: palette.orange,
  },
  high: {
    label: "高",
    value: "high",
    icon: SignalIcon,
    color: palette.red,
  },
  critical: {
    label: "严重",
    value: "critical",
    icon: AlertTriangleIcon,
    color: palette.fuchsia,
  },
  other: {
    label: "其他",
    value: "other",
    icon: CircleIcon,
    color: palette.gray,
  },
} as const

export const SEVERITIES: Record<CaseSeverity, CaseBadgeProps<CaseSeverity>> = {
  unknown: {
    label: "未知",
    value: "unknown",
    icon: CircleHelpIcon,
    color: palette.gray,
  },
  informational: {
    label: "提示",
    value: "informational",
    icon: InfoIcon,
    color: palette.sky,
  },
  low: {
    label: "低",
    value: "low",
    icon: SignalMediumIcon,
    color: palette.yellow,
  },
  medium: {
    label: "中",
    value: "medium",
    icon: SignalHighIcon,
    color: palette.orange,
  },
  high: {
    label: "高",
    value: "high",
    icon: SignalIcon,
    color: palette.red,
  },
  critical: {
    label: "严重",
    value: "critical",
    icon: AlertTriangleIcon,
    color: palette.fuchsia,
  },
  fatal: {
    label: "致命",
    value: "fatal",
    icon: AlertTriangleIcon,
    color: palette.red,
  },
  other: {
    label: "其他",
    value: "other",
    icon: CircleIcon,
    color: palette.gray,
  },
}
