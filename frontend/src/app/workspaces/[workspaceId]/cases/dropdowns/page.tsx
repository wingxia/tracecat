import type { Metadata } from "next"
import { DropdownsView } from "@/components/cases/dropdowns-view"

export const metadata: Metadata = {
  title: "下拉选项",
}

export default function CasesDropdownsPage() {
  return <DropdownsView />
}
