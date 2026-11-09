import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "动作",
}

export default function ActionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
