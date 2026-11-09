"use client"

import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import {
  type CollectionObject,
  type WorkflowExecutionCollectionPageItem,
  type WorkflowExecutionCollectionPageResponse,
  workflowExecutionsGetWorkflowExecutionCollectionPage,
} from "@/client"
import { CodeBlock } from "@/components/code-block"
import { ExternalObjectResult } from "@/components/executions/external-object-result"
import { JsonViewWithControls } from "@/components/json-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  isExternalStoredObject,
  isInlineStoredObject,
} from "@/lib/stored-object"
import { useWorkspaceId } from "@/providers/workspace-id"

const DEFAULT_PAGE_SIZE = 25

function getElementKindLabel(kind: CollectionObject["element_kind"]): string {
  if (kind === "stored_object") {
    return "已存储项目"
  }
  return "内嵌值"
}

function getItemKindLabel(item: WorkflowExecutionCollectionPageItem): string {
  if (item.kind === "inline_value") {
    return "值"
  }
  if (item.stored && isExternalStoredObject(item.stored)) {
    return "文件"
  }
  if (item.stored && isInlineStoredObject(item.stored)) {
    return "值"
  }
  return "已存储项目"
}

function formatSize(sizeBytes: number): string {
  if (sizeBytes === 0) {
    return "0 Bytes"
  }
  const units = ["Bytes", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
    units.length - 1
  )
  const value = sizeBytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatPageWindow(
  offset: number,
  count: number,
  total: number
): string {
  if (count === 0) {
    return "0 items"
  }
  const start = offset + 1
  const end = Math.min(offset + count, total)
  return `${start}–${end} of ${total}`
}

export function CollectionObjectResult({
  executionId,
  eventId,
  collection,
  copyMode = "jsonpath-only",
  copyPrefix,
}: {
  executionId: string
  eventId: number
  collection: CollectionObject
  copyMode?: "jsonpath-only" | "jsonpath-and-payload"
  copyPrefix?: string
}) {
  const workspaceId = useWorkspaceId()
  const [offset, setOffset] = useState(0)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [page, setPage] =
    useState<WorkflowExecutionCollectionPageResponse | null>(null)

  useEffect(() => {
    setOffset(0)
    setPage(null)
    setPageError(null)
  }, [eventId, executionId])

  useEffect(() => {
    let cancelled = false
    const loadPage = async () => {
      setIsLoadingPage(true)
      setPageError(null)
      try {
        const response =
          await workflowExecutionsGetWorkflowExecutionCollectionPage({
            executionId,
            workspaceId,
            requestBody: {
              event_id: eventId,
              offset,
              limit: DEFAULT_PAGE_SIZE,
            },
          })
        if (!cancelled) {
          setPage(response)
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "获取集合分页失败"
          setPageError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPage(false)
        }
      }
    }
    void loadPage()
    return () => {
      cancelled = true
    }
  }, [eventId, executionId, offset, workspaceId])

  const resolvedCollection = page?.collection ?? collection
  const pageItems = page?.items ?? []
  const canPrev = offset > 0
  const canNext = (page?.next_offset ?? null) !== null
  const summaryLabel = useMemo(
    () =>
      `${resolvedCollection.count} 个条目 • 每页 ${resolvedCollection.chunk_size} 项 • ${getElementKindLabel(resolvedCollection.element_kind)}`,
    [
      resolvedCollection.chunk_size,
      resolvedCollection.count,
      resolvedCollection.element_kind,
    ]
  )
  const pageWindow = formatPageWindow(
    offset,
    pageItems.length,
    resolvedCollection.count
  )

  return (
    <div className="flex flex-col gap-3 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">集合结果</p>
          <p className="text-muted-foreground">{summaryLabel}</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {pageWindow}
        </Badge>
      </div>

      {isLoadingPage && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderIcon className="size-3 animate-spin" />
          <span>正在加载集合分页…</span>
        </div>
      )}

      {pageError && (
        <div className="text-rose-600">加载集合分页失败： {pageError}</div>
      )}

      {!isLoadingPage && !pageError && (
        <div className="overflow-hidden rounded-md border bg-background">
          {pageItems.length === 0 ? (
            <div className="px-3 py-2 text-muted-foreground">
              此页没有项目。
            </div>
          ) : (
            pageItems.map((item) => (
              <div
                key={item.index}
                className="flex flex-col gap-2 border-b px-3 py-2.5 last:border-b-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      项目 {item.index}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {getItemKindLabel(item)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {item.value_size_bytes !== null &&
                    item.value_size_bytes !== undefined ? (
                      <span>{formatSize(item.value_size_bytes)}</span>
                    ) : null}
                    {item.truncated ? (
                      <>
                        <span>•</span>
                        <span>预览已截断</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {item.kind === "stored_object_ref" && item.stored ? (
                  isExternalStoredObject(item.stored) ? (
                    <ExternalObjectResult
                      executionId={executionId}
                      eventId={eventId}
                      external={item.stored}
                      collectionIndex={item.index}
                      compact={true}
                    />
                  ) : isInlineStoredObject(item.stored) ? (
                    <div className="rounded-sm border border-dashed p-2">
                      <JsonViewWithControls
                        src={item.stored.data}
                        defaultExpanded={true}
                        copyMode={copyMode}
                        copyPrefix={getCollectionItemCopyPrefix(
                          copyPrefix,
                          item.index
                        )}
                      />
                    </div>
                  ) : (
                    <div className="rounded-sm border border-dashed p-2">
                      <JsonViewWithControls
                        src={item.stored}
                        defaultExpanded={true}
                        copyMode={copyMode}
                        copyPrefix={getCollectionItemCopyPrefix(
                          copyPrefix,
                          item.index
                        )}
                      />
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <CodeBlock title={`项目 ${item.index} 预览`}>
                      {item.value_preview ?? "暂无内嵌预览。"}
                    </CodeBlock>
                    {item.truncated ? (
                      <p className="text-muted-foreground">
                        正在显示此值的截断预览。
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{pageWindow}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!canPrev || isLoadingPage}
            onClick={() =>
              setOffset((prev) => Math.max(0, prev - DEFAULT_PAGE_SIZE))
            }
          >
            <ChevronLeftIcon className="mr-2 size-3" />
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!canNext || isLoadingPage}
            onClick={() => {
              if (
                page?.next_offset !== null &&
                page?.next_offset !== undefined
              ) {
                setOffset(page.next_offset)
              }
            }}
          >
            下一页
            <ChevronRightIcon className="ml-2 size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function getCollectionItemCopyPrefix(
  copyPrefix: string | undefined,
  itemIndex: number
): string | undefined {
  if (!copyPrefix) {
    return undefined
  }
  return `${copyPrefix}[${itemIndex}]`
}
