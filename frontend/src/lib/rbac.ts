import type { ScopeRead } from "@/client"

// Permission levels for resource categories
export type PermissionLevel =
  | "none"
  | "read"
  | "write"
  | "execute"
  | "admin"
  | "mixed"

// Actions included at each permission level (cumulative)
export const LEVEL_ACTIONS: Record<
  Exclude<PermissionLevel, "mixed">,
  string[]
> = {
  none: [],
  read: ["read"],
  write: ["read", "create", "update"],
  // `submit` is how a form is executed: `form:submit`.
  execute: ["read", "execute", "submit"],
  admin: [
    "read",
    "create",
    "update",
    "delete",
    "invite",
    "remove",
    "manage",
    "execute",
    "submit",
  ],
}

// Resource category definitions with display names
export const RESOURCE_CATEGORIES: Record<
  string,
  { label: string; description: string; resources: string[] }
> = {
  workflows: {
    label: "工作流",
    description: "工作流自动化与执行",
    resources: ["workflow", "schedule"],
  },
  forms: {
    label: "表单",
    description: "表单、填写与提交记录",
    resources: ["form"],
  },
  cases: {
    label: "事件",
    description: "事件管理与跟踪",
    resources: ["case"],
  },
  data: {
    label: "数据",
    description: "数据表、标签和变量",
    resources: ["table", "tag", "variable"],
  },
  agents: {
    label: "智能体",
    description: "AI 智能体配置与执行",
    resources: ["agent"],
  },
  secrets: {
    label: "密钥",
    description: "凭据、密钥及网络隧道管理",
    resources: ["secret", "tunnel"],
  },
  integrations: {
    label: "集成",
    description: "OAuth 和 MCP 集成管理",
    resources: ["integration"],
  },
  workspace: {
    label: "工作空间",
    description: "工作空间设置、成员及访问控制",
    resources: ["workspace", "workspace:member", "workspace:rbac"],
  },
  organization: {
    label: "组织",
    description: "组织设置、成员及基于角色的访问控制",
    resources: ["org"],
  },
  actions: {
    label: "动作",
    description: "注册表动作执行权限",
    resources: ["action"],
  },
}

// Display labels for permission levels
export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "无",
  read: "读取",
  write: "写入",
  execute: "执行",
  admin: "管理员",
  mixed: "自定义",
}

function isActionScopeResource(resource: string): boolean {
  return resource === "action" || resource.startsWith("action:")
}

function extractNamespace(value: string): string | null {
  const normalized = value.trim()
  if (!normalized) return null
  const delimiter = [".", "/", ":"].find((separator) =>
    normalized.includes(separator)
  )
  if (!delimiter) return normalized
  return normalized.slice(0, normalized.indexOf(delimiter))
}

function getActionScopeTarget(scope: ScopeRead): string | null {
  const sourceRef = scope.source_ref?.trim()
  if (sourceRef) return sourceRef

  if (scope.resource.startsWith("action:")) {
    const resourceTarget = scope.resource.slice("action:".length).trim()
    if (resourceTarget) return resourceTarget
  }

  if (scope.name.startsWith("action:") && scope.name.endsWith(":execute")) {
    const nameTarget = scope.name.slice("action:".length, -":execute".length)
    if (nameTarget.trim()) return nameTarget.trim()
  }

  return null
}

export function getScopeActionNamespace(scope: ScopeRead): string | null {
  if (!isActionScopeResource(scope.resource)) return null
  const target = getActionScopeTarget(scope)
  if (!target) return null
  return extractNamespace(target)
}

export function getScopeActionLabel(scope: ScopeRead): string {
  if (!isActionScopeResource(scope.resource)) return scope.action

  const namespace = getScopeActionNamespace(scope)
  const target = getActionScopeTarget(scope)
  if (!target || !namespace || target === namespace) {
    return scope.action
  }

  const namespacePrefix = `${namespace}.`
  if (target.startsWith(namespacePrefix)) {
    return target.slice(namespacePrefix.length)
  }
  const colonPrefix = `${namespace}:`
  if (target.startsWith(colonPrefix)) {
    return target.slice(colonPrefix.length)
  }
  const slashPrefix = `${namespace}/`
  if (target.startsWith(slashPrefix)) {
    return target.slice(slashPrefix.length)
  }

  return target
}

/**
 * Get scopes that match a category's resources
 */
export function getCategoryScopes(
  categoryResources: string[],
  scopes: ScopeRead[]
): ScopeRead[] {
  return scopes.filter((s) =>
    categoryResources.some(
      (r) => s.resource === r || s.resource.startsWith(`${r}:`)
    )
  )
}

