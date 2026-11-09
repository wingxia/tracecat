"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { WorkspaceRead } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useWorkspaceSettings } from "@/lib/hooks"

export const runtimeSettingsSchema = z
  .object({
    workflow_unlimited_timeout_enabled: z.boolean().optional(),
    workflow_default_timeout_seconds: z.number().optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.workflow_unlimited_timeout_enabled ||
      values.workflow_default_timeout_seconds === undefined ||
      values.workflow_default_timeout_seconds >= 1
    ) {
      return
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "超时时间至少为 1 秒",
      path: ["workflow_default_timeout_seconds"],
    })
  })

type RuntimeSettingsForm = z.infer<typeof runtimeSettingsSchema>

interface WorkspaceRuntimeSettingsProps {
  workspace: WorkspaceRead
}

export function buildRuntimeSettingsUpdate(values: RuntimeSettingsForm) {
  return {
    workflow_unlimited_timeout_enabled:
      values.workflow_unlimited_timeout_enabled,
    workflow_default_timeout_seconds:
      values.workflow_default_timeout_seconds ?? null,
  }
}

export function WorkspaceRuntimeSettings({
  workspace,
}: WorkspaceRuntimeSettingsProps) {
  const { updateWorkspace, isUpdating } = useWorkspaceSettings(workspace.id)

  const form = useForm<RuntimeSettingsForm>({
    resolver: zodResolver(runtimeSettingsSchema),
    mode: "onChange",
    defaultValues: {
      workflow_unlimited_timeout_enabled:
        workspace.settings?.workflow_unlimited_timeout_enabled ?? false,
      workflow_default_timeout_seconds:
        workspace.settings?.workflow_default_timeout_seconds || undefined,
    },
  })

  async function onSubmit(values: RuntimeSettingsForm) {
    await updateWorkspace({
      settings: buildRuntimeSettingsUpdate(values),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="workflow_unlimited_timeout_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>工作流不限制超时</FormLabel>
                <FormDescription>
                  强制所有工作流无限运行，不受超时限制。
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workflow_default_timeout_seconds"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>默认工作流超时时间</FormLabel>
                <FormDescription>
                  此工作空间中工作流的默认超时秒数。启用不限制超时后，此设置不生效。
                </FormDescription>
              </div>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="300"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  disabled={form.watch("workflow_unlimited_timeout_enabled")}
                  className="w-24"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isUpdating} size="sm">
          {isUpdating ? "保存中…" : "保存"}
        </Button>
      </form>
    </Form>
  )
}
