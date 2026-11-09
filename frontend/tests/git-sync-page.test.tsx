/**
 * @jest-environment jsdom
 */

import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type ReactElement, useState } from "react"
import type {
  GitBranchInfo,
  GitCommitInfo,
  PullResult,
  WorkspaceRead,
  WorkspaceSyncExportPreview,
} from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { GitSyncView } from "@/components/workspace-sync/git-sync-view"
import { useGitSyncProviders } from "@/hooks/use-git-sync-providers"
import {
  useRepositoryBranches,
  useRepositoryCommits,
  useWorkflowSync,
  useWorkspaceSyncExport,
  useWorkspaceSyncExportPreview,
} from "@/hooks/use-workspace-sync"
import { useGitHubAppRepositories, useWorkspaceSettings } from "@/lib/hooks"

jest.mock("@/components/workspace-sync/sync-operation-status", () => ({
  SyncOperationStatus: () => <div data-testid="sync-operation-status" />,
}))
const mockExportWorkspace = jest.fn()
const mockPullWorkflows = jest.fn()
const mockRefetchExportPreview = jest.fn()

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
  useWorkflowSync: jest.fn(),
  useWorkspaceSyncExport: jest.fn(),
  useWorkspaceSyncExportPreview: jest.fn(),
}))

const mockInvalidateQueries = jest.fn()
let mockImportRevision = 0
beforeEach(() => {
  mockImportRevision = 0
})

jest.mock("@/lib/query", () => ({
  useQuery: () => ({ data: mockImportRevision }),
  useInfiniteQuery: () => ({ data: undefined }),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

jest.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => null,
}))

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
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

const REPO_URL = "git+ssh://git@github.com/TracecatHQ/detections.git"
const LATEST_SHA = "1c52757aa0000000000000000000000000000000"

const COMMITS: GitCommitInfo[] = [
  {
    sha: LATEST_SHA,
    message: "Update detections",
    author: "Example Author",
    author_email: "author@example.com",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
]

function setup({
  gitRepoUrl = REPO_URL,
  branches = [{ name: "main", is_default: true }],
  commits = COMMITS,
  preview,
}: {
  gitRepoUrl?: string | null
  branches?: GitBranchInfo[]
  commits?: GitCommitInfo[]
  preview?: WorkspaceSyncExportPreview
} = {}): WorkspaceRead {
  jest
    .mocked(useGitSyncProviders)
    .mockReturnValue({ kind: "known", providers: [{ id: "github" }] })
  jest.mocked(useScopeCheck).mockReturnValue(false)
  jest.mocked(useWorkspaceSettings).mockReturnValue({
    updateWorkspace: jest.fn(),
    isUpdating: false,
    deleteWorkspace: jest.fn(),
    isDeleting: false,
  } as ReturnType<typeof useWorkspaceSettings>)
  jest.mocked(useGitHubAppRepositories).mockReturnValue({
    repositories: [],
    repositoriesIsLoading: false,
    repositoriesError: null,
    refetchRepositories: jest.fn(),
  } as unknown as ReturnType<typeof useGitHubAppRepositories>)
  jest.mocked(useRepositoryBranches).mockReturnValue({
    branches,
    branchesIsLoading: false,
    branchesError: null,
  } as ReturnType<typeof useRepositoryBranches>)
  jest.mocked(useRepositoryCommits).mockReturnValue({
    commits,
    commitsIsLoading: false,
    commitsError: null,
  } as ReturnType<typeof useRepositoryCommits>)
  jest.mocked(useWorkspaceSyncExport).mockReturnValue({
    exportWorkspace: mockExportWorkspace,
    exportWorkspaceIsPending: false,
    exportWorkspaceError: null,
  } as ReturnType<typeof useWorkspaceSyncExport>)
  jest.mocked(useWorkflowSync).mockReturnValue({
    pullWorkflows: mockPullWorkflows,
    pullWorkflowsIsPending: false,
    pullWorkflowsError: null,
    previewOperation: {
      id: "pull-operation",
      direction: "pull",
      status: "ready",
      stage: "awaiting_confirmation",
      created_at: "2026-10-22T00:00:00Z",
      expires_at: "2100-01-01T00:00:00Z",
      inputs: {
        id: "pull-operation",
        direction: "pull",
        pull: { commit_sha: LATEST_SHA },
      },
    },
  } as ReturnType<typeof useWorkflowSync>)
  jest
    .mocked(useWorkspaceSyncExportPreview)
    .mockImplementation(function usePreview(_id, options) {
      const key = JSON.stringify([
        options.push,
        options.compareRef,
        options.provider,
      ])
      const [preparedKey, setPreparedKey] = useState<string>()
      return {
        preview: preparedKey === key ? preview : undefined,
        previewOperationId: preparedKey === key ? "push-operation" : undefined,
        previewDiffCount: preview?.resource_diffs?.length ?? 0,
        previewIsLoading: false,
        previewError: null,
        refetchPreview: () => {
          Promise.resolve(mockRefetchExportPreview()).then((result) => {
            if (!result?.error) setPreparedKey(key)
          })
        },
      }
    })
  return {
    id: "workspace-1",
    name: "Workspace 1",
    organization_id: "org-1",
    settings: {
      git_provider: "github",
      git_repo_url: gitRepoUrl,
      effective_allowed_attachment_extensions: [],
      effective_allowed_attachment_mime_types: [],
    },
  }
}

async function confirmAction(user: {
  click: (element: Element) => Promise<void>
}) {
  const dialog = await screen.findByRole("alertdialog")
  const action = within(dialog)
    .getAllByRole("button")
    .find((button) => button.textContent !== "取消")
  if (!action) throw new Error("Confirmation dialog has no action")
  await user.click(action)
}

function renderWithTooltips(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  // clearAllMocks keeps queued Once values; drop any a failed test left behind.
  mockPullWorkflows.mockReset()
  mockRefetchExportPreview.mockResolvedValue({ error: null })
})

