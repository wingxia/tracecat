import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "版本控制设置",
  description: "配置组织的版本控制系统集成",
}

export default function VCSSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
