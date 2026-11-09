import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SCIM | 组织",
}

export default function ScimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
