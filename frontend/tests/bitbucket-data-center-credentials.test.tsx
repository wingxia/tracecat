import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BitbucketDataCenterTokenSetup } from "@/components/organization/org-vcs-bitbucket-data-center"

const mockSave = jest.fn()
const mockDelete = jest.fn()
const mockRefetch = jest.fn()
const mockStatus = jest.fn()

jest.mock("@/hooks/use-bitbucket-data-center-credentials", () => ({
  useBitbucketDataCenterTokenCredentialsStatus: () => mockStatus(),
  useBitbucketDataCenterTokenCredentials: () => ({
    saveCredentials: { mutateAsync: mockSave, isPending: false },
  }),
  useDeleteBitbucketDataCenterTokenCredentials: () => ({
    deleteCredentials: { mutateAsync: mockDelete, isPending: false },
  }),
}))
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

describe("Bitbucket Data Center credentials", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSave.mockResolvedValue(undefined)
    mockStatus.mockReturnValue({
      credentialsStatus: { exists: false },
      credentialsStatusIsLoading: false,
      refetchCredentialsStatus: mockRefetch,
    })
  })

  it("saves the instance URL and HTTP access token", async () => {
    const user = userEvent.setup()
    render(<BitbucketDataCenterTokenSetup />)
    await user.click(screen.getByRole("button", { name: "连接" }))
    await user.type(
      screen.getByLabelText("实例 URL"),
      "https://example.test/bitbucket"
    )
    await user.type(screen.getByLabelText("凭据令牌"), "synthetic-token")
    await user.click(screen.getByRole("button", { name: "保存" }))
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({
        base_url: "https://example.test/bitbucket",
        token: "synthetic-token",
      })
    )
    expect(mockRefetch).toHaveBeenCalled()
  })

  it("offers reconnect for corrupt credentials", async () => {
    mockStatus.mockReturnValue({
      credentialsStatus: { exists: true, is_corrupted: true },
      refetchCredentialsStatus: mockRefetch,
    })
    render(<BitbucketDataCenterTokenSetup />)
    expect(screen.getByRole("button", { name: "重新连接" })).toBeInTheDocument()
    expect(
      screen.getByLabelText("删除 Bitbucket Data Center 凭据")
    ).toBeInTheDocument()
  })

  it("shows a status failure without claiming the provider is disconnected", () => {
    mockStatus.mockReturnValue({
      credentialsStatusError: new Error("unavailable"),
      refetchCredentialsStatus: mockRefetch,
    })
    render(<BitbucketDataCenterTokenSetup />)
    expect(
      screen.getByText(/无法加载 Bitbucket Data Center 凭据/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "连接" })
    ).not.toBeInTheDocument()
  })
})
