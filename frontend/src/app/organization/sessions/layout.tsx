import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "会话 | 组织",
}

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
