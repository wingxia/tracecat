import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "应用 | 组织",
}

export default function AppSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
