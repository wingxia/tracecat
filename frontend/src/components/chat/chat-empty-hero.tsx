"use client"

import type { ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

interface ChatEmptyHeroProps {
  /** Rendered below the greeting, e.g. the prompt composer or a CTA card. */
  children: ReactNode
  className?: string
}

/**
 * Centered welcome layout shown for an empty workspace chat. Greets the user by
 * name and vertically centers the provided content (composer or call to action).
 */
export function ChatEmptyHero({ children, className }: ChatEmptyHeroProps) {
  const { user } = useAuth()
  const firstName = user?.firstName?.trim()
  const greeting = firstName
    ? `${firstName}，你想完成什么任务？`
    : "你想完成什么任务？"

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center px-3",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[48rem] -translate-y-8">
        <h1 className="mb-6 text-center text-2xl font-medium tracking-tight text-foreground">
          {greeting}
        </h1>
        {children}
      </div>
    </div>
  )
}
