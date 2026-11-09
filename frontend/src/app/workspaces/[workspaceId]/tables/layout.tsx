import type { Metadata } from "next"
import { TablesRouteLayout } from "@/components/tables/tables-route-layout"

export const metadata: Metadata = {
  title: "数据表",
}

export default function TablesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TablesRouteLayout>{children}</TablesRouteLayout>
}
