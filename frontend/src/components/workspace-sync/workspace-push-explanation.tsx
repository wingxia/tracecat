/** Explain workspace Push's existing draft export policy without blocking it. */
export function WorkspacePushExplanation() {
  return (
    <p className="text-xs text-muted-foreground">
      工作空间推送可直接导出新工作流的当前编辑，无需先发布。若要从单个新工作流页面推送，请先发布。
    </p>
  )
}
