import { syncSettingsSchema } from "@/components/workspace-sync/connection-form"

describe("syncSettingsSchema git_repo_url validation", () => {
  it.each([
    "git+ssh://git@github.com/org/repo.git",
    "git+ssh://git@gitlab.company.com:2222/team/project.git",
    "git+ssh://git@gitlab.com/group/subgroup/repo.git",
    "git+ssh://git@example.com/org/repo",
    "git+ssh://someuser@git.example.com/org/repo.git",
    "git+ssh://git@github.com/org/repo.git@feature/custom-branch",
  ])("accepts valid git SSH URL %s", (url) => {
    const result = syncSettingsSchema.safeParse({
      git_repo_url: url,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.git_repo_url).toBe(url)
    }
  })

  it.each([
    [
      "protocol",
      "https://github.com/org/repo.git",
      "URL 必须以“git+ssh://”协议开头",
    ],
    [
      "user",
      "git+ssh://github.com/org/repo.git",
      "URL 必须包含 SSH 用户（如 git@ 或 someuser@）",
    ],
    ["path", "git+ssh://git@github.com", "URL 必须包含仓库路径"],
    [
      "port text",
      "git+ssh://git@github.com:not_a_port/org/repo.git",
      "端口必须是数字",
    ],
    [
      "port missing",
      "git+ssh://git@github.com:/org/repo.git",
      "“:”后缺少端口号",
    ],
    [
      "segments",
      "git+ssh://git@github.com/repo.git",
      "仓库路径至少需要两段（如 org/repo）",
    ],
    [
      "trailing ref",
      "git+ssh://git@github.com/org/repo.git@@",
      "必须是有效的 Git SSH URL（如 git+ssh://<user>@github.com/org/repo.git）",
    ],
  ])("rejects invalid git SSH URL with bad %s", (_, url, message) => {
    const result = syncSettingsSchema.safeParse({
      git_repo_url: url,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.map((issue: { message: string }) => issue.message)
      ).toContain(message)
    }
  })
})
