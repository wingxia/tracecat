import { MessageCircle } from "lucide-react"

export default async function ChatDefault() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">选择事件以查看对话</p>
        <p className="text-xs mt-1">与 AI 讨论事件详情并进行分析</p>
      </div>
    </div>
  )
}
