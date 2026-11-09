import {
  getWorkspaceSyncResourceLabel,
  WORKSPACE_SYNC_RESOURCE_TYPE_META,
} from "@/components/workspace-sync/resource-metadata"

describe("getWorkspaceSyncResourceLabel", () => {
  it("returns labels for known resource types", () => {
    expect(getWorkspaceSyncResourceLabel("workflow")).toBe("工作流")
  })

  it("preserves unknown resource types that match object prototype keys", () => {
    expect(getWorkspaceSyncResourceLabel("toString")).toBe("toString")
  })

  it("describes table sync as schema-only", () => {
    expect(WORKSPACE_SYNC_RESOURCE_TYPE_META.table.summary).toBe(
      "数据表元数据和列结构"
    )
  })
})
