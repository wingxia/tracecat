import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "监控 | 监控中心",
}

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