const PUSH_PREVIEW: WorkspaceSyncExportPreview = {
  resource_counts: { workflow: 2 },
  files: [
    "workflows/phishing-triage/definition.yml",
    "workflows/daily-sweep/definition.yml",
  ],
  resources: [
    {
      resource_type: "workflow",
      source_id: "phishing-triage",
      name: "Phishing triage",
      path: "workflows/phishing-triage/definition.yml",
    },
    {
      resource_type: "workflow",
      source_id: "daily-sweep",
      name: "Daily sweep",
      path: "workflows/daily-sweep/definition.yml",
    },
  ],
  resource_diffs: [
    {
      resource_type: "workflow",
      source_id: "phishing-triage",
      source_path: "workflows/phishing-triage/definition.yml",
      change_type: "modified",
      title: "Phishing triage",
      diff: "--- a\n+++ b\n@@ -1,2 +1,2 @@\n title: Phishing triage\n-score: 0.7\n+score: 0.82",
    },
    {
      resource_type: "workflow",
      source_id: "legacy-check",
      source_path: "workflows/legacy-check/definition.yml",
      change_type: "deleted",
      title: "Legacy check",
      diff: "@@ -1 +0,0 @@\n-title: Legacy check",
    },
  ],
}

describe("GitSyncView connected", () => {
  it("puts the tabs and repo status in the header and the target in the footer", () => {
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "推送" })).toHaveAttribute(
      "data-state",
      "active"
    )
    expect(screen.getByText("TracecatHQ/detections")).toBeInTheDocument()
    expect(screen.getByText("已连接")).toBeInTheDocument()

    const header = screen.getByRole("banner")
    expect(within(header).getByRole("tablist")).toBeInTheDocument()
    expect(within(header).getByText("已连接")).toBeInTheDocument()

    const bar = screen.getByRole("group", { name: "推送操作" })
    expect(bar).toHaveTextContent(/^目标/)
    expect(
      within(bar).getByRole("button", { name: /^分支/ })
    ).toHaveTextContent(/^sync\/workspace-[0-9a-z]+新建$/)
    expect(within(bar).getByRole("textbox", { name: "提交说明" })).toHaveValue(
      "导出工作空间配置"
    )
    expect(
      within(screen.getByRole("tabpanel", { name: "推送" })).getByText(
        "暂无预览"
      )
    ).toBeInTheDocument()
  })

  it("opens the connection panel in place and returns with Back", async () => {
    const user = userEvent.setup()
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("button", { name: "编辑连接" }))
    expect(
      screen.getByRole("heading", { name: "仓库连接" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "返回变更列表" }))
    expect(
      screen.queryByRole("heading", { name: "仓库连接" })
    ).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "编辑连接" })).toBeInTheDocument()
  })

  it("hides Edit without workspace update access", () => {
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection={false} />
    )

    expect(
      screen.queryByRole("button", { name: "编辑连接" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("TracecatHQ/detections")).toBeInTheDocument()
  })

  it("previews a push as a grouped list with inline diffs", async () => {
    const user = userEvent.setup()
    renderWithTooltips(
      <GitSyncView
        workspace={setup({ preview: PUSH_PREVIEW })}
        canSync
        canManageConnection
      />
    )

    expect(
      screen.queryByText("包含在此次操作中： 推送")
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "预览" }))
    expect(mockRefetchExportPreview).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText("与 main 相比，1 modified · 1 deleted")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "再次预览" })).toBeInTheDocument()
    expect(screen.getByText("包含在此次操作中： 推送")).toBeInTheDocument()
    expect(screen.getByText("2 个文件")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /工作流/ }))
    expect(screen.getByRole("img", { name: "已修改" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "已删除" })).toBeInTheDocument()
    expect(screen.getByText("未更改")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Phishing triage/ }))
    expect(screen.getByText("+1")).toBeInTheDocument()
    expect(screen.getByText("−1")).toBeInTheDocument()
    expect(screen.getByText("行")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()

    const bar = screen.getByRole("group", { name: "推送操作" })
    expect(bar).toHaveClass("sticky", "bottom-0", "border-t", "bg-background")
    expect(
      within(bar).getByRole("button", { name: "推送并创建 PR" })
    ).toBeEnabled()
  })

  it("pushes and opens a pull request with a View PR toast", async () => {
    const user = userEvent.setup()
    const prUrl = "https://github.com/TracecatHQ/detections/pull/42"
    mockExportWorkspace.mockResolvedValue({
      commit: {
        status: "committed",
        sha: "a".repeat(40),
        ref: "sync/workspace-test",
        base_ref: "main",
        pr_url: prUrl,
        message: "导出工作空间配置",
      },
      files: ["tracecat.json"],
    })
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("button", { name: "预览" }))
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "推送并创建 PR" })
      ).toBeEnabled()
    )
    await user.click(screen.getByRole("button", { name: "推送并创建 PR" }))
    await confirmAction(user)

    await waitFor(() =>
      expect(mockExportWorkspace).toHaveBeenCalledWith({
        operationId: "push-operation",
      })
    )
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "PR 已就绪" })
      )
    )
    // The push changed the remote, so branches and commits are refetched.
    for (const key of ["workflow-sync-branches", "repository_commits"]) {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: [key, "workspace-1"],
      })
    }
    const toastOptions = jest.mocked(toast).mock.calls[0][0]
    render(
      <ToastProvider>
        <Toast open>{toastOptions.action}</Toast>
        <ToastViewport />
      </ToastProvider>
    )
    expect(screen.getByRole("link", { name: "查看 PR" })).toHaveAttribute(
      "href",
      prUrl
    )
  })

  it("compares later previews against a branch it just created", async () => {
    const user = userEvent.setup()
    mockExportWorkspace.mockResolvedValue({
      commit: {
        status: "committed",
        sha: "a".repeat(40),
        ref: "sync/workspace-test",
        base_ref: "main",
        pr_url: null,
        message: "导出工作空间配置",
      },
      files: ["tracecat.json"],
    })
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )
    expect(useWorkspaceSyncExportPreview).toHaveBeenLastCalledWith(
      "workspace-1",
      expect.objectContaining({ compareRef: "main" })
    )

    await user.click(screen.getByRole("button", { name: "预览" }))
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "推送并创建 PR" })
      ).toBeEnabled()
    )
    await user.click(screen.getByRole("button", { name: "推送并创建 PR" }))
    await confirmAction(user)
    await waitFor(() => expect(mockExportWorkspace).toHaveBeenCalled())
    const branch = jest
      .mocked(useWorkspaceSyncExportPreview)
      .mock.calls.at(-1)?.[1].push?.branch

    await waitFor(() =>
      expect(useWorkspaceSyncExportPreview).toHaveBeenLastCalledWith(
        "workspace-1",
        expect.objectContaining({ compareRef: branch })
      )
    )
  })

  it("drops a push preview that started before a reset", async () => {
    const user = userEvent.setup()
    let resolvePreview: (value: { error: null }) => void = () => {}
    renderWithTooltips(
      <GitSyncView
        workspace={setup({
          preview: PUSH_PREVIEW,
          branches: [
            { name: "main", is_default: true },
            { name: "release", is_default: false },
          ],
        })}
        canSync
        canManageConnection
      />
    )
    mockRefetchExportPreview.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePreview = resolve
      })
    )

    await user.click(screen.getByRole("button", { name: "预览" }))
    await user.click(screen.getByRole("button", { name: /^分支/ }))
    await user.click(screen.getByRole("option", { name: /release/ }))
    await act(async () => {
      resolvePreview({ error: null })
    })

    expect(
      screen.queryByText("包含在此次操作中： 推送")
    ).not.toBeInTheDocument()
  })

  it("creates a named branch from the picker", async () => {
    const user = userEvent.setup()
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("button", { name: /^分支/ }))
    expect(screen.getByText("新分支创建来源： main")).toBeInTheDocument()
    const input = screen.getByLabelText("新分支创建来源： main")
    await user.clear(input)
    await user.type(input, "sync/oct-08")
    await user.click(screen.getByRole("button", { name: "创建分支" }))

    expect(screen.getByRole("button", { name: /^分支/ })).toHaveTextContent(
      "sync/oct-08新建"
    )
    expect(screen.getByRole("button", { name: "推送并创建 PR" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "预览" }))
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "推送并创建 PR" })
      ).toBeEnabled()
    )
  })

  it("explains an invalid branch name before creating it", async () => {
    const user = userEvent.setup()
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("button", { name: /^分支/ }))
    const input = screen.getByLabelText("新分支创建来源： main")
    await user.clear(input)
    await user.type(input, "sync..oct")

    expect(
      screen.getByText("分支名称不能包含 .. 或 @{，也不能仅为 @。")
    ).toBeInTheDocument()
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("button", { name: "创建分支" })).toBeDisabled()
  })

  it("names the selected branch and commit for screen readers", async () => {
    const user = userEvent.setup()
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    expect(
      screen.getByRole("button", { name: /^分支：sync\/workspace-/ })
    ).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "拉取" }))
    expect(
      screen.getByRole("combobox", {
        name: "提交 1c52757: Update detections",
      })
    ).toBeInTheDocument()
  })

  it.each([
    ["the branch list fails", REPO_URL, undefined],
    [
      "the branch list fails with a pinned branch",
      `${REPO_URL}@release`,
      undefined,
    ],
    [
      "no listed branch is the default",
      `${REPO_URL}@release`,
      [{ name: "release", is_default: false }],
    ],
  ])("keeps push off when %s", (_case, gitRepoUrl, branches) => {
    const workspace = setup({ gitRepoUrl })
    // A pin names the base, but not the repository default.
    jest.mocked(useRepositoryBranches).mockReturnValue({
      branches,
      branchesIsLoading: false,
      branchesError: branches ? null : new Error("unreachable"),
    } as unknown as ReturnType<typeof useRepositoryBranches>)
    renderWithTooltips(
      <GitSyncView workspace={workspace} canSync canManageConnection />
    )

    const bar = screen.getByRole("group", { name: "推送操作" })
    const pushButtons = within(bar)
      .getAllByRole("button")
      .filter((button) => /推送/.test(button.textContent ?? ""))
    expect(pushButtons.length).toBeGreaterThan(0)
    for (const button of pushButtons) {
      expect(button).toBeDisabled()
    }
  })

  it("restarts the pull source when the default branch changes", async () => {
    const user = userEvent.setup()
    const older = {
      ...COMMITS[0],
      sha: "2".repeat(40),
      message: "Older change",
    }
    const workspace = setup({ commits: [COMMITS[0], older] })
    const view = renderWithTooltips(
      <GitSyncView workspace={workspace} canSync canManageConnection />
    )
    await user.click(screen.getByRole("tab", { name: "拉取" }))
    await user.click(screen.getByRole("combobox", { name: /^提交/ }))
    await user.click(screen.getByRole("option", { name: /Older change/ }))
    expect(
      screen.getByRole("combobox", { name: "提交 2222222: Older change" })
    ).toBeInTheDocument()

    // The repository default moves from main to trunk while the page is open.
    const trunkHead = {
      ...COMMITS[0],
      sha: "3".repeat(40),
      message: "Trunk head",
    }
    jest.mocked(useRepositoryBranches).mockReturnValue({
      branches: [{ name: "trunk", is_default: true }],
      branchesIsLoading: false,
      branchesError: null,
    } as ReturnType<typeof useRepositoryBranches>)
    jest.mocked(useRepositoryCommits).mockReturnValue({
      commits: [trunkHead],
      commitsIsLoading: false,
      commitsError: null,
    } as ReturnType<typeof useRepositoryCommits>)
    view.rerender(
      <TooltipProvider>
        <GitSyncView workspace={workspace} canSync canManageConnection />
      </TooltipProvider>
    )

    expect(
      await screen.findByRole("combobox", {
        name: "提交 3333333: Trunk head",
      })
    ).toBeInTheDocument()
  })

  it("blocks pushing to the default branch", async () => {
    const user = userEvent.setup()
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("button", { name: /^分支/ }))
    await user.click(screen.getByRole("option", { name: /main/ }))

    expect(screen.getByRole("button", { name: /^分支/ })).toHaveTextContent(
      "maindefault"
    )
    expect(
      screen.getByText("直接推送到 main 已禁用。请选择或创建其他分支。")
    ).toBeInTheDocument()
    const bar = screen.getByRole("group", { name: "推送操作" })
    expect(
      within(bar).getByRole("button", { name: "选择其他分支" })
    ).toBeDisabled()
    expect(within(bar).getByRole("button", { name: "推送选项" })).toBeDisabled()
  })

  it("blocks pushing to the repository default when another branch is pinned", async () => {
    const user = userEvent.setup()
    renderWithTooltips(
      <GitSyncView
        workspace={setup({
          gitRepoUrl: `${REPO_URL}@release`,
          branches: [
            { name: "main", is_default: true },
            { name: "release", is_default: false },
            { name: "feature", is_default: false },
          ],
        })}
        canSync
        canManageConnection
      />
    )

    await user.click(screen.getByRole("button", { name: /^分支/ }))
    await user.click(screen.getByRole("option", { name: /main/ }))

    expect(
      screen.getByText("直接推送到 main 已禁用。请选择或创建其他分支。")
    ).toBeInTheDocument()
    const bar = screen.getByRole("group", { name: "推送操作" })
    expect(
      within(bar).getByRole("button", { name: "选择其他分支" })
    ).toBeDisabled()
  })

  it("pushes only, without a pull request, from the button menu", async () => {
    const user = userEvent.setup()
    mockExportWorkspace.mockResolvedValue({
      commit: {
        status: "committed",
        sha: "b".repeat(40),
        ref: "release",
        base_ref: "main",
        pr_url: null,
        message: "导出工作空间配置",
      },
      files: ["tracecat.json"],
    })
    renderWithTooltips(
      <GitSyncView
        workspace={setup({
          branches: [
            { name: "main", is_default: true },
            { name: "release", is_default: false },
          ],
        })}
        canSync
        canManageConnection
      />
    )

    await user.click(screen.getByRole("button", { name: /^分支/ }))
    await user.click(screen.getByRole("option", { name: /release/ }))

    await user.click(screen.getByRole("button", { name: "推送选项" }))
    await user.click(screen.getByRole("menuitemradio", { name: /仅推送/ }))

    expect(
      screen.getByText(/工作空间推送可直接导出新工作流的当前编辑，无需先发布/)
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    const bar = screen.getByRole("group", { name: "推送操作" })
    await user.click(screen.getByRole("button", { name: "预览" }))
    await waitFor(() =>
      expect(
        within(bar).getByRole("button", { name: "推送到 release" })
      ).toBeEnabled()
    )
    await user.click(
      within(bar).getByRole("button", { name: "推送到 release" })
    )
    await confirmAction(user)
    await waitFor(() =>
      expect(mockExportWorkspace).toHaveBeenCalledWith({
        operationId: "push-operation",
      })
    )
  })

  it("waits to open the matches dialog until Pull is on screen", async () => {
    const user = userEvent.setup()
    let resolvePreview: (result: PullResult) => void = () => {}
    mockPullWorkflows.mockReturnValueOnce(
      new Promise<PullResult>((resolve) => {
        resolvePreview = resolve
      })
    )
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("tab", { name: "拉取" }))
    await user.click(screen.getByRole("button", { name: "预览" }))
    await user.click(screen.getByRole("tab", { name: "推送" }))
    await act(async () => {
      resolvePreview({
        success: false,
        commit_sha: LATEST_SHA,
        workflows_found: 0,
        workflows_imported: 0,
        diagnostics: [],
        message: "Import failed: 1 validation error(s) found",
        resource_diffs: [],
        catalog_mapping_requirements: [
          {
            source_catalog_id: "11111111-1111-1111-1111-111111111111",
            model_provider: "custom-model-provider",
            model_name: "shared-model",
            reason: "ambiguous",
            message: "Choose the target model before applying this pull.",
            candidates: [],
            affected_presets: [],
            affected_workflows: [],
          },
        ],
      })
    })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "拉取" }))
    expect(
      await screen.findByRole("dialog", { name: "匹配 1 个引用 后拉取" })
    ).toBeInTheDocument()
  })

  it("gates the pull on a re-previewed model mapping", async () => {
    const user = userEvent.setup()
    const sourceCatalogId = "11111111-1111-1111-1111-111111111111"
    const targetCatalogId = "22222222-2222-2222-2222-222222222222"
    const ambiguousPreview: PullResult = {
      success: false,
      commit_sha: LATEST_SHA,
      workflows_found: 0,
      workflows_imported: 0,
      diagnostics: [],
      message: "Import failed: 1 validation error(s) found",
      resource_diffs: [],
      catalog_mapping_requirements: [
        {
          source_catalog_id: sourceCatalogId,
          model_provider: "custom-model-provider",
          model_name: "shared-model",
          reason: "ambiguous",
          message: "Choose the target model before applying this pull.",
          candidates: [
            {
              catalog_id: targetCatalogId,
              model_provider: "custom-model-provider",
              model_name: "shared-model",
              provider_name: "Provider East",
              model_display_name: null,
              endpoint_hostname: "east.models.example.com",
              origin: "custom_provider",
            },
          ],
          affected_presets: [],
          affected_workflows: [],
        },
      ],
    }
    const resolvedPreview: PullResult = {
      ...ambiguousPreview,
      success: true,
      message: "Dry run completed - 1 resource change(s) detected",
      catalog_mapping_requirements: [],
      resource_counts: { workflow: { found: 1, imported: 0 } },
      resource_diffs: [
        {
          resource_type: "workflow",
          source_id: "phishing-triage",
          source_path: "workflows/phishing-triage/definition.yml",
          change_type: "modified",
          title: "Phishing triage",
          diff: "@@ -1 +1 @@\n-old\n+new",
        },
      ],
    }
    mockPullWorkflows
      .mockResolvedValueOnce(ambiguousPreview)
      .mockResolvedValueOnce(resolvedPreview)
      // The apply result only counts; names come from the preview.
      .mockResolvedValueOnce({
        ...resolvedPreview,
        message: "Imported",
        resource_counts: { workflow: { found: 1, imported: 1 } },
        resource_diffs: [],
      })
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("tab", { name: "拉取" }))
    const bar = screen.getByRole("group", { name: "拉取操作" })
    expect(bar).toHaveTextContent(/^来源/)
    const pullPanel = screen.getByRole("tabpanel", { name: "拉取" })
    expect(within(pullPanel).getByText("暂无预览")).toBeInTheDocument()
    await user.hover(
      within(bar).getByRole("button", { name: "关于覆盖定时计划" })
    )
    expect(
      (await screen.findAllByText("将覆盖 ID 匹配的现有资源，保留定时计划。"))
        .length
    ).toBeGreaterThan(0)
    await user.unhover(
      within(bar).getByRole("button", { name: "关于覆盖定时计划" })
    )
    const commitField = within(bar).getByRole("combobox", { name: /^提交/ })
    expect(commitField).toHaveTextContent(
      "1c52757Update detections· 约 2 小时前最新"
    )
    await user.click(commitField)
    await user.type(
      screen.getByPlaceholderText("按说明、作者或 SHA 搜索"),
      "Example"
    )
    expect(
      screen.getByRole("option", { name: /Update detections/ })
    ).toHaveTextContent(
      "EAUpdate detections最新1c52757·Example Author·约 2 小时前"
    )
    await user.keyboard("{Escape}")
    expect(bar).toHaveClass("sticky", "bottom-0")
    const applyButton = within(bar).getByRole("button", {
      name: "拉取到 Workspace 1",
    })
    expect(applyButton).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "预览" }))
    // A preview that needs matches opens the dialog on its own.
    const dialog = await screen.findByRole("dialog", {
      name: "匹配 1 个引用 后拉取",
    })
    expect(
      screen.getByText(
        "拉取被阻止：此提交中的 1 个引用需要在 Workspace 1 中匹配。"
      )
    ).toBeInTheDocument()
    expect(applyButton).toBeDisabled()
    const save = within(dialog).getByRole("button", {
      name: "保存并再次预览",
    })
    expect(save).toBeDisabled()
    expect(within(dialog).getByText("已匹配 0/1 项")).toBeInTheDocument()

    await user.click(
      within(dialog).getByLabelText(
        /^shared-model（custom-model-provider）的目标模型/
      )
    )
    await user.click(
      screen.getByRole("option", {
        name: "Provider East · east.models.example.com",
      })
    )
    expect(within(dialog).getByText("已匹配 1/1 项")).toBeInTheDocument()
    expect(applyButton).toBeDisabled()

    await user.click(save)
    expect(
      await screen.findByText("已检查匹配项，目标为 shared-model.")
    ).toBeInTheDocument()
    const pullButton = await within(bar).findByRole("button", {
      name: "拉取到 Workspace 1",
    })
    expect(pullButton).toBeEnabled()
    expect(screen.getByText("包含在此次操作中： 拉取")).toBeInTheDocument()
    expect(
      screen.getByText("来自 main 上的 1c52757：1 modified")
    ).toBeInTheDocument()

    await user.click(pullButton)
    await confirmAction(user)
    await waitFor(() =>
      expect(mockPullWorkflows).toHaveBeenNthCalledWith(3, {
        commit_sha: LATEST_SHA,
        sync_schedules: false,
        catalog_mappings: [
          {
            source_catalog_id: sourceCatalogId,
            target_catalog_id: targetCatalogId,
          },
        ],
        mcp_integration_mappings: [],
        secret_store_mappings: [],
      })
    )
    expect(
      await screen.findByText("已拉取 1 项到 Workspace 1")
    ).toBeInTheDocument()
    expect(screen.getByText("变更内容")).toBeInTheDocument()
    expect(screen.getByText("Phishing triage")).toBeInTheDocument()
    expect(screen.getByText("1 / 1")).toBeInTheDocument()
    expect(
      within(bar).getByRole("button", { name: "再次预览" })
    ).toBeInTheDocument()
  })
  it("treats secret store matches as optional and sends the choice", async () => {
    const user = userEvent.setup()
    const unmatchedStore = {
      source_store: "source-production",
      reason: "unresolved" as const,
      message: "No store with this name is authorized for this workspace.",
      candidates: [
        {
          store_id: "store-target",
          name: "target-production",
          region: "us-east-1",
        },
      ],
      affected_secrets: [
        { secret_name: "vendor_api", environment: "default", path: "a" },
        { secret_name: "vendor_app", environment: "default", path: "b" },
      ],
    }
    const preview: PullResult = {
      success: true,
      commit_sha: LATEST_SHA,
      workflows_found: 1,
      workflows_imported: 0,
      diagnostics: [],
      message: "Dry run completed",
      resource_diffs: [
        {
          resource_type: "workflow",
          source_id: "phishing-triage",
          source_path: "workflows/phishing-triage/definition.yml",
          change_type: "modified",
          title: "Phishing triage",
          diff: "@@ -1 +1 @@\n-old\n+new",
        },
      ],
      secret_store_mapping_requirements: [unmatchedStore],
      library_skill_installs: ["triage-notes"],
    }
    mockPullWorkflows
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({
        ...preview,
        secret_store_mapping_requirements: [],
      })
      .mockResolvedValueOnce({
        ...preview,
        resource_counts: { workflow: { found: 1, imported: 1 } },
      })
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("tab", { name: "拉取" }))
    const bar = screen.getByRole("group", { name: "拉取操作" })
    await user.click(screen.getByRole("button", { name: "预览" }))

    // Optional: no dialog, no block, and pulling is already allowed.
    expect(
      await screen.findByText(
        "密钥存储： 0 / 1 已关联。未关联的密钥将不带存储导入，之后可在凭据中关联。"
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText("拉取会从技能库安装 1 个技能：triage-notes。")
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    const pullButton = within(bar).getByRole("button", {
      name: "拉取到 Workspace 1",
    })
    expect(pullButton).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "选择存储" }))
    const dialog = await screen.findByRole("dialog", {
      name: "此次拉取的匹配项",
    })
    expect(within(dialog).getByText("可选")).toBeInTheDocument()
    expect(
      within(dialog).getByText("使用者 vendor_api, vendor_app")
    ).toBeInTheDocument()
    await user.click(
      within(dialog).getByLabelText("source-production 的目标存储")
    )
    await user.click(
      screen.getByRole("option", { name: "target-production (us-east-1)" })
    )
    await user.click(
      within(dialog).getByRole("button", { name: "保存并再次预览" })
    )
    const mapping = [
      { source_store: "source-production", target_store_id: "store-target" },
    ]
    await waitFor(() =>
      expect(mockPullWorkflows).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          dry_run: true,
          secret_store_mappings: mapping,
        })
      )
    )
    // The match is kept on screen even though the new preview stops listing it.
    expect(
      await screen.findByText(/密钥存储： 1 \/ 1 已关联/)
    ).toBeInTheDocument()

    await user.click(
      within(bar).getByRole("button", { name: "拉取到 Workspace 1" })
    )
    await confirmAction(user)
    await waitFor(() =>
      expect(mockPullWorkflows).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ secret_store_mappings: mapping })
      )
    )
    expect(
      await screen.findByText("从技能库安装： triage-notes.")
    ).toBeInTheDocument()
  })

  it("keeps a linked store listed while another stays unresolved", async () => {
    const user = userEvent.setup()
    const store = (name: string) => ({
      source_store: name,
      reason: "unresolved" as const,
      message: "No store with this name is authorized for this workspace.",
      candidates: [
        { store_id: "store-target", name: "target-production", region: null },
      ],
      affected_secrets: [
        { secret_name: `${name}_api`, environment: "default", path: name },
      ],
    })
    const preview: PullResult = {
      success: true,
      commit_sha: LATEST_SHA,
      workflows_found: 0,
      workflows_imported: 0,
      diagnostics: [],
      message: "Dry run completed",
      resource_diffs: [],
      secret_store_mapping_requirements: [store("store-a"), store("store-b")],
    }
    mockPullWorkflows.mockResolvedValueOnce(preview).mockResolvedValueOnce({
      ...preview,
      // Linking store-a resolves it, so the backend lists only store-b.
      secret_store_mapping_requirements: [store("store-b")],
    })
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("tab", { name: "拉取" }))
    await user.click(screen.getByRole("button", { name: "预览" }))
    await user.click(await screen.findByRole("button", { name: "选择存储" }))
    const dialog = await screen.findByRole("dialog", {
      name: "此次拉取的匹配项",
    })
    await user.click(within(dialog).getByLabelText("store-a 的目标存储"))
    await user.click(screen.getByRole("option", { name: "target-production" }))
    await user.click(
      within(dialog).getByRole("button", { name: "保存并再次预览" })
    )

    await waitFor(() => expect(mockPullWorkflows).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByText(/密钥存储： 1 \/ 2 已关联/)
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "选择存储" }))
    expect(
      await screen.findByLabelText("store-a 的目标存储")
    ).toHaveTextContent("target-production")
  })

  it("clears the push preview after a pull", async () => {
    const user = userEvent.setup()
    const preview: PullResult = {
      success: true,
      commit_sha: LATEST_SHA,
      workflows_found: 1,
      workflows_imported: 0,
      diagnostics: [],
      message: "Dry run completed - 1 resource change(s) detected",
      resource_diffs: [
        {
          resource_type: "workflow",
          source_id: "phishing-triage",
          source_path: "workflows/phishing-triage/definition.yml",
          change_type: "modified",
          title: "Phishing triage",
          diff: "@@ -1 +1 @@\n-old\n+new",
        },
      ],
    }
    mockPullWorkflows
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ ...preview, message: "Imported" })
    renderWithTooltips(
      <GitSyncView
        workspace={setup({ preview: PUSH_PREVIEW })}
        canSync
        canManageConnection
      />
    )

    await user.click(screen.getByRole("button", { name: "预览" }))
    expect(
      await screen.findByText("包含在此次操作中： 推送")
    ).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: "拉取" }))
    const pullPanel = screen.getByRole("tabpanel", { name: "拉取" })
    await user.click(within(pullPanel).getByRole("button", { name: "预览" }))
    const bar = screen.getByRole("group", { name: "拉取操作" })
    await user.click(
      await within(bar).findByRole("button", {
        name: "拉取到 Workspace 1",
      })
    )
    await confirmAction(user)
    await waitFor(() => expect(mockPullWorkflows).toHaveBeenCalledTimes(2))

    await user.click(screen.getByRole("tab", { name: "推送" }))
    await waitFor(() =>
      expect(
        screen.queryByText("包含在此次操作中： 推送")
      ).not.toBeInTheDocument()
    )
  })

  it("sends leave unlinked as a null store", async () => {
    const user = userEvent.setup()
    const preview: PullResult = {
      success: true,
      commit_sha: LATEST_SHA,
      workflows_found: 0,
      workflows_imported: 0,
      diagnostics: [],
      message: "Dry run completed",
      resource_diffs: [],
      secret_store_mapping_requirements: [
        {
          source_store: "source-production",
          reason: "unresolved",
          message: "No store with this name is authorized for this workspace.",
          candidates: [],
          affected_secrets: [
            { secret_name: "vendor_api", environment: "default", path: "a" },
          ],
        },
      ],
    }
    mockPullWorkflows.mockResolvedValue(preview)
    renderWithTooltips(
      <GitSyncView workspace={setup()} canSync canManageConnection />
    )

    await user.click(screen.getByRole("tab", { name: "拉取" }))
    await user.click(screen.getByRole("button", { name: "预览" }))
    await user.click(await screen.findByRole("button", { name: "选择存储" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(
      within(dialog).getByLabelText("source-production 的目标存储")
    )
    await user.click(screen.getByRole("option", { name: "保持未关联" }))
    await user.click(
      within(dialog).getByRole("button", { name: "保存并再次预览" })
    )

    await waitFor(() =>
      expect(mockPullWorkflows).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dry_run: true,
          secret_store_mappings: [
            { source_store: "source-production", target_store_id: null },
          ],
        })
      )
    )
  })
})

it("clears an open push preview when an observed pull imports data", async () => {
  const user = userEvent.setup()
  const workspace = setup({ preview: PUSH_PREVIEW })
  const view = renderWithTooltips(
    <GitSyncView workspace={workspace} canSync canManageConnection />
  )
  await user.click(screen.getByRole("button", { name: "预览" }))
  expect(await screen.findByText("包含在此次操作中： 推送")).toBeInTheDocument()
  mockImportRevision = 1
  view.rerender(
    <TooltipProvider>
      <GitSyncView workspace={workspace} canSync canManageConnection />
    </TooltipProvider>
  )
  await waitFor(() =>
    expect(
      screen.queryByText("包含在此次操作中： 推送")
    ).not.toBeInTheDocument()
  )
})
