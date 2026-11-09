/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import {
  type WorkflowCommitResponse,
  type WorkflowRead,
  workflowsCommitWorkflow,
  workflowsGetWorkflow,
  workflowsPublishWorkflow,
} from "@/client"
import { CancelablePromise } from "@/client/core/CancelablePromise"
import { toast } from "@/components/ui/use-toast"
import { isPublishRequired } from "@/components/workspace-sync/publish-first-dialog"
import { WorkspacePushExplanation } from "@/components/workspace-sync/workspace-push-explanation"
import { QueryClient, QueryClientProvider } from "@/lib/query"
import { useWorkflow, WorkflowProvider } from "@/providers/workflow"

jest.mock("@/client", () => ({
  workflowsGetWorkflow: jest.fn(),
  workflowsCommitWorkflow: jest.fn(),
  workflowsPublishWorkflow: jest.fn(),
  workflowsUpdateWorkflow: jest.fn(),
}))
jest.mock("@/components/ui/use-toast", () => ({ toast: jest.fn() }))

function pushError(code: string) {
  return Object.assign(new Error("Push failed"), {
    status: 400,
    body: {
      detail: "Synthetic workflow: 推送到 Git 前，请先发布此工作流。",
      diagnostics: [
        {
          workflow_id: "00000000-0000-4000-8000-000000000001",
          workflow_title: "Synthetic workflow",
          stage: "definition",
          code,
          message: "推送到 Git 前，请先发布此工作流。",
        },
      ],
    },
  })
}

function PushButton() {
  const { publishWorkflow, validationErrors } = useWorkflow()
  return (
    <>
      <output aria-label="Validation errors">
        {validationErrors?.length ?? 0}
      </output>
      <button
        type="button"
        onClick={() => {
          void publishWorkflow({
            branch: "sync/example",
            create_pr: false,
          }).catch(() => {})
        }}
      >
        Push
      </button>
    </>
  )
}

function renderWorkflow() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <WorkflowProvider workspaceId="synthetic" workflowId="synthetic">
        <PushButton />
      </WorkflowProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(workflowsGetWorkflow).mockResolvedValue({
    id: "synthetic",
    title: "Synthetic workflow",
    version: null,
  } as WorkflowRead)
})

test("clicking Push shows the Publish-first modal; dismissing has no side effects", async () => {
  jest
    .mocked(workflowsPublishWorkflow)
    .mockRejectedValue(pushError("publish_required"))
  renderWorkflow()
  const push = screen.getByRole("button", { name: "Push" })
  expect(push).toBeEnabled()
  fireEvent.click(push)
  expect(
    await screen.findByRole("dialog", { name: "请先发布此工作流" })
  ).toBeInTheDocument()
  expect(
    screen.getByText("推送到 Git 前，请先发布此工作流。")
  ).toBeInTheDocument()
  expect(toast).not.toHaveBeenCalled()
  expect(workflowsCommitWorkflow).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "知道了" }))
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  )
  expect(push).toBeEnabled()
  expect(workflowsPublishWorkflow).toHaveBeenCalledTimes(1)
  expect(workflowsCommitWorkflow).not.toHaveBeenCalled()
})

test("message text cannot turn an inconsistent saved version into a first-Publish error", async () => {
  const error = pushError("missing_definition")
  expect(isPublishRequired(error)).toBe(false)
  jest.mocked(workflowsPublishWorkflow).mockRejectedValue(error)
  renderWorkflow()
  fireEvent.click(screen.getByRole("button", { name: "Push" }))
  await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(toast).toHaveBeenCalledWith(
    expect.objectContaining({ variant: "destructive" })
  )
})

test("Publish from the modal saves one version and closes without retrying Git Push", async () => {
  jest
    .mocked(workflowsPublishWorkflow)
    .mockRejectedValue(pushError("publish_required"))
  let finishPublish!: (response: WorkflowCommitResponse) => void
  jest.mocked(workflowsCommitWorkflow).mockImplementationOnce(
    () =>
      new CancelablePromise((resolve) => {
        finishPublish = resolve
      })
  )
  renderWorkflow()
  fireEvent.click(screen.getByRole("button", { name: "Push" }))
  fireEvent.click(await screen.findByRole("button", { name: "发布工作流" }))
  const pending = await screen.findByRole("button", { name: "发布中…" })
  expect(pending).toBeDisabled()
  fireEvent.click(pending)
  expect(workflowsCommitWorkflow).toHaveBeenCalledTimes(1)
  expect(workflowsCommitWorkflow).toHaveBeenCalledWith({
    workspaceId: "synthetic",
    workflowId: "synthetic",
  })
  await act(async () =>
    finishPublish({
      workflow_id: "synthetic",
      status: "success",
      message: "Published",
    })
  )
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  )
  expect(workflowsGetWorkflow).toHaveBeenCalledTimes(2)
  expect(workflowsPublishWorkflow).toHaveBeenCalledTimes(1)
})

