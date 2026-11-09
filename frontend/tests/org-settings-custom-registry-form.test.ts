import type { ZodIssue } from "zod"
import { gitFormSchema as customRegistryFormSchema } from "@/components/organization/org-settings-custom-registry"

const baseFormData = {
  git_allowed_domains: [{ id: "0", text: "github.com" }],
  git_repo_url: null as string | null,
  git_repo_package_name: null as string | null,
}

describe("gitFormSchema git_repo_url superRefine", () => {
  it("accepts a valid git+ssh URL with nested groups", () => {
    const result = customRegistryFormSchema.safeParse({
      ...baseFormData,
      git_repo_url: "git+ssh://git@gitlab.example.com/group/subgroup/repo.git",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.git_repo_url).toBe(
        "git+ssh://git@gitlab.example.com/group/subgroup/repo.git"
      )
    }
  })

  it("accepts a valid git+ssh URL with a non-default SSH user", () => {
    const result = customRegistryFormSchema.safeParse({
      ...baseFormData,
      git_repo_url: "git+ssh://someuser@git.example.com/org/repo.git",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.git_repo_url).toBe(
        "git+ssh://someuser@git.example.com/org/repo.git"
      )
    }
  })

  it.each([
    [
      "missing protocol",
      "ssh://git@github.com/org/repo.git",
      "URL 必须以“git+ssh://”协议开头",
    ],
    [
      "missing git user",
      "git+ssh://github.com/org/repo.git",
      "URL 必须包含 SSH 用户（如 git@ 或 someuser@）",
    ],
    [
      "missing repository path",
      "git+ssh://git@github.com",
      "URL 必须包含仓库路径",
    ],
    [
      "missing port value",
      "git+ssh://git@github.com:/org/repo.git",
      "“:”后缺少端口号",
    ],
    [
      "non numeric port",
      "git+ssh://git@github.com:notaport/org/repo.git",
      "端口必须是数字",
    ],
    [
      "insufficient path segments",
      "git+ssh://git@github.com/repo.git",
      "仓库路径至少需要两段（如 org/repo）",
    ],
  ])("returns specific error when %s", (_, url, message) => {
    const result = customRegistryFormSchema.safeParse({
      ...baseFormData,
      git_repo_url: url,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.map((issue: ZodIssue) => issue.message)
      ).toContain(message)
    }
  })

  it("falls back to generic error when validation fails for other reasons", () => {
    const result = customRegistryFormSchema.safeParse({
      ...baseFormData,
      git_repo_url: "git+ssh://git@github.com/org/repo.git@@",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.map((issue: ZodIssue) => issue.message)
      ).toContain(
        "必须是有效的 Git SSH URL（如 git+ssh://<user>@github.com/org/repo.git）"
      )
    }
  })
})
