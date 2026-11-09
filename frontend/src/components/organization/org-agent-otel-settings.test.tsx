import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { OrgAgentOtelSettings } from "@/components/organization/org-agent-otel-settings"
import { useOrgAgentOtelSettings } from "@/hooks/use-org-agent-otel-settings"

jest.mock("@/components/auth/scope-guard", () => ({
  useScopeCheck: jest.fn(),
}))

jest.mock("@/hooks/use-org-agent-otel-settings", () => ({
  useOrgAgentOtelSettings: jest.fn(),
}))

const updateAgentOtelSettings = jest.fn(async () => undefined)

function settingsWithEndpoint(endpoint: string) {
  return {
    agent_otel_config: {
      enabled: true,
      endpoint,
      metrics_enabled: true,
      logs_enabled: true,
      traces_enabled: false,
    },
  }
}

function mockSettingsHook(
  overrides: Partial<ReturnType<typeof useOrgAgentOtelSettings>> = {}
) {
  jest.mocked(useOrgAgentOtelSettings).mockReturnValue({
    agentOtelSettings: settingsWithEndpoint("https://collector.example.com"),
    agentOtelSettingsIsLoading: false,
    agentOtelSettingsError: null,
    updateAgentOtelSettings,
    updateAgentOtelSettingsIsPending: false,
    updateAgentOtelSettingsError: null,
    ...overrides,
  } as ReturnType<typeof useOrgAgentOtelSettings>)
}

describe("OrgAgentOtelSettings edit gating", () => {
  beforeEach(() => {
    jest.mocked(useScopeCheck).mockReturnValue(true)
    mockSettingsHook()
  })

  it("disables saving when settings fail to load", () => {
    mockSettingsHook({
      agentOtelSettings: undefined,
      agentOtelSettingsError: new Error("Request failed"),
    })

    render(<OrgAgentOtelSettings />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "为保护已保存的配置，已禁用编辑。"
    )
    expect(screen.getByRole("button", { name: "保存配置" })).toBeDisabled()
  })

  it("stays editable when a background refetch fails with retained data", async () => {
    mockSettingsHook({
      agentOtelSettingsError: new Error("Request failed"),
    })

    render(<OrgAgentOtelSettings />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "保存配置" })).toBeEnabled()
    )
  })

  it("disables saving when settings return no data", () => {
    mockSettingsHook({ agentOtelSettings: undefined })

    render(<OrgAgentOtelSettings />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "为保护已保存的配置，已禁用编辑。"
    )
    expect(screen.getByRole("button", { name: "保存配置" })).toBeDisabled()
  })

  it("renders settings read-only without the update scope", async () => {
    jest.mocked(useScopeCheck).mockReturnValue(false)

    render(<OrgAgentOtelSettings />)

    expect(screen.getByRole("alert")).toHaveTextContent("没有更新权限")
    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "启用智能体遥测" })
      ).toBeChecked()
    )
    expect(
      screen.getByRole("switch", { name: "启用智能体遥测" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "保存配置" })).toBeDisabled()
  })

  it("keeps controls editable with loaded settings and the update scope", async () => {
    render(<OrgAgentOtelSettings />)

    await waitFor(() =>
      expect(
        screen.getByRole("switch", { name: "启用智能体遥测" })
      ).toBeChecked()
    )
    expect(screen.getByRole("switch", { name: "启用智能体遥测" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "保存配置" })).toBeEnabled()
  })
})

describe("OrgAgentOtelSettings server resync", () => {
  beforeEach(() => {
    jest.mocked(useScopeCheck).mockReturnValue(true)
    mockSettingsHook({
      agentOtelSettings: settingsWithEndpoint("old-collector"),
    })
  })

  it("adopts a changed server endpoint while the form is pristine", async () => {
    const { rerender } = render(<OrgAgentOtelSettings />)

    const endpoint = screen.getByLabelText("收集器端点")
    await waitFor(() => expect(endpoint).toHaveValue("old-collector"))

    mockSettingsHook({
      agentOtelSettings: settingsWithEndpoint("new-collector"),
    })
    rerender(<OrgAgentOtelSettings />)

    await waitFor(() => expect(endpoint).toHaveValue("new-collector"))
  })

  it("keeps unsaved edits when the server config changes", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OrgAgentOtelSettings />)

    const endpoint = screen.getByLabelText("收集器端点")
    await waitFor(() => expect(endpoint).toHaveValue("old-collector"))

    await user.clear(endpoint)
    await user.type(endpoint, "my-draft")
    expect(endpoint).toHaveValue("my-draft")

    mockSettingsHook({
      agentOtelSettings: settingsWithEndpoint("new-collector"),
    })
    rerender(<OrgAgentOtelSettings />)

    await waitFor(() => expect(endpoint).toHaveValue("my-draft"))
    expect(screen.getByRole("button", { name: "重置" })).toBeEnabled()
  })

  it("disables Reset until the form is edited", async () => {
    render(<OrgAgentOtelSettings />)

    const reset = screen.getByRole("button", { name: "重置" })
    await waitFor(() => expect(reset).toBeDisabled())

    await userEvent.setup().type(screen.getByLabelText("收集器端点"), "x")
    expect(reset).toBeEnabled()
  })
})
describe("OrgAgentOtelSettings save reseed guard", () => {
  beforeEach(() => {
    jest.mocked(useScopeCheck).mockReturnValue(true)
  })

  it("keeps submitted values pristine when the post-save refetch fails", async () => {
    // A failed refetch leaves pre-save data in the cache; its sig matches the
    // pre-save baseline, so the resync effect must not reseed over the save.
    const user = userEvent.setup()
    render(<OrgAgentOtelSettings />)

    const endpoint = screen.getByLabelText("收集器端点")
    await user.clear(endpoint)
    await user.type(endpoint, "https://new.example.com")
    await user.click(screen.getByRole("button", { name: "保存配置" }))

    await waitFor(() => expect(updateAgentOtelSettings).toHaveBeenCalled())
    expect(endpoint).toHaveValue("https://new.example.com")
    expect(screen.getByRole("button", { name: "重置" })).toBeDisabled()
  })

  it("adopts the canonical post-save read when the refetch lands", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OrgAgentOtelSettings />)

    const endpoint = screen.getByLabelText("收集器端点")
    await user.clear(endpoint)
    await user.type(endpoint, "https://new.example.com")
    await user.click(screen.getByRole("button", { name: "保存配置" }))
    await waitFor(() => expect(updateAgentOtelSettings).toHaveBeenCalled())

    mockSettingsHook({
      agentOtelSettings: settingsWithEndpoint("https://new.example.com/"),
    })
    rerender(<OrgAgentOtelSettings />)

    await waitFor(() =>
      expect(endpoint).toHaveValue("https://new.example.com/")
    )
  })
})