/**
 * Get scopes that should be selected for a given permission level
 */
export function getScopesForLevel(
  categoryResources: string[],
  scopes: ScopeRead[],
  level: PermissionLevel
): string[] {
  if (level === "none" || level === "mixed") return []

  const categoryScopes = getCategoryScopes(categoryResources, scopes)
  const actionsForLevel = LEVEL_ACTIONS[level as keyof typeof LEVEL_ACTIONS]
  if (!actionsForLevel) return []

  return categoryScopes
    .filter((s) => {
      const action = s.action.split(":")[0]
      return actionsForLevel.includes(action)
    })
    .map((s) => s.id)
}

/**
 * Determine the current permission level for a category based on selected scopes
 * This is the inverse of getScopesForLevel - it checks if selected scopes match a level exactly
 */
export function getCategoryPermissionLevel(
  categoryResources: string[],
  scopes: ScopeRead[],
  selectedScopeIds: Set<string>
): PermissionLevel {
  const categoryScopes = getCategoryScopes(categoryResources, scopes)

  if (categoryScopes.length === 0) return "none"

  const selectedInCategory = categoryScopes.filter((s) =>
    selectedScopeIds.has(s.id)
  )

  if (selectedInCategory.length === 0) return "none"
  if (selectedInCategory.length === categoryScopes.length) return "admin"

  // Check each level by comparing selected scopes to expected scopes for that level
  const selectedCategoryIds = new Set(selectedInCategory.map((s) => s.id))
  const expectedReadScopeIds = new Set(
    getScopesForLevel(categoryResources, scopes, "read")
  )

  for (const level of ["write", "execute", "read"] as const) {
    const expectedScopeIds = new Set(
      getScopesForLevel(categoryResources, scopes, level)
    )
    if (expectedScopeIds.size === 0) continue

    // Skip redundant levels (e.g., categories without any `execute` scopes where
    // `execute` would otherwise match exactly the `read` scope set).
    if (level !== "read") {
      if (
        expectedScopeIds.size === expectedReadScopeIds.size &&
        [...expectedScopeIds].every((id) => expectedReadScopeIds.has(id))
      ) {
        continue
      }
    }

    // Exact match check
    if (
      expectedScopeIds.size === selectedCategoryIds.size &&
      [...expectedScopeIds].every((id) => selectedCategoryIds.has(id))
    ) {
      return level
    }
  }

  return "mixed"
}

/**
 * Group scopes by their resource type
 */
export function groupScopesByResource(
  scopes: ScopeRead[]
): Record<string, ScopeRead[]> {
  return scopes.reduce(
    (acc, scope) => {
      const resource = scope.resource
      if (!acc[resource]) {
        acc[resource] = []
      }
      acc[resource].push(scope)
      return acc
    },
    {} as Record<string, ScopeRead[]>
  )
}

/** Mirrors `is_org_level_role` in tracecat/authz/scopes.py. */
export function isOrgLevelRole(role: { scopes?: ScopeRead[] }): boolean {
  return (role.scopes ?? []).some((scope) => scope.name.startsWith("org:"))
}

/**
 * Roles to offer when editing an assignment. A current role that no longer
 * fits the scope is returned separately so the dialog can still show it.
 */
export function rolesForAssignmentEdit<
  T extends { id: string; scopes?: ScopeRead[] },
>(
  roles: T[],
  workspaceId: string | null,
  currentRoleId: string
): { options: T[]; legacy: T | undefined } {
  const options = rolesForScope(roles, workspaceId)
  const legacy = options.some((role) => role.id === currentRoleId)
    ? undefined
    : roles.find((role) => role.id === currentRoleId)
  return { options, legacy }
}

/** Roles assignable at a scope: org roles only org-wide; workspace roles anywhere. */
export function rolesForScope<T extends { scopes?: ScopeRead[] }>(
  roles: T[],
  workspaceId: string | null
): T[] {
  return workspaceId === null
    ? roles
    : roles.filter((role) => !isOrgLevelRole(role))
}

/** Abbreviate a role name to its uppercased word initials. */
export function abbreviateRoleName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/** Abbreviate a name to its first three non-space characters, uppercased. */
export function abbreviateName(name: string): string {
  return name.replace(/\s+/g, "").slice(0, 3).toUpperCase()
}

/** Map an organization role slug to the tier shown in the members table. */
export function organizationTier(
  roleSlug: string | null | undefined
): "所有者" | "管理员" | "成员" {
  switch (roleSlug) {
    case "organization-owner":
      return "所有者"
    case "organization-admin":
      return "管理员"
    default:
      return "成员"
  }
}
