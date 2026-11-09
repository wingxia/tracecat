import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "仓库 | 自定义注册表",
}

export default function CustomRegistryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
