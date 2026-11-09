"use client"

import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <p className="text-sm text-muted-foreground">
        请妥善保管这些恢复码。丢失安全密钥时，每个恢复码可用于登录一次。恢复码不会再次显示。
      </p>
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(codes.join("\n"))
          toast({ title: "已复制恢复码" })
        }}
      >
        <Copy className="mr-2 size-4" />
        复制恢复码
      </Button>
    </div>
  )
}
