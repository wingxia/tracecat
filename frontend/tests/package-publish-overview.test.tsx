import { render, screen } from "@testing-library/react"
import type { PullResourceDiff } from "@/client"
import { PackagePublishSummary } from "@/components/workspace-sync/package-publish-overview"

function diff(
  change_type: PullResourceDiff["change_type"],
  title: string
): PullResourceDiff {
  return {
    resource_type: "workflow",
    source_id: title,
    source_path: `workflows/${title}/definition.yml`,
    change_type,
    title,
    diff: "",
  }
}

describe("PackagePublishSummary", () => {
  it("lists what is added, updated and removed by name", () => {
    render(
      <PackagePublishSummary
        compareRef="main"
        diffs={[
          diff("added", "triage"),
          diff("modified", "enrich"),
          diff("deleted", "legacy"),
        ]}
      />
    )

    expect(screen.getByText("已添加到软件包 (1)")).toBeInTheDocument()
    expect(screen.getByText("已在软件包中更新 (1)")).toBeInTheDocument()
    expect(screen.getByText("已从软件包移除 (1)")).toBeInTheDocument()
    expect(screen.getByText("legacy")).toBeInTheDocument()
  })

  it("lists a resource with several changed files once", () => {
    render(
      <PackagePublishSummary
        compareRef="main"
        diffs={[
          diff("modified", "triage"),
          {
            ...diff("added", "triage"),
            source_path: "workflows/triage/layout.yml",
          },
          diff("added", "enrich"),
          {
            ...diff("added", "enrich"),
            source_path: "workflows/enrich/layout.yml",
          },
        ]}
      />
    )

    expect(screen.getByText("已在软件包中更新 (1)")).toBeInTheDocument()
    expect(screen.getByText("已添加到软件包 (1)")).toBeInTheDocument()
    expect(screen.getAllByText("triage")).toHaveLength(1)
    expect(screen.getAllByText("enrich")).toHaveLength(1)
  })

  it("says nothing changes when the branch already matches", () => {
    render(<PackagePublishSummary compareRef="main" diffs={[]} />)

    expect(screen.getByText(/已与所选内容一致/)).toBeInTheDocument()
  })
})
