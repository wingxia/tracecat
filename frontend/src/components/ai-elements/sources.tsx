"use client"

import { ArrowUpRightIcon, GlobeIcon } from "lucide-react"
import type { ComponentProps } from "react"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { cn } from "@/lib/utils"

export type SourcesProps = ComponentProps<typeof TraceCollapsible>

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Trace className={cn("not-prose", className)}>
    <TraceCollapsible {...props} />
  </Trace>
)

export type SourcesTriggerProps = ComponentProps<
  typeof TraceCollapsibleTrigger
> & {
  count: number
}

export const SourcesTrigger = ({
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <TraceCollapsibleTrigger {...props}>
    {children ?? (
      <TraceLine>
        <TraceIcon>
          <GlobeIcon />
        </TraceIcon>
        <TraceTitle>
          已使用 {count} {count === 1 ? "个来源" : "个来源"}
        </TraceTitle>
      </TraceLine>
    )}
  </TraceCollapsibleTrigger>
)

export type SourcesContentProps = ComponentProps<typeof TraceCollapsibleContent>

export const SourcesContent = ({ children, ...props }: SourcesContentProps) => (
  <TraceCollapsibleContent {...props}>
    <Trace>{children}</Trace>
  </TraceCollapsibleContent>
)

export type SourceProps = ComponentProps<"a">

export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a href={href} rel="noreferrer" target="_blank" {...props}>
    {children ?? (
      <TraceLine>
        <TraceIcon>
          <GlobeIcon />
        </TraceIcon>
        <TraceTitle>
          {title}
          <span className="sr-only"> （在新标签页中打开）</span>
        </TraceTitle>
        <TraceIcon>
          <ArrowUpRightIcon />
        </TraceIcon>
      </TraceLine>
    )}
  </a>
)
