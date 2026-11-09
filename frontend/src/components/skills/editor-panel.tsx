"use client"

import {
  AlertCircle,
  Download,
  FilePlus2,
  FolderOpen,
  Loader2,
  PencilLine,
  RefreshCcw,
  Trash2,
  Upload,
} from "lucide-react"
import dynamic from "next/dynamic"
import { type ChangeEvent, useMemo, useRef, useState } from "react"
import type { SkillDraftFileRead, SkillDraftRead, SkillRead } from "@/client"
import { CenteredSpinner } from "@/components/loading/spinner"
import { ReadOnlyFieldset } from "@/components/managed/read-only-fieldset"
import { SkillFileTree } from "@/components/skills/file-tree"
import { RenameDialog } from "@/components/skills/rename-dialog"
import { SkillFileIcon } from "@/components/skills/skill-file-icon"
import { SkillToolsPanel } from "@/components/skills/skill-tools-panel"

const CodeEditor = dynamic(
  () =>
    import("@/components/editor/codemirror/code-editor").then(
      (m) => m.CodeEditor
    ),
  { ssr: false }
)
const SkillFrontmatterEditor = dynamic(
  () =>
    import("@/components/skills/skill-frontmatter-editor").then(
      (m) => m.SkillFrontmatterEditor
    ),
  { ssr: false, loading: FrontmatterEditorSkeleton }
)
const SimpleEditor = dynamic(
  () =>
    import("@/components/tiptap-templates/simple/simple-editor").then(
      (m) => m.SimpleEditor
    ),
  { ssr: false }
)

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsAtLeastWidth } from "@/hooks/use-is-at-least-width"
import { useManagedResources } from "@/hooks/use-managed-resources"
import {
  composeMarkdownFrontmatter,
  splitMarkdownFrontmatter,
} from "@/lib/markdown-frontmatter"
import type { VisibleFileEntry } from "@/lib/skills-studio"
import {
  buildSkillFileTree,
  getLanguageForPath,
  isEditablePath,
  isMarkdownPath,
  SKILL_MD_PATH,
} from "@/lib/skills-studio"
import { cn } from "@/lib/utils"

// Below this editor-area width the tools panel stacks under the instructions.
const TOOLS_SPLIT_MIN_WIDTH = 720

function FrontmatterEditorSkeleton() {
  return (
    <div role="status" className="w-full rounded-md border px-3 py-2">
      <span className="sr-only">正在加载元数据编辑器</span>
      <div aria-hidden="true" className="flex gap-4">
        <div className="flex shrink-0 flex-col gap-2 border-r pr-3">
          <Skeleton className="h-3 w-2" />
          <Skeleton className="h-3 w-2" />
          <Skeleton className="h-3 w-2" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  )
}

type EditorPanelProps = {
  skill?: SkillRead
  skillLoading: boolean
  draft?: SkillDraftRead
  draftLoading: boolean
  visibleFiles: VisibleFileEntry[]
  selectedFile: VisibleFileEntry | null
  selectedPath: string | null
  draftFile?: SkillDraftFileRead
  draftFileLoading: boolean
  currentTextValue: string | null
  markdownEditorActivatedRef: React.MutableRefObject<boolean>
  onSelectPath: (path: string) => void
  onEditorChange: (nextValue: string) => void
  onUndoSelectedFileChange: () => void
  onSaveWorkingCopy: () => Promise<void>
  onDeleteSelectedFile: () => void
  onReplaceSelectedFile: (event: ChangeEvent<HTMLInputElement>) => void
  pendingCreate: boolean
  pendingCreateError: string | null
  onBeginCreate: () => void
  onSubmitCreate: (path: string) => void
  onCancelCreate: () => void
  onChangeCreatePath: (value: string) => void
  moveSource: { fromPath: string; isFolder: boolean } | null
  onBeginMove: (path: string, isFolder: boolean) => void
  onCancelMove: () => void
  onCommitMove: (toFolderPath: string | null) => void
  renameTarget: { fromPath: string; isFolder: boolean } | null
  renameError: string | null
  onBeginRename: (path: string, isFolder: boolean) => void
  onCancelRename: () => void
  onSubmitRename: (newPath: string) => void | Promise<void>
}

