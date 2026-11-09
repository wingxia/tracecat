/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  GitBranchInfo,
  GitHubAppRepository,
  VcsProvider,
  WorkspaceRead,
} from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { GitSyncConnectionPanel } from "@/components/workspace-sync/git-sync-connection"
import { GitSyncView } from "@/components/workspace-sync/git-sync-view"
import {
  type GitSyncProvidersState,
  useGitSyncProviders,
} from "@/hooks/use-git-sync-providers"
import {
  useRepositoryBranches,
  useRepositoryCommits,
} from "@/hooks/use-workspace-sync"
import { useGitHubAppRepositories, useWorkspaceSettings } from "@/lib/hooks"

jest.mock("@/components/workspace-sync/sync-operation-status", () => ({
  SyncOperationStatus: () => <div data-testid="sync-operation-status" />,
}))

const mockUpdateWorkspace = jest.fn()

jest.mock("@/lib/hooks", () => ({
  useGitHubAppRepositories: jest.fn(),
  useWorkspaceSettings: jest.fn(),
}))

jest.mock("@/hooks/use-git-sync-providers", () => ({
  useGitSyncProviders: jest.fn(),
}))

jest.mock("@/components/auth/scope-guard", () => ({
  useScopeCheck: jest.fn(),
}))

jest.mock("@/hooks/use-workspace-sync", () => ({
  useRepositoryBranches: jest.fn(),
  useRepositoryCommits: jest.fn(),
}))

jest.mock("@/lib/query", () => ({
  useQuery: () => ({ data: 0 }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))

jest.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => null,
}))

jest.mock("@/components/workspace-sync/git-sync-push", () => ({
  GitSyncPushTab: () => <div>Push tab</div>,
}))

jest.mock("@/components/workspace-sync/git-sync-pull", () => ({
  GitSyncPullTab: () => <div>Pull tab</div>,
}))

beforeAll(() => {
  for (const name of [
    "hasPointerCapture",
    "setPointerCapture",
    "releasePointerCapture",
    "scrollIntoView",
  ] as const) {
    if (!HTMLElement.prototype[name]) {
      Object.defineProperty(HTMLElement.prototype, name, {
        value: () => false,
      })
    }
  }
})

const repositories: GitHubAppRepository[] = [
  {
    id: 1,
    name: "detections",
    full_name: "TracecatHQ/detections",
    private: true,
    default_branch: "main",
    git_url: "git+ssh://git@github.com/TracecatHQ/detections.git",
    html_url: "https://github.com/TracecatHQ/detections",
    installation_id: 1001,
    installation_account: "TracecatHQ",
    installation_account_type: "Organization",
  },
  {
    id: 2,
    name: "playbooks",
    full_name: "TracecatHQ/playbooks",
    private: false,
    default_branch: "trunk",
    git_url: "git+ssh://git@github.com/TracecatHQ/playbooks.git",
    html_url: "https://github.com/TracecatHQ/playbooks",
    installation_id: 1001,
    installation_account: "TracecatHQ",
    installation_account_type: "Organization",
  },
]

const GITHUB_ONLY: GitSyncProvidersState = {
  kind: "known",
  providers: [{ id: "github" }],
}
const GITLAB_ONLY: GitSyncProvidersState = {
  kind: "known",
  providers: [{ id: "gitlab", host: "gitlab.example.com" }],
}

