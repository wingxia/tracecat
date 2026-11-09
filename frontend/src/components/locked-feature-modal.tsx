"use client"

import { ArrowUpRight, Lock } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const LOCKED_FEATURE_BULLETS = [
  "通过企业级智能体、可复用技能、指标和高级工作流工具，构建可用于生产环境的自动化。",
  "编写、管理版本并发布技能，在工作空间内共享智能体行为。",
  "使用 RBAC、SLA、治理及面向生产环境的功能。",
]

interface LockedFeatureModalProps {
  children?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: ReactNode
  bullets?: string[]
  footer?: ReactNode
  hideFooter?: boolean
}

export function LockedFeatureModal({
  children,
  open,
  onOpenChange,
  title = "升级以解锁此功能",
  description = "升级以使用企业级智能体、技能、指标和其他高级功能。",
  bullets = LOCKED_FEATURE_BULLETS,
  footer,
  hideFooter = false,
}: LockedFeatureModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent
        title={title}
        className="max-w-sm gap-0 overflow-hidden border-border p-0 shadow-none"
      >
        <DialogHeader className="space-y-2 border-b px-5 py-5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md border bg-muted/40">
              <Lock className="size-3.5 text-muted-foreground" />
            </div>
            <DialogTitle className="text-base font-semibold">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        {bullets.length > 0 ? (
          <div className="space-y-4 px-5 py-4">
            <ul className="space-y-2 pl-4 text-sm text-muted-foreground">
              {bullets.map((bullet, index) => (
                <li key={`bullet-${index}`} className="list-disc">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hideFooter ? null : (
          <DialogFooter className="border-t px-5 py-4 sm:justify-start sm:space-x-0">
            {footer ?? (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full justify-center"
              >
                <a
                  href="https://tracecat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  了解更多 <ArrowUpRight className="size-4" />
                </a>
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function LockedFeatureChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 translate-y-px items-center justify-center text-muted-foreground",
        className
      )}
    >
      <Lock className="size-3 text-muted-foreground" />
    </span>
  )
}
