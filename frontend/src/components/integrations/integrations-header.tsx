"use client"

import { Link2, Lock, LockKeyhole, Unlink2 } from "lucide-react"
import {
  CatalogHeader,
  type CatalogHeaderPillOption,
  type CatalogHeaderSelectFilter,
} from "@/components/catalog/catalog-header"

export type IntegrationTypeFilter = "oauth" | "custom_oauth"
export type ConnectionFilter = "all" | "connected" | "not_connected"

interface IntegrationsHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  typeFilters: IntegrationTypeFilter[]
  onTypeFilterToggle: (filter: IntegrationTypeFilter) => void
  connectionFilter: ConnectionFilter
  onConnectionFilterChange: (filter: ConnectionFilter) => void
  displayIntegrationCount?: number
}

const TYPE_FILTER_OPTIONS: Array<
  CatalogHeaderPillOption<IntegrationTypeFilter>
> = [
  { value: "oauth", label: "OAuth", icon: Lock },
  { value: "custom_oauth", label: "自定义 OAuth", icon: LockKeyhole },
]

export function IntegrationsHeader({
  searchQuery,
  onSearchChange,
  typeFilters,
  onTypeFilterToggle,
  connectionFilter,
  onConnectionFilterChange,
  displayIntegrationCount = 0,
}: IntegrationsHeaderProps) {
  const selectFilters: CatalogHeaderSelectFilter[] = [
    {
      key: "connection",
      value: connectionFilter,
      onValueChange: (value) =>
        onConnectionFilterChange(value as ConnectionFilter),
      placeholder: "连接",
      allValue: "all",
      options: [
        { value: "all", label: "所有连接" },
        { value: "connected", label: "已连接", icon: Link2 },
        {
          value: "not_connected",
          label: "未连接",
          icon: Unlink2,
        },
      ],
    },
  ]

  return (
    <CatalogHeader
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={"搜索集成…"}
      pillFilters={TYPE_FILTER_OPTIONS}
      activePillFilters={typeFilters}
      onPillFilterToggle={onTypeFilterToggle}
      selectFilters={selectFilters}
      displayCount={displayIntegrationCount}
      countLabel="integrations"
    />
  )
}
