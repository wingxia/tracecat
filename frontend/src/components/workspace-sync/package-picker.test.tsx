import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { WorkspacePackageRead } from "@/client"
import {
  PackageResourcesDialog,
  PackageSummary,
} from "@/components/workspace-sync/package-picker"

const mockUser = { isSuperuser: true }

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mockUser }),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

const PACKAGE: WorkspacePackageRead = {
  is_source: true,
  ref: "main",
  patterns: ["workflows/triage/**"],
  resources: [
    {
      resource_type: "workflow",
      source_id: "triage",
      local_id: "wf-1",
      name: "triage",
      path: "workflows/triage/workflow.yml",
      pattern: "workflows/triage/**",
      status: "explicit",
    },
    {
      resource_type: "variable",
      source_id: "default/settings",
      local_id: "var-1",
      name: "settings",
      path: "variables/default/settings.yml",
      pattern: "variables/default/settings.yml",
      status: "implied",
      implied_by: ["triage"],
    },
  ],
}

const SAME_GROUP_PACKAGE: WorkspacePackageRead = {
  is_source: true,
  ref: "main",
  patterns: ["workflows/parent/**"],
  resources: [
    {
      resource_type: "workflow",
      source_id: "parent",
      local_id: "wf-parent",
      name: "parent",
      path: "workflows/parent/workflow.yml",
      pattern: "workflows/parent/**",
      status: "explicit",
    },
    {
      resource_type: "workflow",
      source_id: "child",
      local_id: "wf-child",
      name: "child",
      path: "workflows/child/workflow.yml",
      pattern: "workflows/child/**",
      status: "implied",
      implied_by: ["parent"],
    },
  ],
}

const SAME_NAME_PACKAGE: WorkspacePackageRead = {
  is_source: true,
  ref: "main",
  patterns: ["workflows/parent/**"],
  resources: [
    {
      resource_type: "workflow",
      source_id: "parent",
      local_id: "wf-parent",
      name: "parent",
      path: "workflows/parent/workflow.yml",
      pattern: "workflows/parent/**",
      status: "explicit",
    },
    {
      resource_type: "agent_preset",
      source_id: "shared-name",
      local_id: "preset-1",
      name: "parent",
      path: "agents/shared-name/preset.yml",
      pattern: "agents/shared-name/**",
      status: "implied",
      implied_by: ["parent"],
    },
  ],
}

const USES_SETTINGS = new Set(["workflow:triage"])

const TRIGGER = <button type="button">Open</button>

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Open" }))
}

function renderDialog(
  selected: Set<string>,
  workspacePackage: WorkspacePackageRead = PACKAGE,
  onApply = jest.fn()
) {
  render(
    <PackageResourcesDialog
      trigger={TRIGGER}
      workspacePackage={workspacePackage}
      selected={selected}
      onApply={onApply}
    />
  )
  openDialog()
  return onApply
}

function expandGroups() {
  for (const group of screen.getAllByRole("button", { expanded: false })) {
    fireEvent.click(group)
  }
}

