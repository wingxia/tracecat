"use client"

import { useEffect } from "react"
import { useWorkflow } from "@/providers/workflow"

export default function WorkflowExecutionsPage() {
  const { workflow } = useWorkflow()

  useEffect(() => {
    document.title = `工作流运行 | ${workflow?.title}`
  }, [workflow])

  return (
    <main className="container flex size-full max-w-[400px] flex-col items-center justify-center space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">
        选择工作流运行记录
      </h1>
      <span className="text-center text-sm text-muted-foreground">
        点击侧边栏中的工作流运行记录以查看执行事件。
      </span>
    </main>
  )
}
