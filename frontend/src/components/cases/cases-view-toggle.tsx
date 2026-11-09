"use client"

import {
  BracesIcon,
  Flag,
  LayersIcon,
  ListIcon,
  TagIcon,
  Timer,
} from "lucide-react"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export enum CasesViewMode {
  Cases = "cases",
  Tags = "tags",
  CustomFields = "custom-fields",
  Dropdowns = "dropdowns",
  ClosureRequirements = "closure-requirements",
  Durations = "durations",
}

interface CasesViewToggleProps {
  view: CasesViewMode
  onViewChange?: (view: CasesViewMode) => void
  className?: string
  casesHref?: string
  tagsHref?: string
  customFieldsHref?: string
  dropdownsHref?: string
  closureRequirementsHref?: string
  durationsHref?: string
}

export function CasesViewToggle({
  view,
  onViewChange,
  className,
  casesHref,
  tagsHref,
  customFieldsHref,
  dropdownsHref,
  closureRequirementsHref,
  durationsHref,
}: CasesViewToggleProps) {
  const handleViewChange = (view: CasesViewMode) => {
    onViewChange?.(view)
  }

  const toggleItems = [
    {
      mode: CasesViewMode.Cases,
      icon: LayersIcon,
      tooltip: "事件列表",
      href: casesHref,
      ariaLabel: "事件视图",
    },
    {
      mode: CasesViewMode.Tags,
      icon: TagIcon,
      tooltip: "标签",
      href: tagsHref,
      ariaLabel: "标签视图",
    },
    {
      mode: CasesViewMode.CustomFields,
      icon: BracesIcon,
      tooltip: "自定义字段",
      href: customFieldsHref,
      ariaLabel: "自定义字段视图",
    },
    {
      mode: CasesViewMode.Dropdowns,
      icon: ListIcon,
      tooltip: "下拉选项",
      href: dropdownsHref,
      ariaLabel: "下拉字段视图",
    },
    {
      mode: CasesViewMode.ClosureRequirements,
      icon: Flag,
      tooltip: "关闭条件",
      href: closureRequirementsHref,
      ariaLabel: "关闭要求视图",
    },
    {
      mode: CasesViewMode.Durations,
      icon: Timer,
      tooltip: "时长指标",
      href: durationsHref,
      ariaLabel: "时长指标视图",
    },
  ] as const

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border bg-transparent",
        className
      )}
    >
      <TooltipProvider>
        {toggleItems.map((item, index) => {
          const Icon = item.icon
          const isActive = view === item.mode
          const isFirst = index === 0
          const isLast = index === toggleItems.length - 1
          const roundedClass = cn({
            "rounded-l-sm": isFirst,
            "rounded-none": !isFirst && !isLast,
            "rounded-r-sm": isLast,
          })
          const baseClasses = cn(
            "flex size-7 items-center justify-center transition-colors",
            roundedClass,
            isActive
              ? "bg-background text-accent-foreground"
              : "bg-accent text-muted-foreground hover:bg-muted/50"
          )

          const content = item.href ? (
            <Link
              href={item.href}
              onClick={() => handleViewChange(item.mode)}
              className={baseClasses}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.ariaLabel}
            >
              <Icon className="size-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => handleViewChange(item.mode)}
              className={baseClasses}
              aria-current={isActive}
              aria-label={item.ariaLabel}
            >
              <Icon className="size-3.5" />
            </button>
          )

          return (
            <Tooltip key={item.mode}>
              <TooltipTrigger asChild>{content}</TooltipTrigger>
              <TooltipContent>
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </div>
  )
}