function setup({
  gitRepoUrl = null,
  gitProvider = null,
  providers = GITHUB_ONLY,
  scopes = [],
  repositoryHook = {},
  branches = [],
}: {
  gitRepoUrl?: string | null
  gitProvider?: VcsProvider | null
  providers?: GitSyncProvidersState
  scopes?: string[]
  repositoryHook?: Partial<ReturnType<typeof useGitHubAppRepositories>>
  branches?: GitBranchInfo[]
} = {}): WorkspaceRead {
  jest.mocked(useGitSyncProviders).mockReturnValue(providers)
  jest
    .mocked(useScopeCheck)
    .mockImplementation((scope?: string) => scopes.includes(scope ?? ""))
  jest.mocked(useWorkspaceSettings).mockReturnValue({
    updateWorkspace: mockUpdateWorkspace,
    isUpdating: false,
    deleteWorkspace: jest.fn(),
    isDeleting: false,
  } as ReturnType<typeof useWorkspaceSettings>)
  jest.mocked(useGitHubAppRepositories).mockReturnValue({
    repositories,
    repositoriesIsLoading: false,
    repositoriesError: null,
    refetchRepositories: jest.fn(),
    ...repositoryHook,
  } as ReturnType<typeof useGitHubAppRepositories>)
  jest.mocked(useRepositoryBranches).mockReturnValue({
    branches,
    branchesIsLoading: false,
    branchesError: null,
  } as ReturnType<typeof useRepositoryBranches>)
  jest.mocked(useRepositoryCommits).mockReturnValue({
    commits: [],
    commitsIsLoading: false,
    commitsError: null,
  } as ReturnType<typeof useRepositoryCommits>)
  return {
    id: "workspace-1",
    name: "Workspace 1",
    organization_id: "org-1",
    settings: {
      git_provider: gitProvider,
      git_repo_url: gitRepoUrl,
      effective_allowed_attachment_extensions: [],
      effective_allowed_attachment_mime_types: [],
    },
  }
}

function repositoryInput() {
  return screen.getByRole("textbox", { name: "仓库" })
}

function providerSelect() {
  return screen.getByRole("combobox", { name: "提供商" })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdateWorkspace.mockResolvedValue(undefined)
})

