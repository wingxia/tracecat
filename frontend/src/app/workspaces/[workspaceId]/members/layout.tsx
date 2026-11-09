import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "成员 | 工作空间",
}

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
