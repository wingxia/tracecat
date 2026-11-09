"use client"

import { ExternalLinkIcon } from "lucide-react"
import Link from "next/link"
import type { WorkflowRead } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { CopyButton } from "@/components/copy-button"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import {
  useCreateForm,
  useFormDetail,
  useForms,
  useUpdateForm,
} from "@/hooks/use-forms"
import { getApiErrorDetail } from "@/lib/errors"
import { getFormErrorDetail } from "@/lib/forms/errors"
import { useWorkspaceId } from "@/providers/workspace-id"

/**
 * The Form tab of the workflow builder's trigger panel: a switch that puts
 * the workflow's form online (creating it if needed, and only once the
 * workflow is published), the requester link, and a link to the form's page.
 */
export function FormTriggerControls({
  workflow,
}: {
  workflow: Pick<WorkflowRead, "id" | "version">
}) {
  const workspaceId = useWorkspaceId()
  const canCreate = useScopeCheck("form:create")
  const canUpdate = useScopeCheck("form:update")
  const { forms, formsIsLoading, formsError } = useForms(workspaceId)
  const listed = forms.find((form) => form.workflow_id === workflow.id)
  // The list has no URL. The detail carries the one requesters open.
  const { data: detail } = useFormDetail(
    { workspaceId, formId: listed?.id },
    { enabled: Boolean(listed) }
  )
  const { mutateAsync: createForm, isPending: createFormIsPending } =
    useCreateForm(workspaceId)
  const { mutateAsync: updateForm, isPending: updateFormIsPending } =
    useUpdateForm({
      workspaceId,
      formId: listed?.id ?? "",
    })

  if (formsIsLoading) {
    return <CenteredSpinner />
  }
  if (formsError) {
    return <p className="text-xs text-destructive">无法加载表单。</p>
  }

  const isPublished = typeof workflow.version === "number"
  const online = (detail?.status ?? listed?.status) === "online"
  // Only a known missing scope disables the switch; a loading one does not.
  // Without `form:update` the list hides each form's workflow, so a form that
  // exists would look absent and creating another would conflict.
  const lacksScope = canUpdate === false || (!listed && canCreate === false)
  const isPending = createFormIsPending || updateFormIsPending

  let hint = "表单已下线"
  if (!isPublished) {
    hint = "发布工作流以将其表单上线"
  } else if (online) {
    hint = "表单已上线，正在接受提交"
  } else if (!listed) {
    hint = "启用后可根据此工作流的输入创建表单"
  }

  async function setOnline(next: boolean) {
    const status = next ? "online" : "offline"
    try {
      if (listed) {
        await updateForm({ status })
      } else {
        await createForm({ workflow_id: workflow.id, status })
      }
    } catch (error) {
      toast({
        title: next ? "无法上线表单" : "无法下线表单",
        description:
          getFormErrorDetail(error)?.message ??
          getApiErrorDetail(error) ??
          "出现了问题。",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <div className="space-y-1">
          <Label
            htmlFor="form-trigger-switch"
            className="text-xs font-semibold"
          >
            启用表单
          </Label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Switch
          id="form-trigger-switch"
          checked={online}
          onCheckedChange={setOnline}
          className="data-[state=checked]:bg-emerald-500"
          disabled={!isPublished || lacksScope || isPending}
        />
      </div>

      {listed && (
        <>
          {detail && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="form-trigger-url"
                  className="text-xs font-medium"
                >
                  填写者链接
                </Label>
                <CopyButton
                  value={detail.url}
                  toastMessage="已将表单链接复制到剪贴板"
                />
              </div>
              <Input
                id="form-trigger-url"
                value={detail.url}
                className="text-xs"
                readOnly
              />
            </div>
          )}
          <Link
            href={`/workspaces/${workspaceId}/forms/${listed.id}`}
            className="flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLinkIcon className="size-3.5" />
            在表单中编辑
          </Link>
        </>
      )}
    </div>
  )
}
