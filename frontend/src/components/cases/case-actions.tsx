"use client"

import { Copy, ExternalLink, TagsIcon, Trash2 } from "lucide-react"
import Link from "next/link"
import type { CaseReadMinimal } from "@/client"
import { casesAddTag, casesRemoveTag } from "@/client"
import { DeleteCaseAlertDialogTrigger } from "@/components/cases/delete-case-dialog"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { caseHref } from "@/lib/cases/urls"
import { useCaseTagCatalog } from "@/lib/hooks"
import { useQueryClient } from "@/lib/query"
import { useWorkspaceId } from "@/providers/workspace-id"

export function CaseActions({
  item,
  setSelectedCase,
}: {
  item: CaseReadMinimal
  setSelectedCase: (case_: CaseReadMinimal) => void
}) {
  const workspaceId = useWorkspaceId()
  const { caseTags } = useCaseTagCatalog(workspaceId)
  const queryClient = useQueryClient()

  const handleTagToggle = async (tagId: string, hasTag: boolean) => {
    try {
      if (hasTag) {
        // Remove tag
        await casesRemoveTag({
          caseId: item.id,
          tagIdentifier: tagId,
          workspaceId,
        })
        const tag = caseTags?.find((t) => t.id === tagId)
        toast({
          title: "已移除标签",
          description: `已从事件移除标签“${tag?.name}”`,
        })
      } else {
        // Add tag
        await casesAddTag({
          caseId: item.id,
          workspaceId,
          requestBody: {
            tag_id: tagId,
          },
        })
        const tag = caseTags?.find((t) => t.id === tagId)
        toast({
          title: "已添加标签",
          description: `已为事件添加标签“${tag?.name}”`,
        })
      }

      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: ["cases"] })
    } catch (error) {
      console.error("Failed to modify tag:", error)
      toast({
        title: "错误",
        description: `${hasTag ? "移除" : "添加"}事件标签失败（${hasTag ? "来自" : "更改为"}）`,
        variant: "destructive",
      })
    }
  }

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        className="text-xs"
        onClick={(e) => e.stopPropagation()}
        asChild
      >
        <Link
          href={caseHref(workspaceId, item.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 size-3.5" />
          在新标签页中打开
        </Link>
      </DropdownMenuItem>

      {caseTags && caseTags.length > 0 ? (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className="text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <TagsIcon className="mr-2 size-3.5" />
            标签
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {caseTags.map((tag) => {
                const hasTag = item.tags?.some((t) => t.id === tag.id)
                return (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    className="text-xs"
                    checked={hasTag}
                    onClick={async (e) => {
                      e.stopPropagation()
                      await handleTagToggle(tag.id, !!hasTag)
                    }}
                  >
                    <div
                      className="mr-2 flex size-2 rounded-full"
                      style={{
                        backgroundColor: tag.color || undefined,
                      }}
                    />
                    <span>{tag.name}</span>
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      ) : (
        <DropdownMenuItem
          className="!bg-transparent text-xs !text-muted-foreground hover:cursor-not-allowed"
          onClick={(e) => e.stopPropagation()}
        >
          <TagsIcon className="mr-2 size-3.5" />
          <span>暂无可用标签</span>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem
        className="text-xs"
        onClick={async (e) => {
          e.stopPropagation()
          try {
            await navigator.clipboard.writeText(item.id)
            toast({
              title: "已复制事件 ID",
              description: (
                <div className="flex flex-col space-y-2">
                  <span>
                    已复制事件 ID：{" "}
                    <b className="inline-block">{item.short_id}</b>
                  </span>
                  <span className="text-muted-foreground">ID： {item.id}</span>
                </div>
              ),
            })
          } catch (error) {
            console.error("Failed to copy to clipboard:", error)
            toast({
              title: "复制失败",
              description: "无法将事件 ID 复制到剪贴板",
              variant: "destructive",
            })
          }
        }}
      >
        <Copy className="mr-2 size-3.5" />
        复制事件 ID
      </DropdownMenuItem>

      {/* Danger zone */}
      <DeleteCaseAlertDialogTrigger asChild>
        <DropdownMenuItem
          className="text-xs text-rose-500 focus:text-rose-600"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedCase(item)
          }}
        >
          <Trash2 className="mr-2 size-3.5" />
          删除
        </DropdownMenuItem>
      </DeleteCaseAlertDialogTrigger>
    </DropdownMenuGroup>
  )
}
