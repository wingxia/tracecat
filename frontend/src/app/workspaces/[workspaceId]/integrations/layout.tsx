import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "集成",
}

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
