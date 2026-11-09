import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "访问控制 | 组织",
}

export default function RbacLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
