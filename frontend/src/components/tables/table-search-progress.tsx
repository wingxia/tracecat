"use client"

import { useState } from "react"
import { tablesGetTableSearchProgress } from "@/client"
import { useTableSearchContext } from "@/components/tables/table-search-context"
import { Button } from "@/components/ui/button"
import { searchPollInterval, tableSearchKey } from "@/hooks/use-table-search"
import { useQuery } from "@/lib/query"

function errorMessage(code: string) {
  switch (code) {
    case "CREDENTIAL_INVALID":
      return "请检查 AI 提供商凭据后重试。"
    case "RATE_LIMITED":
      return "提供商繁忙，请稍后重试。"
    case "TIMEOUT":
    case "UNAVAILABLE":
    case "PROVIDER_UNAVAILABLE":
      return "提供商无法完成索引，请稍后重试。"
    case "CONFIGURATION_INVALID":
    case "NOT_CONFIGURED":
      return "请检查 AI 提供商配置后重试。"
    default:
      return "无法完成索引。请重试；若问题持续，请检查 AI 提供商设置。"
  }
}

/** Fetch one bounded progress page only while the status details are open. */
export function TableSearchProgress() {
  const search = useTableSearchContext()
  const generation = search?.configuration.data?.generation ?? 0
  const [page, setPage] = useState<{ generation: number; cursor?: string }>({
    generation,
  })
  const cursor = page.generation === generation ? page.cursor : undefined
  const workspaceId = search?.workspaceId ?? ""
  const tableId = search?.tableId ?? ""
  const progress = useQuery({
    queryKey: [
      ...tableSearchKey(workspaceId, tableId),
      "progress",
      generation,
      cursor,
    ],
    queryFn: () =>
      tablesGetTableSearchProgress({
        workspaceId,
        tableId,
        generation,
        cursor,
        limit: 20,
      }),
    enabled: Boolean(search?.canRead && generation),
    retry: false,
    meta: { suppressErrorToast: true },
    refetchInterval: (query) =>
      query.state.error || search?.configuration.error || search?.provider.error
        ? false
        : searchPollInterval(search?.configuration.data, search?.provider.data),
  })
  if (!search) return null
  const failedIds =
    progress.data?.items
      .filter((item) => item.state === "failed")
      .map((item) => item.document_id) ?? []
  return (
    <div className="max-h-64 space-y-2 overflow-auto">
      <p className="font-medium text-foreground">行处理进度 · 每页最多 20 行</p>
      {progress.isPending && <p>正在加载进度…</p>}
      {progress.error && (
        <p role="alert">无法加载进度，请重新加载页面后重试。</p>
      )}
      {progress.data?.items.map((item) => (
        <div key={item.document_id} className="border-t pt-2">
          <p className="truncate">
            行 {item.row_id}: {item.state}
          </p>
          <p>
            {item.sampled_embedded} 已生成嵌入，抽样范围为 {item.sampled_chunks}{" "}
            个分块
            {item.chunks_capped ? "（还有更多分块）" : ""}.{" "}
            {item.expected_chunks === null
              ? "仍在统计总数。"
              : `共 ${item.expected_chunks} 个分块。`}
          </p>
          {item.error_code && (
            <p role="alert">{errorMessage(item.error_code)}</p>
          )}
        </div>
      ))}
      {progress.data?.items.length === 0 && <p>暂无可显示的行处理进度。</p>}
      <div className="flex flex-wrap gap-2">
        {search.canUpdate && failedIds.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={
              search.provider.data?.state !== "active" ||
              search.provider.data.reindex_required ||
              search.configuration.data?.index?.state !== "active" ||
              search.retry.isPending ||
              search.selection.isPending ||
              progress.isFetching
            }
            onClick={() => search.retry.mutate(failedIds)}
          >
            重试此页失败的行
          </Button>
        )}
        {cursor && (
          <Button
            size="sm"
            variant="ghost"
            disabled={progress.isFetching}
            onClick={() => setPage({ generation })}
          >
            第一页
          </Button>
        )}
        {progress.data?.has_more && progress.data.next_cursor && (
          <Button
            size="sm"
            variant="ghost"
            disabled={progress.isFetching}
            onClick={() =>
              setPage({
                generation,
                cursor: progress.data?.next_cursor ?? undefined,
              })
            }
          >
            下一页进度
          </Button>
        )}
      </div>
    </div>
  )
}
