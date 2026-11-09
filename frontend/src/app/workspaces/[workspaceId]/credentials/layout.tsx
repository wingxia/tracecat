import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "凭据 | 工作空间",
}

export default function CredentialsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