/**
 * Center pane with file tree sidebar and code/markdown editor.
 *
 * @param props Panel state and callbacks from the parent hook.
 */
export function EditorPanel({
  skill,
  skillLoading,
  draft,
  draftLoading,
  visibleFiles,
  selectedFile,
  selectedPath,
  draftFile,
  draftFileLoading,
  currentTextValue,
  markdownEditorActivatedRef,
  onSelectPath,
  onEditorChange,
  onUndoSelectedFileChange,
  onSaveWorkingCopy,
  onDeleteSelectedFile,
  onReplaceSelectedFile,
  pendingCreate,
  pendingCreateError,
  onBeginCreate,
  onSubmitCreate,
  onCancelCreate,
  onChangeCreatePath,
  moveSource,
  onBeginMove,
  onCancelMove,
  onCommitMove,
  renameTarget,
  renameError,
  onBeginRename,
  onCancelRename,
  onSubmitRename,
}: EditorPanelProps) {
  const fileTree = useMemo(
    () => buildSkillFileTree(visibleFiles),
    [visibleFiles]
  )
  const replaceInputRef = useRef<HTMLInputElement>(null)
  // Managed skills are read-only: no file edits, creates, moves or deletes.
  const { isManaged } = useManagedResources()
  const readOnly = isManaged("skill", skill?.id)
  const splitFrontmatter =
    selectedFile !== null &&
    isMarkdownPath(selectedFile.path) &&
    currentTextValue !== null
      ? splitMarkdownFrontmatter(currentTextValue)
      : null
  // A callback ref, because the editor area mounts after the loading returns.
  const [editorArea, setEditorArea] = useState<HTMLDivElement | null>(null)
  const toolsBeside = useIsAtLeastWidth(editorArea, TOOLS_SPLIT_MIN_WIDTH)
  // Tools sit beside SKILL.md whenever its frontmatter and instructions show.
  const showTools =
    selectedFile?.path === SKILL_MD_PATH &&
    splitFrontmatter !== null &&
    !draftFileLoading &&
    selectedFile.change?.kind !== "delete" &&
    selectedFile.change?.kind !== "upload" &&
    isEditablePath(selectedFile.path)

  function handleToolsChange(nextFrontmatter: string) {
    if (!splitFrontmatter) {
      return
    }
    // A tools edit is always a user action, unlike the change events the
    // markdown editor emits on mount. The tools panel and its portalled picker
    // sit outside the editor's focus capture; activate for exactly this write.
    const activated = markdownEditorActivatedRef.current
    markdownEditorActivatedRef.current = true
    onEditorChange(
      composeMarkdownFrontmatter(nextFrontmatter, splitFrontmatter.body)
    )
    markdownEditorActivatedRef.current = activated
  }

  if (skillLoading || draftLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <CenteredSpinner />
      </div>
    )
  }

  if (!skill || !draft) {
    return (
      <div className="flex h-full items-center justify-center px-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="size-4" />
          <AlertTitle>未找到技能</AlertTitle>
          <AlertDescription>此技能可能已被删除或不可用。</AlertDescription>
        </Alert>
      </div>
    )
  }

  const editorBody = (
    <div className="h-full min-h-0 flex-1 overflow-auto">
      <ReadOnlyFieldset
        readOnly={readOnly}
        className="flex min-h-full flex-col p-4"
      >
        {!selectedFile ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            选择文件以开始编辑。
          </div>
        ) : draftFileLoading ? (
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
            {selectedFile.path === SKILL_MD_PATH ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-2/3" />
                <FrontmatterEditorSkeleton />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        ) : selectedFile.change?.kind === "delete" ? (
          <div className="flex flex-1 items-center justify-center">
            <Alert className="max-w-md">
              <Trash2 className="size-4" />
              <AlertTitle>已标记为删除</AlertTitle>
              <AlertDescription>
                保存工作副本会从技能中移除此文件，点击“重置”可保留。
              </AlertDescription>
            </Alert>
          </div>
        ) : selectedFile.change?.kind === "upload" ? (
          <div className="flex flex-1 items-center justify-center">
            <Alert className="max-w-md">
              <Upload className="size-4" />
              <AlertTitle>等待替换</AlertTitle>
              <AlertDescription>
                保存工作副本会上传并关联替换文件，点击“重置”可保留当前文件。
              </AlertDescription>
            </Alert>
          </div>
        ) : currentTextValue !== null && isEditablePath(selectedFile.path) ? (
          isMarkdownPath(selectedFile.path) && splitFrontmatter ? (
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
              <div
                className="flex flex-col gap-2"
                onFocusCapture={() => {
                  markdownEditorActivatedRef.current = true
                }}
              >
                <div>
                  <div className="text-sm font-medium">元数据</div>
                  <div className="text-xs text-muted-foreground">
                    智能体用于发现此技能的元数据。需要{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                      名称
                    </code>{" "}
                    和{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                      描述
                    </code>
                    .
                  </div>
                </div>
                {selectedFile.path === SKILL_MD_PATH ? (
                  <SkillFrontmatterEditor
                    value={splitFrontmatter.frontmatter}
                    readOnly={readOnly}
                    onChange={(nextFrontmatter) =>
                      onEditorChange(
                        composeMarkdownFrontmatter(
                          nextFrontmatter,
                          splitFrontmatter.body
                        )
                      )
                    }
                  />
                ) : (
                  <CodeEditor
                    value={splitFrontmatter.frontmatter}
                    readOnly={readOnly}
                    onChange={(nextFrontmatter) =>
                      onEditorChange(
                        composeMarkdownFrontmatter(
                          nextFrontmatter,
                          splitFrontmatter.body
                        )
                      )
                    }
                    language="yaml"
                    className="[&_.cm-scroller]:max-h-64"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="mb-2">
                  <div className="text-sm font-medium">指令</div>
                  <div className="text-xs text-muted-foreground">
                    技能被触发时，智能体加载的工作流、示例和参考资料。
                  </div>
                </div>
                <SimpleEditor
                  value={splitFrontmatter.body}
                  editable={!readOnly}
                  onChange={(nextBody) =>
                    onEditorChange(
                      composeMarkdownFrontmatter(
                        splitFrontmatter.frontmatter,
                        nextBody
                      )
                    )
                  }
                  onSave={readOnly ? undefined : () => void onSaveWorkingCopy()}
                  onFocus={() => {
                    markdownEditorActivatedRef.current = true
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          ) : isMarkdownPath(selectedFile.path) ? (
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
              <SimpleEditor
                value={currentTextValue}
                editable={!readOnly}
                onChange={onEditorChange}
                onSave={readOnly ? undefined : () => void onSaveWorkingCopy()}
                onFocus={() => {
                  markdownEditorActivatedRef.current = true
                }}
                className="flex-1"
              />
            </div>
          ) : (
            <CodeEditor
              value={currentTextValue}
              readOnly={readOnly}
              onChange={onEditorChange}
              language={getLanguageForPath(selectedFile.path)}
              className="flex-1"
            />
          )
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Alert className="max-w-md">
              <Download className="size-4" />
              <AlertTitle>只读文件</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  首版暂不支持在线编辑此文件类型。你可以替换、删除或下载当前文件。
                </p>
                {draftFile?.kind === "download" && draftFile.download_url ? (
                  // Downloading does not edit, so it stays usable on a
                  // managed skill's locked fieldset.
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="pointer-events-auto"
                  >
                    <a
                      href={draftFile.download_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download className="mr-2 size-4" />
                      下载当前文件
                    </a>
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </ReadOnlyFieldset>
    </div>
  )

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="flex h-full min-h-0 overflow-hidden"
      >
        {/* File tree sidebar */}
        <ResizablePanel
          defaultSize={20}
          minSize={12}
          maxSize={40}
          className="flex h-full min-h-0 flex-col"
        >
          <div className="flex h-8 items-center justify-end gap-0.5 border-b px-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={onBeginCreate}
              disabled={readOnly}
              aria-label={"新建文件"}
            >
              <FilePlus2 className="size-3.5" />
            </Button>
            {!readOnly &&
            selectedFile &&
            selectedFile.path !== SKILL_MD_PATH ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={() => onBeginMove(selectedFile.path, false)}
                  aria-label={"移动文件"}
                >
                  <FolderOpen className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-foreground"
                  onClick={() => onBeginRename(selectedFile.path, false)}
                  aria-label={"重命名文件"}
                >
                  <PencilLine className="size-3.5" />
                </Button>
              </>
            ) : null}
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="px-1 py-1">
              <SkillFileTree
                nodes={fileTree}
                selectedPath={selectedPath}
                onSelectPath={onSelectPath}
                // Managed skills get no tree mutations: create, move or
                // folder rename.
                pendingCreate={!readOnly && pendingCreate}
                pendingCreateError={pendingCreateError}
                onSubmitCreate={readOnly ? undefined : onSubmitCreate}
                onCancelCreate={onCancelCreate}
                onChangeCreatePath={onChangeCreatePath}
                moveSource={readOnly ? null : moveSource}
                onCancelMove={onCancelMove}
                onCommitMove={readOnly ? undefined : onCommitMove}
                onBeginRenameFolder={
                  readOnly ? undefined : (path) => onBeginRename(path, true)
                }
              />
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle />

        {/* Editor area */}
        <ResizablePanel
          defaultSize={80}
          className="flex min-h-0 flex-col overflow-hidden"
        >
          <div className="flex h-8 items-center justify-between border-b px-3">
            <div className="flex items-center gap-1.5 text-xs font-light">
              {selectedFile ? (
                <SkillFileIcon
                  path={selectedFile.path}
                  className="size-3.5 text-muted-foreground"
                />
              ) : null}
              <span className="truncate">
                {selectedFile?.path ?? "选择文件"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!readOnly && selectedFile?.change ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={onUndoSelectedFileChange}
                >
                  <RefreshCcw className="mr-2 size-3.5" />
                  重置
                </Button>
              ) : null}
              {!readOnly && selectedFile ? (
                <>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    className="hidden"
                    onChange={onReplaceSelectedFile}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => replaceInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-3.5" />
                    替换
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={onDeleteSelectedFile}
                  >
                    <Trash2 className="mr-2 size-3.5" />
                    删除
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div ref={setEditorArea} className="flex min-h-0 flex-1 flex-col">
            {showTools && splitFrontmatter ? (
              <ResizablePanelGroup
                direction={toolsBeside ? "horizontal" : "vertical"}
                className="min-h-0 flex-1"
              >
                <ResizablePanel defaultSize={62} minSize={40}>
                  {editorBody}
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel
                  defaultSize={38}
                  minSize={26}
                  className={cn(toolsBeside && "min-w-[280px]")}
                >
                  <div className="h-full overflow-auto px-4 pb-4 [--tool-list-inset:1rem]">
                    <ReadOnlyFieldset readOnly={readOnly}>
                      <SkillToolsPanel
                        workspaceId={skill.workspace_id}
                        frontmatter={splitFrontmatter.frontmatter}
                        onChange={handleToolsChange}
                      />
                    </ReadOnlyFieldset>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              editorBody
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <RenameDialog
        target={renameTarget}
        error={renameError}
        onCancel={onCancelRename}
        onSubmit={onSubmitRename}
      />
    </>
  )
}