describe("GitSyncConnectionPanel remote line", () => {
  it("connects a typed GitHub repository on Enter", async () => {
    const user = userEvent.setup()
    const onSaved = jest.fn()
    render(<GitSyncConnectionPanel workspace={setup()} onSaved={onSaved} />)

    expect(
      screen.getByRole("heading", { name: "连接仓库" })
    ).toBeInTheDocument()
    // One provider: shown, but not a choice.
    expect(providerSelect()).toHaveTextContent("GitHub")
    expect(providerSelect()).toBeDisabled()
    expect(
      screen.getByText("使用 TracecatHQ 的 GitHub 应用。")
    ).toBeInTheDocument()

    await user.type(
      repositoryInput(),
      "git@github.com:TracecatHQ/detections.git"
    )
    expect(repositoryInput().nextElementSibling).toHaveTextContent(
      "TracecatHQ/detections 于 github.com"
    )
    await user.keyboard("{Enter}")

    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: {
          git_provider: "github",
          git_repo_url: "git+ssh://git@github.com/TracecatHQ/detections.git",
        },
      })
    )
    expect(onSaved).toHaveBeenCalled()
  })

  it("fills the input from the app repository list", async () => {
    const user = userEvent.setup()
    render(<GitSyncConnectionPanel workspace={setup()} />)

    expect(screen.getByText("私有")).toBeInTheDocument()
    expect(screen.getByText("公开")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /playbooks/ }))
    expect(repositoryInput()).toHaveValue(
      "git+ssh://git@github.com/TracecatHQ/playbooks.git@trunk"
    )
    await user.click(screen.getByRole("button", { name: "连接" }))

    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: {
          git_provider: "github",
          git_repo_url:
            "git+ssh://git@github.com/TracecatHQ/playbooks.git@trunk",
        },
      })
    )
  })

  it("filters the list and reports no match", async () => {
    const user = userEvent.setup()
    render(<GitSyncConnectionPanel workspace={setup()} />)

    await user.type(repositoryInput(), "TracecatHQ/play")
    expect(
      screen.queryByRole("button", { name: /detections/ })
    ).not.toBeInTheDocument()
    await user.clear(repositoryInput())
    await user.type(repositoryInput(), "zzz")
    expect(
      screen.getByText("没有匹配项。请粘贴 SSH 克隆 URL 进行检查。")
    ).toBeInTheDocument()
  })

  it.each([
    [[], "请联系组织管理员将其添加到应用可访问的仓库。"],
    [
      ["org:settings:update"],
      "请在 GitHub 中将其添加到应用可访问的仓库，然后重试。",
    ],
  ])("blocks repositories the GitHub App can't reach", async (scopes, hint) => {
    const user = userEvent.setup()
    render(<GitSyncConnectionPanel workspace={setup({ scopes })} />)

    await user.type(
      repositoryInput(),
      "git@github.com:TracecatHQ/elsewhere.git{Enter}"
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      `GitHub 应用无法访问 TracecatHQ/elsewhere。${hint}`
    )
    expect(mockUpdateWorkspace).not.toHaveBeenCalled()
  })

  it("still saves a pasted URL when the list can't load", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          repositoryHook: {
            repositories: undefined,
            repositoriesError: new Error("forbidden"),
          },
        })}
      />
    )

    expect(
      screen.getByText("无法加载列表，仍可粘贴 SSH 克隆 URL。")
    ).toBeInTheDocument()
    await user.type(
      repositoryInput(),
      "git@github.com:TracecatHQ/elsewhere.git{Enter}"
    )
    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: {
          git_provider: "github",
          git_repo_url: "git+ssh://git@github.com/TracecatHQ/elsewhere.git",
        },
      })
    )
  })

  it("keeps github.com required when the list can't load", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          repositoryHook: {
            repositories: undefined,
            repositoriesError: new Error("forbidden"),
          },
        })}
      />
    )

    await user.type(
      repositoryInput(),
      "git@github.example.com:TracecatHQ/elsewhere.git{Enter}"
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "此组织尚未配置 github.example.com。这里的 GitHub 为 github.com。"
    )
    expect(mockUpdateWorkspace).not.toHaveBeenCalled()
  })

  it("waits for the app's repository list before connecting", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          repositoryHook: {
            repositories: undefined,
            repositoriesIsLoading: true,
          },
        })}
      />
    )

    await user.type(
      repositoryInput(),
      "git@github.com:TracecatHQ/elsewhere.git{Enter}"
    )

    expect(screen.getByRole("button", { name: "连接" })).toBeDisabled()
    expect(mockUpdateWorkspace).not.toHaveBeenCalled()
  })

  it("shows skeleton rows while the list loads", () => {
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          repositoryHook: {
            repositories: undefined,
            repositoriesIsLoading: true,
          },
        })}
      />
    )
    expect(screen.getByLabelText("正在加载仓库")).toBeInTheDocument()
  })

  it("uses the organization's GitLab host and rejects other hosts", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel workspace={setup({ providers: GITLAB_ONLY })} />
    )

    expect(useGitHubAppRepositories).toHaveBeenCalledWith("workspace-1", {
      enabled: false,
    })
    expect(providerSelect()).toHaveTextContent("GitLabgitlab.example.com")
    expect(repositoryInput()).toHaveAttribute(
      "placeholder",
      "git@gitlab.example.com:group/project.git"
    )
    expect(
      screen.getByText("粘贴来自 gitlab.example.com 的 SSH 克隆 URL。")
    ).toBeInTheDocument()
    expect(screen.getByText("使用组织的 GitLab 令牌。")).toBeInTheDocument()

    await user.type(
      repositoryInput(),
      "git@gitlab.com:group/project.git{Enter}"
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "此组织尚未配置 gitlab.com。这里的 GitLab 为 gitlab.example.com。"
    )

    await user.clear(repositoryInput())
    await user.type(
      repositoryInput(),
      "https://gitlab.example.com/group/sub/project{Enter}"
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "粘贴 SSH 克隆 URL，例如 git@gitlab.example.com:group/project.git。"
    )

    await user.clear(repositoryInput())
    await user.type(
      repositoryInput(),
      "git@gitlab.example.com:group/sub/project.git{Enter}"
    )
    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: {
          git_provider: "gitlab",
          git_repo_url:
            "git+ssh://git@gitlab.example.com/group/sub/project.git",
        },
      })
    )
  })

  it("asks where the repository is when several providers are set up", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          providers: {
            kind: "known",
            providers: [
              { id: "github" },
              { id: "gitlab", host: "gitlab.example.com" },
            ],
          },
        })}
      />
    )

    expect(providerSelect()).toHaveTextContent("选择仓库所在位置")
    expect(providerSelect()).toBeEnabled()
    expect(repositoryInput()).toBeDisabled()
    expect(screen.getByRole("button", { name: "连接" })).toBeDisabled()

    await user.click(providerSelect())
    await user.click(await screen.findByRole("option", { name: /GitLab/ }))

    expect(providerSelect()).toHaveTextContent("GitLabgitlab.example.com")
    expect(repositoryInput()).toBeEnabled()
    expect(repositoryInput()).toHaveAttribute(
      "placeholder",
      "git@gitlab.example.com:group/project.git"
    )
  })

  it("lets viewers without provider status pick a provider explicitly", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel
        workspace={setup({ providers: { kind: "unknown" } })}
      />
    )

    expect(providerSelect()).toHaveTextContent("GitHub")
    expect(
      screen.getByText("使用 TracecatHQ 的 GitHub 应用。")
    ).toBeInTheDocument()
    await user.click(providerSelect())
    await user.click(await screen.findByRole("option", { name: /GitLab/ }))

    expect(screen.getByText("使用组织的 GitLab 令牌。")).toBeInTheDocument()
    expect(
      screen.getByText("粘贴来自 GitLab 的 SSH 克隆 URL。")
    ).toBeInTheDocument()
    // Without the instance's base path, a web URL can't be mapped to SSH.
    await user.type(
      repositoryInput(),
      "https://gitlab.example.com/gitlab/group/project{Enter}"
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "粘贴 SSH 克隆 URL，例如 git@gitlab.example.com:group/project.git。"
    )
    expect(mockUpdateWorkspace).not.toHaveBeenCalled()
  })

  it.each([
    [
      ["org:settings:update"],
      "在“组织 › Git 提供商”中配置 GitHub、GitLab 或 Bitbucket 后，各工作空间即可连接仓库。",
    ],
    [
      [],
      "请联系组织管理员在“组织 › Git 提供商”中完成配置，之后即可在此连接仓库。",
    ],
  ])("blocks the flow when the org has no provider", (scopes, body) => {
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          scopes,
          providers: { kind: "known", providers: [] },
        })}
      />
    )

    expect(screen.getByText("组织尚未设置 Git 提供商")).toBeInTheDocument()
    expect(screen.getByText(body)).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    const link = screen.queryByRole("link", { name: /设置 Git 提供商/ })
    if (scopes.length > 0) {
      expect(link).toHaveAttribute("href", "/organization/vcs")
    } else {
      expect(link).not.toBeInTheDocument()
    }
  })

  it("shows no remote line while provider status loads", () => {
    render(
      <GitSyncConnectionPanel
        workspace={setup({ providers: { kind: "loading" } })}
      />
    )
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("prefills the full URL when the stored connection pins a ref", async () => {
    const user = userEvent.setup()
    const url = "git+ssh://git@github.com/TracecatHQ/detections.git@release"
    render(
      <GitSyncConnectionPanel
        workspace={setup({ gitRepoUrl: url, gitProvider: "github" })}
      />
    )
    await user.click(screen.getByRole("button", { name: "更改" }))
    expect(repositoryInput()).toHaveValue(url)
  })
})

