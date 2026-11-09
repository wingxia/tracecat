import type { Metadata } from "next"
import { CasesRouteLayout } from "@/components/cases/cases-route-layout"

export const metadata: Metadata = {
  title: "事件",
}

export default function CasesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CasesRouteLayout>{children}</CasesRouteLayout>
}
