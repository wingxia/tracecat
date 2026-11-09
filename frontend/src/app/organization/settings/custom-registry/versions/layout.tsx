import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "版本 | 自定义注册表",
}

export default function CustomRegistryVersionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
