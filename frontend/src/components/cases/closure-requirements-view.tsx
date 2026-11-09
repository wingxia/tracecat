"use client"

import { ArrowUpRight, ShieldCheck } from "lucide-react"
import {
  type CaseDropdownDefinitionRead,
  type CaseFieldReadMinimal,
  caseDropdownsUpdateDropdownDefinition,
  casesUpdateField,
} from "@/client"
import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useWorkspaceDetails } from "@/hooks/use-workspace"
import { useCaseDropdownDefinitions, useCaseFields } from "@/lib/hooks"
import { useMutation, useQueryClient } from "@/lib/query"
import { useWorkspaceId } from "@/providers/workspace-id"

/** Row shape for the unified closure requirements table. */
interface ClosureRow {
  id: string
  name: string
  type: string
  kind: "field" | "dropdown"
  required_on_closure: boolean
}

/**
 * Unified view for managing which custom fields and dropdowns
 * are required before a case can be closed or resolved.
 */
export function ClosureRequirementsView() {
  const workspaceId = useWorkspaceId()
  const queryClient = useQueryClient()
  const { workspace, workspaceLoading, workspaceError } = useWorkspaceDetails()
  const { hasEntitlement, isLoading: entitlementsLoading } = useEntitlements()
  const caseAddonsEnabled = hasEntitlement("case_addons")

  const { caseFields, caseFieldsIsLoading, caseFieldsError } =
    useCaseFields(workspaceId)
  const {
    dropdownDefinitions,
    dropdownDefinitionsIsLoading,
    dropdownDefinitionsError,
  } = useCaseDropdownDefinitions(workspaceId, caseAddonsEnabled)

  const { mutateAsync: updateField } = useMutation({
    mutationFn: async ({
      fieldId,
      requiredOnClosure,
    }: {
      fieldId: string
      requiredOnClosure: boolean
    }) => {
      await casesUpdateField({
        workspaceId,
        fieldId,
        requestBody: { required_on_closure: requiredOnClosure },
      })
    },
    meta: { suppressErrorToast: false },
    onMutate: async ({ fieldId, requiredOnClosure }) => {
      await queryClient.cancelQueries({
        queryKey: ["case-fields", workspaceId],
      })
      const previousFields = queryClient.getQueryData<CaseFieldReadMinimal[]>([
        "case-fields",
        workspaceId,
      ])
      queryClient.setQueryData<CaseFieldReadMinimal[]>(
        ["case-fields", workspaceId],
        (old) =>
          old?.map((f) =>
            f.id === fieldId
              ? { ...f, required_on_closure: requiredOnClosure }
              : f
          )
      )
      return { previousFields }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFields) {
        queryClient.setQueryData(
          ["case-fields", workspaceId],
          context.previousFields
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["case-fields", workspaceId] })
    },
  })

  const { mutateAsync: updateDropdown } = useMutation({
    mutationFn: async ({
      definitionId,
      requiredOnClosure,
    }: {
      definitionId: string
      requiredOnClosure: boolean
    }) => {
      await caseDropdownsUpdateDropdownDefinition({
        workspaceId,
        definitionId,
        requestBody: { required_on_closure: requiredOnClosure },
      })
    },
    meta: { suppressErrorToast: false },
    onMutate: async ({ definitionId, requiredOnClosure }) => {
      await queryClient.cancelQueries({
        queryKey: ["case-dropdown-definitions", workspaceId],
      })
      const previousDropdowns = queryClient.getQueryData<
        CaseDropdownDefinitionRead[]
      >(["case-dropdown-definitions", workspaceId])
      queryClient.setQueryData<CaseDropdownDefinitionRead[]>(
        ["case-dropdown-definitions", workspaceId],
        (old) =>
          old?.map((d) =>
            d.id === definitionId
              ? { ...d, required_on_closure: requiredOnClosure }
              : d
          )
      )
      return { previousDropdowns }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDropdowns) {
        queryClient.setQueryData(
          ["case-dropdown-definitions", workspaceId],
          context.previousDropdowns
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-dropdown-definitions", workspaceId],
      })
    },
  })

  if (entitlementsLoading) {
    return <CenteredSpinner />
  }

  if (!caseAddonsEnabled) {
    return (
      <div className="size-full overflow-auto">
        <div className="container flex h-full max-w-[1000px] items-center justify-center py-8">
          <EntitlementRequiredEmptyState
            title={"仅限企业版"}
            description={"关闭条件仅适用于企业版套餐。"}
          >
            <Button
              variant="link"
              asChild
              className="text-muted-foreground"
              size="sm"
            >
              <a
                href="https://tracecat.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                了解更多 <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </EntitlementRequiredEmptyState>
        </div>
      </div>
    )
  }

  if (workspaceLoading || caseFieldsIsLoading || dropdownDefinitionsIsLoading) {
    return <CenteredSpinner />
  }

  if (workspaceError) {
    return (
      <AlertNotification level="error" message={"加载工作空间信息出错。"} />
    )
  }

  if (!workspace) {
    return <AlertNotification level="error" message={"未找到工作空间。"} />
  }

  if (caseFieldsError) {
    return <AlertNotification level="error" message={caseFieldsError.message} />
  }

  if (dropdownDefinitionsError) {
    return (
      <AlertNotification
        level="error"
        message={`加载下拉字段出错：${dropdownDefinitionsError.message}`}
      />
    )
  }

  const customFields = (caseFields ?? []).filter((f) => !f.reserved)
  const dropdowns = dropdownDefinitions ?? []

  const rows: ClosureRow[] = [
    ...customFields.map(
      (f): ClosureRow => ({
        id: f.id,
        name: f.display_name,
        type: f.kind ?? f.type,
        kind: "field",
        required_on_closure: f.required_on_closure ?? false,
      })
    ),
    ...dropdowns.map(
      (d): ClosureRow => ({
        id: d.id,
        name: d.name,
        type: "Dropdown",
        kind: "dropdown",
        required_on_closure: d.required_on_closure,
      })
    ),
  ]

  if (rows.length === 0) {
    return (
      <div className="size-full overflow-auto">
        <div className="container flex h-full max-w-[1000px] flex-col space-y-8 py-8">
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck className="size-6" />
              </EmptyMedia>
              <EmptyTitle>尚未定义字段或下拉选项</EmptyTitle>
              <EmptyDescription>
                先创建自定义字段或下拉选项，再配置关闭或解决事件前需要填写的内容。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    )
  }

  async function handleToggle(row: ClosureRow, checked: boolean) {
    try {
      if (row.kind === "field") {
        await updateField({ fieldId: row.id, requiredOnClosure: checked })
      } else {
        await updateDropdown({
          definitionId: row.id,
          requiredOnClosure: checked,
        })
      }
      toast({
        title: checked ? "已标记为必填" : "已取消必填要求",
        description: `${row.name} ${checked ? "将设为" : "不再"}在关闭时必填。`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "更新失败",
        description: "请重试。",
      })
    }
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-8 py-8">
        <div className="space-y-4">
          <DataTable
            data={rows}
            toolbarProps={{
              filterProps: {
                column: "name",
                placeholder: "按名称筛选…",
              },
            }}
            columns={[
              {
                accessorKey: "name",
                header: ({ column }) => (
                  <DataTableColumnHeader
                    className="text-xs"
                    column={column}
                    title={"名称"}
                  />
                ),
                cell: ({ row }) => (
                  <div className="text-xs text-foreground/80">
                    {row.getValue<string>("name")}
                  </div>
                ),
                enableSorting: true,
                enableHiding: false,
              },
              {
                accessorKey: "type",
                header: ({ column }) => (
                  <DataTableColumnHeader
                    className="text-xs"
                    column={column}
                    title={"输入"}
                  />
                ),
                cell: ({ row }) => (
                  <div className="text-xs text-muted-foreground">
                    {row.getValue<string>("type")}
                  </div>
                ),
                enableSorting: true,
                enableHiding: false,
              },
              {
                accessorKey: "required_on_closure",
                header: ({ column }) => (
                  <DataTableColumnHeader
                    className="text-xs"
                    column={column}
                    title={"必填"}
                  />
                ),
                cell: ({ row }) => (
                  <Switch
                    checked={row.getValue<boolean>("required_on_closure")}
                    onCheckedChange={(checked) =>
                      handleToggle(row.original, checked)
                    }
                  />
                ),
                enableSorting: false,
                enableHiding: false,
              },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
