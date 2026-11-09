import type { Metadata } from "next"
import { ClosureRequirementsView } from "@/components/cases/closure-requirements-view"

export const metadata: Metadata = {
  title: "关闭条件",
}

export default function ClosureRequirementsPage() {
  return <ClosureRequirementsView />
}
