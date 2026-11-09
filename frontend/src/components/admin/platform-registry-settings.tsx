"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useAdminRegistrySettings } from "@/hooks/use-admin"
import { validateGitSshUrl } from "@/lib/git"

const formSchema = z.object({
  git_repo_url: z
    .string()
    .superRefine((val, ctx) => validateGitSshUrl(val || null, ctx))
    .optional()
    .nullable()
    .or(z.literal("")),
  git_repo_package_name: z.string().optional().nullable().or(z.literal("")),
  git_allowed_domains: z.string().optional().nullable().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

export function PlatformRegistrySettings() {
  const { settings, isLoading, updateSettings, updatePending } =
    useAdminRegistrySettings()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      git_repo_url: "",
      git_repo_package_name: "",
      git_allowed_domains: "",
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        git_repo_url: settings.git_repo_url ?? "",
        git_repo_package_name: settings.git_repo_package_name ?? "",
        git_allowed_domains: settings.git_allowed_domains?.join(", ") ?? "",
      })
    }
  }, [settings, form])

  const onSubmit = async (values: FormValues) => {
    try {
      await updateSettings({
        git_repo_url: values.git_repo_url || null,
        git_repo_package_name: values.git_repo_package_name || null,
        git_allowed_domains: values.git_allowed_domains
          ? values.git_allowed_domains
              .split(",")
              .map((d) => d.trim())
              .filter((d) => d.length > 0)
          : null,
      })
      toast({
        title: "已更新设置",
        description: "已保存注册表设置。",
      })
    } catch (error) {
      console.error("Failed to update settings", error)
      toast({
        title: "更新设置失败",
        description: "请重试。",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground">加载中…</div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="git_repo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Git 仓库 URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="git+ssh://someuser@git.example.com/org/repo.git"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>注册表的默认 Git 仓库 URL。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="git_repo_package_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>包名称</FormLabel>
              <FormControl>
                <Input
                  placeholder="my-registry"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>Git 仓库中的包名称。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="git_allowed_domains"
          render={({ field }) => (
            <FormItem>
              <FormLabel>允许的域名</FormLabel>
              <FormControl>
                <Input
                  placeholder="github.com, gitlab.com"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                以逗号分隔的允许访问的 Git 域名列表。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={updatePending}>
          {updatePending ? "保存中…" : "保存设置"}
        </Button>
      </form>
    </Form>
  )
}
