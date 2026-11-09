import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { type FormReadMinimal, formsDeleteForm, formsListForms } from "@/client"
import {
  CreateFormDialog,
  FormsDashboard,
} from "@/components/forms/forms-dashboard"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@/lib/query"

let scopes = new Set<string>()
let workflowList: Record<string, unknown> = {}
const mockToast = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock("@/client", () => ({
  formsDeleteForm: jest.fn(),
  formsListForms: jest.fn(),
}))
jest.mock("@/components/auth/scope-guard", () => ({
  useScopeCheck: (scope: string) => scopes.has(scope),
}))
jest.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}))
jest.mock("@/providers/workspace-id", () => ({
  useWorkspaceId: () => "workspace-1",
}))
jest.mock("@/lib/hooks", () => ({
  useWorkflowManager: () => workflowList,
}))

function form(overrides: Partial<FormReadMinimal>): FormReadMinimal {
  return {
    id: "form-1",
    workflow_id: "wf_taken",
    workflow_title: "Provision laptop",
    status: "online",
    title: "Laptop request",
    submission_count: 42,
    created_at: "2026-10-01T09:00:00Z",
    updated_at: "2026-10-01T09:00:00Z",
    ...overrides,
  }
}

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>
  )
  return userEvent.setup()
}

beforeEach(() => {
  jest.clearAllMocks()
  scopes = new Set(["form:read", "form:delete", "workflow:read"])
  workflowList = { workflows: [], workflowsLoading: false }
  // Two pages: the list loads all of them so it can be searched.
  jest
    .mocked(formsListForms)
    .mockResolvedValueOnce({
      items: [form({})],
      next_cursor: "cursor-2",
      has_more: true,
    } as never)
    .mockResolvedValueOnce({
      items: [
        form({
          id: "form-2",
          title: "Offboarding",
          workflow_id: "wf_other",
          workflow_title: "Offboard employee",
          status: "offline",
          submission_count: 1,
        }),
      ],
      has_more: false,
    } as never)
})

it("lists every form with its workflow, status and usage, and deletes after confirming", async () => {
  jest.mocked(formsDeleteForm).mockResolvedValue(undefined)
  const user = renderWithClient(<FormsDashboard />)

  const row = (
    await screen.findByRole("link", { name: "Offboarding" })
  ).closest("li") as HTMLElement
  expect(
    within(row).getByRole("link", { name: "Offboard employee" })
  ).toHaveAttribute("href", "/workspaces/workspace-1/workflows/wf_other")
  expect(within(row).getByText("已下线")).toBeInTheDocument()
  expect(within(row).getByText("1 次提交")).toBeInTheDocument()

  await user.type(screen.getByPlaceholderText("搜索表单…"), "laptop")
  expect(screen.queryByText("Offboarding")).not.toBeInTheDocument()

  await user.click(
    screen.getByRole("button", { name: "打开菜单： Laptop request" })
  )
  await user.click(await screen.findByRole("menuitem", { name: "删除" }))
  await user.click(screen.getByRole("button", { name: "删除" }))
  await waitFor(() =>
    expect(formsDeleteForm).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      formId: "form-1",
    })
  )
})

it("shows each form's workflow as plain text without workflow:read", async () => {
  scopes.delete("workflow:read")
  renderWithClient(<FormsDashboard />)

  expect(await screen.findByText("Offboard employee")).toBeInTheDocument()
  expect(screen.queryByRole("link", { name: "Offboard employee" })).toBeNull()
})

it("confirms a copied form link only once the clipboard write lands", async () => {
  const user = renderWithClient(<FormsDashboard />)
  // After setup, which installs its own clipboard stub.
  const writeText = jest
    .spyOn(navigator.clipboard, "writeText")
    .mockRejectedValueOnce(new Error("Write permission denied"))
  const url = `${window.location.origin}/forms/form-1`
  async function copyLink() {
    await user.click(
      await screen.findByRole("button", {
        name: "打开菜单： Laptop request",
      })
    )
    await user.click(await screen.findByRole("menuitem", { name: "复制链接" }))
  }

  await copyLink()
  await waitFor(() =>
    expect(mockToast).toHaveBeenCalledWith({
      title: "无法复制链接",
      description: url,
      variant: "destructive",
    })
  )
  expect(mockToast).toHaveBeenCalledTimes(1)

  await copyLink()
  await waitFor(() =>
    expect(mockToast).toHaveBeenLastCalledWith({
      title: "已复制表单链接",
      description: url,
    })
  )
  expect(writeText).toHaveBeenCalledTimes(2)
})

it("says so when the workflows to pick from can't be loaded", async () => {
  workflowList = {
    workflows: undefined,
    workflowsLoading: false,
    workflowsError: new Error("Forbidden"),
  }
  renderWithClient(<CreateFormDialog open onOpenChange={jest.fn()} />)

  expect(await screen.findByText("无法加载工作流。")).toBeInTheDocument()
  expect(screen.queryByText("未找到工作流。")).toBeNull()
})
