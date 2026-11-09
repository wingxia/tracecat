"use client"

import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import type { BuildEdition } from "@/client"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Badge } from "@/components/ui/badge"
import { siteConfig } from "@/config/site"
import { useAdminBuildInfo } from "@/hooks/use-admin"

const EDITION_LABELS: Record<BuildEdition, string> = {
  oss: "打开来源",
  ee: "Enterprise",
}

/** Shows the version, edition, commit, and build time of the deployment. */
export function PlatformBuildInfo() {
  const { buildInfo, buildInfoIsLoading, buildInfoError } = useAdminBuildInfo()

  if (buildInfoIsLoading) {
    return <CenteredSpinner />
  }
  if (buildInfoError || !buildInfo) {
    return <p className="text-sm text-muted-foreground">无法加载构建详情。</p>
  }

  return (
    <div className="divide-y rounded-lg border">
      <BuildRow label={"版本"}>
        <Badge variant="secondary" className="text-xs text-muted-foreground">
          {buildInfo.version}
        </Badge>
      </BuildRow>
      <BuildRow label={"版本类型"}>
        {EDITION_LABELS[buildInfo.edition]}
      </BuildRow>
      <BuildRow label={"提交"}>
        <CommitValue commit={buildInfo.commit} />
      </BuildRow>
      <BuildRow label={"构建时间"}>
        {buildInfo.built_at
          ? format(new Date(buildInfo.built_at), "PPpp", { locale: zhCN })
          : "未知"}
      </BuildRow>
    </div>
  )
}

function BuildRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{children}</span>
    </div>
  )
}

function CommitValue({ commit }: { commit?: string | null }) {
  if (!commit) {
    return "未知"
  }
  return (
    <a
      href={`${siteConfig.links.github}/commit/${commit}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs underline-offset-4 hover:underline"
    >
      {commit.slice(0, 7)}
    </a>
  )
}
