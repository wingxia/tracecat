import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "对话",
}

export default function WorkspaceChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
