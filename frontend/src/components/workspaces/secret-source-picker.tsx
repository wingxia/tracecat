"use client"

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import Image from "next/image"
import TracecatIcon from "public/icon.png"
import React from "react"
import { AwsIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuthorizedSecretStores } from "@/hooks/use-secret-stores"
import { cn } from "@/lib/utils"

/** Search appears once the store list no longer fits at a glance. */
const SEARCH_THRESHOLD = 6

/** `null` means the secret is stored in Tracecat. */
export type SecretSourceValue = string | null

/**
 * Picks where a secret lives: Tracecat, or one specific authorized external
 * store. Stores are grouped under their provider, so one choice sets both.
 */
export function SecretSourcePicker({
  id,
  workspaceId,
  value,
  onChange,
}: {
  id?: string
  workspaceId: string
  value: SecretSourceValue
  onChange: (value: SecretSourceValue) => void
}) {
  const [open, setOpen] = React.useState(false)
  const { stores, isLoading, error } = useAuthorizedSecretStores(workspaceId)
  // Disabled and still-in-setup stores cannot resolve secrets.
  const enabledStores = (stores ?? []).filter((store) => store.enabled)
  const selected = enabledStores.find((store) => store.id === value) ?? null
  const isStale = stores !== undefined && value !== null && selected === null

  // A store disabled mid-dialog would leave the form writing to it.
  React.useEffect(() => {
    if (isStale) onChange(null)
  }, [isStale, onChange])

  function choose(next: SecretSourceValue) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-start gap-2 px-3 text-sm font-normal shadow-none"
        >
          {selected ? (
            <AwsIcon className="size-4 shrink-0 rounded-sm" />
          ) : (
            <Image src={TracecatIcon} alt="" className="size-4 rounded-sm" />
          )}
          <span className="min-w-0 flex-1 truncate text-left">
            {selected ? selected.name : "Tracecat"}
            {selected && (
              <span className="text-muted-foreground">
                {" "}
                · {selected.region}
              </span>
            )}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command>
          {enabledStores.length > SEARCH_THRESHOLD && (
            <CommandInput placeholder={"搜索存储或区域"} />
          )}
          <CommandList className="max-h-72">
            <CommandEmpty>没有匹配的存储。</CommandEmpty>
            <CommandItem
              value="tracecat"
              onSelect={() => choose(null)}
              className="gap-2"
            >
              <Image src={TracecatIcon} alt="" className="size-4 rounded-sm" />
              <span className="flex-1">Tracecat</span>
              <CheckIcon
                className={cn("size-4", value !== null && "invisible")}
              />
            </CommandItem>
            <CommandGroup
              heading={
                <span className="flex items-center gap-1.5">
                  <AwsIcon className="size-3.5 rounded-sm" />
                  AWS Secrets Manager
                </span>
              }
            >
              {enabledStores.map((store) => (
                <CommandItem
                  key={store.id}
                  value={`${store.name} ${store.region}`}
                  onSelect={() => choose(store.id)}
                  className="gap-2 pl-7"
                >
                  <span className="min-w-0 flex-1 truncate">{store.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {store.region}
                  </span>
                  <CheckIcon
                    className={cn("size-4", value !== store.id && "invisible")}
                  />
                </CommandItem>
              ))}
              {isLoading && (
                <p className="py-1.5 pl-7 pr-2 text-xs text-muted-foreground">
                  正在加载存储…
                </p>
              )}
              {error && (
                <p className="py-1.5 pl-7 pr-2 text-xs text-destructive">
                  无法加载密钥存储，请重新打开对话框以重试。
                </p>
              )}
              {!isLoading && !error && enabledStores.length === 0 && (
                <p className="py-1.5 pl-7 pr-2 text-xs text-muted-foreground">
                  {stores?.length
                    ? "此工作空间没有已启用的存储，请联系组织管理员启用或完成设置。"
                    : "此工作空间没有已授权的存储，请联系组织管理员添加。"}
                </p>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
