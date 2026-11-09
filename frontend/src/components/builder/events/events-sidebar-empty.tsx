import { type LucideIcon, Plus, WorkflowIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export interface EventsSidebarEmptyProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: React.ReactNode | string
  action?: () => void
  icon?: LucideIcon
  actionLabel?: string
}

export function EventsSidebarEmpty({
  title = "暂无条目",
  description = "创建第一个条目以开始使用",
  action,
  icon: Icon = WorkflowIcon,
  actionLabel = "创建条目",
  className,
  ...props
}: EventsSidebarEmptyProps) {
  return (
    <Empty className={cn("size-full", className)} {...props}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {Icon && <Icon className="size-6" />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && (
        <EmptyContent>
          <Button
            variant="outline"
            size="sm"
            onClick={action}
            className="w-full gap-1.5"
          >
            <Plus className="size-4" />
            {actionLabel}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
