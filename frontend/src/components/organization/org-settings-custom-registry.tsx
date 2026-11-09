"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { OrgRegistrySshKeySection } from "@/components/organization/org-registry-ssh-key"
import { CustomTagInput } from "@/components/tags-input"
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
import { validateGitSshUrl } from "@/lib/git"
import { useOrgGitSettings } from "@/lib/hooks"

export const gitFormSchema = z.object({
  git_allowed_domains: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1, "不能为空"),
    })
  ),
  git_repo_url: z
    .string()
    .nullish()
    // Empty string signals removal
    .transform((url) => url?.trim() || null)
    .superRefine((url, ctx) => validateGitSshUrl(url, ctx)),
  git_repo_package_name: z
    .string()
    .nullish()
    // Empty string signals removal
    .transform((name) => name?.trim() || null),
})

type GitFormValues = z.infer<typeof gitFormSchema>

/**
 * Lets the SSH key section sit between the form fields and the submit
 * button without nesting its dialogs inside the Git settings form.
 */
const GIT_SETTINGS_FORM_ID = "org-git-settings-form"

/** Git repository settings for the custom registry, plus the SSH key used to clone it. */
export function OrgSettingsCustomRegistryForm() {
  const {
    gitSettings,
    gitSettingsIsLoading,
    gitSettingsError,
    updateGitSettings,
    updateGitSettingsIsPending,
  } = useOrgGitSettings()

  const form = useForm<GitFormValues>({
    resolver: zodResolver(gitFormSchema),
    values: {
      git_allowed_domains: gitSettings?.git_allowed_domains?.map(
        (domain, index) => ({
          id: index.toString(),
          text: domain,
        })
      ) ?? [{ id: "0", text: "github.com" }],
      git_repo_url: gitSettings?.git_repo_url ?? "",
      git_repo_package_name: gitSettings?.git_repo_package_name ?? "",
    },
    mode: "onChange",
    // when a field already has an error, re-validate it on change too
    reValidateMode: "onChange",
  })
  const onSubmit = async (data: GitFormValues) => {
    try {
      await updateGitSettings({
        requestBody: {
          git_allowed_domains: data.git_allowed_domains.map(
            (domain) => domain.text
          ),
          git_repo_url: data.git_repo_url,
          git_repo_package_name: data.git_repo_package_name,
        },
      })
    } catch {
      console.error("Failed to update Git settings")
    }
  }

  if (gitSettingsIsLoading) {
    return <CenteredSpinner />
  }
  if (gitSettingsError || !gitSettings) {
    return (
      <AlertNotification
        level="error"
        message={`加载 Git 设置出错：${gitSettingsError?.message || "未知错误"}`}
      />
    )
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          id={GIT_SETTINGS_FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <FormField
            control={form.control}
            name="git_repo_url"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>远程仓库 URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="git+ssh://someuser@git.example.com:2222/org/team/repo.git"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription className="flex flex-col gap-2">
                  <span>
                    远程仓库的 pip Git URL，使用{" "}
                    <span className="font-mono tracking-tighter">git+ssh</span>{" "}
                    协议，支持嵌套用户组和自定义端口。
                  </span>
                  <span>
                    格式：{" "}
                    <span className="font-mono tracking-tight">
                      {"git+ssh://<user>@<hostname>[:<port>]/<org>/<repo>.git"}
                    </span>
                  </span>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="git_repo_package_name"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>仓库包名称</FormLabel>
                <FormControl>
                  <Input
                    placeholder="package_name"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>
                  仓库中的 Python 包名称。留空时使用 Git URL 中的仓库名称。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="git_allowed_domains"
            render={({ field }) => (
              <FormItem>
                <FormLabel>允许的 Git 域名</FormLabel>
                <FormControl>
                  <CustomTagInput
                    {...field}
                    placeholder={"输入域名…"}
                    tags={field.value}
                    setTags={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  添加允许进行 Git 操作的域名（如
                  github.com、gitlab.com，或带端口的 gitlab.example.com:2222）
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <OrgRegistrySshKeySection />
      <Button
        type="submit"
        form={GIT_SETTINGS_FORM_ID}
        disabled={updateGitSettingsIsPending}
      >
        保存仓库设置
      </Button>
    </div>
  )
}
