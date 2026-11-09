"use client"

import { ChevronDown, Loader2 } from "lucide-react"
import type { AgentPresetVersionReadMinimal } from "@/client"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const CURRENT_VERSION_VALUE = "__current__"

export function getAgentPresetVersionNumber(
  versions: AgentPresetVersionReadMinimal[] | undefined,
  versionId: string | null | undefined
): number | null {
  if (!versions || !versionId) {
    return null
  }
  return versions.find((version) => version.id === versionId)?.version ?? null
}

export function formatAgentPresetVersionLabel({
  currentVersionNumber,
  selectedVersionNumber,
  currentVersionId,
  selectedVersionId,
}: {
  currentVersionNumber?: number | null
  selectedVersionNumber?: number | null
  currentVersionId?: string | null
  selectedVersionId?: string | null
}): string {
  if (!selectedVersionId) {
    return currentVersionNumber ? `版本 ${currentVersionNumber}，当前` : "当前"
  }
  if (selectedVersionId === currentVersionId) {
    return selectedVersionNumber
      ? `版本 ${selectedVersionNumber}，当前`
      : "当前版本"
  }
  return selectedVersionNumber ? `版本 ${selectedVersionNumber}` : "版本"
}

export function getAgentPresetVersionFallbackLabel({
  currentVersionId,
  selectedVersionId,
}: {
  currentVersionId?: string | null
  selectedVersionId?: string | null
}): string {
  if (!selectedVersionId) {
    return "当前"
  }
  if (selectedVersionId === currentVersionId) {
    return "当前版本"
  }
  return "固定版本"
}

function VersionLabel({
  label,
  versionNumber,
  isCurrent = false,
  fallback = "当前",
}: {
  label?: string
  versionNumber?: number | null
  isCurrent?: boolean
  fallback?: string
}) {
  return (
    <span className="flex items-center gap-2">
      <span>
        {label ?? (versionNumber ? `版本 ${versionNumber}` : fallback)}
      </span>
      {isCurrent ? (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          当前
        </Badge>
      ) : null}
    </span>
  )
}

interface AgentPresetVersionSelectProps {
  versions?: AgentPresetVersionReadMinimal[]
  versionsIsLoading: boolean
  versionsError: unknown
  selectedVersionId: string | null
  currentVersionId: string | null
  onSelect: (versionId: string | null) => void | Promise<void>
  disabled?: boolean
  placeholder?: string
  triggerClassName?: string
  allowCurrent?: boolean
}

export function AgentPresetVersionSelect({
  versions,
  versionsIsLoading,
  versionsError,
  selectedVersionId,
  currentVersionId,
  onSelect,
  disabled = false,
  placeholder = "选择版本",
  triggerClassName,
  allowCurrent = true,
}: AgentPresetVersionSelectProps) {
  const value =
    selectedVersionId ?? (allowCurrent ? CURRENT_VERSION_VALUE : undefined)
  const currentVersionNumber = getAgentPresetVersionNumber(
    versions,
    currentVersionId
  )
  const selectedVersionNumber = getAgentPresetVersionNumber(
    versions,
    selectedVersionId
  )

  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        void onSelect(nextValue === CURRENT_VERSION_VALUE ? null : nextValue)
      }
      disabled={disabled}
    >
      <SelectTrigger
        icon={<ChevronDown className="ml-1 size-3" />}
        className={cn(
          "min-w-36 border-none bg-transparent px-2 text-xs font-medium shadow-none hover:bg-accent focus:ring-0",
          triggerClassName
        )}
      >
        <SelectValue
          placeholder={placeholder}
          aria-label={formatAgentPresetVersionLabel({
            currentVersionNumber,
            selectedVersionNumber,
            currentVersionId,
            selectedVersionId,
          })}
        >
          {versionsIsLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" />
              加载中…
            </span>
          ) : (
            <VersionLabel
              versionNumber={
                selectedVersionId ? selectedVersionNumber : currentVersionNumber
              }
              isCurrent={
                !selectedVersionId || selectedVersionId === currentVersionId
              }
              fallback={getAgentPresetVersionFallbackLabel({
                currentVersionId,
                selectedVersionId,
              })}
            />
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {versionsIsLoading ? (
          <SelectItem value="__loading" disabled>
            正在加载版本…
          </SelectItem>
        ) : null}
        {versionsError ? (
          <SelectItem value="__error" disabled>
            加载版本失败
          </SelectItem>
        ) : null}
        {!versionsIsLoading && !versionsError && allowCurrent ? (
          <SelectItem value={CURRENT_VERSION_VALUE}>
            <VersionLabel label={"使用最新版本"} />
          </SelectItem>
        ) : null}
        {!versionsIsLoading &&
        !versionsError &&
        (versions?.length ?? 0) === 0 ? (
          <SelectItem value="__empty" disabled>
            未找到版本
          </SelectItem>
        ) : null}
        {versions?.map((version) => {
          const isCurrent = version.id === currentVersionId
          return (
            <SelectItem key={version.id} value={version.id}>
              <VersionLabel
                versionNumber={version.version}
                isCurrent={isCurrent}
                fallback={"版本"}
              />
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
