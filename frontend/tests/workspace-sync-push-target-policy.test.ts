import {
  getWorkspaceSyncPushButtonLabel,
  getWorkspaceSyncPushOutcome,
  getWorkspaceSyncPushResultLabel,
  getWorkspaceSyncPushWarning,
} from "@/components/workspace-sync/push-target-policy"

describe("getWorkspaceSyncPushOutcome", () => {
  it("blocks pull request mode when a new branch name matches the default branch", () => {
    const outcome = getWorkspaceSyncPushOutcome({
      mode: "pull-request",
      targetBranch: "main",
      defaultBranch: "main",
      isCreatingBranch: true,
    })

    expect(outcome.targetIsDefault).toBe(true)
    expect(outcome.isPullRequestBlocked).toBe(true)
    expect(outcome.willCreatePr).toBe(false)
  })

  it("uses GitLab merge request wording when provider is GitLab", () => {
    const outcome = getWorkspaceSyncPushOutcome({
      mode: "pull-request",
      targetBranch: "sync/workspace",
      defaultBranch: "main",
      isCreatingBranch: true,
    })

    expect(
      getWorkspaceSyncPushButtonLabel({
        outcome,
        isCreatingBranch: true,
        isPending: false,
        provider: "gitlab",
      })
    ).toBe("推送并创建 MR")
    expect(
      getWorkspaceSyncPushResultLabel({
        outcome,
        defaultBranch: "main",
        provider: "gitlab",
      })
    ).toBe("MR 合并到 main")
    expect(
      getWorkspaceSyncPushWarning({
        outcome: {
          ...outcome,
          createPr: false,
          willCreatePr: false,
          targetIsDefault: true,
        },
        defaultBranch: "main",
        provider: "gitlab",
      })
    ).toBe("此操作会直接提交到 main，不创建merge request。")
  })
})
