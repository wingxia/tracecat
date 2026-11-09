"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { KeyIcon, PlusIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"
import type { ScopeRead, ScopeSource } from "@/client"
import {
  RbacDetailRow,
  RbacListContainer,
  RbacListEmpty,
  RbacListHeader,
  RbacListItem,
} from "@/components/organization/rbac-list-item"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useRbacScopes } from "@/lib/hooks"

const SCOPE_SOURCE_COLORS: Record<ScopeSource, string> = {
  platform: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  custom: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

export function OrgRbacScopes() {
  const [selectedScope, setSelectedScope] = useState<ScopeRead | null>(null)
  const [expandedScopeId, setExpandedScopeId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<ScopeSource | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const {
    scopes,
    isLoading,
    error,
    createScope,
    createScopeIsPending,
    deleteScope,
    deleteScopeIsPending,
  } = useRbacScopes({
    includeSystem: true,
    source: sourceFilter === "all" ? undefined : sourceFilter,
  })

  const filteredScopes = useMemo(() => {
    if (!searchQuery.trim()) return scopes
    const query = searchQuery.toLowerCase()
    return scopes.filter(
      (scope) =>
        scope.name.toLowerCase().includes(query) ||
        scope.description?.toLowerCase().includes(query) ||
        scope.resource.toLowerCase().includes(query) ||
        scope.action.toLowerCase().includes(query)
    )
  }, [scopes, searchQuery])

  const handleCreateScope = async (name: string, description: string) => {
    await createScope({ name, description: description || undefined })
    setIsCreateOpen(false)
  }

  const handleDeleteScope = async () => {
    if (selectedScope) {
      await deleteScope(selectedScope.id)
      setSelectedScope(null)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-destructive">
        加载权限范围失败
      </div>
    )
  }

  return (
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedScope(null)
          }
        }}
      >
        <div className="space-y-4">
          <RbacListHeader
            left={
              <div className="flex items-center gap-3">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={"搜索权限范围…"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-[200px] pl-8"
                  />
                </div>
                <Select
                  value={sourceFilter}
                  onValueChange={(v) =>
                    setSourceFilter(v as ScopeSource | "all")
                  }
                >
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder={"按来源筛选"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有来源</SelectItem>
                    <SelectItem value="platform">平台</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
            right={
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusIcon className="mr-2 size-4" />
                  创建权限范围
                </Button>
              </DialogTrigger>
            }
          />

          {isLoading ? (
            <RbacListContainer>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-border/50 px-3 py-2.5 last:border-b-0"
                >
                  <Skeleton className="size-6" />
                  <Skeleton className="size-4" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </RbacListContainer>
          ) : filteredScopes.length === 0 ? (
            <RbacListContainer>
              <RbacListEmpty
                message={
                  searchQuery || sourceFilter !== "all"
                    ? "没有符合筛选条件的权限范围"
                    : "未找到权限范围"
                }
              />
            </RbacListContainer>
          ) : (
            <RbacListContainer>
              {filteredScopes.map((scope) => (
                <RbacListItem
                  key={scope.id}
                  icon={<KeyIcon className="size-4" />}
                  title={
                    <code className="text-xs font-mono">{scope.name}</code>
                  }
                  subtitle={
                    scope.description || `${scope.resource}:${scope.action}`
                  }
                  badges={
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${SCOPE_SOURCE_COLORS[scope.source]}`}
                    >
                      {scope.source}
                    </Badge>
                  }
                  isExpanded={expandedScopeId === scope.id}
                  onExpandedChange={(expanded) =>
                    setExpandedScopeId(expanded ? scope.id : null)
                  }
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                        >
                          <span className="sr-only">打开菜单</span>
                          <DotsHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard.writeText(scope.name)
                          }
                        >
                          复制权限范围名称
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard.writeText(scope.id)
                          }
                        >
                          复制权限范围 ID
                        </DropdownMenuItem>
                        {scope.source === "custom" && (
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-rose-500 focus:text-rose-600"
                              onClick={() => setSelectedScope(scope)}
                            >
                              删除
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                >
                  <div className="space-y-3">
                    <RbacDetailRow label={"名称"}>
                      <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-mono">
                        {scope.name}
                      </code>
                    </RbacDetailRow>
                    <RbacDetailRow label={"资源"}>
                      <span className="text-muted-foreground">
                        {scope.resource}
                      </span>
                    </RbacDetailRow>
                    <RbacDetailRow label={"动作"}>
                      <span className="text-muted-foreground">
                        {scope.action}
                      </span>
                    </RbacDetailRow>
                    <RbacDetailRow label={"来源"}>
                      <Badge
                        variant="secondary"
                        className={SCOPE_SOURCE_COLORS[scope.source]}
                      >
                        {scope.source}
                      </Badge>
                    </RbacDetailRow>
                    {scope.description && (
                      <RbacDetailRow label={"描述"}>
                        {scope.description}
                      </RbacDetailRow>
                    )}
                  </div>
                </RbacListItem>
              ))}
            </RbacListContainer>
          )}
        </div>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除权限范围</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除权限范围{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                {selectedScope?.name}
              </code>
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteScope}
              disabled={deleteScopeIsPending}
            >
              {deleteScopeIsPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateScopeDialog
        onSubmit={handleCreateScope}
        isPending={createScopeIsPending}
        onOpenChange={setIsCreateOpen}
      />
    </Dialog>
  )
}

function CreateScopeDialog({
  onSubmit,
  isPending,
  onOpenChange,
}: {
  onSubmit: (name: string, description: string) => Promise<void>
  isPending: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit(name.trim(), description.trim())
    setName("")
    setDescription("")
  }

  return (
    <DialogContent size="md">
      <DialogHeader>
        <DialogTitle>创建自定义权限范围</DialogTitle>
        <DialogDescription>
          为组织创建自定义权限范围。名称应采用以下格式：{" "}
          <code>resource:action</code> （例如： <code>workflow:execute</code>).
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scope-name">权限范围名称</Label>
              <Input
                id="scope-name"
                placeholder={"例如：custom:my-scope:read"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                pattern="^[a-z0-9:_.*-]+$"
                required
              />
              <p className="text-xs text-muted-foreground">
                仅允许小写字母、数字、冒号、下划线、点、星号和连字符。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope-description">描述（可选）</Label>
              <Textarea
                id="scope-description"
                placeholder={"描述此权限范围允许访问的内容"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button size="sm" type="submit" disabled={!name.trim() || isPending}>
            {isPending ? "创建中…" : "创建权限范围"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
