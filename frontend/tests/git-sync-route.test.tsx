/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import WorkspaceGitSyncPage from "@/app/workspaces/[workspaceId]/git-sync/page"

let mockEntitlements = {
  hasEntitlement: (_key: string) => false,
  hasEntitlementData: true,
  isLoading: false,
}

jest.mock("@/hooks/use-entitlements", () => ({
  useEntitlements: () => mockEntitlements,
}))

jest.mock("@/hooks/use-workspace", () => ({
  useWorkspaceDetails: () => ({
    workspace: { id: "workspace-1", name: "Workspace 1", settings: {} },
    workspaceLoading: false,
    workspaceError: null,
  }),
}))

let mockScopes: Record<string, boolean | undefined> = {}

jest.mock("@/components/auth/scope-guard", () => ({
  useScopeCheck: (scope: string) => mockScopes[scope],
}))

jest.mock("@/components/loading/spinner", () => ({
  CenteredSpinner: () => <div>Loading</div>,
}))

jest.mock("@/components/workspace-sync/git-sync-view", () => ({
  GitSyncHeader: () => <header>Git Sync</header>,
  GitSyncView: ({
    canSync,
    canManageConnection,
  }: {
    canSync: boolean
    canManageConnection: boolean
  }) => (
    <div>
      Git Sync view sync={String(canSync)} manage=
      {String(canManageConnection)}
    </div>
  ),
}))

beforeEach(() => {
  mockScopes = { "workspace_sync:sync": true, "workspace:update": true }
})

describe("WorkspaceGitSyncPage", () => {
  it("asks to reload when the plan can't be checked, not to upgrade", () => {
    mockEntitlements = {
      hasEntitlement: () => false,
      hasEntitlementData: false,
      isLoading: false,
    }

    render(<WorkspaceGitSyncPage />)

    expect(screen.getByText("无法检查套餐权限")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "重新加载" })).toBeInTheDocument()
    expect(screen.queryByText("需要升级")).not.toBeInTheDocument()
  })

  it("shows the upgrade state when the plan lacks Git Sync", () => {
    mockEntitlements = {
      hasEntitlement: () => false,
      hasEntitlementData: true,
      isLoading: false,
    }

    render(<WorkspaceGitSyncPage />)

    expect(screen.getByText("需要升级")).toBeInTheDocument()
  })

  it("shows the page when the plan includes Git Sync", () => {
    mockEntitlements = {
      hasEntitlement: () => true,
      hasEntitlementData: true,
      isLoading: false,
    }

    render(<WorkspaceGitSyncPage />)

    expect(screen.getByText(/Git Sync view/)).toHaveTextContent(
      "sync=true manage=true"
    )
  })

  describe("permissions", () => {
    beforeEach(() => {
      mockEntitlements = {
        hasEntitlement: () => true,
        hasEntitlementData: true,
        isLoading: false,
      }
    })

    it("waits while a permission check is unresolved", () => {
      mockScopes = {
        "workspace_sync:sync": undefined,
        "workspace:update": true,
      }

      render(<WorkspaceGitSyncPage />)

      expect(screen.getByText("Loading")).toBeInTheDocument()
    })

    it("refuses viewers who can neither sync nor manage the connection", () => {
      mockScopes = { "workspace_sync:sync": false, "workspace:update": false }

      render(<WorkspaceGitSyncPage />)

      expect(
        screen.getByText("你没有同步此工作空间的权限。")
      ).toBeInTheDocument()
      expect(screen.queryByText(/Git Sync view/)).not.toBeInTheDocument()
    })

    it("lets connection admins in without sync access", () => {
      mockScopes = { "workspace_sync:sync": false, "workspace:update": true }

      render(<WorkspaceGitSyncPage />)

      expect(screen.getByText(/Git Sync view/)).toHaveTextContent(
        "sync=false manage=true"
      )
    })
  })
})