describe("PackageResourcesDialog", () => {
  it("starts with every group collapsed", () => {
    renderDialog(USES_SETTINGS)

    expect(screen.queryByRole("checkbox", { name: /^triage/ })).toBeNull()
    expect(screen.queryByRole("checkbox", { name: /^settings/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /工作流/ }))
    expect(screen.getByRole("checkbox", { name: /^triage/ })).toBeVisible()
    expect(screen.getByText("workflows/triage/workflow.yml")).toBeVisible()
  })

  it("keeps an implied resource while the resource using it is checked", () => {
    renderDialog(USES_SETTINGS)
    expandGroups()

    const dependency = screen.getByRole("checkbox", { name: /settings/ })
    expect(dependency).toBeChecked()
    expect(dependency).toBeDisabled()
    expect(screen.getByText(/因 triage 依赖此资源而包含/)).toBeVisible()
    expect(screen.getByText(/2 \/ 2 位于软件包中/)).toBeInTheDocument()
  })

  it("drops an implied resource once its last user is unchecked", () => {
    renderDialog(USES_SETTINGS)
    expandGroups()

    fireEvent.click(screen.getByRole("checkbox", { name: /^triage/ }))

    const dependency = screen.getByRole("checkbox", { name: /settings/ })
    expect(dependency).not.toBeChecked()
    expect(dependency).toBeEnabled()
    expect(screen.getByText(/0 \/ 2 位于软件包中/)).toBeInTheDocument()
  })

  it("applies a draft only when asked", () => {
    const onApply = renderDialog(USES_SETTINGS)
    expandGroups()

    fireEvent.click(screen.getByRole("checkbox", { name: /^triage/ }))
    expect(onApply).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))
    expect(onApply).toHaveBeenCalledWith(new Set())
  })

  it("discards a draft when closed without applying", () => {
    const onApply = renderDialog(USES_SETTINGS)
    expandGroups()
    fireEvent.click(screen.getByRole("checkbox", { name: /^triage/ }))
    expect(screen.getByText(/0 \/ 2 位于软件包中/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "关闭" }))
    openDialog()

    expect(screen.getByText(/2 \/ 2 位于软件包中/)).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })

  it("restarts the draft when the package changes while open", () => {
    const onApply = jest.fn()
    function dialog(workspacePackage: WorkspacePackageRead) {
      return (
        <PackageResourcesDialog
          trigger={TRIGGER}
          workspacePackage={workspacePackage}
          selected={USES_SETTINGS}
          onApply={onApply}
        />
      )
    }
    const { rerender } = render(dialog(PACKAGE))
    openDialog()
    expandGroups()
    fireEvent.click(screen.getByRole("checkbox", { name: /^triage/ }))
    expect(screen.getByText(/0 \/ 2 位于软件包中/)).toBeInTheDocument()

    rerender(dialog({ ...PACKAGE }))

    expect(screen.getByText(/2 \/ 2 位于软件包中/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))
    expect(onApply).toHaveBeenCalledWith(USES_SETTINGS)
  })

  it("checks a whole group at once", () => {
    const onApply = renderDialog(new Set())

    fireEvent.click(screen.getByRole("checkbox", { name: /全选 工作流/i }))
    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))

    expect(onApply).toHaveBeenCalledWith(new Set(["workflow:triage"]))
  })

  it("leaves a resource selected by a glob out of the group checkbox", () => {
    const onApply = renderDialog(new Set(), {
      ...SAME_GROUP_PACKAGE,
      patterns: ["workflows/parent*/**"],
      resources: SAME_GROUP_PACKAGE.resources?.map((resource) => ({
        ...resource,
        status: resource.name === "parent" ? "explicit" : "excluded",
      })),
    })

    fireEvent.click(screen.getByRole("checkbox", { name: /全选 工作流/i }))
    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))

    expect(onApply).toHaveBeenCalledWith(new Set(["workflow:child"]))
  })

  it("filters resources by name across groups", () => {
    renderDialog(USES_SETTINGS)

    fireEvent.change(screen.getByRole("textbox", { name: "搜索资源" }), {
      target: { value: "sett" },
    })

    expect(screen.getByRole("checkbox", { name: /settings/ })).toBeVisible()
    expect(screen.queryByRole("checkbox", { name: /^triage/ })).toBeNull()
    expect(screen.getByRole("button", { name: /变量/ })).toBeDisabled()
  })

  it("keeps a dependency implied when its group is toggled off and on", () => {
    const onApply = renderDialog(
      new Set(["workflow:parent"]),
      SAME_GROUP_PACKAGE
    )
    const group = screen.getByRole("checkbox", {
      name: /全选 工作流/i,
    })

    fireEvent.click(group)
    expect(screen.getByText(/0 \/ 2 位于软件包中/)).toBeInTheDocument()
    fireEvent.click(group)
    expect(screen.getByText(/2 \/ 2 位于软件包中/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))
    expect(onApply).toHaveBeenCalledWith(new Set(["workflow:parent"]))
  })

  it("clears a dependency selected by its own row with its group", () => {
    const onApply = renderDialog(
      new Set(["workflow:parent", "workflow:child"]),
      SAME_GROUP_PACKAGE
    )

    fireEvent.click(screen.getByRole("checkbox", { name: /全选 工作流/i }))
    expect(screen.getByText(/0 \/ 2 位于软件包中/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))
    expect(onApply).toHaveBeenCalledWith(new Set())
  })

  it("keeps the group checkbox usable for a former dependency", () => {
    const onApply = renderDialog(USES_SETTINGS)
    expandGroups()

    fireEvent.click(screen.getByRole("checkbox", { name: /^triage/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: /^settings/ }))
    const group = screen.getByRole("checkbox", {
      name: /全选 变量/i,
    })
    expect(group).toBeEnabled()

    fireEvent.click(group)
    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))
    expect(onApply).toHaveBeenCalledWith(new Set())
  })

  it("lets a selected dependency be unchecked when a user shares its name", () => {
    renderDialog(new Set(["workflow:parent"]), SAME_NAME_PACKAGE)
    expandGroups()
    const [workflow, preset] = screen.getAllByRole("checkbox", {
      name: /^parent/,
    })

    fireEvent.click(workflow)
    fireEvent.click(preset)
    expect(preset).toBeEnabled()

    fireEvent.click(preset)
    expect(screen.getByText(/0 \/ 2 位于软件包中/)).toBeInTheDocument()
  })

  it("marks a partly selected group", () => {
    renderDialog(new Set(), {
      ...SAME_GROUP_PACKAGE,
      patterns: ["workflows/parent/**", "workflows/child/**"],
      resources: SAME_GROUP_PACKAGE.resources?.map((resource) => ({
        ...resource,
        status: "explicit",
      })),
    })
    expandGroups()
    expect(screen.getByText(/0 \/ 2 位于软件包中/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("checkbox", { name: /^child/ }))

    expect(screen.getByText(/1 \/ 2 位于软件包中/)).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: /全选 工作流/i })
    ).toHaveAttribute("aria-checked", "mixed")
  })
})