test("Publish validation errors stay visible in the modal and reach the editor", async () => {
  jest
    .mocked(workflowsPublishWorkflow)
    .mockRejectedValue(pushError("publish_required"))
  jest.mocked(workflowsCommitWorkflow).mockResolvedValueOnce({
    workflow_id: "synthetic",
    status: "failure",
    message: "Invalid workflow",
    errors: [
      { type: "dsl", status: "error", msg: "Add an action to this workflow." },
    ],
  })
  renderWorkflow()
  fireEvent.click(screen.getByRole("button", { name: "Push" }))
  fireEvent.click(await screen.findByRole("button", { name: "发布工作流" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Add an action to this workflow."
  )
  expect(screen.getByRole("dialog")).toBeInTheDocument()
  expect(screen.getByLabelText("Validation errors")).toHaveTextContent("1")
  expect(screen.getByRole("button", { name: "发布工作流" })).toBeEnabled()
  jest.mocked(workflowsCommitWorkflow).mockResolvedValueOnce({
    workflow_id: "synthetic",
    status: "success",
    message: "Published",
  })
  fireEvent.click(screen.getByRole("button", { name: "发布工作流" }))
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  )
  expect(screen.getByLabelText("Validation errors")).toHaveTextContent("0")
  expect(workflowsPublishWorkflow).toHaveBeenCalledTimes(1)
})

test("a network retry shows only its own error while preserving editor validation errors", async () => {
  jest
    .mocked(workflowsPublishWorkflow)
    .mockRejectedValue(pushError("publish_required"))
  jest
    .mocked(workflowsCommitWorkflow)
    .mockResolvedValueOnce({
      workflow_id: "synthetic",
      status: "failure",
      message: "Invalid workflow",
      errors: [
        { type: "dsl", status: "error", msg: "Previous validation failure." },
      ],
    })
    .mockRejectedValueOnce(new Error("Network unavailable"))
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
  renderWorkflow()
  fireEvent.click(screen.getByRole("button", { name: "Push" }))
  fireEvent.click(await screen.findByRole("button", { name: "发布工作流" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Previous validation failure."
  )
  fireEvent.click(screen.getByRole("button", { name: "发布工作流" }))
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "无法发布此工作流，请重试。"
    )
  )
  expect(screen.getByRole("alert")).not.toHaveTextContent(
    "Previous validation failure."
  )
  expect(screen.getByLabelText("Validation errors")).toHaveTextContent("1")
  expect(workflowsPublishWorkflow).toHaveBeenCalledTimes(1)
  warn.mockRestore()
})

test("a transport failure stays in the modal and can be retried", async () => {
  jest
    .mocked(workflowsPublishWorkflow)
    .mockRejectedValue(pushError("publish_required"))
  jest
    .mocked(workflowsCommitWorkflow)
    .mockRejectedValueOnce(new Error("Network unavailable"))
    .mockResolvedValueOnce({
      workflow_id: "synthetic",
      status: "success",
      message: "Published",
    })
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
  renderWorkflow()
  fireEvent.click(screen.getByRole("button", { name: "Push" }))
  fireEvent.click(await screen.findByRole("button", { name: "发布工作流" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "无法发布此工作流，请重试。"
  )
  fireEvent.click(screen.getByRole("button", { name: "发布工作流" }))
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  )
  expect(workflowsCommitWorkflow).toHaveBeenCalledTimes(2)
  expect(workflowsPublishWorkflow).toHaveBeenCalledTimes(1)
  warn.mockRestore()
})

test("a successful saved-version Push does not require another Publish", async () => {
  jest.mocked(workflowsPublishWorkflow).mockResolvedValue({
    status: "no_op",
    branch: "sync/example",
    base_branch: "main",
    message: "无更改",
  })
  renderWorkflow()
  fireEvent.click(screen.getByRole("button", { name: "Push" }))
  await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(workflowsCommitWorkflow).not.toHaveBeenCalled()
})

test("legacy string errors cannot select the prerequisite modal", () => {
  expect(
    isPublishRequired(
      Object.assign(new Error(), {
        body: { detail: "推送到 Git 前，请先发布此工作流。" },
      })
    )
  ).toBe(false)
})

test("workspace explanation is informational and has no confirmation", () => {
  render(<WorkspacePushExplanation />)
  expect(
    screen.getByText(/工作空间推送可直接导出新工作流的当前编辑，无需先发布/)
  ).toBeInTheDocument()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})
