import { render, screen } from "@testing-library/react"
import { ChatEmptyHero } from "@/components/chat/chat-empty-hero"

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { firstName: "Daryl" } }),
}))

describe("ChatEmptyHero", () => {
  it("renders the primary greeting as a level-one heading", () => {
    render(<ChatEmptyHero>Composer</ChatEmptyHero>)

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Daryl，你想完成什么任务？",
      })
    ).toBeInTheDocument()
  })
})