describe("GitSyncConnectionPanel connected repository", () => {
  const url = "git+ssh://git@github.com/TracecatHQ/detections.git"

  it("shows the repository read-only with change and disconnect", () => {
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          gitRepoUrl: url,
          gitProvider: "github",
          branches: [{ name: "main", is_default: true }],
        })}
      />
    )

    expect(
      screen.getByText("此工作空间所有成员共享，通过组织的 GitHub 应用 访问。")
    ).toBeInTheDocument()
    expect(screen.getByText("TracecatHQ/detections")).toBeInTheDocument()
    expect(screen.getByText("分支").closest("div")).toHaveTextContent(
      "分支main"
    )
    expect(screen.queryByText("Pushes")).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "更改" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "断开连接" })).toBeInTheDocument()
    expect(screen.getByText("停止此工作空间的推送和拉取。")).toBeInTheDocument()
    expect(useGitSyncProviders).toHaveBeenLastCalledWith({ enabled: false })
  })

  it("changes the repository in its row and stays on the page", async () => {
    const user = userEvent.setup()
    const onSaved = jest.fn()
    render(
      <GitSyncConnectionPanel
        workspace={setup({ gitRepoUrl: url, gitProvider: "github" })}
        onSaved={onSaved}
      />
    )

    await user.click(screen.getByRole("button", { name: "更改" }))
    expect(repositoryInput()).toHaveValue(url)
    expect(repositoryInput()).toHaveFocus()
    expect(
      screen.getByText("更改仓库会清除此页面上的所有预览。")
    ).toBeInTheDocument()

    // Focus selected the prefill, so typing replaces it.
    await user.keyboard("git@github.com:TracecatHQ/playbooks.git")
    expect(repositoryInput()).toHaveValue(
      "git@github.com:TracecatHQ/playbooks.git"
    )
    await user.click(screen.getByRole("button", { name: "保存" }))

    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: {
          git_provider: "github",
          git_repo_url:
            "git+ssh://git@github.com/TracecatHQ/playbooks.git@trunk",
        },
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    )
    expect(onSaved).toHaveBeenCalled()
    expect(
      screen.getByRole("heading", { name: "仓库连接" })
    ).toBeInTheDocument()
  })

  it("closes the row editor without saving on cancel or no change", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel
        workspace={setup({ gitRepoUrl: url, gitProvider: "github" })}
      />
    )

    await user.click(screen.getByRole("button", { name: "更改" }))
    await user.click(screen.getByRole("button", { name: "保存" }))
    await waitFor(() =>
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    )

    await user.click(screen.getByRole("button", { name: "更改" }))
    await user.keyboard("git@github.com:TracecatHQ/playbooks.git")
    await user.click(screen.getByRole("button", { name: "取消" }))
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.getByText("TracecatHQ/detections")).toBeInTheDocument()
    expect(mockUpdateWorkspace).not.toHaveBeenCalled()
  })

  it("pins and unpins the sync branch through the URL ref", async () => {
    const user = userEvent.setup()
    const branches = [
      { name: "main", is_default: true },
      { name: "release", is_default: false },
    ]
    const { rerender } = render(
      <GitSyncConnectionPanel
        workspace={setup({ gitRepoUrl: url, gitProvider: "github", branches })}
      />
    )

    const branchSelect = screen.getByRole("combobox", { name: "分支" })
    expect(branchSelect).toHaveTextContent("maindefault")
    await user.click(branchSelect)
    await user.click(screen.getByRole("option", { name: "release" }))
    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: { git_repo_url: `${url}@release` },
      })
    )

    mockUpdateWorkspace.mockClear()
    rerender(
      <GitSyncConnectionPanel
        workspace={setup({
          gitRepoUrl: `${url}@release`,
          gitProvider: "github",
          branches,
        })}
      />
    )
    expect(screen.getByRole("combobox", { name: "分支" })).toHaveTextContent(
      "release"
    )
    await user.click(screen.getByRole("combobox", { name: "分支" }))
    await user.click(screen.getByRole("option", { name: /main/ }))
    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: { git_repo_url: url },
      })
    )
  })

  it("shows a pin on the default branch as pinned and lets it be cleared", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncConnectionPanel
        workspace={setup({
          gitRepoUrl: `${url}@develop`,
          gitProvider: "github",
          branches: [
            { name: "develop", is_default: true },
            { name: "release", is_default: false },
          ],
        })}
      />
    )

    const branchSelect = screen.getByRole("combobox", { name: "分支" })
    expect(branchSelect).toHaveTextContent("develop已固定")
    await user.click(branchSelect)
    await user.click(screen.getByRole("option", { name: "develop default" }))
    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({
        settings: { git_repo_url: url },
      })
    )
  })

  it("shows who made the latest commit and when, with the message on hover", () => {
    const workspace = setup({ gitRepoUrl: url, gitProvider: "github" })
    jest.mocked(useRepositoryCommits).mockReturnValue({
      commits: [
        {
          sha: "01f9d62aa0000000000000000000000000000000",
          message: "Add escalation decision\n\nLonger body",
          author: "Example Author",
          author_email: "author@example.com",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      commitsIsLoading: false,
      commitsError: null,
    } as ReturnType<typeof useRepositoryCommits>)
    render(<GitSyncConnectionPanel workspace={workspace} />)

    const row = screen.getByText("最新提交").closest("div")
    expect(row).toHaveTextContent(
      "最新提交01f9d62 · Example Author · 约 2 天前"
    )
    expect(
      within(row as HTMLElement).getByTitle("Add escalation decision")
    ).toBeInTheDocument()
  })

  it("hides the actions without workspace update access", () => {
    render(
      <GitSyncConnectionPanel
        workspace={setup({ gitRepoUrl: url })}
        canManageConnection={false}
      />
    )

    expect(
      screen.queryByRole("button", { name: "更改" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "断开连接" })
    ).not.toBeInTheDocument()
  })

  it("disconnects by clearing only the repository URL", async () => {
    const user = userEvent.setup()
    render(<GitSyncConnectionPanel workspace={setup({ gitRepoUrl: url })} />)

    await user.click(screen.getByRole("button", { name: "断开连接" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(
      "断开连接 TracecatHQ/detections?重新连接仓库前，推送和拉取将停止。不会删除工作空间或仓库中的内容。"
    )
    await user.click(within(dialog).getByRole("button", { name: "断开连接" }))

    await waitFor(() => expect(mockUpdateWorkspace).toHaveBeenCalledTimes(1))
    expect(mockUpdateWorkspace).toHaveBeenCalledWith({
      settings: { git_repo_url: null },
    })
  })

  it("keeps the connection when disconnect is cancelled", async () => {
    const user = userEvent.setup()
    render(<GitSyncConnectionPanel workspace={setup({ gitRepoUrl: url })} />)

    await user.click(screen.getByRole("button", { name: "断开连接" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "取消" }))

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(mockUpdateWorkspace).not.toHaveBeenCalled()
  })
})

describe("GitSyncView connection", () => {
  it("asks non-admins to get a repository connected", () => {
    render(
      <GitSyncView workspace={setup()} canSync canManageConnection={false} />
    )

    expect(screen.getByText("尚未连接仓库")).toBeInTheDocument()
    expect(screen.getByTestId("sync-operation-status")).toBeInTheDocument()
    expect(
      screen.getByText(
        "请联系工作空间管理员连接仓库，连接后即可在此推送和拉取。"
      )
    ).toBeInTheDocument()
    expect(useGitHubAppRepositories).not.toHaveBeenCalled()
  })

  it("hides operation history without sync access", () => {
    render(
      <GitSyncView workspace={setup()} canSync={false} canManageConnection />
    )

    expect(
      screen.queryByTestId("sync-operation-status")
    ).not.toBeInTheDocument()
  })

  it("renders the remote line inline for admins without a repository", () => {
    render(<GitSyncView workspace={setup()} canSync canManageConnection />)

    expect(
      screen.getByRole("heading", { name: "连接仓库" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "连接" })).toBeInTheDocument()
  })

  it("opens the connection from the header and goes back to changes", async () => {
    const user = userEvent.setup()
    render(
      <GitSyncView
        workspace={setup({
          gitRepoUrl: "git+ssh://git@github.com/TracecatHQ/detections.git",
          gitProvider: "github",
          branches: [{ name: "main", is_default: true }],
        })}
        canSync
        canManageConnection
      />
    )

    expect(screen.getByText("Push tab")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "编辑连接" }))
    expect(
      screen.getByRole("heading", { name: "仓库连接" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "更改" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "返回变更列表" }))
    expect(screen.getByText("Push tab")).toBeInTheDocument()
  })
})
