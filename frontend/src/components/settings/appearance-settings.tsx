"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type ChatVerbosity,
  useChatVerbosityPreference,
} from "@/hooks/use-chat-verbosity"
import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
] as const

const VERBOSITY_OPTIONS: { value: ChatVerbosity; label: string }[] = [
  { value: "default", label: "默认" },
  { value: "verbose", label: "详细" },
  { value: "minimal", label: "精简" },
]

/**
 * The Settings modal Appearance section: theme and agent verbosity.
 *
 * Lets the user choose between light, dark, and system themes via
 * `next-themes`, and how much agent work chats draw. Guards against SSR/hydration mismatches by treating the
 * theme as unset until the component has mounted on the client.
 */
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [verbosity, setVerbosity] = useChatVerbosityPreference()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // next-themes returns an undefined theme on the first render, so keep a
  // stable placeholder until mounted to avoid an SSR/client markup mismatch.
  const activeTheme = mounted ? theme : undefined

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">外观</h2>
        <p className="text-sm text-muted-foreground">
          自定义 Tracecat 在此设备上的外观。
        </p>
      </div>
      <div className="space-y-3">
        <span className="text-sm font-medium">主题</span>
        <div className="grid max-w-md grid-cols-3 gap-3">
          {THEME_OPTIONS.map((option) => {
            const isActive = activeTheme === option.value
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-md border p-4 text-sm font-medium",
                  isActive
                    ? "border-primary ring-1 ring-primary"
                    : "border-border hover:border-foreground/30"
                )}
                onClick={() => setTheme(option.value)}
              >
                <option.icon className="size-5" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="agent-verbosity" className="text-sm font-medium">
          智能体回复详略
        </label>
        <Select
          value={verbosity}
          onValueChange={(value) => setVerbosity(value as ChatVerbosity)}
        >
          <SelectTrigger id="agent-verbosity" className="max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERBOSITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
