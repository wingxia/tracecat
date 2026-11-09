import type { Metadata } from "next"
import { WorkflowTagsView } from "@/components/dashboard/workflow-tags-view"

export const metadata: Metadata = {
  title: "工作流标签",
}

export default function WorkflowTagsPage() {
  return <WorkflowTagsView />
}
