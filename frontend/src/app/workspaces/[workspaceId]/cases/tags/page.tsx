import type { Metadata } from "next"
import { TagsView } from "@/components/cases/tags-view"

export const metadata: Metadata = {
  title: "标签",
}

export default function CasesTagsPage() {
  return <TagsView />
}
