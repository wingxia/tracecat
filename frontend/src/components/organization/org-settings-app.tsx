"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
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
import { useOrgAppSettings } from "@/lib/hooks"

const appFormSchema = z.object({
  app_registry_validation_enabled: z.boolean(),
  app_executions_query_limit: z.number().min(1).max(1000),
  app_workflow_export_enabled: z.boolean(),
  app_create_workspace_on_register: z.boolean(),
  app_action_form_mode_enabled: z.boolean(),
  app_workflow_compact_conditions_enabled: z.boolean(),
})

type AppFormValues = z.infer<typeof appFormSchema>

export function OrgSettingsAppForm() {
  const {
    appSettings,
    appSettingsIsLoading,
    appSettingsError,
    updateAppSettings,
    updateAppSettingsIsPending,
  } = useOrgAppSettings()

  const form = useForm<AppFormValues>({
    resolver: zodResolver(appFormSchema),
    values: {
      app_registry_validation_enabled:
        appSettings?.app_registry_validation_enabled ?? false,
      app_executions_query_limit:
        appSettings?.app_executions_query_limit ?? 100,
      app_workflow_export_enabled:
        appSettings?.app_workflow_export_enabled ?? true,
      app_create_workspace_on_register:
        appSettings?.app_create_workspace_on_register ?? false,
      app_action_form_mode_enabled:
        appSettings?.app_action_form_mode_enabled ?? true,
      app_workflow_compact_conditions_enabled:
        appSettings?.app_workflow_compact_conditions_enabled ?? true,
    },
  })

  const onSubmit = async (data: AppFormValues) => {
    try {
      await updateAppSettings({
        requestBody: {
          app_registry_validation_enabled: data.app_registry_validation_enabled,
          app_executions_query_limit: data.app_executions_query_limit,
          app_workflow_export_enabled: data.app_workflow_export_enabled,
          app_create_workspace_on_register:
            data.app_create_workspace_on_register,
          app_action_form_mode_enabled: data.app_action_form_mode_enabled,
          app_workflow_compact_conditions_enabled:
            data.app_workflow_compact_conditions_enabled,
        },
      })
    } catch {
      console.error("Failed to update App settings")
    }
  }

  if (appSettingsIsLoading) {
    return <CenteredSpinner />
  }
  if (appSettingsError || !appSettings) {
    return (
      <AlertNotification
        level="error"
        message={`加载应用设置出错：${appSettingsError?.message || "未知错误"}`}
      />
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="app_registry_validation_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>启用注册表校验</FormLabel>
                <FormDescription>启用注册表校验。</FormDescription>
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
          name="app_executions_query_limit"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>工作流执行记录查询上限</FormLabel>
                <FormDescription>单次最多可查询的执行记录数。</FormDescription>
              </div>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="w-24"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="app_workflow_export_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>启用工作流导出</FormLabel>
                <FormDescription>
                  允许用户导出工作流，禁用后用户无法导出。
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
          name="app_create_workspace_on_register"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>注册时创建工作空间</FormLabel>
                <FormDescription>
                  新用户注册时自动创建工作空间。
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
          name="app_action_form_mode_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>启用动作表单模式</FormLabel>
                <FormDescription>
                  允许通过表单输入动作参数，禁用后仅支持 YAML 模式。
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
          name="app_workflow_compact_conditions_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>紧凑显示运行条件</FormLabel>
                <FormDescription>
                  在工作流画布上以图标显示运行条件，悬停或选择动作以查看完整条件。
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

        <Button type="submit" disabled={updateAppSettingsIsPending}>
          更新应用设置
        </Button>
      </form>
    </Form>
  )
}
