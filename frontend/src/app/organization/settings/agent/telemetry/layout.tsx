import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "遥测 | 组织",
}

export default function AgentTelemetryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