describe("PackageSummary", () => {
  beforeEach(() => {
    mockUser.isSuperuser = true
  })

  it("returns focus to the opener when the dialog closes", async () => {
    render(
      <PackageSummary
        workspacePackage={PACKAGE}
        selected={USES_SETTINGS}
        isChanged={false}
        onApply={jest.fn()}
      />
    )
    const opener = screen.getByRole("button", { name: "编辑资源" })

    opener.focus()
    fireEvent.click(opener)
    fireEvent.click(screen.getByRole("button", { name: "应用选择" }))

    await waitFor(() => expect(opener).toHaveFocus())
  })

  it("cannot open the dialog while disabled", () => {
    render(
      <PackageSummary
        workspacePackage={PACKAGE}
        selected={USES_SETTINGS}
        isChanged={false}
        disabled
        onApply={jest.fn()}
      />
    )

    expect(screen.getByRole("button", { name: "编辑资源" })).toBeDisabled()
  })

  it("names the admin page without linking it for other users", () => {
    mockUser.isSuperuser = false
    render(
      <PackageSummary
        workspacePackage={PACKAGE}
        selected={USES_SETTINGS}
        isChanged={false}
        onApply={jest.fn()}
      />
    )

    expect(screen.getByText(/管理后台 › 托管工作空间/)).toBeInTheDocument()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("counts the package and opens the dialog", () => {
    render(
      <PackageSummary
        workspacePackage={PACKAGE}
        selected={USES_SETTINGS}
        isChanged={false}
        onApply={jest.fn()}
      />
    )

    expect(screen.getByText(/2 \/ 2 个资源/)).toBeInTheDocument()
    expect(screen.getByText(/发布不会更改客户工作空间/)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "管理后台 › 托管工作空间" })
    ).toHaveAttribute("href", "/admin/managed-package")

    fireEvent.click(screen.getByRole("button", { name: "编辑资源" }))
    expect(
      screen.getByRole("dialog", { name: "选择软件包资源" })
    ).toBeInTheDocument()
  })
})
