import { syncSettingsSchema } from "@/components/workspace-sync/connection-form"
import { getConfiguredGitProviders } from "@/hooks/use-git-sync-providers"
import {
  type GitRemoteTarget,
  getAppRepositoryGitUrl,
  getBaseUrlHost,
  parseGitRemote,
} from "@/lib/git-remote"

const github: GitRemoteTarget = {
  provider: "github",
  host: "github.com",
  hostIsKnown: true,
  orgConfigured: true,
}
const gitlab: GitRemoteTarget = {
  provider: "gitlab",
  host: "gitlab.example.com",
  hostIsKnown: true,
  orgConfigured: true,
}
const bitbucket: GitRemoteTarget = {
  provider: "bitbucket",
  host: "bitbucket.org",
  hostIsKnown: true,
  orgConfigured: false,
}
const dataCenter: GitRemoteTarget = {
  provider: "bitbucket_data_center",
  host: "bitbucket.example.com",
  hostIsKnown: true,
  orgConfigured: true,
}

function expectGitUrl(input: string, target: GitRemoteTarget, url: string) {
  const result = parseGitRemote(input, target)
  expect(result).toMatchObject({ kind: "ok", remote: { gitUrl: url } })
  expect(
    syncSettingsSchema.safeParse({
      git_provider: target.provider,
      git_repo_url: url,
    }).success
  ).toBe(true)
}

function expectError(input: string, target: GitRemoteTarget, message: string) {
  expect(parseGitRemote(input, target)).toEqual({ kind: "invalid", message })
}

describe("parseGitRemote", () => {
  it("treats blank input as empty", () => {
    expect(parseGitRemote("   ", github)).toEqual({ kind: "empty" })
  })

  it.each([
    "git@github.com:TracecatHQ/detections.git",
    "git+ssh://git@github.com/TracecatHQ/detections.git",
    "ssh://git@github.com/TracecatHQ/detections",
  ])("resolves GitHub input %s", (input) => {
    expectGitUrl(
      input,
      github,
      "git+ssh://git@github.com/TracecatHQ/detections.git"
    )
  })

  it("keeps an explicit ref from a git+ssh URL", () => {
    const result = parseGitRemote(
      "git+ssh://git@github.com/TracecatHQ/detections.git@release/v2",
      github
    )
    expect(result).toEqual({
      kind: "ok",
      remote: {
        gitUrl: "git+ssh://git@github.com/TracecatHQ/detections.git@release/v2",
        host: "github.com",
        path: "TracecatHQ/detections",
        ref: "release/v2",
      },
    })
  })

  it.each([
    "TracecatHQ/detections",
    "github.com/TracecatHQ/detections",
    "https://github.com/TracecatHQ/detections",
  ])("rejects non-SSH input %s", (input) => {
    expectError(
      input,
      github,
      "粘贴 SSH 克隆 URL，例如 git@github.com:owner/repository.git。"
    )
  })

  it("rejects a host the organization has not set up", () => {
    expectError(
      "git@gitlab.com:TracecatHQ/detections.git",
      github,
      "此组织尚未配置 gitlab.com。这里的 GitHub 为 github.com。"
    )
  })

  it("rejects a GitHub path without a repository", () => {
    expectError(
      "git@github.com:TracecatHQ.git",
      github,
      "粘贴 SSH 克隆 URL，例如 git@github.com:owner/repository.git。"
    )
  })

  it.each([
    "git@gitlab.example.com:group/sub/project.git",
    "ssh://git@gitlab.example.com/group/sub/project.git",
  ])("keeps GitLab nested groups for %s", (input) => {
    expectGitUrl(
      input,
      gitlab,
      "git+ssh://git@gitlab.example.com/group/sub/project.git"
    )
  })

  it("keeps a GitLab path that looks like a base path", () => {
    expectGitUrl(
      "git@gitlab.example.com:gitlab/project.git",
      gitlab,
      "git+ssh://git@gitlab.example.com/gitlab/project.git"
    )
  })

  it("keeps a GitLab SSH port", () => {
    expectGitUrl(
      "ssh://git@gitlab.example.com:2222/group/project.git",
      gitlab,
      "git+ssh://git@gitlab.example.com:2222/group/project.git"
    )
  })

  it("rejects a GitLab host that is not the organization's", () => {
    expectError(
      "git@gitlab.com:group/project.git",
      gitlab,
      "此组织尚未配置 gitlab.com。这里的 GitLab 为 gitlab.example.com。"
    )
  })

  it("takes the host from SSH input when the GitLab host is unknown", () => {
    const target = {
      ...gitlab,
      host: undefined,
      hostIsKnown: false,
      orgConfigured: false,
    }
    expectError(
      "https://gitlab.example.com/gitlab/group/project",
      target,
      "粘贴 SSH 克隆 URL，例如 git@gitlab.example.com:group/project.git。"
    )
    expectGitUrl(
      "git@gitlab.example.com:group/project.git",
      target,
      "git+ssh://git@gitlab.example.com/group/project.git"
    )
  })

  it.each([
    "git@bitbucket.org:example-workspace/example-repo.git",
    "ssh://git@bitbucket.org/example-workspace/example-repo.git",
  ])("resolves Bitbucket Cloud input %s", (input) => {
    expectGitUrl(
      input,
      bitbucket,
      "git+ssh://git@bitbucket.org/example-workspace/example-repo.git"
    )
  })

  it("rejects non-bitbucket.org hosts for Bitbucket Cloud", () => {
    expectError(
      "git@bitbucket.example.com:example-workspace/example-repo.git",
      bitbucket,
      "此处的 Bitbucket Cloud 仓库位于 bitbucket.org，而非 bitbucket.example.com。"
    )
  })

  it("keeps a pasted Bitbucket Data Center git+ssh URL on the instance host", () => {
    expectGitUrl(
      "git+ssh://git@bitbucket.example.com/PROJ/detections.git",
      dataCenter,
      "git+ssh://git@bitbucket.example.com/PROJ/detections.git"
    )
  })

  it("rejects a Bitbucket Data Center SSH URL on another host", () => {
    expect(
      parseGitRemote(
        "git+ssh://git@ssh.bitbucket.example.com/PROJ/detections.git",
        dataCenter
      )
    ).toEqual({
      kind: "invalid",
      message:
        "此组织尚未配置 ssh.bitbucket.example.com。这里的 Bitbucket Data Center 为 bitbucket.example.com。",
    })
  })

  it("rejects a Bitbucket Data Center SSH port the backend refuses", () => {
    expectError(
      "git+ssh://git@bitbucket.example.com:7999/PROJ/detections.git",
      dataCenter,
      "请移除端口，Bitbucket 会从组织的实例 URL 获取端口。"
    )
  })

  it("rejects nested Bitbucket Data Center paths", () => {
    expectError(
      "git+ssh://git@bitbucket.example.com/PROJ/sub/detections.git",
      dataCenter,
      "粘贴 SSH 克隆 URL，例如 git@bitbucket.example.com:PROJECT/repository.git。"
    )
  })
})

