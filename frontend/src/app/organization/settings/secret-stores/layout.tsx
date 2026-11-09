import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "密钥存储 | 组织",
}

export default function SecretStoresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
