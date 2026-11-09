"use client"

import { Info } from "lucide-react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

export function CreateSecretTooltip() {
  return (
    <div className="flex items-center">
      <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild className="hover:border-none">
          <Info className="mr-1 size-4 stroke-muted-foreground" />
        </HoverCardTrigger>
        <HoverCardContent
          className="w-auto max-w-[500px] p-3 font-mono text-xs tracking-tight"
          side="left"
          sideOffset={20}
        >
          <div className="w-full space-y-4">
            <div className="w-full items-center text-start text-muted-foreground ">
              创建可包含多个键值凭据对的密钥，在工作流中可通过以下表达式引用：{" "}
            </div>
            <div className="rounded-md border bg-muted-foreground/10 p-2">
              <pre className="text-xs text-foreground/70">
                {"${{ SECRETS.<my_secret>.<key> }}"}
              </pre>
            </div>
            <div className="w-full items-center text-start text-muted-foreground ">
              <span>
                例如，凭据键名为 GH_ACCESS_TOKEN 时，可创建名为
                `my_github_secret` 的密钥，并这样引用：{" "}
              </span>
            </div>
            <div className="flex w-full flex-col text-muted-foreground ">
              <div className="rounded-md border bg-muted-foreground/10 p-2">
                <pre className="text-xs text-foreground/70">
                  {"${{ SECRETS.my_github_secret.GH_ACCESS_TOKEN }}"}
                </pre>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
      <span className="text-sm text-muted-foreground">
        定义包含一个或多个键值对的密钥。
      </span>
    </div>
  )
}
