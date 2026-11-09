import type { Metadata } from "next"
import { WorkflowRunsLayout } from "@/components/workflow-runs/workflow-runs-layout"

export const metadata: Metadata = {
  title: "运行记录",
}

export default function WorkflowRunsPage() {
  return <WorkflowRunsLayout />
}