describe("git remote helpers", () => {
  it("reads hosts from provider base URLs", () => {
    expect(getBaseUrlHost("https://gitlab.example.com:8443/gitlab")).toBe(
      "gitlab.example.com"
    )
    expect(getBaseUrlHost("not a url")).toBeUndefined()
  })

  it("pins a non-main default branch for app repositories", () => {
    const repository = {
      id: 1,
      name: "playbooks",
      full_name: "TracecatHQ/playbooks",
      private: false,
      default_branch: "trunk",
      git_url: "git+ssh://git@github.com/TracecatHQ/playbooks.git",
      html_url: "https://github.com/TracecatHQ/playbooks",
      installation_id: 1,
      installation_account: "TracecatHQ",
    }
    expect(getAppRepositoryGitUrl(repository)).toBe(
      "git+ssh://git@github.com/TracecatHQ/playbooks.git@trunk"
    )
    expect(
      getAppRepositoryGitUrl({ ...repository, default_branch: "main" })
    ).toBe("git+ssh://git@github.com/TracecatHQ/playbooks.git")
  })
})

describe("getConfiguredGitProviders", () => {
  it("lists only usable providers with their hosts", () => {
    expect(
      getConfiguredGitProviders({
        github: { exists: true },
        gitlab: { exists: true, base_url: "https://gitlab.example.com" },
        bitbucket: { exists: true, is_corrupted: true },
        bitbucketDataCenter: { exists: false },
      })
    ).toEqual([{ id: "github" }, { id: "gitlab", host: "gitlab.example.com" }])
  })
})
