import Cookies from "js-cookie"
import { AlertTriangleIcon, CircleCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  type ActionLockStatus,
  type ActionRead,
  type ActionsDeleteActionData,
  type ActionUpdate,
  type AgentGetProviderCredentialConfigResponse,
  type AgentGetProvidersStatusResponse,
  type AgentSessionsListSessionsData,
  type AgentSessionsListSessionsResponse,
  type AgentSettingsRead,
  ApiError,
  type AppSettingsRead,
  type AuditSettingsRead,
  type AuditWebhookTestResult,
  type AwsAssumeRoleAccessRead,
  actionsDeleteAction,
  actionsGetAction,
  actionsListActionLockStatuses,
  actionsUpdateAction,
  agentCreateProviderCredentials,
  agentDeleteProviderCredentials,
  agentGetDefaultModel,
  agentGetDefaultModelSelection,
  agentGetProviderCredentialConfig,
  agentGetProvidersStatus,
  agentListProviderCredentialConfigs,
  agentSessionsListSessions,
  agentSetDefaultModel,
  agentUpdateProviderCredentials,
  type CaseBatchDelete,
  type CaseBatchUpdate,
  type CaseCommentCreate,
  type CaseCommentRead,
  type CaseCommentThreadRead,
  type CaseCommentUpdate,
  type CaseCreate,
  type CaseDropdownDefinitionRead,
  type CaseDropdownsAddDropdownOptionData,
  type CaseDropdownsCreateDropdownDefinitionData,
  type CaseDropdownsDeleteDropdownDefinitionData,
  type CaseDropdownsDeleteDropdownOptionData,
  type CaseDropdownsReorderDropdownOptionsData,
  type CaseDropdownsUpdateDropdownDefinitionData,
  type CaseDropdownsUpdateDropdownOptionData,
  type CaseDurationDefinitionRead,
  type CaseDurationRead,
  type CaseEventsWithUsers,
  type CaseFieldReadMinimal,
  type CaseRead,
  type CaseReadMinimal,
  type CasesGetCaseData,
  type CasesListCommentsData,
  type CasesListCommentThreadsData,
  type CasesListTagsData,
  type CasesListTasksData,
  type CasesSearchCasesData,
  type CaseTagCreate,
  type CaseTagRead,
  type CaseTagsCreateCaseTagData,
  type CaseTagsDeleteCaseTagData,
  type CaseTagsUpdateCaseTagData,
  type CaseTaskCreate,
  type CaseTaskRead,
  type CaseTaskUpdate,
  type CaseTriggerCreate,
  type CaseTriggerRead,
  type CaseUpdate,
  type CustomOAuthProviderCreate,
  caseDropdownsAddDropdownOption,
  caseDropdownsCreateDropdownDefinition,
  caseDropdownsDeleteDropdownDefinition,
  caseDropdownsDeleteDropdownOption,
  caseDropdownsListDropdownDefinitions,
  caseDropdownsReorderDropdownOptions,
  caseDropdownsUpdateDropdownDefinition,
  caseDropdownsUpdateDropdownOption,
  casesAddTag,
  casesBatchClearParent,
  casesBatchDeleteCases,
  casesBatchSetParent,
  casesBatchUpdateCases,
  casesCreateCase,
  casesCreateComment,
  casesCreateTask,
  casesDeleteCase,
  casesDeleteComment,
  casesDeleteTask,
  casesListComments,
  casesListCommentThreads,
  casesListEventsWithUsers,
  casesListFields,
  casesListTags,
  casesListTasks,
  casesRemoveTag,
  casesSearchCases,
  casesSetCaseDropdownValue,
  casesUpdateCase,
  casesUpdateComment,
  casesUpdateTask,
  caseTagsCreateCaseTag,
  caseTagsDeleteCaseTag,
  caseTagsListCaseTags,
  caseTagsUpdateCaseTag,
  type DefaultModelSelection,
  type FolderDirectoryItem,
  foldersCreateFolder,
  foldersDeleteFolder,
  foldersGetDirectory,
  foldersListFolders,
  foldersMoveFolder,
  foldersUpdateFolder,
  type GitCommitInfo,
  type GitSettingsRead,
  type GraphOperation,
  type GroupCreate,
  type GroupReadWithMembers,
  // RBAC types and functions
  type GroupRoleAssignmentCreate,
  type GroupRoleAssignmentReadWithDetails,
  type GroupRoleAssignmentUpdate,
  type GroupUpdate,
  getWorkspaceModels,
  graphApplyGraphOperations,
  graphGetGraph,
  type IntegrationRead,
  type IntegrationReadMinimal,
  type IntegrationUpdate,
  type InvitationCreate,
  integrationsConnectProvider,
  integrationsDeleteIntegration,
  integrationsDisconnectIntegration,
  integrationsGetIntegration,
  integrationsListIntegrations,
  integrationsTestConnection,
  integrationsUpdateIntegration,
  invitationsCreateInvitation,
  invitationsResendInvitation,
  invitationsRevokeInvitation,
  type MCPIntegrationCreate,
  type MCPIntegrationRead,
  type MCPIntegrationTestConnectionRequest,
  type MCPIntegrationUpdate,
  type MCPToolPolicyUpdate,
  type McpIntegrationsListMcpIntegrationsData,
  type ModelCredentialCreate,
  type ModelCredentialUpdate,
  mcpIntegrationsConnectMcpIntegration,
  mcpIntegrationsCreateMcpIntegration,
  mcpIntegrationsDeleteMcpIntegration,
  mcpIntegrationsGetMcpIntegration,
  mcpIntegrationsListMcpIntegrations,
  mcpIntegrationsTestMcpConnectionConfig,
  mcpIntegrationsTestMcpIntegrationConnection,
  mcpIntegrationsUpdateMcpIntegration,
  mcpIntegrationsUpdateMcpIntegrationToolPolicies,
  type OAuthGrantType,
  type OrganizationDeleteOrgMemberData,
  type OrganizationDeleteSessionData,
  type OrganizationUpdateOrgMemberData,
  type OrgMemberRead,
  organizationDeleteOrgMember,
  organizationDeleteSession,
  organizationListOrgMembers,
  organizationListSessions,
  organizationSecretsCreateOrgSecret,
  organizationSecretsDeleteOrgSecretById,
  organizationSecretsListOrgSecrets,
  organizationSecretsUpdateOrgSecretById,
  organizationUpdateOrgMember,
  type ProviderCredentialConfig,
  type ProviderRead,
  type ProviderReadMinimal,
  providersCreateCustomProvider,
  providersGetProvider,
  providersListProviders,
  type RegistryActionRead,
  type RegistryActionReadMinimal,
  type RegistryRepositoriesDeleteRegistryRepositoryData,
  type RegistryRepositoriesSyncRegistryRepositoryData,
  type RegistryRepositoryErrorDetail,
  type RegistryRepositoryReadMinimal,
  type RoleCreate,
  type RoleReadWithScopes,
  type RoleUpdate,
  rbacAddGroupMember,
  rbacCreateAssignment,
  rbacCreateGroup,
  rbacCreateRole,
  rbacCreateScope,
  rbacCreateUserAssignment,
  rbacDeleteAssignment,
  rbacDeleteGroup,
  rbacDeleteRole,
  rbacDeleteScope,
  rbacDeleteUserAssignment,
  rbacGetGroup,
  rbacGetRole,
  rbacListAssignments,
  rbacListGroups,
  rbacListRoles,
  rbacListScopes,
  rbacListUserAssignments,
  rbacRemoveGroupMember,
  rbacUpdateAssignment,
  rbacUpdateGroup,
  rbacUpdateRole,
  rbacUpdateUserAssignment,
  registryActionsGetRegistryAction,
  registryActionsListRegistryActions,
  registryRepositoriesDeleteRegistryRepository,
  registryRepositoriesListRegistryRepositories,
  registryRepositoriesListRepositoryCommits,
  registryRepositoriesSyncRegistryRepository,
  type SAMLSettingsRead,
  type ScheduleRead,
  type SchedulesCreateScheduleData,
  type SchedulesDeleteScheduleData,
  type SchedulesUpdateScheduleData,
  type ScopeCreate,
  type ScopeRead,
  type ScopeSource,
  type SecretCreate,
  type SecretDefinition,
  type SecretReadMinimal,
  type SecretUpdate,
  type SessionRead,
  type SettingsTestAuditWebhookData,
  type SettingsUpdateAgentSettingsData,
  type SettingsUpdateAppSettingsData,
  type SettingsUpdateAuditSettingsData,
  type SettingsUpdateGitSettingsData,
  type SettingsUpdateSamlSettingsData,
  schedulesCreateSchedule,
  schedulesDeleteSchedule,
  schedulesListSchedules,
  schedulesUpdateSchedule,
  secretsCreateSecret,
  secretsDeleteSecretById,
  secretsGetAwsAssumeRoleAccess,
  secretsListSecretDefinitions,
  secretsListSecrets,
  secretsUpdateSecretById,
  settingsGetAgentSettings,
  settingsGetAppSettings,
  settingsGetAuditSettings,
  settingsGetGitSettings,
  settingsGetSamlSettings,
  settingsTestAuditWebhook,
  settingsUpdateAgentSettings,
  settingsUpdateAppSettings,
  settingsUpdateAuditSettings,
  settingsUpdateGitSettings,
  settingsUpdateSamlSettings,
  type TableRead,
  type TableReadMinimal,
  type TablesBatchDeleteRowsData,
  type TablesBatchInsertRowsData,
  type TablesBatchUpdateRowsData,
  type TablesCreateColumnData,
  type TablesCreateTableData,
  type TablesCreateTableResponse,
  type TablesDeleteColumnData,
  type TablesDeleteRowData,
  type TablesDeleteTableData,
  type TablesGetTableData,
  type TablesImportCsvData,
  type TablesImportTableFromCsvData,
  type TablesImportTableFromCsvResponse,
  type TablesInsertRowData,
  type TablesListTablesData,
  type TablesUpdateColumnData,
  type TablesUpdateRowData,
  type TablesUpdateTableData,
  type TagRead,
  type TagsCreateTagData,
  type TagsDeleteTagData,
  type TagsUpdateTagData,
  type TriggerType,
  tablesBatchDeleteRows,
  tablesBatchInsertRows,
  tablesBatchUpdateRows,
  tablesCreateColumn,
  tablesCreateTable,
  tablesDeleteColumn,
  tablesDeleteRow,
  tablesDeleteTable,
  tablesGetTable,
  tablesImportCsv,
  tablesImportTableFromCsv,
  tablesInsertRow,
  tablesListTables,
  tablesUpdateColumn,
  tablesUpdateRow,
  tablesUpdateTable,
  tagsCreateTag,
  tagsDeleteTag,
  tagsListTags,
  tagsUpdateTag,
  triggersCreateCaseTrigger,
  triggersDeleteWebhookApiKey,
  triggersGenerateWebhookApiKey,
  triggersGetCaseTrigger,
  triggersRevokeWebhookApiKey,
  triggersUpdateWebhook,
  type UserRoleAssignmentCreate,
  type UserRoleAssignmentReadWithDetails,
  type UserRoleAssignmentUpdate,
  type UserScopesRead,
  type UserUpdate,
  usersGetMyScopes,
  usersUsersPatchCurrentUser,
  type VariableCreate,
  type VariableReadMinimal,
  type VariableUpdate,
  type VcsGetGithubAppCredentialsStatusResponse,
  type VcsGetGithubAppManifestResponse,
  type VcsGetGitlabTokenCredentialsStatusResponse,
  type VcsSaveGithubAppCredentialsData,
  type VcsSaveGithubAppCredentialsResponse,
  type VcsSaveGitlabTokenCredentialsData,
  type VcsSaveGitlabTokenCredentialsResponse,
  variablesCreateVariable,
  variablesDeleteVariableById,
  variablesListVariables,
  variablesUpdateVariableById,
  vcsDeleteGithubAppCredentials,
  vcsDeleteGitlabTokenCredentials,
  vcsGetGithubAppCredentialsStatus,
  vcsGetGithubAppManifest,
  vcsGetGitlabTokenCredentialsStatus,
  vcsSaveGithubAppCredentials,
  vcsSaveGitlabTokenCredentials,
  type WebhookUpdate,
  type WorkflowDirectoryItem,
  type WorkflowExecutionCreate,
  type WorkflowExecutionRead,
  type WorkflowExecutionReadMinimal,
  type WorkflowFolderCreate,
  type WorkflowFolderRead,
  type WorkflowReadMinimal,
  type WorkflowsAddTagData,
  type WorkflowsCreateWorkflowData,
  type WorkflowsListWorkflowRepositoriesResponse,
  type WorkflowsMoveWorkflowToFolderData,
  type WorkflowsRemoveTagData,
  type WorkflowsUpdateWorkflowData,
  type WorkspaceAgentModelListResponse,
  type WorkspaceCreate,
  type WorkspaceReadMinimal,
  type WorkspaceUpdate,
  workflowExecutionsCreateDraftWorkflowExecution,
  workflowExecutionsCreateWorkflowExecution,
  workflowExecutionsGetWorkflowExecution,
  workflowExecutionsGetWorkflowExecutionCompact,
  workflowExecutionsListWorkflowExecutions,
  workflowsAddTag,
  workflowsCreateWorkflow,
  workflowsDeleteWorkflow,
  workflowsListWorkflowRepositories,
  workflowsListWorkflows,
  workflowsMoveWorkflowToFolder,
  workflowsRemoveTag,
  workflowsUpdateWorkflow,
  workspacesCreateWorkspace,
  workspacesDeleteWorkspace,
  workspacesListWorkspaces,
  workspacesUpdateWorkspace,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import {
  markStdioMcpVerificationStarted,
  useStdioMcpVerificationStatus,
} from "@/hooks/use-stdio-mcp-verification-status"
import { type AgentSessionWithStatus, enrichAgentSession } from "@/lib/agents"
import { client as apiClient, getBaseUrl } from "@/lib/api"
import {
  getAuditWebhookTestDescription,
  getAuditWebhookTestTitle,
} from "@/lib/audit-webhook-test"
import {
  listCaseDurationDefinitions,
  listCaseDurations,
} from "@/lib/case-durations"
import {
  CASE_COMMENT_ACTIVE_POLL_INTERVAL_MS,
  caseCommentQueryKeys,
  hasActiveCaseCommentInvocations,
  hasActiveCaseCommentThreadInvocations,
  invalidateCaseCommentQueries,
} from "@/lib/cases/comment-queries"
import { invalidateCaseActivityQueries } from "@/lib/cases/invalidation"
import type { ModelInfo } from "@/lib/chat"
import {
  getApiErrorDetail,
  getMcpOAuthConnectErrorDetail,
  retryHandler,
  sanitizeUrlsInText,
  type TracecatApiError,
} from "@/lib/errors"
import type { WorkflowExecutionReadCompact } from "@/lib/event-history"
import { getPendingStdioMcpVerificationIds } from "@/lib/integrations"
import {
  type Query,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@/lib/query"
import { useWorkspaceId } from "@/providers/workspace-id"

/**
 * Build a react-query `onError` handler that surfaces mutation failures as
 * toasts, mapping 403s to a consistent "Forbidden" message.
 *
 * @param activity Human-readable activity description, e.g. "deleting the action".
 */
function toastMutationError(activity: string) {
  return (error: ApiError) => {
    if (error.status === 403) {
      toast({
        title: "禁止访问",
        description: "你无法执行此操作",
      })
      return
    }
    console.error(`Error ${activity}`, error)
    toast({
      title: `错误 ${activity}`,
      description: `${activity}时出错：${getApiErrorDetail(error)}`,
    })
  }
}

interface AppInfo {
  version: string
  public_app_url: string
  auth_allowed_types: string[]
  saml_enabled: boolean
  saml_enforced: boolean
  ee_multi_tenant: boolean
}

export type WorkspaceSecretListItem = SecretReadMinimal & {
  is_corrupted?: boolean
}

export function useAppInfo(_orgSlug?: string | null) {
  const {
    data: appInfo,
    isLoading: appInfoIsLoading,
    error: appInfoError,
  } = useQuery<AppInfo, Error>({
    queryKey: ["app-info"],
    queryFn: async () => {
      const resp = await fetch(`${getBaseUrl()}/info`)
      try {
        return await resp.json()
      } catch (_error) {
        throw new Error(
          "无法获取身份验证设置，可能是连接 Tracecat API 时出现网络问题。"
        )
      }
    },
  })
  return { appInfo, appInfoIsLoading, appInfoError }
}

export function useAction(
  actionId: string,
  workspaceId: string,
  workflowId: string
) {
  const [isSaving, setIsSaving] = useState(false)
  const queryClient = useQueryClient()
  const {
    data: action,
    isLoading: actionIsLoading,
    error: actionError,
  } = useQuery<ActionRead, Error>({
    enabled: !!workflowId,
    queryKey: ["action", actionId, workflowId],
    queryFn: async ({ queryKey }) => {
      const [, actionId, workflowId] = queryKey as [string, string, string]
      return await actionsGetAction({ workspaceId, actionId, workflowId })
    },
  })
  const { mutateAsync: updateAction } = useMutation({
    mutationFn: async (values: ActionUpdate) => {
      setIsSaving(true)
      return await actionsUpdateAction({
        workspaceId,
        actionId,
        workflowId,
        requestBody: values,
      })
    },
    meta: { suppressErrorToast: false },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["action"],
      })
      queryClient.invalidateQueries({
        queryKey: ["workflow", workflowId],
      })
      queryClient.invalidateQueries({
        queryKey: ["action-lock-status", workspaceId, workflowId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-workflow-references", workspaceId],
      })
      // Add a small delay before clearing the saving state to show feedback
      setTimeout(() => {
        setIsSaving(false)
      }, 1000)
    },
    onError: (error) => {
      console.error("Failed to update action:", error)
      setIsSaving(false)
    },
  })
  return {
    action,
    actionIsLoading,
    actionError,
    updateAction,
    isSaving,
  }
}

/** Refs of locked actions whose locked run no longer exists. */
export function useActionLockStatuses(
  workspaceId: string,
  workflowId: string | null,
  enabled: boolean
) {
  const { data } = useQuery<ActionLockStatus[], Error>({
    queryKey: ["action-lock-status", workspaceId, workflowId],
    queryFn: async () =>
      await actionsListActionLockStatuses({
        workspaceId,
        workflowId: workflowId ?? "",
      }),
    enabled: enabled && Boolean(workspaceId) && Boolean(workflowId),
    staleTime: 60_000,
  })
  const staleLockedRefs = useMemo(
    () =>
      new Set(
        (data ?? []).filter((status) => !status.available).map((s) => s.ref)
      ),
    [data]
  )
  return { staleLockedRefs }
}

export function useDeleteAction() {
  const queryClient = useQueryClient()
  const { mutateAsync: deleteAction } = useMutation({
    mutationFn: async (params: ActionsDeleteActionData) =>
      await actionsDeleteAction(params),
    onSuccess: (_, variables) => {
      const { actionId, workspaceId } = variables
      queryClient.invalidateQueries({
        queryKey: ["actions", actionId, workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-workflow-references", workspaceId],
      })
    },
    onError: toastMutationError("deleting the action"),
  })
  return { deleteAction }
}

type GraphOpParams = {
  baseVersion: number
  operations: GraphOperation[]
}

const structuralGraphOperationTypes = new Set<GraphOperation["type"]>([
  "add_node",
  "update_node",
  "delete_node",
  "add_edge",
  "delete_edge",
])

function shouldSyncGraphCache(operations: GraphOperation[]): boolean {
  return operations.some((operation) =>
    structuralGraphOperationTypes.has(operation.type)
  )
}

/**
 * Hook to fetch graph data for a workflow.
 */
export function useGraph(workspaceId: string, workflowId: string) {
  const query = useQuery({
    queryKey: ["graph", workspaceId, workflowId],
    queryFn: async () => {
      const graph = await graphGetGraph({ workspaceId, workflowId })
      return graph
    },
    enabled: Boolean(workflowId),
  })

  return query
}

/**
 * Hook to apply graph operations with optimistic concurrency.
 * Returns the updated graph on success, allowing the canvas to update state.
 */
export function useGraphOperations(workspaceId: string, workflowId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ baseVersion, operations }: GraphOpParams) =>
      await graphApplyGraphOperations({
        workspaceId,
        workflowId,
        requestBody: {
          base_version: baseVersion,
          operations,
        },
      }),
    onSuccess: (graph, variables) => {
      if (shouldSyncGraphCache(variables.operations)) {
        // Update the graph cache with the latest structural state.
        queryClient.setQueryData(["graph", workspaceId, workflowId], graph)
        queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
        queryClient.invalidateQueries({
          queryKey: ["agent-preset-workflow-references", workspaceId],
        })
      }
    },
    onError: (error) => {
      console.error("Failed to apply graph operations:", error)
    },
  })

  // Helper to refetch graph on 409 conflict
  const refetchGraph = useCallback(async () => {
    const graph = await graphGetGraph({ workspaceId, workflowId })
    queryClient.setQueryData(["graph", workspaceId, workflowId], graph)
    return graph
  }, [workspaceId, workflowId, queryClient])

  return {
    applyGraphOperations: mutation.mutateAsync,
    isPending: mutation.isPending,
    refetchGraph,
  }
}

export function useUpdateWebhook(workspaceId: string, workflowId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (params: WebhookUpdate) =>
      await triggersUpdateWebhook({
        workspaceId,
        workflowId,
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
    },
    onError: (error) => {
      console.error("Failed to update webhook:", error)
      toast({
        title: "更新 Webhook 出错",
        description: "无法更新 Webhook，请重试。",
        variant: "destructive",
      })
    },
  })

  return mutation
}

export function useCaseTrigger(
  workspaceId: string,
  workflowId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<CaseTriggerRead | null, ApiError>({
    queryKey: ["case-trigger", workspaceId, workflowId],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      try {
        return await triggersGetCaseTrigger({ workspaceId, workflowId })
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
  })
}

export function useUpsertCaseTrigger(workspaceId: string, workflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: CaseTriggerCreate) =>
      await triggersCreateCaseTrigger({
        workspaceId,
        workflowId,
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-trigger", workspaceId, workflowId],
      })
    },
    onError: (error) => {
      console.error("Failed to update case trigger:", error)
      queryClient.invalidateQueries({
        queryKey: ["case-trigger", workspaceId, workflowId],
      })
      toast({
        title: "更新事件触发器出错",
        description: "无法更新事件触发器，请重试。",
        variant: "destructive",
      })
    },
  })
}

export function useGenerateWebhookApiKey(
  workspaceId: string,
  workflowId: string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      await triggersGenerateWebhookApiKey({
        workspaceId,
        workflowId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
    },
    onError: (error) => {
      console.error("Failed to generate webhook API key:", error)
      toast({
        title: "生成 API 密钥出错",
        description: "无法生成 API 密钥，请重试。",
      })
    },
  })
}

export function useRevokeWebhookApiKey(
  workspaceId: string,
  workflowId: string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      await triggersRevokeWebhookApiKey({
        workspaceId,
        workflowId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
      toast({
        title: "API 密钥已撤销",
        description: "已成功撤销 Webhook API 密钥。",
      })
    },
    onError: (error) => {
      console.error("Failed to revoke webhook API key:", error)
      toast({
        title: "撤销 API 密钥出错",
        description: "无法撤销 API 密钥，请重试。",
        variant: "destructive",
      })
    },
  })
}

export function useDeleteWebhookApiKey(
  workspaceId: string,
  workflowId: string
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () =>
      await triggersDeleteWebhookApiKey({
        workspaceId,
        workflowId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
      toast({
        title: "已删除 API 密钥",
        description: "已成功移除 Webhook API 密钥。",
      })
    },
    onError: (error) => {
      console.error("Failed to delete webhook API key:", error)
      toast({
        title: "删除 API 密钥出错",
        description: "无法删除 API 密钥，请重试。",
        variant: "destructive",
      })
    },
  })
}

interface WorkflowFilter {
  tag?: string[]
}

interface UseWorkflowManagerOptions {
  listEnabled?: boolean
}

export function useWorkflowManager(
  filter?: WorkflowFilter,
  options: UseWorkflowManagerOptions = {}
) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  const listEnabled = options.listEnabled ?? true
  const normalizedTags =
    filter?.tag && filter.tag.length > 0
      ? [...filter.tag].sort((a, b) => a.localeCompare(b))
      : null

  // List all workflows
  const {
    data: workflows,
    isLoading: workflowsLoading,
    error: workflowsError,
  } = useQuery<WorkflowReadMinimal[], ApiError>({
    enabled: listEnabled,
    queryKey: ["workflows", workspaceId, normalizedTags],
    queryFn: async () => {
      const response = await workflowsListWorkflows({
        workspaceId,
        tag: normalizedTags,
        limit: 0,
      })
      return response.items
    },
    retry: retryHandler,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Create workflow
  const { mutateAsync: createWorkflow } = useMutation({
    mutationFn: async (params: WorkflowsCreateWorkflowData) =>
      await workflowsCreateWorkflow(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      // An imported or duplicated workflow can run a preset.
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-workflow-references", workspaceId],
      })
      toast({
        title: "已创建工作流",
        description: "工作流创建成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "无法创建工作流",
            description: "上传的工作流 YAML / JSON 无效。",
          })
          break
        case 409:
          toast({
            title: "工作流已存在",
            description: "已存在相同 ID 的工作流。",
          })
          break
        default:
          console.error("Failed to create workflow:", error)
          toast({
            title: "创建工作流出错",
            description: getApiErrorDetail(error) ?? "请重试。",
            variant: "destructive",
          })
      }
    },
  })

  // Delete workflow
  const { mutateAsync: deleteWorkflow, isPending: deleteWorkflowIsPending } =
    useMutation({
      mutationFn: async (workflowId: string) =>
        await workflowsDeleteWorkflow({
          workflowId,
          workspaceId,
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workflows"] })
        queryClient.invalidateQueries({ queryKey: ["directory-items"] })
        queryClient.invalidateQueries({
          queryKey: ["agent-preset-workflow-references", workspaceId],
        })
        toast({
          title: "已删除工作流",
          description: "工作流删除成功。",
        })
      },
      onError: (error: TracecatApiError) => {
        switch (error.status) {
          case 400:
            toast({
              title: "无法删除工作流",
              description: getApiErrorDetail(error) ?? "请重试。",
            })
            break
          default:
            console.error("Failed to delete workflow:", error)
            toast({
              title: "删除工作流出错",
              description: getApiErrorDetail(error) ?? "请重试。",
              variant: "destructive",
            })
        }
      },
    })
  // Add tag to workflow
  const { mutateAsync: addWorkflowTag } = useMutation({
    mutationFn: async (params: WorkflowsAddTagData) =>
      await workflowsAddTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to add tag to workflow:", error)
      toast({
        title: "无法向工作流添加标签",
        description: getApiErrorDetail(error) ?? "请重试。",
      })
    },
  })
  // Remove tag from workflow
  const { mutateAsync: removeWorkflowTag } = useMutation({
    mutationFn: async (params: WorkflowsRemoveTagData) =>
      await workflowsRemoveTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to remove tag from workflow:", error)
      toast({
        title: "无法从工作流移除标签",
        description: getApiErrorDetail(error) ?? "请重试。",
      })
    },
  })

  // Move workflow
  const { mutateAsync: moveWorkflow } = useMutation({
    mutationFn: async (params: WorkflowsMoveWorkflowToFolderData) =>
      await workflowsMoveWorkflowToFolder(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to move workflow:", error)
      toast({
        title: "移动工作流出错",
        description: getApiErrorDetail(error) ?? "请重试。",
      })
    },
  })

  // Update workflow
  const { mutateAsync: updateWorkflow, isPending: updateWorkflowIsPending } =
    useMutation({
      mutationFn: async (params: WorkflowsUpdateWorkflowData) =>
        await workflowsUpdateWorkflow(params),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["workflows"] })
        queryClient.invalidateQueries({ queryKey: ["directory-items"] })
        // Keep an already-loaded builder view in step with a dashboard rename.
        queryClient.invalidateQueries({ queryKey: ["workflow"] })
        queryClient.invalidateQueries({
          queryKey: ["agent-preset-workflow-references", workspaceId],
        })
      },
      onError: (error: TracecatApiError) => {
        // Transport failures rethrow a raw error with no `body`, so read the
        // detail defensively; dereferencing it here would throw before the
        // toast renders and leave the user with no feedback at all.
        const detail = getApiErrorDetail(error)
        switch (error.status) {
          case 409:
            // The API returns a specific conflict reason (alias collision vs.
            // a duplicate workflow), so surface it rather than assuming one.
            toast({
              title: "无法更新工作流",
              description: detail ?? "工作流已在其他位置被修改。",
              variant: "destructive",
            })
            break
          default:
            console.error("Failed to update workflow:", error)
            toast({
              title: "更新工作流出错",
              description: detail
                ? `${detail}。请重试。`
                : "无法连接服务器，请重试。",
              variant: "destructive",
            })
        }
      },
    })

  return {
    workflows,
    workflowsLoading,
    workflowsError,
    createWorkflow,
    deleteWorkflow,
    deleteWorkflowIsPending,
    addWorkflowTag,
    removeWorkflowTag,
    moveWorkflow,
    updateWorkflow,
    updateWorkflowIsPending,
  }
}

export function useWorkspaceManager() {
  const queryClient = useQueryClient()
  const router = useRouter()

  // List workspaces
  const {
    data: workspaces,
    error: workspacesError,
    isLoading: workspacesLoading,
  } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => await workspacesListWorkspaces(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: retryHandler,
  })

  // Create workspace
  const { mutateAsync: createWorkspace } = useMutation({
    mutationFn: async (params: WorkspaceCreate) =>
      await workspacesCreateWorkspace({
        requestBody: params,
      }),
    onSuccess: (newWorkspace) => {
      // Optimistically add the new workspace to the cache so it's immediately
      // available in the workspace selector after navigation
      queryClient.setQueryData<WorkspaceReadMinimal[]>(["workspaces"], (old) =>
        old ? [...old, newWorkspace] : [newWorkspace]
      )
      // Still invalidate to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      toast({
        title: "已创建工作空间",
        description: "工作空间创建成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 409:
          console.log(
            "Workspace with this name already exists.",
            error.body.detail
          )
          break
        default:
          console.error("Failed to create workspace:", error)
          toast({
            title: "创建工作空间出错",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
      }
    },
  })

  // Delete workspace
  const { mutateAsync: deleteWorkspace } = useMutation({
    mutationFn: async (workspaceId: string) =>
      await workspacesDeleteWorkspace({
        workspaceId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      router.replace("/workspaces")
      toast({
        title: "已删除工作空间",
        description: "工作空间删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "无法删除工作空间",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
          break
        default:
          console.error("Failed to delete workspace:", error)
          toast({
            title: "删除工作空间出错",
            description: getApiErrorDetail(error) ?? "请重试。",
            variant: "destructive",
          })
      }
    },
  })

  // Cookies
  const getLastWorkspaceId = useCallback(
    () => Cookies.get("__tracecat:workspaces:last-viewed"),
    []
  )
  const setLastWorkspaceId = useCallback((id?: string) => {
    if (!id) {
      Cookies.set("__tracecat:workspaces:last-viewed", "")
      return
    }
    Cookies.set("__tracecat:workspaces:last-viewed", id)
  }, [])
  const clearLastWorkspaceId = useCallback(() => {
    Cookies.remove("__tracecat:workspaces:last-viewed")
  }, [])

  return {
    workspaces,
    workspacesError,
    workspacesLoading,
    createWorkspace,
    deleteWorkspace,
    getLastWorkspaceId,
    setLastWorkspaceId,
    clearLastWorkspaceId,
  }
}

export function useWorkflowExecutions(
  workflowId: string,
  options?: {
    /**
     * Refetch interval in milliseconds
     */
    refetchInterval?: number
  }
) {
  const workspaceId = useWorkspaceId()
  const {
    data: workflowExecutions,
    isLoading: workflowExecutionsIsLoading,
    error: workflowExecutionsError,
  } = useQuery<WorkflowExecutionReadMinimal[], Error>({
    queryKey: ["workflow-executions", workflowId],
    queryFn: async () =>
      await workflowExecutionsListWorkflowExecutions({
        workspaceId,
        workflowId,
      }),
    ...options,
  })
  return {
    workflowExecutions,
    workflowExecutionsIsLoading,
    workflowExecutionsError,
  }
}

export function useWorkflowExecution(
  executionId: string,
  options?: {
    refetchInterval?: number
    enabled?: boolean
  }
) {
  const workspaceId = useWorkspaceId()
  const {
    data: execution,
    isLoading: executionIsLoading,
    error: executionError,
  } = useQuery<WorkflowExecutionRead, ApiError>({
    queryKey: ["workflow-executions", executionId],
    queryFn: async () =>
      await workflowExecutionsGetWorkflowExecution({
        workspaceId,
        executionId: executionId,
      }),
    retry: retryHandler,
    enabled: options?.enabled ?? !!executionId,
    refetchInterval: options?.refetchInterval,
  })
  return {
    execution,
    executionIsLoading,
    executionError,
  }
}

export function useCompactWorkflowExecution(workflowExecutionId?: string) {
  const workspaceId = useWorkspaceId()
  const {
    data: execution,
    isLoading: executionIsLoading,
    error: executionError,
  } = useQuery<WorkflowExecutionReadCompact | null, ApiError>({
    enabled: !!workflowExecutionId,
    queryKey: ["compact-workflow-execution", workflowExecutionId],
    queryFn: async () => {
      if (!workflowExecutionId) return null
      return await workflowExecutionsGetWorkflowExecutionCompact({
        workspaceId,
        executionId: workflowExecutionId,
      })
    },
    // Add retry logic for potential 404s when the execution hasn't been fully registered
    retry: (failureCount, error) => error?.status === 404 && failureCount < 10,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    // Use more dynamic polling interval based on execution status
    refetchInterval: (query) => {
      // If we don't have data yet, poll more frequently
      // if (!query.state.data) {
      //   return 1000
      // }

      // Adjust polling based on workflow status
      switch (query.state.data?.status) {
        case "RUNNING":
          return 1000
        default:
          return false
      }
    },
    // Don't cache stale data in this context
    // staleTime: 0,
  })

  return {
    execution,
    executionIsLoading,
    executionError,
  }
}

export function useCreateManualWorkflowExecution(workflowId: string) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()

  const {
    mutateAsync: createExecution,
    isPending: createExecutionIsPending,
    error: createExecutionError,
  } = useMutation({
    mutationFn: async (params: WorkflowExecutionCreate) => {
      return await workflowExecutionsCreateWorkflowExecution({
        workspaceId,
        requestBody: params,
      })
    },
    onSuccess: async ({ wf_exec_id, message }) => {
      toast({
        title: "工作流已开始运行",
        description: `${wf_exec_id} ${message}`,
      })

      // Still invalidate queries for compatibility with other components
      await queryClient.refetchQueries({
        queryKey: ["last-manual-execution"],
      })
      await queryClient.refetchQueries({
        queryKey: ["last-manual-execution", workflowId],
      })
      await queryClient.refetchQueries({
        queryKey: ["compact-workflow-execution"],
      })
      await queryClient.refetchQueries({
        queryKey: ["compact-workflow-execution", wf_exec_id],
      })
      await queryClient.invalidateQueries({
        queryKey: ["case-task-workflow-runs"],
      })
    },
    onError: (error: TracecatApiError<Record<string, string>>) => {
      switch (error.status) {
        case 400:
          console.error("Invalid workflow trigger inputs", error)
          return toast({
            title: "工作流触发器输入无效",
            description: "请悬停在运行按钮上查看详情。",
          })
        default:
          console.error("Unexpected error starting workflow", error)
          return toast({
            title: "启动工作流时发生意外错误",
            description: "请查看运行日志获取更多信息",
          })
      }
    },
  })

  return {
    createExecution,
    createExecutionIsPending,
    createExecutionError,
  }
}

export function useCreateDraftWorkflowExecution(workflowId: string) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()

  const {
    mutateAsync: createDraftExecution,
    isPending: createDraftExecutionIsPending,
    error: createDraftExecutionError,
  } = useMutation({
    mutationFn: async (params: WorkflowExecutionCreate) => {
      return await workflowExecutionsCreateDraftWorkflowExecution({
        workspaceId,
        requestBody: params,
      })
    },
    onSuccess: async ({ wf_exec_id, message }) => {
      toast({
        title: "工作流草稿已开始运行",
        description: `${wf_exec_id} ${message}`,
      })

      // Still invalidate queries for compatibility with other components
      await queryClient.refetchQueries({
        queryKey: ["last-manual-execution"],
      })
      await queryClient.refetchQueries({
        queryKey: ["last-manual-execution", workflowId],
      })
      await queryClient.refetchQueries({
        queryKey: ["compact-workflow-execution"],
      })
      await queryClient.refetchQueries({
        queryKey: ["compact-workflow-execution", wf_exec_id],
      })
    },
    onError: (error: TracecatApiError<Record<string, string>>) => {
      switch (error.status) {
        case 400:
          console.error("Workflow validation failed", error)
          return toast({
            title: "工作流校验失败，存在 1 个错误",
            description: "请悬停在运行按钮上查看错误。",
          })
        default:
          console.error("Unexpected error starting draft workflow", error)
          return toast({
            title: "启动工作流草稿时发生意外错误",
            description: "请查看运行日志获取更多信息",
          })
      }
    },
  })

  return {
    createDraftExecution,
    createDraftExecutionIsPending,
    createDraftExecutionError,
  }
}

export function useLastExecution({
  workflowId,
  triggerTypes,
  refetchInterval,
}: {
  workflowId?: string | null
  triggerTypes: TriggerType[]
  /**
   * When set, poll the latest-execution list on this interval (ms) so runs
   * started outside this view -- e.g. by a chat agent's `core.workflow.execute`
   * -- are discovered without an explicit invalidation. Background polling is
   * disabled, so the query only refetches while the tab is focused.
   */
  refetchInterval?: number
}) {
  const workspaceId = useWorkspaceId()
  const {
    data: lastExecution,
    isLoading: lastExecutionIsLoading,
    error: lastExecutionError,
  } = useQuery<WorkflowExecutionReadMinimal | null, TracecatApiError>({
    enabled: !!workflowId,
    queryKey: ["last-execution", workflowId, triggerTypes?.sort().join(",")],
    queryFn: async () => {
      const executions = await workflowExecutionsListWorkflowExecutions({
        workspaceId,
        workflowId,
        limit: 1,
        userId: "current",
        trigger: triggerTypes,
      })

      return executions.length > 0 ? executions[0] : null
    },
    refetchInterval,
    refetchIntervalInBackground: false,
  })

  return {
    lastExecution,
    lastExecutionIsLoading,
    lastExecutionError,
  }
}

export function useSchedules(workflowId: string) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  // Fetch schedules
  const {
    data: schedules,
    isLoading,
    error,
  } = useQuery<ScheduleRead[], Error>({
    queryKey: [workflowId, "schedules"],
    queryFn: async ({ queryKey }) => {
      const [workflowId] = queryKey as [string, string]
      return await schedulesListSchedules({
        workspaceId,
        workflowId,
      })
    },
  })

  // Create schedules
  const { mutateAsync: createSchedule } = useMutation({
    mutationFn: async (values: SchedulesCreateScheduleData) =>
      await schedulesCreateSchedule(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [workflowId, "schedules"] })
      toast({
        title: "已创建定时计划",
        description: "定时计划创建成功。",
      })
    },
    onError: (error) => {
      console.error("Failed to create schedule:", error)
      toast({
        title: "创建定时计划出错",
        description: "无法创建定时计划，请重试。",
        variant: "destructive",
      })
    },
  })
  // Update schedules
  const { mutateAsync: updateSchedule } = useMutation({
    mutationFn: async (values: SchedulesUpdateScheduleData) =>
      await schedulesUpdateSchedule(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [workflowId, "schedules"] })
      toast({
        title: "已更新定时计划",
        description: "定时计划更新成功。",
      })
    },
    onError: (error) => {
      console.error("Failed to update webhook:", error)
      toast({
        title: "更新定时计划出错",
        description: "无法更新定时计划，请重试。",
        variant: "destructive",
      })
    },
  })

  // Delete schedule
  const { mutateAsync: deleteSchedule } = useMutation({
    mutationFn: async (values: SchedulesDeleteScheduleData) =>
      await schedulesDeleteSchedule(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [workflowId, "schedules"] })
      toast({
        title: "已删除定时计划",
        description: "定时计划删除成功。",
      })
    },
    onError: (error) => {
      console.error("Failed to delete schedule:", error)
      toast({
        title: "删除定时计划出错",
        description: "无法删除定时计划，请重试。",
        variant: "destructive",
      })
    },
  })

  return {
    schedules,
    schedulesIsLoading: isLoading,
    schedulesError: error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  }
}

export function useWorkspaceSecrets(
  workspaceId: string,
  options: { listEnabled?: boolean } = {}
) {
  const queryClient = useQueryClient()
  const listEnabled = options.listEnabled ?? true
  const {
    data: secrets,
    isLoading: secretsIsLoading,
    error: secretsError,
  } = useQuery<WorkspaceSecretListItem[], ApiError>({
    queryKey: ["workspace-secrets", workspaceId],
    queryFn: async () =>
      await secretsListSecrets({
        workspaceId,
        type: ["custom", "ssh_key", "mtls", "ca_cert"],
      }),
    enabled: !!workspaceId && listEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Create secret
  const { mutateAsync: createSecret } = useMutation({
    mutationFn: async (secret: SecretCreate) =>
      await secretsCreateSecret({
        workspaceId,
        requestBody: secret,
      }),
    onSuccess: () => {
      toast({
        title: "已添加新密钥",
        description: "新密钥添加成功。",
      })
      queryClient.invalidateQueries({
        queryKey: ["workspace-secrets", workspaceId],
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法在此工作空间中创建密钥。",
          })
        case 409:
          return toast({
            title: "密钥已存在",
            description: "不支持名称和环境均相同的密钥。",
          })
        default:
          console.error("Failed to create secret", error)
          return toast({
            title: "添加新密钥失败",
            description: "请检查密钥格式后重试。",
          })
      }
    },
  })

  // Update secret
  const { mutateAsync: updateSecretById } = useMutation({
    mutationFn: async ({
      secretId,
      params,
    }: {
      secretId: string
      params: SecretUpdate
    }) =>
      await secretsUpdateSecretById({
        workspaceId,
        secretId,
        requestBody: params,
      }),
    onSuccess: () => {
      toast({
        title: "已更新密钥",
        description: "密钥更新成功。",
      })
      queryClient.invalidateQueries({
        queryKey: ["workspace-secrets", workspaceId],
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法更新此工作空间中的密钥。",
          })
        default:
          console.error("Failed to update secret", error)
          return toast({
            title: "更新密钥失败",
            description: "更新密钥时出错。",
          })
      }
    },
  })

  // Delete secret
  const { mutateAsync: deleteSecretById } = useMutation({
    mutationFn: async (secret: WorkspaceSecretListItem) =>
      await secretsDeleteSecretById({ workspaceId, secretId: secret.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-secrets", workspaceId],
      })
      toast({
        title: "已删除密钥",
        description: "密钥删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法删除此工作空间中的密钥。",
          })
        default:
          console.error("Failed to delete secret", error)
          return toast({
            title: "删除密钥失败",
            description: "删除密钥时出错。",
          })
      }
    },
  })

  return {
    secrets,
    secretsIsLoading,
    secretsError,
    createSecret,
    updateSecretById,
    deleteSecretById,
  }
}

export function useSecretDefinitions(workspaceId: string) {
  const {
    data: secretDefinitions,
    isLoading: secretDefinitionsIsLoading,
    error: secretDefinitionsError,
  } = useQuery<SecretDefinition[], ApiError>({
    queryKey: ["secret-definitions", workspaceId],
    queryFn: async () => await secretsListSecretDefinitions({ workspaceId }),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    secretDefinitions,
    secretDefinitionsIsLoading,
    secretDefinitionsError,
  }
}

export function useAwsAssumeRoleAccess(
  workspaceId: string,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true
  const {
    data: awsAssumeRoleAccess,
    isLoading: awsAssumeRoleAccessIsLoading,
    error: awsAssumeRoleAccessError,
  } = useQuery<AwsAssumeRoleAccessRead, ApiError>({
    queryKey: ["aws-assume-role-access", workspaceId],
    queryFn: async () => await secretsGetAwsAssumeRoleAccess({ workspaceId }),
    enabled: !!workspaceId && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    awsAssumeRoleAccess,
    awsAssumeRoleAccessIsLoading,
    awsAssumeRoleAccessError,
  }
}

export function useWorkspaceVariables(
  workspaceId: string,
  options: { listEnabled?: boolean } = {}
) {
  const queryClient = useQueryClient()
  const listEnabled = options.listEnabled ?? true
  const {
    data: variables,
    isLoading: variablesIsLoading,
    error: variablesError,
  } = useQuery<VariableReadMinimal[], ApiError>({
    queryKey: ["workspace-variables", workspaceId],
    queryFn: async () =>
      await variablesListVariables({
        workspaceId,
      }),
    enabled: !!workspaceId && listEnabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Create variable
  const { mutateAsync: createVariable } = useMutation({
    mutationFn: async (variable: VariableCreate) =>
      await variablesCreateVariable({
        workspaceId,
        requestBody: variable,
      }),
    onSuccess: () => {
      toast({
        title: "已添加新变量",
        description: "新变量添加成功。",
      })
      queryClient.invalidateQueries({
        queryKey: ["workspace-variables", workspaceId],
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法在此工作空间中创建变量。",
          })
        case 409:
          return toast({
            title: "变量已存在",
            description: "不支持名称和环境均相同的变量。",
          })
        default:
          console.error("Failed to create variable", error)
          return toast({
            title: "添加新变量失败",
            description: "请联系支持团队获取帮助。",
          })
      }
    },
  })

  // Update variable
  const { mutateAsync: updateVariableById } = useMutation({
    mutationFn: async ({
      variableId,
      params,
    }: {
      variableId: string
      params: VariableUpdate
    }) =>
      await variablesUpdateVariableById({
        workspaceId,
        variableId,
        requestBody: params,
      }),
    onSuccess: () => {
      toast({
        title: "已更新变量",
        description: "变量更新成功。",
      })
      queryClient.invalidateQueries({
        queryKey: ["workspace-variables", workspaceId],
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法更新此工作空间中的变量。",
          })
        default:
          console.error("Failed to update variable", error)
          return toast({
            title: "更新变量失败",
            description: "更新变量时出错。",
          })
      }
    },
  })

  // Delete variable
  const { mutateAsync: deleteVariableById } = useMutation({
    mutationFn: async (variable: VariableReadMinimal) =>
      await variablesDeleteVariableById({
        workspaceId,
        variableId: variable.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-variables", workspaceId],
      })
      toast({
        title: "已删除变量",
        description: "变量删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法删除此工作空间中的变量。",
          })
        default:
          console.error("Failed to delete variable", error)
          return toast({
            title: "删除变量失败",
            description: "删除变量时出错。",
          })
      }
    },
  })

  return {
    variables,
    variablesIsLoading,
    variablesError,
    createVariable,
    updateVariableById,
    deleteVariableById,
  }
}

export function useOrgSecrets() {
  const queryClient = useQueryClient()
  // list custom secrets
  const {
    data: orgSecrets,
    isLoading: orgSecretsIsLoading,
    error: orgSecretsError,
  } = useQuery<SecretReadMinimal[]>({
    queryKey: ["org-custom-secrets"],
    queryFn: async () =>
      await organizationSecretsListOrgSecrets({
        type: ["custom"],
      }),
  })

  // list ssh keys
  const {
    data: orgSSHKeys,
    isLoading: orgSSHKeysIsLoading,
    error: orgSSHKeysError,
  } = useQuery<SecretReadMinimal[]>({
    queryKey: ["org-ssh-keys"],
    queryFn: async () =>
      await organizationSecretsListOrgSecrets({
        type: ["ssh_key"],
      }),
  })

  // create
  const { mutateAsync: createSecret } = useMutation({
    mutationFn: async (params: SecretCreate) =>
      await organizationSecretsCreateOrgSecret({ requestBody: params }),
    onSuccess: (_, variables) => {
      switch (variables.type) {
        case "ssh_key":
          queryClient.invalidateQueries({ queryKey: ["org-ssh-keys"] })
          toast({
            title: "已创建密钥",
            description: "SSH 密钥创建成功。",
          })
          break
        default:
          queryClient.invalidateQueries({ queryKey: ["org-custom-secrets"] })
          toast({
            title: "已创建密钥",
            description: "密钥创建成功。",
          })
          break
      }
    },
  })
  // update
  const { mutateAsync: updateSecretById } = useMutation({
    mutationFn: async ({
      secretId,
      params,
    }: {
      secretId: string
      params: SecretUpdate
    }) =>
      await organizationSecretsUpdateOrgSecretById({
        secretId,
        requestBody: params,
      }),
    onSuccess: (_, variables) => {
      switch (variables.params.type) {
        case "ssh_key":
          queryClient.invalidateQueries({ queryKey: ["org-ssh-keys"] })
          toast({
            title: "已更新密钥",
            description: "SSH 密钥更新成功。",
          })
          break
        default:
          queryClient.invalidateQueries({ queryKey: ["org-custom-secrets"] })
          toast({
            title: "已更新密钥",
            description: "密钥更新成功。",
          })
          break
      }
    },
  })
  // delete
  const { mutateAsync: deleteSecretById } = useMutation({
    mutationFn: async (secret: SecretReadMinimal) =>
      await organizationSecretsDeleteOrgSecretById({ secretId: secret.id }),
    onSuccess: (_, variables) => {
      switch (variables.type) {
        case "ssh_key":
          queryClient.invalidateQueries({ queryKey: ["org-ssh-keys"] })
          toast({
            title: "已删除密钥",
            description: "SSH 密钥删除成功。",
          })
          break
        default:
          queryClient.invalidateQueries({ queryKey: ["org-custom-secrets"] })
          toast({
            title: "已删除密钥",
            description: "密钥删除成功。",
          })
          break
      }
    },
  })

  return {
    orgSecrets,
    orgSecretsIsLoading,
    orgSecretsError,
    createSecret,
    updateSecretById,
    deleteSecretById,
    orgSSHKeys,
    orgSSHKeysIsLoading,
    orgSSHKeysError,
  }
}

export function useUserManager() {
  const queryClient = useQueryClient()
  const {
    isPending: updateCurrentUserPending,
    mutateAsync: updateCurrentUser,
  } = useMutation({
    mutationFn: async (params: UserUpdate) =>
      await usersUsersPatchCurrentUser({
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] })
      queryClient.invalidateQueries({ queryKey: ["auth"] })
      toast({
        title: "已更新用户",
        description: "用户更新成功。",
      })
    },
    onError: (error: ApiError) => {
      switch (error.status) {
        case 400:
          console.error("User with email already exists", error)
          toast({
            title: "此邮箱对应的用户已存在",
            description: "已存在使用此邮箱的用户。",
          })
          break
        default:
          console.error("Failed to update user", error)
          toast({
            title: "更新用户失败",
            description: "更新用户时出错。",
          })
      }
    },
  })
  return {
    updateCurrentUser,
    updateCurrentUserPending,
  }
}

/* Registry Actions */
// For selector node
interface UseBuilderRegistryActionsOptions {
  versions?: string[]
  includeLocked?: boolean
}

export function useBuilderRegistryActions(
  options?: UseBuilderRegistryActionsOptions
) {
  const {
    data: registryActions,
    isLoading: registryActionsIsLoading,
    error: registryActionsError,
  } = useQuery<RegistryActionReadMinimal[]>({
    queryKey: [
      "builder_registry_actions",
      options?.versions,
      options?.includeLocked,
    ],
    queryFn: async () => {
      return await registryActionsListRegistryActions(
        options?.includeLocked ? { includeLocked: true } : {}
      )
    },
  })

  const getRegistryAction = (
    key: string
  ): RegistryActionReadMinimal | undefined => {
    return registryActions?.find((action) => action.action === key)
  }

  return {
    registryActions,
    registryActionsIsLoading,
    registryActionsError,
    getRegistryAction,
  }
}

export function useGetRegistryAction(actionName?: string) {
  const {
    data: registryAction,
    isLoading: registryActionIsLoading,
    error: registryActionError,
  } = useQuery<RegistryActionRead | undefined, ApiError>({
    queryKey: ["registry_action", actionName],
    queryFn: async () => {
      if (!actionName) {
        return undefined
      }
      return await registryActionsGetRegistryAction({
        actionName,
      })
    },
    retry: retryHandler,
    enabled: !!actionName,
  })

  return { registryAction, registryActionIsLoading, registryActionError }
}

// For selector node
interface UseRegistryActionsOptions {
  staleTime?: number
  versions?: string[]
  includeLocked?: boolean
}

export function useRegistryActions(options?: UseRegistryActionsOptions) {
  const {
    data: registryActions,
    isLoading: registryActionsIsLoading,
    error: registryActionsError,
  } = useQuery<RegistryActionReadMinimal[]>({
    queryKey: ["registry_actions", options?.versions, options?.includeLocked],
    staleTime: options?.staleTime,
    queryFn: async () => {
      return await registryActionsListRegistryActions({
        includeLocked: options?.includeLocked,
      })
    },
  })

  return {
    registryActions,
    registryActionsIsLoading,
    registryActionsError,
  }
}

export function useRegistryRepositories() {
  const queryClient = useQueryClient()
  const {
    data: repos,
    isLoading: reposIsLoading,
    error: reposError,
  } = useQuery<RegistryRepositoryReadMinimal[]>({
    queryKey: ["registry_repositories"],
    queryFn: async () => await registryRepositoriesListRegistryRepositories(),
  })

  const {
    mutateAsync: syncRepo,
    isPending: syncRepoIsPending,
    error: syncRepoError,
  } = useMutation({
    mutationFn: async (
      params: RegistryRepositoriesSyncRegistryRepositoryData
    ) => await registryRepositoriesSyncRegistryRepository(params),
    onSuccess: (_, { repositoryId }) => {
      queryClient.invalidateQueries({
        queryKey: ["registry_repositories"],
      })
      queryClient.invalidateQueries({
        queryKey: ["registry_actions"],
      })
      queryClient.invalidateQueries({
        queryKey: ["registry_versions", repositoryId],
      })
      // Scoped to this repository so workspace-sync commit queries, which
      // share the prefix, are left alone.
      queryClient.invalidateQueries({
        queryKey: ["repository_commits", repositoryId],
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          return toast({
            title: "无法同步仓库",
            description: (
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="size-4 fill-rose-600 stroke-white" />
                <span>{getApiErrorDetail(error) ?? "请重试。"}</span>
              </div>
            ),
          })
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无权执行此操作",
          })
        case 422: {
          const { message } = error.body.detail as RegistryRepositoryErrorDetail
          return toast({
            title: "仓库校验失败",
            description: (
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="size-4 fill-rose-600 stroke-white" />
                <span>{message}</span>
              </div>
            ),
          })
        }
        default:
          return toast({
            title: "同步仓库时发生意外错误",
            description: (
              <div className="flex items-start gap-2">
                <AlertTriangleIcon className="size-4 fill-rose-600 stroke-white" />
                <span>{error.message}</span>
                <span>{getApiErrorDetail(error) ?? "请重试。"}</span>
              </div>
            ),
          })
      }
    },
  })

  const {
    mutateAsync: deleteRepo,
    isPending: deleteRepoIsPending,
    error: deleteRepoError,
  } = useMutation({
    mutationFn: async (
      params: RegistryRepositoriesDeleteRegistryRepositoryData
    ) => await registryRepositoriesDeleteRegistryRepository(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry_repositories"] })
      queryClient.invalidateQueries({ queryKey: ["registry_actions"] })
      toast({
        title: "已删除注册表仓库",
        description: "注册表仓库删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      const apiError = error as TracecatApiError
      switch (apiError.status) {
        case 403:
          toast({
            title: "你无法执行此操作",
            description: `${apiError.message}: ${getApiErrorDetail(apiError) ?? "请重试。"}`,
          })
          break
        default:
          toast({
            title: "删除注册表仓库失败",
            description: `删除注册表仓库时发生意外错误。${apiError.message}：${getApiErrorDetail(apiError) ?? "请重试。"}`,
          })
      }
    },
  })

  return {
    repos,
    reposIsLoading,
    reposError,
    syncRepo,
    syncRepoIsPending,
    syncRepoError,
    deleteRepo,
    deleteRepoIsPending,
    deleteRepoError,
  }
}

export function useRepositoryCommits(
  repositoryId: string | null,
  options?: {
    branch?: string
    limit?: number
    enabled?: boolean
  }
) {
  const {
    data: commits,
    isLoading: commitsIsLoading,
    error: commitsError,
  } = useQuery<GitCommitInfo[]>({
    queryKey: [
      "repository_commits",
      repositoryId,
      options?.branch ?? "main",
      options?.limit ?? 50,
    ],
    queryFn: async () => {
      if (!repositoryId) {
        throw new Error("Repository ID is required")
      }
      return await registryRepositoriesListRepositoryCommits({
        repositoryId,
        branch: options?.branch || "main",
        limit: options?.limit || 50,
      })
    },
    enabled: options?.enabled !== false && !!repositoryId,
    // Listing commits shells out to git; callers render the failure inline.
    retry: false,
    meta: { suppressErrorToast: true },
  })

  return {
    commits,
    commitsIsLoading,
    commitsError,
  }
}

export function useOrgMembers() {
  const queryClient = useQueryClient()
  const {
    data: orgMembers,
    isLoading: orgMembersIsLoading,
    error: orgMembersError,
  } = useQuery<OrgMemberRead[]>({
    queryKey: ["org-members"],
    queryFn: async () => await organizationListOrgMembers(),
  })

  const {
    mutateAsync: updateOrgMember,
    isPending: updateOrgMemberIsPending,
    error: updateOrgMemberError,
  } = useMutation({
    mutationFn: async (params: OrganizationUpdateOrgMemberData) =>
      await organizationUpdateOrgMember(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已更新组织成员",
        description: "组织成员更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      const apiError = error as TracecatApiError
      switch (apiError.status) {
        case 403:
          toast({
            title: "你无法执行此操作",
            description: `${apiError.message}: ${getApiErrorDetail(apiError) ?? "请重试。"}`,
          })
          break
        default:
          toast({
            title: "更新组织成员失败",
            description: `更新组织成员时发生意外错误。${apiError.message}：${getApiErrorDetail(apiError) ?? "请重试。"}`,
          })
      }
    },
  })

  const {
    mutateAsync: deleteOrgMember,
    isPending: deleteOrgMemberIsPending,
    error: deleteOrgMemberError,
  } = useMutation({
    mutationFn: async (params: OrganizationDeleteOrgMemberData) =>
      await organizationDeleteOrgMember(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      toast({
        title: "已移除组织成员",
        description: "已移除组织访问权限并撤销会话。",
      })
    },
    onError: (error: TracecatApiError) => {
      const apiError = error as TracecatApiError
      switch (apiError.status) {
        case 403:
          toast({
            title: "你无法执行此操作",
            description: `${apiError.message}: ${getApiErrorDetail(apiError) ?? "请重试。"}`,
          })
          break
        default:
          toast({
            title: "删除组织成员失败",
            description: `删除组织成员时发生意外错误。${apiError.message}：${getApiErrorDetail(apiError) ?? "请重试。"}`,
          })
      }
    },
  })

  const {
    mutateAsync: createInvitation,
    isPending: createInvitationIsPending,
  } = useMutation({
    mutationFn: async (params: InvitationCreate) =>
      await invitationsCreateInvitation({ requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      queryClient.invalidateQueries({
        queryKey: ["org-invitations", "pending"],
      })
      toast({
        title: "已创建邀请",
        description: "邀请发送成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      const apiError = error as TracecatApiError
      const detail = apiError.body?.detail
      toast({
        title: "创建邀请失败",
        description: typeof detail === "string" ? detail : apiError.message,
        variant: "destructive",
      })
    },
  })

  const { mutateAsync: revokeInvitation } = useMutation({
    mutationFn: async (invitationId: string) =>
      await invitationsRevokeInvitation({ invitationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      queryClient.invalidateQueries({
        queryKey: ["org-invitations", "pending"],
      })
      toast({
        title: "邀请已撤销",
        description: "邀请已撤销。",
      })
    },
    onError: (error: TracecatApiError) => {
      const apiError = error as TracecatApiError
      const detail = apiError.body?.detail
      toast({
        title: "撤销邀请失败",
        description: typeof detail === "string" ? detail : apiError.message,
        variant: "destructive",
      })
    },
  })

  const {
    mutateAsync: resendInvitation,
    isPending: resendInvitationIsPending,
  } = useMutation({
    mutationFn: async (invitationId: string) =>
      await invitationsResendInvitation({ invitationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
    },
    // Callers toast on the awaited result, including the 409 cooldown.
    meta: { suppressErrorToast: true },
  })

  return {
    orgMembers,
    orgMembersIsLoading,
    orgMembersError,
    updateOrgMember,
    updateOrgMemberIsPending,
    updateOrgMemberError,
    deleteOrgMember,
    deleteOrgMemberIsPending,
    deleteOrgMemberError,
    createInvitation,
    createInvitationIsPending,
    revokeInvitation,
    resendInvitation,
    resendInvitationIsPending,
  }
}

export function useSessions() {
  const queryClient = useQueryClient()
  // List
  const {
    data: sessions,
    isLoading: sessionsIsLoading,
    error: sessionsError,
  } = useQuery<SessionRead[]>({
    queryKey: ["sessions"],
    queryFn: async () => await organizationListSessions(),
  })

  // Delete
  const {
    mutateAsync: deleteSession,
    isPending: deleteSessionIsPending,
    error: deleteSessionError,
  } = useMutation({
    mutationFn: async (params: OrganizationDeleteSessionData) =>
      await organizationDeleteSession(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      toast({
        title: "已撤销会话",
        description: "会话撤销成功。",
      })
    },
  })

  return {
    sessions,
    sessionsIsLoading,
    sessionsError,
    deleteSession,
    deleteSessionIsPending,
    deleteSessionError,
  }
}

export function useWorkflowTags(
  workspaceId: string,
  options: { enabled: boolean } = { enabled: true }
) {
  const queryClient = useQueryClient()

  // List tags
  const {
    data: tags,
    isLoading: tagsIsLoading,
    error: tagsError,
  } = useQuery<TagRead[]>({
    queryKey: ["tags", workspaceId],
    queryFn: async () => await tagsListTags({ workspaceId }),
    enabled: options.enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Create tag
  const {
    mutateAsync: createTag,
    isPending: createTagIsPending,
    error: createTagError,
  } = useMutation({
    mutationFn: async (params: TagsCreateTagData) =>
      await tagsCreateTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] })
      toast({
        title: "已创建标签",
        description: (
          <div className="flex items-center space-x-2">
            <CircleCheck className="size-4 fill-emerald-500 stroke-white" />
            <span>标签创建成功。</span>
          </div>
        ),
      })
    },

    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          console.error("Error creating tag", error)
          toast({
            title: "创建标签出错",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
          break
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to create tag", error)
          toast({
            title: "创建标签失败",
            description: `创建标签时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  // Update tag
  const {
    mutateAsync: updateTag,
    isPending: updateTagIsPending,
    error: updateTagError,
  } = useMutation({
    mutationFn: async (params: TagsUpdateTagData) =>
      await tagsUpdateTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      toast({
        title: "已更新标签",
        description: "标签更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          console.error("Error updating tag", error)
          toast({
            title: "更新标签出错",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
          break
      }
    },
  })

  // Delete tag
  const {
    mutateAsync: deleteTag,
    isPending: deleteTagIsPending,
    error: deleteTagError,
  } = useMutation({
    mutationFn: async (params: TagsDeleteTagData) =>
      await tagsDeleteTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      toast({
        title: "已删除标签",
        description: "标签删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
      }
    },
  })

  return {
    // List
    tags,
    tagsIsLoading,
    tagsError,
    // Create
    createTag,
    createTagIsPending,
    createTagError,
    // Update
    updateTag,
    updateTagIsPending,
    updateTagError,
    // Delete
    deleteTag,
    deleteTagIsPending,
    deleteTagError,
  }
}

export function useCaseTagCatalog(
  workspaceId: string,
  options: { enabled: boolean } = { enabled: true }
) {
  const queryClient = useQueryClient()

  const {
    data: caseTags,
    isLoading: caseTagsIsLoading,
    error: caseTagsError,
  } = useQuery<CaseTagRead[]>({
    queryKey: ["case-tag-catalog", workspaceId],
    queryFn: async () => await caseTagsListCaseTags({ workspaceId }),
    enabled: options.enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const {
    mutateAsync: createCaseTag,
    isPending: createCaseTagIsPending,
    error: createCaseTagError,
  } = useMutation({
    mutationFn: async (params: CaseTagsCreateCaseTagData) =>
      await caseTagsCreateCaseTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tag-catalog", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["case-tags"] })
      toast({
        title: "已创建事件标签",
        description: (
          <div className="flex items-center space-x-2">
            <CircleCheck className="size-4 fill-emerald-500 stroke-white" />
            <span>事件标签创建成功。</span>
          </div>
        ),
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "创建事件标签出错",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
          break
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to create case tag", error)
          toast({
            title: "创建事件标签失败",
            description: `创建事件标签时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  const {
    mutateAsync: updateCaseTag,
    isPending: updateCaseTagIsPending,
    error: updateCaseTagError,
  } = useMutation({
    mutationFn: async (params: CaseTagsUpdateCaseTagData) =>
      await caseTagsUpdateCaseTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tag-catalog", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["cases"] })
      queryClient.invalidateQueries({ queryKey: ["case-tags"] })
      toast({
        title: "已更新事件标签",
        description: "事件标签更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "更新事件标签出错",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
          break
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
      }
    },
  })

  const {
    mutateAsync: deleteCaseTag,
    isPending: deleteCaseTagIsPending,
    error: deleteCaseTagError,
  } = useMutation({
    mutationFn: async (params: CaseTagsDeleteCaseTagData) =>
      await caseTagsDeleteCaseTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tag-catalog", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["cases"] })
      queryClient.invalidateQueries({ queryKey: ["case-tags"] })
      toast({
        title: "已删除事件标签",
        description: "事件标签删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
      }
    },
  })

  return {
    caseTags,
    caseTagsIsLoading,
    caseTagsError,
    createCaseTag,
    createCaseTagIsPending,
    createCaseTagError,
    updateCaseTag,
    updateCaseTagIsPending,
    updateCaseTagError,
    deleteCaseTag,
    deleteCaseTagIsPending,
    deleteCaseTagError,
  }
}

export function useOrgGitSettings() {
  const queryClient = useQueryClient()
  // Get Git settings
  const {
    data: gitSettings,
    isLoading: gitSettingsIsLoading,
    error: gitSettingsError,
  } = useQuery<GitSettingsRead>({
    queryKey: ["org-git-settings"],
    queryFn: async () => await settingsGetGitSettings(),
  })

  // Update Git settings
  const {
    mutateAsync: updateGitSettings,
    isPending: updateGitSettingsIsPending,
    error: updateGitSettingsError,
  } = useMutation({
    mutationFn: async (params: SettingsUpdateGitSettingsData) =>
      await settingsUpdateGitSettings(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-git-settings"] })
      queryClient.invalidateQueries({ queryKey: ["registry_repositories"] })
      toast({
        title: "已更新 Git 设置",
        description: "Git 设置更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to update Git settings", error)
          toast({
            title: "更新 Git 设置失败",
            description: `更新 Git 设置时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  return {
    // Get
    gitSettings,
    gitSettingsIsLoading,
    gitSettingsError,
    // Update
    updateGitSettings,
    updateGitSettingsIsPending,
    updateGitSettingsError,
  }
}

export function useGitHubAppManifest() {
  // Get GitHub App manifest
  const {
    data: manifest,
    isLoading: manifestIsLoading,
    error: manifestError,
  } = useQuery<VcsGetGithubAppManifestResponse>({
    queryKey: ["github-app-manifest"],
    queryFn: async () => await vcsGetGithubAppManifest(),
  })

  return {
    manifest,
    manifestIsLoading,
    manifestError,
  }
}

/**
 * Fetch whether the organization has GitHub App credentials configured.
 */
export function useGitHubAppCredentialsStatus(options?: {
  enabled?: boolean
  suppressErrorToast?: boolean
}) {
  const {
    data: credentialsStatus,
    isLoading: credentialsStatusIsLoading,
    error: credentialsStatusError,
    refetch: refetchCredentialsStatus,
  } = useQuery<VcsGetGithubAppCredentialsStatusResponse>({
    queryKey: ["github-app-credentials-status"],
    queryFn: async () => await vcsGetGithubAppCredentialsStatus(),
    enabled: options?.enabled !== false,
    ...(options?.suppressErrorToast
      ? { retry: false, meta: { suppressErrorToast: true } }
      : {}),
  })

  return {
    credentialsStatus,
    credentialsStatusIsLoading,
    credentialsStatusError,
    refetchCredentialsStatus,
  }
}

/**
 * Fetch repositories granted to the configured GitHub App installation.
 */
export function useGitHubAppRepositories(
  workspaceId: string,
  options?: { enabled?: boolean }
) {
  const {
    data: repositories,
    isLoading: repositoriesIsLoading,
    error: repositoriesError,
    refetch: refetchRepositories,
  } = useQuery<WorkflowsListWorkflowRepositoriesResponse>({
    queryKey: ["github-app-repositories", workspaceId],
    queryFn: async () =>
      await workflowsListWorkflowRepositories({ workspaceId }),
    enabled: Boolean(workspaceId) && options?.enabled !== false,
    retry: false,
  })

  return {
    repositories,
    repositoriesIsLoading,
    repositoriesError,
    refetchRepositories,
  }
}

function clearGitHubAppRepositoryQueries(queryClient: QueryClient) {
  queryClient.setQueriesData<WorkflowsListWorkflowRepositoriesResponse>(
    { queryKey: ["github-app-repositories"] },
    []
  )
}

export function useGitHubAppCredentials() {
  const queryClient = useQueryClient()

  // Save GitHub App credentials mutation
  const saveCredentials = useMutation<
    VcsSaveGithubAppCredentialsResponse,
    ApiError,
    VcsSaveGithubAppCredentialsData["requestBody"]
  >({
    mutationFn: async (data) => {
      return await vcsSaveGithubAppCredentials({ requestBody: data })
    },
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      clearGitHubAppRepositoryQueries(queryClient)
      // Invalidate and refetch credentials status
      queryClient.invalidateQueries({
        queryKey: ["github-app-credentials-status"],
      })
      queryClient.invalidateQueries({
        queryKey: ["github-app-repositories"],
      })
    },
  })

  return {
    saveCredentials,
  }
}

export function useDeleteGitHubAppCredentials() {
  const queryClient = useQueryClient()

  const deleteCredentials = useMutation<void, ApiError>({
    mutationFn: async () => {
      await vcsDeleteGithubAppCredentials()
    },
    onSuccess: () => {
      clearGitHubAppRepositoryQueries(queryClient)
      queryClient.invalidateQueries({
        queryKey: ["github-app-credentials-status"],
      })
      queryClient.invalidateQueries({
        queryKey: ["github-app-repositories"],
      })
    },
    onError: toastMutationError("deleting the GitHub App credentials"),
  })

  return {
    deleteCredentials,
  }
}

export function useGitLabTokenCredentialsStatus() {
  const {
    data: credentialsStatus,
    isLoading: credentialsStatusIsLoading,
    error: credentialsStatusError,
    refetch: refetchCredentialsStatus,
  } = useQuery<VcsGetGitlabTokenCredentialsStatusResponse>({
    queryKey: ["gitlab-token-credentials-status"],
    queryFn: async () => await vcsGetGitlabTokenCredentialsStatus(),
  })

  return {
    credentialsStatus,
    credentialsStatusIsLoading,
    credentialsStatusError,
    refetchCredentialsStatus,
  }
}

export function useGitLabTokenCredentials() {
  const queryClient = useQueryClient()

  const saveCredentials = useMutation<
    VcsSaveGitlabTokenCredentialsResponse,
    ApiError,
    VcsSaveGitlabTokenCredentialsData["requestBody"]
  >({
    mutationFn: async (data) => {
      return await vcsSaveGitlabTokenCredentials({ requestBody: data })
    },
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      invalidateGitLabTokenCredentialQueries(queryClient)
    },
  })

  return {
    saveCredentials,
  }
}

export function useDeleteGitLabTokenCredentials() {
  const queryClient = useQueryClient()

  const deleteCredentials = useMutation<void, ApiError>({
    mutationFn: async () => {
      await vcsDeleteGitlabTokenCredentials()
    },
    onSuccess: () => {
      invalidateGitLabTokenCredentialQueries(queryClient)
    },
    onError: toastMutationError("deleting the GitLab token credentials"),
  })

  return {
    deleteCredentials,
  }
}

function invalidateGitLabTokenCredentialQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: ["gitlab-token-credentials-status"],
  })
  queryClient.invalidateQueries({
    queryKey: ["workflow-sync-branches"],
  })
  queryClient.invalidateQueries({
    queryKey: ["repository_commits"],
  })
}

export function useOrgAgentSettings() {
  const queryClient = useQueryClient()
  // Get Agent settings
  const {
    data: agentSettings,
    isLoading: agentSettingsIsLoading,
    error: agentSettingsError,
  } = useQuery<AgentSettingsRead>({
    queryKey: ["org-agent-settings"],
    queryFn: async () => await settingsGetAgentSettings(),
  })

  // Update Agent settings
  const {
    mutateAsync: updateAgentSettings,
    isPending: updateAgentSettingsIsPending,
    error: updateAgentSettingsError,
  } = useMutation({
    mutationFn: async (params: SettingsUpdateAgentSettingsData) =>
      await settingsUpdateAgentSettings(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-agent-settings"] })
      toast({
        title: "已更新智能体设置",
        description: "智能体设置更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to update agent settings", error)
          toast({
            title: "更新智能体设置失败",
            description: `更新智能体设置时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  return {
    // Get
    agentSettings,
    agentSettingsIsLoading,
    agentSettingsError,
    // Update
    updateAgentSettings,
    updateAgentSettingsIsPending,
    updateAgentSettingsError,
  }
}

export function useOrgSamlSettings() {
  const queryClient = useQueryClient()

  // Get SAML settings
  const {
    data: samlSettings,
    isLoading: samlSettingsIsLoading,
    error: samlSettingsError,
  } = useQuery<SAMLSettingsRead>({
    queryKey: ["org-saml-settings"],
    queryFn: async () => await settingsGetSamlSettings(),
  })

  // Update SAML settings
  const {
    mutateAsync: updateSamlSettings,
    isPending: updateSamlSettingsIsPending,
    error: updateSamlSettingsError,
  } = useMutation({
    mutationFn: async (params: SettingsUpdateSamlSettingsData) =>
      await settingsUpdateSamlSettings(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-saml-settings"] })
      toast({
        title: "已更新 SAML 设置",
        description: "SAML 设置更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to update SAML settings", error)
          toast({
            title: "更新 SAML 设置失败",
            description: `更新 SAML 设置时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  return {
    // Get
    samlSettings,
    samlSettingsIsLoading,
    samlSettingsError,
    // Update
    updateSamlSettings,
    updateSamlSettingsIsPending,
    updateSamlSettingsError,
  }
}

export function useOrgAppSettings() {
  const queryClient = useQueryClient()

  // Get App settings
  const {
    data: appSettings,
    isLoading: appSettingsIsLoading,
    error: appSettingsError,
  } = useQuery<AppSettingsRead>({
    queryKey: ["org-app-settings"],
    queryFn: async () => await settingsGetAppSettings(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Update App settings
  const {
    mutateAsync: updateAppSettings,
    isPending: updateAppSettingsIsPending,
    error: updateAppSettingsError,
  } = useMutation({
    mutationFn: async (params: SettingsUpdateAppSettingsData) =>
      await settingsUpdateAppSettings(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-app-settings"] })
      queryClient.invalidateQueries({ queryKey: ["workspace"] })
      toast({
        title: "已更新应用设置",
        description: "应用设置更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to update application settings", error)
          toast({
            title: "更新应用设置失败",
            description: `更新应用设置时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  return {
    // Get
    appSettings,
    appSettingsIsLoading,
    appSettingsError,
    // Update
    updateAppSettings,
    updateAppSettingsIsPending,
    updateAppSettingsError,
  }
}

export function useOrgAuditSettings() {
  const queryClient = useQueryClient()

  // Get Audit settings
  const {
    data: auditSettings,
    isLoading: auditSettingsIsLoading,
    error: auditSettingsError,
  } = useQuery<AuditSettingsRead>({
    queryKey: ["org-audit-settings"],
    queryFn: async () => await settingsGetAuditSettings(),
  })

  // Update Audit settings
  const {
    mutateAsync: updateAuditSettings,
    isPending: updateAuditSettingsIsPending,
    error: updateAuditSettingsError,
  } = useMutation({
    mutationFn: async (params: SettingsUpdateAuditSettingsData) =>
      await settingsUpdateAuditSettings(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-audit-settings"] })
      toast({
        title: "已更新审计设置",
        description: "审计设置更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to update audit settings", error)
          toast({
            title: "更新审计设置失败",
            description: `更新审计设置时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  const { mutate: testAuditWebhook, isPending: testAuditWebhookIsPending } =
    useMutation<
      AuditWebhookTestResult,
      TracecatApiError,
      SettingsTestAuditWebhookData
    >({
      mutationFn: settingsTestAuditWebhook,
      onSuccess: (result) => {
        toast({
          title: getAuditWebhookTestTitle(result),
          description: getAuditWebhookTestDescription(result),
          variant: result.ok ? "default" : "destructive",
        })
      },
      onError: (error: TracecatApiError) => {
        switch (error.status) {
          case 403:
            toast({
              title: "禁止访问",
              description: "你无法执行此操作",
            })
            break
          default:
            console.error("Failed to test audit webhook", error)
            toast({
              title: "测试审计 Webhook 失败",
              description: getApiErrorDetail(error) ?? "未知错误",
            })
        }
      },
    })

  return {
    // Get
    auditSettings,
    auditSettingsIsLoading,
    auditSettingsError,
    // Update
    updateAuditSettings,
    updateAuditSettingsIsPending,
    updateAuditSettingsError,
    // Test
    testAuditWebhook,
    testAuditWebhookIsPending,
  }
}

export function useListTables(
  { workspaceId }: TablesListTablesData,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true
  const {
    data: tables,
    isLoading: tablesIsLoading,
    error: tablesError,
  } = useQuery<TableReadMinimal[], ApiError>({
    queryKey: ["tables", workspaceId],
    queryFn: async () => await tablesListTables({ workspaceId }),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    tables,
    tablesIsLoading,
    tablesError,
  }
}

export function useGetTable(
  { tableId, workspaceId }: TablesGetTableData,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true
  const {
    data: table,
    isLoading: tableIsLoading,
    error: tableError,
    refetch: refetchTable,
  } = useQuery<TableRead, ApiError>({
    queryKey: ["table", workspaceId, tableId],
    queryFn: async () => await tablesGetTable({ tableId, workspaceId }),
    enabled: enabled && Boolean(workspaceId) && Boolean(tableId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    table,
    tableIsLoading,
    tableError,
    refetchTable,
  }
}

function invalidateTableDetailQuery(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  tableId: string
) {
  queryClient.invalidateQueries({
    queryKey: ["table", workspaceId, tableId],
  })
  queryClient.invalidateQueries({
    queryKey: ["table-search", workspaceId, tableId],
  })
}

export function useCreateTable() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: createTable,
    isPending: createTableIsPending,
    error: createTableError,
  } = useMutation<
    TablesCreateTableResponse,
    TracecatApiError,
    TablesCreateTableData
  >({
    mutationFn: async (params: TablesCreateTableData) =>
      await tablesCreateTable(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tables", variables.workspaceId],
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Error creating table", error)
    },
  })

  return {
    createTable,
    createTableIsPending,
    createTableError,
  }
}

export function useUpdateTable() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: updateTable,
    isPending: updateTableIsPending,
    error: updateTableError,
  } = useMutation({
    mutationFn: async (params: TablesUpdateTableData) =>
      await tablesUpdateTable(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tables", variables.workspaceId],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
  })

  return {
    updateTable,
    updateTableIsPending,
    updateTableError,
  }
}

export function useDeleteTable() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: deleteTable,
    isPending: deleteTableIsPending,
    error: deleteTableError,
  } = useMutation({
    mutationFn: async (params: TablesDeleteTableData) =>
      await tablesDeleteTable(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tables", variables.workspaceId],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
        case 400:
          return toast({
            title: "请求无效",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
        default:
          console.error("Error deleting table", error)
          return toast({
            title: "删除数据表出错",
            description: `删除数据表时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  return {
    deleteTable,
    deleteTableIsPending,
    deleteTableError,
  }
}

export function useInsertColumn() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: insertColumn,
    isPending: insertColumnIsPending,
    error: insertColumnError,
  } = useMutation({
    mutationFn: async (params: TablesCreateColumnData) =>
      await tablesCreateColumn(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tables", variables.workspaceId],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Error inserting column", error)
          break
      }
    },
  })

  return {
    insertColumn,
    insertColumnIsPending,
    insertColumnError,
  }
}

export function useUpdateColumn() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: updateColumn,
    isPending: updateColumnIsPending,
    error: updateColumnError,
  } = useMutation({
    mutationFn: async (params: TablesUpdateColumnData) =>
      await tablesUpdateColumn(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
    onError: (error: TracecatApiError, variables) => {
      const requestedIsIndex = variables.requestBody?.is_index
      const isIndexOperation = typeof requestedIsIndex === "boolean"
      const indexErrorTitle =
        requestedIsIndex === false ? "删除唯一索引出错" : "创建唯一索引出错"

      if (isIndexOperation) {
        // Handle unique index specific errors
        if (error.status === 409) {
          toast({
            title: indexErrorTitle,
            description: "列中存在重复值，所有值必须唯一。",
          })
        } else if (error.status === 400) {
          toast({
            title: indexErrorTitle,
            description: getApiErrorDetail(error) ?? "请重试。",
          })
        } else {
          toast({
            title: indexErrorTitle,
            description: error.message || "发生意外错误",
          })
        }
      } else {
        // Handle regular column update errors
        switch (error.status) {
          case 403:
            toast({
              title: "禁止访问",
              description: "你无法执行此操作",
            })
            break
          default:
            console.error("Error updating column", error)
            toast({
              title: "更新列出错",
              description: error.message || "发生意外错误",
            })
            break
        }
      }
    },
  })

  return {
    updateColumn,
    updateColumnIsPending,
    updateColumnError,
  }
}

export function useDeleteColumn() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: deleteColumn,
    isPending: deleteColumnIsPending,
    error: deleteColumnError,
  } = useMutation({
    mutationFn: async (params: TablesDeleteColumnData) =>
      await tablesDeleteColumn(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
    onError: toastMutationError("deleting the column"),
  })

  return {
    deleteColumn,
    deleteColumnIsPending,
    deleteColumnError,
  }
}

export function useBatchInsertRows() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: insertRows,
    isPending: insertRowsIsPending,
    error: insertRowsError,
  } = useMutation({
    mutationFn: async (params: TablesBatchInsertRowsData) =>
      await tablesBatchInsertRows(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["table-search", variables.workspaceId, variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          "rows",
          "paginated",
          variables.tableId,
          variables.workspaceId,
        ],
      })
      toast({
        title: "行导入成功",
        description: "数据已导入数据表。",
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Error batch inserting rows:", error)
      toast({
        title: "导入行失败",
        description: "导入数据时出错，请重试。",
        variant: "destructive",
      })
    },
  })

  return {
    insertRows,
    insertRowsIsPending,
    insertRowsError,
  }
}

/**
 * Invalidate every query that lists a table's rows: search, the row list and
 * its pages. For anything that adds a row, wherever it was added from.
 */
export function invalidateTableRowQueries(
  queryClient: QueryClient,
  workspaceId: string,
  tableId: string
) {
  queryClient.invalidateQueries({
    queryKey: ["table-search", workspaceId, tableId],
  })
  queryClient.invalidateQueries({
    queryKey: ["rows", tableId],
  })
  queryClient.invalidateQueries({
    queryKey: ["rows", "paginated", tableId, workspaceId],
  })
}

export function useInsertRow() {
  const queryClient = useQueryClient()

  const {
    mutateAsync: insertRow,
    isPending: insertRowIsPending,
    error: insertRowError,
  } = useMutation({
    mutationFn: async (params: TablesInsertRowData) =>
      await tablesInsertRow(params),
    onSuccess: (_, variables) => {
      invalidateTableRowQueries(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
    onError: (error: TracecatApiError) => {
      if (error.status === 409) {
        toast({
          title: "重复值错误",
          description: "唯一列中不能插入重复值，请使用唯一值。",
          variant: "destructive",
        })
      } else {
        toast({
          title: "插入行出错",
          description: error.message || "发生意外错误",
          variant: "destructive",
        })
      }
    },
  })

  return {
    insertRow,
    insertRowIsPending,
    insertRowError,
  }
}

export function useUpdateRow() {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateRow,
    isPending: updateRowIsPending,
    error: updateRowError,
  } = useMutation({
    mutationFn: async (params: TablesUpdateRowData) =>
      await tablesUpdateRow(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["table-search", variables.workspaceId, variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          "rows",
          "paginated",
          variables.tableId,
          variables.workspaceId,
        ],
      })
    },
    onError: (error: TracecatApiError) => {
      toast({
        title: "更新行出错",
        description: error.message || "发生意外错误",
        variant: "destructive",
      })
    },
  })

  return {
    updateRow,
    updateRowIsPending,
    updateRowError,
  }
}

export function useDeleteRow() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: deleteRow,
    isPending: deleteRowIsPending,
    error: deleteRowError,
  } = useMutation({
    mutationFn: async (params: TablesDeleteRowData) =>
      await tablesDeleteRow(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          "rows",
          "paginated",
          variables.tableId,
          variables.workspaceId,
        ],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
    onError: toastMutationError("deleting the row"),
  })

  return {
    deleteRow,
    deleteRowIsPending,
    deleteRowError,
  }
}

export function useBatchDeleteRows() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: batchDeleteRows,
    isPending: batchDeleteRowsIsPending,
    error: batchDeleteRowsError,
  } = useMutation({
    mutationFn: async (params: TablesBatchDeleteRowsData) =>
      await tablesBatchDeleteRows(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          "rows",
          "paginated",
          variables.tableId,
          variables.workspaceId,
        ],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
    onError: toastMutationError("deleting the selected rows"),
  })

  return {
    batchDeleteRows,
    batchDeleteRowsIsPending,
    batchDeleteRowsError,
  }
}

export function useBatchUpdateRows() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: batchUpdateRows,
    isPending: batchUpdateRowsIsPending,
    error: batchUpdateRowsError,
  } = useMutation({
    mutationFn: async (params: TablesBatchUpdateRowsData) =>
      await tablesBatchUpdateRows(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          "rows",
          "paginated",
          variables.tableId,
          variables.workspaceId,
        ],
      })
      invalidateTableDetailQuery(
        queryClient,
        variables.workspaceId,
        variables.tableId
      )
    },
  })

  return {
    batchUpdateRows,
    batchUpdateRowsIsPending,
    batchUpdateRowsError,
  }
}

export function useImportCsv() {
  const queryClient = useQueryClient()
  const {
    mutateAsync: importCsv,
    isPending: importCsvIsPending,
    error: importCsvError,
  } = useMutation({
    mutationFn: async (params: TablesImportCsvData) =>
      await tablesImportCsv(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["table-search", variables.workspaceId, variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: ["rows", variables.tableId],
      })
      queryClient.invalidateQueries({
        queryKey: [
          "rows",
          "paginated",
          variables.tableId,
          variables.workspaceId,
        ],
      })
      toast({
        title: "行导入成功",
        description: "数据已导入数据表。",
      })
    },
  })

  return {
    importCsv,
    importCsvIsPending,
    importCsvError,
  }
}

export function useImportTableFromCsv() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const {
    mutateAsync: importTable,
    isPending: importTableIsPending,
    error: importTableError,
  } = useMutation<
    TablesImportTableFromCsvResponse,
    TracecatApiError,
    TablesImportTableFromCsvData
  >({
    mutationFn: async (params) => await tablesImportTableFromCsv(params),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tables", variables.workspaceId],
      })
      toast({
        title: "数据表导入成功",
        description: "已从 CSV 文件创建新数据表。",
      })
      if (response?.table?.id) {
        router.push(
          `/workspaces/${variables.workspaceId}/tables/${response.table.id}`
        )
      }
    },
  })

  return {
    importTable,
    importTableIsPending,
    importTableError,
  }
}

export function useSearchCases(params: CasesSearchCasesData) {
  const {
    data: cases,
    isLoading: casesIsLoading,
    error: casesError,
  } = useQuery<CaseReadMinimal[], TracecatApiError>({
    queryKey: ["cases", "search", params],
    queryFn: async () => {
      const response = await casesSearchCases(params)
      return response.items
    },
  })

  return {
    cases,
    casesIsLoading,
    casesError,
  }
}
interface UseGetCaseOptions {
  enabled?: boolean
}

export function useGetCase(
  { caseId, workspaceId }: CasesGetCaseData,
  options?: UseGetCaseOptions
) {
  const {
    data: caseData,
    isLoading: caseDataIsLoading,
    error: caseDataError,
  } = useQuery<CaseRead, TracecatApiError>({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const response = await apiClient.get<CaseRead>(`/cases/${caseId}`, {
        params: { workspace_id: workspaceId },
      })
      return response.data
    },
    enabled: options?.enabled,
  })

  return {
    caseData,
    caseDataIsLoading,
    caseDataError,
  }
}

export function useCreateCase(workspaceId: string) {
  const queryClient = useQueryClient()
  const {
    mutateAsync: createCase,
    isPending: createCaseIsPending,
    error: createCaseError,
  } = useMutation({
    mutationFn: async (params: CaseCreate) =>
      await casesCreateCase({ workspaceId, requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] })
      queryClient.invalidateQueries({ queryKey: ["cases", workspaceId] })
      // Use partial matching to invalidate all paginated queries regardless of filters
      queryClient.invalidateQueries({
        queryKey: ["cases", "paginated"],
        exact: false,
      })
      toast({
        title: "已创建事件",
        description: "新事件创建成功",
      })
    },
    onError: (error: TracecatApiError) => {
      toast({
        title: "创建事件出错",
        description: `创建事件时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
      })
    },
  })

  return {
    createCase,
    createCaseIsPending,
    createCaseError,
  }
}

export function useUpdateCase({
  workspaceId,
  caseId,
}: {
  workspaceId: string
  caseId: string
}) {
  const queryClient = useQueryClient()
  const {
    mutateAsync: updateCase,
    isPending: updateCaseIsPending,
    error: updateCaseError,
  } = useMutation({
    mutationFn: async (params: CaseUpdate) =>
      await casesUpdateCase({ caseId, workspaceId, requestBody: params }),

    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: ["cases", workspaceId],
      })
      // Use partial matching to invalidate all paginated queries regardless of filters
      queryClient.invalidateQueries({
        queryKey: ["cases", "paginated"],
        exact: false,
      })
      invalidateCaseActivityQueries(queryClient, caseId, workspaceId)
      if (params.summary !== undefined || params.description !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ["case-versions", workspaceId, caseId],
        })
      }
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
        default:
          console.error("Error updating case", error)
          return toast({
            title: "更新事件出错",
            description: `更新事件时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
            variant: "destructive",
          })
      }
    },
  })

  return {
    updateCase,
    updateCaseIsPending,
    updateCaseError,
  }
}

export function useDeleteCase({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: deleteCase,
    isPending: deleteCaseIsPending,
    error: deleteCaseError,
  } = useMutation({
    mutationFn: async (caseId: string) =>
      await casesDeleteCase({ workspaceId, caseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cases", workspaceId],
      })
      // Use partial matching to invalidate all paginated queries regardless of filters
      queryClient.invalidateQueries({
        queryKey: ["cases", "paginated"],
        exact: false,
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
        default:
          console.error("Error deleting case", error)
          return toast({
            title: "删除事件出错",
            description: `删除事件时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  return {
    deleteCase,
    deleteCaseIsPending,
    deleteCaseError,
  }
}

/** Update a collection of cases in one server-side batch. */
export function useBatchUpdateCases({ workspaceId }: { workspaceId: string }) {
  const {
    mutateAsync: batchUpdateCases,
    isPending: batchUpdateCasesIsPending,
    error: batchUpdateCasesError,
  } = useMutation({
    mutationFn: async (params: CaseBatchUpdate) =>
      await casesBatchUpdateCases({ workspaceId, requestBody: params }),
    // Cache invalidation is the caller's responsibility: bulk operations issue
    // one request per 1000-ID chunk, and invalidating per chunk would refetch
    // the case list repeatedly mid-operation.
  })

  return {
    batchUpdateCases,
    batchUpdateCasesIsPending,
    batchUpdateCasesError,
  }
}

/**
 * Set or clear (`parentId: null`) the parent of a collection of cases in one
 * server-side batch.
 */
export function useBatchChangeCaseParent({
  workspaceId,
}: {
  workspaceId: string
}) {
  const {
    mutateAsync: batchChangeCaseParent,
    isPending: batchChangeCaseParentIsPending,
  } = useMutation({
    mutationFn: async ({
      caseIds,
      parentId,
    }: {
      caseIds: string[]
      parentId: string | null
    }) =>
      parentId
        ? await casesBatchSetParent({
            workspaceId,
            requestBody: { case_ids: caseIds, parent_id: parentId },
          })
        : await casesBatchClearParent({
            workspaceId,
            requestBody: { case_ids: caseIds },
          }),
    // Cache invalidation is the caller's responsibility, as for batch update.
  })

  return { batchChangeCaseParent, batchChangeCaseParentIsPending }
}

/** Delete a collection of cases in one server-side batch. */
export function useBatchDeleteCases({ workspaceId }: { workspaceId: string }) {
  const {
    mutateAsync: batchDeleteCases,
    isPending: batchDeleteCasesIsPending,
    error: batchDeleteCasesError,
  } = useMutation({
    mutationFn: async (params: CaseBatchDelete) =>
      await casesBatchDeleteCases({ workspaceId, requestBody: params }),
    // Cache invalidation is the caller's responsibility: bulk operations issue
    // one request per 1000-ID chunk, and invalidating per chunk would refetch
    // the case list repeatedly mid-operation.
  })

  return {
    batchDeleteCases,
    batchDeleteCasesIsPending,
    batchDeleteCasesError,
  }
}

export function useCaseDurations({
  caseId,
  workspaceId,
  enabled = true,
}: {
  caseId: string
  workspaceId: string
  enabled: boolean
}) {
  const {
    data: caseDurations,
    isLoading: caseDurationsIsLoading,
    error: caseDurationsError,
  } = useQuery<CaseDurationRead[], TracecatApiError>({
    queryKey: ["case-durations", caseId, workspaceId],
    queryFn: async () => await listCaseDurations(workspaceId, caseId),
    enabled: Boolean(caseId && workspaceId) && enabled,
    // Durations materialize asynchronously (Redis consumer), so a mutation's
    // one-shot invalidation can read before the worker finishes. Poll while
    // the case is open so the recomputed values eventually appear.
    refetchInterval: 5000,
  })

  return {
    caseDurations,
    caseDurationsIsLoading,
    caseDurationsError,
  }
}

export function useCaseDurationDefinitions(
  workspaceId: string,
  enabled = true
) {
  const {
    data: caseDurationDefinitions,
    isLoading: caseDurationDefinitionsIsLoading,
    isFetching: caseDurationDefinitionsIsFetching,
    error: caseDurationDefinitionsError,
  } = useQuery<CaseDurationDefinitionRead[], Error>({
    queryKey: ["case-duration-definitions", workspaceId],
    queryFn: async () => await listCaseDurationDefinitions(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
  })

  return {
    caseDurationDefinitions,
    caseDurationDefinitionsIsLoading,
    caseDurationDefinitionsIsFetching,
    caseDurationDefinitionsError,
  }
}

export function useCaseFields(workspaceId: string, enabled = true) {
  const {
    data: caseFields,
    isLoading: caseFieldsIsLoading,
    isFetching: caseFieldsIsFetching,
    error: caseFieldsError,
  } = useQuery<CaseFieldReadMinimal[], TracecatApiError>({
    queryKey: ["case-fields", workspaceId],
    queryFn: async () => await casesListFields({ workspaceId }),
    enabled: Boolean(workspaceId) && enabled,
  })

  return {
    caseFields,
    caseFieldsIsLoading,
    caseFieldsIsFetching,
    caseFieldsError,
  }
}
export function useCaseComments({
  caseId,
  workspaceId,
  enabled = true,
}: CasesListCommentsData & { enabled?: boolean }) {
  const {
    data: caseComments,
    isLoading: caseCommentsIsLoading,
    error: caseCommentsError,
  } = useQuery<CaseCommentRead[], TracecatApiError>({
    queryKey: caseCommentQueryKeys.comments(caseId, workspaceId),
    queryFn: async () => await casesListComments({ caseId, workspaceId }),
    enabled,
    refetchInterval: (query) =>
      hasActiveCaseCommentInvocations(query.state.data)
        ? CASE_COMMENT_ACTIVE_POLL_INTERVAL_MS
        : false,
  })

  return {
    caseComments,
    caseCommentsIsLoading,
    caseCommentsError,
  }
}

export function useCaseCommentThreads({
  caseId,
  workspaceId,
  enabled = true,
}: CasesListCommentThreadsData & { enabled?: boolean }) {
  const {
    data: caseCommentThreads,
    isLoading: caseCommentThreadsIsLoading,
    error: caseCommentThreadsError,
  } = useQuery<CaseCommentThreadRead[], TracecatApiError>({
    queryKey: caseCommentQueryKeys.threads(caseId, workspaceId),
    queryFn: async () => await casesListCommentThreads({ caseId, workspaceId }),
    enabled,
    refetchInterval: (query) =>
      hasActiveCaseCommentThreadInvocations(query.state.data)
        ? CASE_COMMENT_ACTIVE_POLL_INTERVAL_MS
        : false,
  })

  return {
    caseCommentThreads,
    caseCommentThreadsIsLoading,
    caseCommentThreadsError,
  }
}

export function useCreateCaseComment({
  caseId,
  workspaceId,
}: CasesListCommentsData) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: createComment,
    isPending: createCommentIsPending,
    error: createCommentError,
  } = useMutation({
    mutationFn: async (params: CaseCommentCreate) =>
      await casesCreateComment({
        caseId,
        workspaceId,
        requestBody: params,
      }),
    onSuccess: () => {
      invalidateCaseCommentQueries(queryClient, caseId, workspaceId)
    },
    onError: (error: TracecatApiError) => {
      console.error("Error creating comment", error)
      toast({
        title: "创建评论出错",
        description: `创建评论时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
        variant: "destructive",
      })
    },
  })

  return {
    createComment,
    createCommentIsPending,
    createCommentError,
  }
}

export function useUpdateCaseComment({
  caseId,
  workspaceId,
  commentId,
}: {
  caseId: string
  workspaceId: string
  commentId: string
}) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateComment,
    isPending: updateCommentIsPending,
    error: updateCommentError,
  } = useMutation({
    mutationFn: async (params: CaseCommentUpdate) =>
      await casesUpdateComment({
        caseId,
        workspaceId,
        commentId,
        requestBody: params,
      }),
    onSuccess: () => {
      invalidateCaseCommentQueries(queryClient, caseId, workspaceId)
    },
    onError: (error: TracecatApiError) => {
      console.error("Error updating comment", error)
      toast({
        title: "更新评论出错",
        description: `更新评论时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
        variant: "destructive",
      })
    },
  })

  return {
    updateComment,
    updateCommentIsPending,
    updateCommentError,
  }
}

export function useDeleteCaseComment({
  caseId,
  workspaceId,
  commentId,
}: {
  caseId: string
  workspaceId: string
  commentId: string
}) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: deleteComment,
    isPending: deleteCommentIsPending,
    error: deleteCommentError,
  } = useMutation({
    mutationFn: async () =>
      await casesDeleteComment({
        caseId,
        workspaceId,
        commentId,
      }),
    onSuccess: () => {
      invalidateCaseCommentQueries(queryClient, caseId, workspaceId)
    },
    onError: (error: TracecatApiError) => {
      console.error("Error deleting comment", error)
      toast({
        title: "删除评论出错",
        description: `删除评论时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
        variant: "destructive",
      })
    },
  })

  return {
    deleteComment,
    deleteCommentIsPending,
    deleteCommentError,
  }
}

export function useCaseTasks({
  caseId,
  workspaceId,
  enabled = true,
}: CasesListTasksData & { enabled?: boolean }) {
  const {
    data: caseTasks,
    isLoading: caseTasksIsLoading,
    error: caseTasksError,
    refetch: refetchCaseTasks,
  } = useQuery<CaseTaskRead[], TracecatApiError>({
    queryKey: ["case-tasks", caseId, workspaceId],
    queryFn: async () => await casesListTasks({ caseId, workspaceId }),
    // Tasks are gated behind the `case_addons` entitlement; callers outside
    // the gate (the switcher's progress ring) must pass `enabled` so
    // non-entitled orgs never fire the request.
    enabled: Boolean(caseId && workspaceId) && enabled,
  })

  return {
    caseTasks,
    caseTasksIsLoading,
    caseTasksError,
    refetchCaseTasks,
  }
}

export function useCreateCaseTask({ caseId, workspaceId }: CasesListTasksData) {
  const queryClient = useQueryClient()

  const {
    mutate: createTask,
    isPending: createTaskIsPending,
    error: createTaskError,
  } = useMutation({
    mutationFn: async (params: CaseTaskCreate) =>
      await casesCreateTask({
        caseId,
        workspaceId,
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tasks", caseId, workspaceId],
      })
      invalidateCaseActivityQueries(queryClient, caseId, workspaceId)
    },
    onError: (error: TracecatApiError) => {
      console.error("Error creating task", error)
      toast({
        title: "创建任务出错",
        description: `创建任务时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
      })
    },
  })

  return {
    createTask,
    createTaskIsPending,
    createTaskError,
  }
}

export function useUpdateCaseTask({
  caseId,
  workspaceId,
  taskId,
}: {
  caseId: string
  workspaceId: string
  taskId: string
}) {
  const queryClient = useQueryClient()

  const {
    mutate: updateTask,
    isPending: updateTaskIsPending,
    error: updateTaskError,
  } = useMutation({
    mutationFn: async (params: CaseTaskUpdate) =>
      await casesUpdateTask({
        caseId,
        workspaceId,
        taskId,
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tasks", caseId, workspaceId],
      })
      invalidateCaseActivityQueries(queryClient, caseId, workspaceId)
    },
    onError: (error: TracecatApiError) => {
      console.error("Error updating task", error)
      toast({
        title: "更新任务出错",
        description: `更新任务时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
      })
    },
  })

  return {
    updateTask,
    updateTaskIsPending,
    updateTaskError,
  }
}

export function useDeleteCaseTask({
  caseId,
  workspaceId,
  taskId,
}: {
  caseId: string
  workspaceId: string
  taskId: string
}) {
  const queryClient = useQueryClient()

  const {
    mutate: deleteTask,
    isPending: deleteTaskIsPending,
    error: deleteTaskError,
  } = useMutation({
    mutationFn: async () =>
      await casesDeleteTask({
        caseId,
        workspaceId,
        taskId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tasks", caseId, workspaceId],
      })
      invalidateCaseActivityQueries(queryClient, caseId, workspaceId)
    },
    onError: (error: TracecatApiError) => {
      console.error("Error deleting task", error)
      toast({
        title: "删除任务出错",
        description: `删除任务时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
      })
    },
  })

  return {
    deleteTask,
    deleteTaskIsPending,
    deleteTaskError,
  }
}

export function useFolders(
  workspaceId: string,
  options: { enabled: boolean } = { enabled: true }
) {
  const queryClient = useQueryClient()

  // List folders
  const {
    data: folders,
    isLoading: foldersIsLoading,
    error: foldersError,
  } = useQuery<WorkflowFolderRead[]>({
    queryKey: ["folders", workspaceId],
    queryFn: async () => await foldersListFolders({ workspaceId }),
    enabled: options.enabled,
  })

  // Get folder by parent path
  const {
    data: subFolders,
    isLoading: subFoldersIsLoading,
    error: subFoldersError,
    refetch: refetchSubFolders,
  } = useQuery<WorkflowFolderRead[]>({
    queryKey: ["folders", workspaceId, "parent"],
    queryFn: async () =>
      await foldersListFolders({
        workspaceId,
        parentPath: "/",
      }),
    enabled: options.enabled && !!workspaceId,
  })

  // Create folder
  const {
    mutateAsync: createFolder,
    isPending: createFolderIsPending,
    error: createFolderError,
  } = useMutation({
    mutationFn: async (params: WorkflowFolderCreate) =>
      await foldersCreateFolder({
        workspaceId,
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
      toast({
        title: "已创建文件夹",
        description: (
          <div className="flex items-center space-x-2">
            <span>文件夹创建成功。</span>
          </div>
        ),
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 409:
          console.error("Error creating folder", error)
          return toast({
            title: "创建文件夹出错",
            description: "此位置已存在同名文件夹。",
          })
        case 403:
          return toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
        default:
          console.error("Failed to create folder", error)
          return toast({
            title: "创建文件夹失败",
            description: `创建文件夹时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  // Update folder
  const {
    mutateAsync: updateFolder,
    isPending: updateFolderIsPending,
    error: updateFolderError,
  } = useMutation({
    mutationFn: async ({
      folderId,
      name,
    }: {
      folderId: string
      name: string
    }) =>
      await foldersUpdateFolder({
        folderId,
        workspaceId,
        requestBody: { name },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
      toast({
        title: "已更新文件夹",
        description: "文件夹更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 409:
          console.error("Error updating folder", error)
          toast({
            title: "更新文件夹出错",
            description: "此位置已存在同名文件夹。",
          })
          break
        default:
          console.error("Error updating folder", error)
          toast({
            title: "更新文件夹出错",
            description: `更新文件夹时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
          break
      }
    },
  })

  // Move folder
  const {
    mutateAsync: moveFolder,
    isPending: moveFolderIsPending,
    error: moveFolderError,
  } = useMutation({
    mutationFn: async ({
      folderId,
      newParentPath,
    }: {
      folderId: string
      newParentPath: string | null
    }) =>
      await foldersMoveFolder({
        folderId,
        workspaceId,
        requestBody: { new_parent_path: newParentPath },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
      toast({
        title: "已移动文件夹",
        description: "文件夹移动成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Error moving folder", error)
      toast({
        title: "移动文件夹出错",
        description: `移动文件夹时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
      })
    },
  })

  // Delete folder
  const {
    mutateAsync: deleteFolder,
    isPending: deleteFolderIsPending,
    error: deleteFolderError,
  } = useMutation({
    mutationFn: async ({
      folderId,
      recursive = false,
      deleteWorkflows = false,
    }: {
      folderId: string
      recursive?: boolean
      deleteWorkflows?: boolean
    }) =>
      await foldersDeleteFolder({
        folderId,
        workspaceId,
        requestBody: { recursive, delete_workflows: deleteWorkflows },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      toast({
        title: "已删除文件夹",
        description: "文件夹删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "无法删除文件夹",
            description: getApiErrorDetail(error) ?? "请重试。",
          })
          break
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Error deleting folder", error)
          toast({
            title: "删除文件夹失败",
            description: `删除文件夹时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
          break
      }
    },
  })

  return {
    // List
    folders,
    foldersIsLoading,
    foldersError,
    // List subfolders
    subFolders,
    subFoldersIsLoading,
    subFoldersError,
    refetchSubFolders,
    // Create
    createFolder,
    createFolderIsPending,
    createFolderError,
    // Update
    updateFolder,
    updateFolderIsPending,
    updateFolderError,
    // Move
    moveFolder,
    moveFolderIsPending,
    moveFolderError,
    // Delete
    deleteFolder,
    deleteFolderIsPending,
    deleteFolderError,
  }
}

export type DirectoryItem = FolderDirectoryItem | WorkflowDirectoryItem
export function useGetDirectoryItems(
  path: string,
  workspaceId?: string,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true
  const {
    data: directoryItems,
    isLoading: directoryItemsIsLoading,
    error: directoryItemsError,
  } = useQuery<DirectoryItem[], ApiError>({
    enabled: enabled && !!workspaceId,
    queryKey: ["directory-items", workspaceId, path],
    queryFn: async () =>
      await foldersGetDirectory({ path, workspaceId: workspaceId ?? "" }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    directoryItems,
    directoryItemsIsLoading,
    directoryItemsError,
  }
}

export function useCaseEvents({
  caseId,
  workspaceId,
}: {
  caseId: string
  workspaceId: string
}) {
  const {
    data: caseEvents,
    isLoading: caseEventsIsLoading,
    error: caseEventsError,
  } = useQuery<CaseEventsWithUsers, TracecatApiError>({
    queryKey: ["case-events", caseId, workspaceId],
    queryFn: async () =>
      await casesListEventsWithUsers({ caseId, workspaceId }),
  })

  return {
    caseEvents,
    caseEventsIsLoading,
    caseEventsError,
  }
}

export function useCaseTags({ caseId, workspaceId }: CasesListTagsData) {
  const {
    data: caseTags,
    isLoading: caseTagsIsLoading,
    error: caseTagsError,
  } = useQuery<CaseTagRead[], TracecatApiError>({
    queryKey: ["case-tags", caseId, workspaceId],
    queryFn: async () => await casesListTags({ caseId, workspaceId }),
  })

  return {
    caseTags,
    caseTagsIsLoading,
    caseTagsError,
  }
}

export function useAddCaseTag({
  caseId,
  workspaceId,
}: {
  caseId: string
  workspaceId: string
}) {
  const queryClient = useQueryClient()
  const {
    mutateAsync: addCaseTag,
    isPending: addCaseTagIsPending,
    error: addCaseTagError,
  } = useMutation({
    mutationFn: async (params: CaseTagCreate) =>
      await casesAddTag({ caseId, workspaceId, requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tags", caseId, workspaceId],
      })
      invalidateCaseActivityQueries(queryClient, caseId, workspaceId)
    },
  })
  return {
    addCaseTag,
    addCaseTagIsPending,
    addCaseTagError,
  }
}

export function useRemoveCaseTag({
  caseId,
  workspaceId,
}: {
  caseId: string
  workspaceId: string
}) {
  const queryClient = useQueryClient()
  const {
    mutateAsync: removeCaseTag,
    isPending: removeCaseTagIsPending,
    error: removeCaseTagError,
  } = useMutation({
    mutationFn: async (tagIdentifier: string) =>
      await casesRemoveTag({ caseId, workspaceId, tagIdentifier }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["case-tags", caseId, workspaceId],
      })
      invalidateCaseActivityQueries(queryClient, caseId, workspaceId)
    },
    onError: toastMutationError("removing the case tag"),
  })
  return {
    removeCaseTag,
    removeCaseTagIsPending,
    removeCaseTagError,
  }
}

/* Integrations */
export function useIntegrations(workspaceId: string) {
  // List workspace integrations
  const {
    data: integrations,
    isLoading: integrationsIsLoading,
    error: integrationsError,
  } = useQuery<IntegrationReadMinimal[], TracecatApiError>({
    queryKey: ["integrations", workspaceId],
    queryFn: async () => await integrationsListIntegrations({ workspaceId }),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // List providers
  const {
    data: providers,
    isLoading: providersIsLoading,
    error: providersError,
  } = useQuery<ProviderReadMinimal[], TracecatApiError>({
    queryKey: ["providers", workspaceId],
    queryFn: async () => await providersListProviders({ workspaceId }),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    integrations,
    integrationsIsLoading,
    integrationsError,
    providers,
    providersIsLoading,
    providersError,
  }
}

type CreateCustomProviderParams = Omit<
  CustomOAuthProviderCreate,
  "provider_id"
> & {
  provider_id?: string | null
}

export function useCreateCustomProvider(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: createCustomProvider,
    isPending: createCustomProviderIsPending,
    error: createCustomProviderError,
  } = useMutation({
    mutationFn: async (params: CreateCustomProviderParams) => {
      const cleanScopes = params.scopes
        ?.map((scope) => scope.trim())
        .filter(Boolean)
      const payload: CustomOAuthProviderCreate = {
        ...params,
        name: params.name.trim(),
        description: params.description?.trim() || undefined,
        authorization_endpoint: params.authorization_endpoint.trim(),
        token_endpoint: params.token_endpoint.trim(),
        client_id: params.client_id.trim(),
        client_secret: params.client_secret?.trim() || undefined,
        scopes: cleanScopes ?? [],
        provider_id: params.provider_id?.trim() || undefined,
      }

      return await providersCreateCustomProvider({
        workspaceId,
        requestBody: payload,
      })
    },
    onSuccess: (provider) => {
      queryClient.invalidateQueries({ queryKey: ["providers", workspaceId] })
      toast({
        title: "已创建提供商",
        description: `已添加 ${provider.name}`,
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to create custom provider:", error)
      toast({
        title: "创建提供商失败",
        description: `${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
  })

  return {
    createCustomProvider,
    createCustomProviderIsPending,
    createCustomProviderError,
  }
}

export function useConnectMcpIntegration(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: connectMcpIntegration,
    isPending: connectMcpIntegrationIsPending,
    error: connectMcpIntegrationError,
  } = useMutation({
    mutationFn: async (params: MCPIntegrationCreate) => {
      return await mcpIntegrationsConnectMcpIntegration({
        workspaceId,
        requestBody: params,
      })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["mcp-integrations", workspaceId],
      })
      if (result.auth_url) {
        return
      }
      if (result.mcp_integration) {
        const verifying = result.mcp_integration.state !== "connected"
        if (verifying && result.mcp_integration.server_type === "stdio") {
          markStdioMcpVerificationStarted(
            queryClient,
            workspaceId,
            result.mcp_integration.id
          )
        }
        toast({
          title: verifying ? "已开始验证 MCP 集成" : "MCP 集成已连接",
          description: verifying
            ? `已添加 ${result.mcp_integration.name}；验证成功后将显示工具。`
            : `已添加 ${result.mcp_integration.name}`,
        })
      }
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to connect MCP integration:", error)
      toast({
        title: "连接 MCP 集成失败",
        description: getMcpOAuthConnectErrorDetail(error),
        variant: "destructive",
      })
    },
  })

  return {
    connectMcpIntegration,
    connectMcpIntegrationIsPending,
    connectMcpIntegrationError,
  }
}

export function useCreateMcpIntegration(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: createMcpIntegration,
    isPending: createMcpIntegrationIsPending,
    error: createMcpIntegrationError,
  } = useMutation({
    mutationFn: async (params: MCPIntegrationCreate) => {
      return await mcpIntegrationsCreateMcpIntegration({
        workspaceId,
        requestBody: params,
      })
    },
    onSuccess: (integration) => {
      queryClient.invalidateQueries({
        queryKey: ["mcp-integrations", workspaceId],
      })
      const verifying =
        integration.server_type === "stdio" && integration.state !== "connected"
      if (verifying) {
        markStdioMcpVerificationStarted(
          queryClient,
          workspaceId,
          integration.id
        )
      }
      toast({
        title: verifying ? "已开始验证 MCP 集成" : "已创建 MCP 集成",
        description: verifying
          ? `已添加 ${integration.name}；验证成功后将显示工具。`
          : `已添加 ${integration.name}`,
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to create MCP integration:", error)
      toast({
        title: "创建 MCP 集成失败",
        description: `${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
  })

  return {
    createMcpIntegration,
    createMcpIntegrationIsPending,
    createMcpIntegrationError,
  }
}

/**
 * List MCP integrations for a workspace.
 *
 * Pass `source` to restrict results to either platform-managed rows
 * (auto-created by an MCP OAuth provider) or workspace-authored rows. Omit
 * `source` to get every row, which is what agent presets and runtime
 * resolution need to look up an MCP integration by ID.
 */
export function useListMcpIntegrations(
  workspaceId: string,
  source?: McpIntegrationsListMcpIntegrationsData["source"],
  options?: { enabled?: boolean }
) {
  const enabled = Boolean(workspaceId) && (options?.enabled ?? true)
  const {
    data: mcpIntegrations,
    isLoading: mcpIntegrationsIsLoading,
    error: mcpIntegrationsError,
  } = useQuery<MCPIntegrationRead[], TracecatApiError>({
    queryKey: ["mcp-integrations", workspaceId, source],
    queryFn: async () =>
      await mcpIntegrationsListMcpIntegrations({ workspaceId, source }),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // When the list query is disabled, React Query still returns cached data, so
  // gate verification polling on the same enabled flag to avoid polling and
  // failure toasts on surfaces that opted out of MCP.
  useStdioMcpVerificationStatus({
    workspaceId,
    pendingIntegrationIds: enabled
      ? getPendingStdioMcpVerificationIds(mcpIntegrations)
      : [],
  })

  return {
    mcpIntegrations,
    mcpIntegrationsIsLoading,
    mcpIntegrationsError,
  }
}

export function useGetMcpIntegration(
  workspaceId: string,
  mcpIntegrationId: string | null
) {
  const {
    data: mcpIntegration,
    isLoading: mcpIntegrationIsLoading,
    error: mcpIntegrationError,
  } = useQuery<MCPIntegrationRead, TracecatApiError>({
    queryKey: ["mcp-integration", workspaceId, mcpIntegrationId],
    queryFn: async () =>
      await mcpIntegrationsGetMcpIntegration({
        workspaceId,
        mcpIntegrationId: mcpIntegrationId!,
      }),
    enabled: Boolean(workspaceId && mcpIntegrationId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  useStdioMcpVerificationStatus({
    workspaceId,
    pendingIntegrationIds: getPendingStdioMcpVerificationIds(
      mcpIntegration ? [mcpIntegration] : undefined
    ),
  })

  return {
    mcpIntegration,
    mcpIntegrationIsLoading,
    mcpIntegrationError,
  }
}

export function useUpdateMcpIntegration(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateMcpIntegration,
    isPending: updateMcpIntegrationIsPending,
    error: updateMcpIntegrationError,
  } = useMutation({
    mutationFn: async ({
      mcpIntegrationId,
      params,
    }: {
      mcpIntegrationId: string
      params: MCPIntegrationUpdate
    }) => {
      return await mcpIntegrationsUpdateMcpIntegration({
        workspaceId,
        mcpIntegrationId,
        requestBody: params,
      })
    },
    onSuccess: (integration) => {
      queryClient.invalidateQueries({
        queryKey: ["mcp-integrations", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["mcp-integration", workspaceId, integration.id],
      })
      toast({
        title: "已更新 MCP 集成",
        description: `已更新 ${integration.name}`,
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to update MCP integration:", error)
      toast({
        title: "更新 MCP 集成失败",
        description: `${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
  })

  return {
    updateMcpIntegration,
    updateMcpIntegrationIsPending,
    updateMcpIntegrationError,
  }
}

export function useUpdateMcpIntegrationToolPolicies(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateMcpIntegrationToolPolicies,
    isPending: updateMcpIntegrationToolPoliciesIsPending,
    error: updateMcpIntegrationToolPoliciesError,
  } = useMutation({
    mutationKey: ["update-mcp-integration-tool-policies", workspaceId],
    mutationFn: async ({
      mcpIntegrationId,
      tools,
    }: {
      mcpIntegrationId: string
      tools: MCPToolPolicyUpdate[]
    }) => {
      return await mcpIntegrationsUpdateMcpIntegrationToolPolicies({
        workspaceId,
        mcpIntegrationId,
        requestBody: { tools },
      })
    },
    // Optimistically patch the cached integration so policy switches flip
    // immediately instead of waiting for the round-trip and refetch.
    onMutate: async ({ mcpIntegrationId, tools }) => {
      const queryKey = ["mcp-integration", workspaceId, mcpIntegrationId]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<MCPIntegrationRead>(queryKey)
      if (previous?.tools) {
        const patches = new Map(tools.map((tool) => [tool.name, tool]))
        queryClient.setQueryData<MCPIntegrationRead>(queryKey, {
          ...previous,
          tools: previous.tools.map((tool) => {
            const patch = patches.get(tool.name)
            if (!patch) {
              return tool
            }
            return {
              ...tool,
              enabled: patch.enabled ?? tool.enabled,
              requires_approval:
                patch.requires_approval ?? tool.requires_approval,
            }
          }),
        })
      }
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to update MCP tool policy:", error)
      toast({
        title: "更新工具策略失败",
        description: `${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
    // Reconcile against the server once toggles settle instead of restoring a
    // per-mutation snapshot. Toggles run concurrently (no disable-all gating),
    // so restoring a stale snapshot on error would clobber a sibling toggle
    // that already succeeded. Refetching re-syncs to server truth — a failed
    // tool reverts, succeeded siblings stay. Only invalidate once this is the
    // last in-flight toggle (isMutating counts the current one as 1), so a
    // refetch can't overwrite siblings' still-pending optimistic patches.
    onSettled: (_data, _error, { mcpIntegrationId }) => {
      const stillInFlight = queryClient.isMutating({
        mutationKey: ["update-mcp-integration-tool-policies", workspaceId],
      })
      if (stillInFlight > 1) {
        return
      }
      queryClient.invalidateQueries({
        queryKey: ["mcp-integration", workspaceId, mcpIntegrationId],
      })
      queryClient.invalidateQueries({
        queryKey: ["mcp-integrations", workspaceId],
      })
    },
  })

  return {
    updateMcpIntegrationToolPolicies,
    updateMcpIntegrationToolPoliciesIsPending,
    updateMcpIntegrationToolPoliciesError,
  }
}

/**
 * Test connectivity to an HTTP MCP integration config.
 *
 * This hits the HTTP config-test endpoint and never persists discovered tools.
 * Stdio tests use {@link useTestMcpIntegrationConnection} because they must run
 * against saved integration rows.
 */
export function useTestMcpConnectionConfig(workspaceId: string) {
  const {
    mutateAsync: testMcpConnectionConfig,
    isPending: testMcpConnectionConfigIsPending,
    error: testMcpConnectionConfigError,
  } = useMutation({
    mutationFn: async (params: MCPIntegrationTestConnectionRequest) => {
      return await mcpIntegrationsTestMcpConnectionConfig({
        workspaceId,
        requestBody: params,
      })
    },
    onSuccess: (result) => {
      if (result.success) {
        const toolCount = result.tools?.length ?? 0
        toast({
          title: "连接已验证",
          description: `${toolCount} ${toolCount === 1 ? "个工具" : "个工具"}可用`,
        })
      } else {
        toast({
          title: "连接失败",
          description: sanitizeUrlsInText(result.error || result.message),
          variant: "destructive",
        })
      }
    },
    onError: (error: TracecatApiError) => {
      // The server URI is caller-controlled and may carry credentials in its
      // userinfo/query; strip those from any URLs before logging or surfacing.
      const detail = sanitizeUrlsInText(
        getApiErrorDetail(error) ?? error.message
      )
      console.error("Failed to test MCP connection:", detail)
      toast({
        title: "测试失败",
        description: `无法测试连接：${detail}`,
        variant: "destructive",
      })
    },
  })

  return {
    testMcpConnectionConfig,
    testMcpConnectionConfigIsPending,
    testMcpConnectionConfigError,
  }
}

/**
 * Test connectivity to a saved MCP integration and persist its tool listing.
 *
 * Unlike {@link useTestMcpConnectionConfig} (which hits the HTTP config-test
 * endpoint and never persists), this calls the integration-scoped endpoint
 * that refreshes and stores the discovered tools. On success it invalidates the
 * integration query so the Tools list reflects the new verification result.
 */
export function useTestMcpIntegrationConnection(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: testMcpIntegrationConnection,
    isPending: testMcpIntegrationConnectionIsPending,
    error: testMcpIntegrationConnectionError,
  } = useMutation({
    mutationFn: async (mcpIntegrationId: string) => {
      return await mcpIntegrationsTestMcpIntegrationConnection({
        workspaceId,
        mcpIntegrationId,
      })
    },
    onSuccess: (result, mcpIntegrationId) => {
      // Tools are refreshed on success and preserved on failure, so refresh the
      // integration regardless of outcome.
      queryClient.invalidateQueries({
        queryKey: ["mcp-integration", workspaceId, mcpIntegrationId],
      })
      queryClient.invalidateQueries({
        queryKey: ["mcp-integrations", workspaceId],
      })
      if (result.success) {
        const toolCount = result.tools?.length ?? 0
        toast({
          title: "连接已验证",
          description: `${toolCount} ${toolCount === 1 ? "个工具" : "个工具"}可用`,
        })
      } else {
        toast({
          title: "连接失败",
          description: sanitizeUrlsInText(result.error || result.message),
          variant: "destructive",
        })
      }
    },
    onError: (error: TracecatApiError) => {
      const detail = sanitizeUrlsInText(
        getApiErrorDetail(error) ?? error.message
      )
      console.error("Failed to test MCP connection:", detail)
      toast({
        title: "测试失败",
        description: `无法测试连接：${detail}`,
        variant: "destructive",
      })
    },
  })

  return {
    testMcpIntegrationConnection,
    testMcpIntegrationConnectionIsPending,
    testMcpIntegrationConnectionError,
  }
}

export function useDeleteMcpIntegration(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: deleteMcpIntegration,
    isPending: deleteMcpIntegrationIsPending,
    error: deleteMcpIntegrationError,
  } = useMutation({
    mutationFn: async (mcpIntegrationId: string) => {
      return await mcpIntegrationsDeleteMcpIntegration({
        workspaceId,
        mcpIntegrationId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mcp-integrations", workspaceId],
      })
      // Also refresh OAuth providers/integrations since the backing OAuth
      // integration is disconnected on the backend
      queryClient.invalidateQueries({
        queryKey: ["providers", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["integrations", workspaceId],
      })
      toast({
        title: "已删除 MCP 集成",
        description: "已移除此集成",
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to delete MCP integration:", error)
      toast({
        title: "删除 MCP 集成失败",
        description: `${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
  })

  return {
    deleteMcpIntegration,
    deleteMcpIntegrationIsPending,
    deleteMcpIntegrationError,
  }
}

export function useIntegrationProvider({
  providerId,
  workspaceId,
  grantType,
}: {
  providerId: string
  workspaceId: string
  grantType?: OAuthGrantType
}) {
  const queryClient = useQueryClient()

  // Read
  const {
    data: integration,
    isLoading: integrationIsLoading,
    error: integrationError,
  } = useQuery<IntegrationRead | null, TracecatApiError>({
    queryKey: ["integration", providerId, workspaceId, grantType],
    queryFn: async () => {
      try {
        return await integrationsGetIntegration({
          providerId,
          workspaceId,
          grantType,
        })
      } catch (error) {
        // No integration row yet means the provider is not configured.
        if (error instanceof ApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    retry: retryHandler,
    enabled: Boolean(providerId && workspaceId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Get provider schema
  const {
    data: provider,
    isLoading: providerIsLoading,
    error: providerError,
  } = useQuery<ProviderRead, TracecatApiError>({
    queryKey: ["provider-schema", providerId, workspaceId, grantType],
    queryFn: async () =>
      await providersGetProvider({ providerId, workspaceId, grantType }),
    enabled: Boolean(providerId && workspaceId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Update
  const {
    mutateAsync: updateIntegration,
    isPending: updateIntegrationIsPending,
    error: updateIntegrationError,
  } = useMutation({
    mutationFn: async (params: IntegrationUpdate) =>
      await integrationsUpdateIntegration({
        providerId,
        workspaceId,
        grantType,
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["integration", providerId, workspaceId, grantType],
      })
      queryClient.invalidateQueries({
        queryKey: ["providers", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["provider-schema", providerId, workspaceId, grantType],
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to update integration:", error)
      toast({
        title: "更新失败",
        description: `无法更新集成：${JSON.stringify(error.body?.detail) || error.message}`,
      })
    },
  })

  // Connect to provider
  const {
    mutateAsync: connectProvider,
    isPending: connectProviderIsPending,
    error: connectProviderError,
  } = useMutation({
    mutationFn: async (providerId: string) =>
      await integrationsConnectProvider({ providerId, workspaceId }),
    onSuccess: (result) => {
      // Redirect to OAuth provider if auth_url is returned
      window.location.href = result.auth_url
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to connect provider:", error)
      toast({
        title: "连接失败",
        description: `无法连接提供商：${error.body?.detail || error.message}`,
      })
    },
  })

  // Disconnect from provider
  const {
    mutateAsync: disconnectProvider,
    isPending: disconnectProviderIsPending,
    error: disconnectProviderError,
  } = useMutation({
    mutationFn: async (providerId: string) =>
      await integrationsDisconnectIntegration({ providerId, workspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["integration", providerId, workspaceId, grantType],
      })
      queryClient.invalidateQueries({
        queryKey: ["providers", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["provider-schema", providerId, workspaceId, grantType],
      })
      toast({
        title: "已断开",
        description: "已成功断开提供商连接",
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to disconnect provider:", error)
      toast({
        title: "断开连接失败",
        description: `无法断开提供商连接：${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
  })

  const {
    mutateAsync: deleteIntegration,
    isPending: deleteIntegrationIsPending,
    error: deleteIntegrationError,
  } = useMutation({
    mutationFn: async (providerId: string) =>
      await integrationsDeleteIntegration({
        providerId,
        workspaceId,
        grantType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["integration", providerId, workspaceId, grantType],
      })
      queryClient.invalidateQueries({
        queryKey: ["providers", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["provider-schema", providerId, workspaceId, grantType],
      })
      toast({
        title: "已删除连接",
        description: "已移除集成配置",
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to delete integration:", error)
      toast({
        title: "删除失败",
        description: `无法删除集成：${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
  })

  // Test connection for client credentials providers
  const {
    mutateAsync: testConnection,
    isPending: testConnectionIsPending,
    error: testConnectionError,
  } = useMutation({
    mutationFn: async (providerId: string) =>
      await integrationsTestConnection({ providerId, workspaceId }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ["integration", providerId, workspaceId, grantType],
        })
        queryClient.invalidateQueries({
          queryKey: ["providers", workspaceId],
        })
        queryClient.invalidateQueries({
          queryKey: ["provider-schema", providerId, workspaceId, grantType],
        })
        toast({
          title: "连接成功",
          description: result.message,
        })
      } else {
        toast({
          title: "连接失败",
          description: result.error || result.message,
          variant: "destructive",
        })
      }
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to test connection:", error)
      toast({
        title: "测试失败",
        description: `无法测试连接：${error.body?.detail || error.message}`,
        variant: "destructive",
      })
    },
  })

  return {
    integration,
    integrationIsLoading,
    integrationError,
    updateIntegration,
    updateIntegrationIsPending,
    updateIntegrationError,
    connectProvider,
    connectProviderIsPending,
    connectProviderError,
    disconnectProvider,
    disconnectProviderIsPending,
    disconnectProviderError,
    deleteIntegration,
    deleteIntegrationIsPending,
    deleteIntegrationError,
    testConnection,
    testConnectionIsPending,
    testConnectionError,
    provider,
    providerIsLoading,
    providerError,
  }
}

// Agent hooks
interface UseAgentSessionsOptions {
  enabled?: boolean
  autoRefresh?: boolean
}

export function useAgentSessions(
  { workspaceId }: AgentSessionsListSessionsData,
  options?: UseAgentSessionsOptions
) {
  const autoRefreshEnabled = options?.autoRefresh ?? true
  /**
   * Computes the refetch interval for agent sessions based on current state.
   *
   * Returns `false` to disable polling when:
   * - Auto-refresh is disabled
   * - The browser tab is hidden
   *
   * Returns dynamic intervals based on session state:
   * - 3000ms (3s): When there are pending approvals or active sessions (RUNNING/CONTINUED_AS_NEW)
   * - 10000ms (10s): Default interval when sessions exist but are idle
   * - 10000ms (10s): When no sessions exist
   *
   * This adaptive polling reduces server load while ensuring timely updates for active workflows.
   */
  const computeRefetchInterval = useCallback(
    (
      query: Query<
        AgentSessionsListSessionsResponse,
        TracecatApiError,
        AgentSessionsListSessionsResponse,
        readonly unknown[]
      >
    ) => {
      if (!autoRefreshEnabled) {
        return false
      }

      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return false
      }

      const data = query.state.data

      if (!data || data.length === 0) {
        return 10000
      }

      const enrichedSessions = data.map(enrichAgentSession)

      const hasPendingApproval = enrichedSessions.some(
        (session) => session.pendingApprovalCount > 0
      )
      if (hasPendingApproval) {
        return 3000
      }

      const hasActiveSession = enrichedSessions.some((session) =>
        ["RUNNING", "CONTINUED_AS_NEW"].includes(session.derivedStatus)
      )
      if (hasActiveSession) {
        return 3000
      }

      return 10000
    },
    [autoRefreshEnabled]
  )
  const {
    data: sessions,
    isLoading: sessionsIsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery<
    AgentSessionsListSessionsResponse,
    TracecatApiError,
    AgentSessionWithStatus[]
  >({
    queryKey: ["agent-sessions", workspaceId],
    queryFn: async () => await agentSessionsListSessions({ workspaceId }),
    select: (data) => data.map(enrichAgentSession),
    enabled: options?.enabled ?? Boolean(workspaceId),
    retry: retryHandler,
    refetchInterval: computeRefetchInterval,
  })

  return {
    sessions,
    sessionsIsLoading,
    sessionsError,
    refetchSessions,
  }
}

/**
 * Fetch the AI models enabled for the given workspace, each labelled with its
 * custom provider, and the workspace's default model. Use this anywhere a
 * workspace-scoped picker should only show models the workspace may use.
 */
export function useWorkspaceAgentModels(
  workspaceId: string | null | undefined
) {
  const {
    data,
    isLoading: modelsLoading,
    error: modelsError,
  } = useQuery<WorkspaceAgentModelListResponse, ApiError>({
    queryKey: ["workspace", workspaceId, "agent-models"],
    // The full effective set, unpaginated; org enablement keeps it small.
    queryFn: async () =>
      await getWorkspaceModels({ workspaceId: workspaceId as string }),
    enabled: Boolean(workspaceId),
    retry: retryHandler,
  })

  return {
    models: data?.items,
    /** The org default model, when it is enabled for this workspace. */
    defaultCatalogId: data?.default_catalog_id ?? null,
    /** Whether the org has a default model, enabled here or not. */
    hasOrgDefault: data?.has_org_default ?? false,
    /** The workspace has a subset, and the org disabled every model in it. */
    workspaceSubsetDisabled: data?.workspace_subset_disabled ?? false,
    modelsLoading,
    modelsError,
  }
}

export function useModelProvidersStatus() {
  const {
    data: providersStatus,
    isLoading,
    error,
    refetch,
  } = useQuery<AgentGetProvidersStatusResponse>({
    queryKey: ["agent-providers-status"],
    queryFn: async () => await agentGetProvidersStatus(),
  })

  return {
    providersStatus,
    isLoading,
    error,
    refetch,
  }
}

export function useAgentDefaultModel() {
  const queryClient = useQueryClient()

  const {
    data: defaultModel,
    isLoading: defaultModelLoading,
    error: defaultModelError,
  } = useQuery<string | null>({
    queryKey: ["agent-default-model"],
    queryFn: async () => await agentGetDefaultModel(),
  })

  const {
    data: defaultModelSelection,
    isLoading: defaultModelSelectionLoading,
    error: defaultModelSelectionError,
  } = useQuery<DefaultModelSelection | null>({
    queryKey: ["agent-default-model-selection"],
    queryFn: async () => await agentGetDefaultModelSelection(),
  })

  const {
    mutateAsync: updateDefaultModel,
    isPending: isUpdating,
    error: updateError,
  } = useMutation({
    mutationFn: async (catalogId: string) =>
      await agentSetDefaultModel({
        requestBody: { catalog_id: catalogId },
      }),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-default-model"] })
      queryClient.invalidateQueries({
        queryKey: ["agent-default-model-selection"],
      })
      // Workspace pages read the default through their agent-models view.
      queryClient.invalidateQueries({
        queryKey: ["workspace"],
        predicate: (query) => query.queryKey[2] === "agent-models",
      })
    },
  })

  return {
    defaultModel,
    defaultModelSelection,
    defaultModelSelectionLoading,
    defaultModelSelectionError,
    defaultModelLoading: defaultModelLoading || defaultModelSelectionLoading,
    defaultModelError: defaultModelError ?? defaultModelSelectionError,
    updateDefaultModel,
    isUpdating,
    updateError,
  }
}

export function useAgentCredentials() {
  const queryClient = useQueryClient()

  // Create credentials
  const {
    mutateAsync: createCredentials,
    isPending: isCreating,
    error: createError,
  } = useMutation({
    mutationFn: async (data: ModelCredentialCreate) =>
      await agentCreateProviderCredentials({
        requestBody: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-providers-status"] })
    },
  })

  // Update credentials
  const {
    mutateAsync: updateCredentials,
    isPending: isUpdating,
    error: updateError,
  } = useMutation({
    mutationFn: async ({
      provider,
      credentials,
    }: {
      provider: string
      credentials: ModelCredentialUpdate
    }) =>
      await agentUpdateProviderCredentials({
        provider,
        requestBody: credentials,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-providers-status"] })
    },
  })

  // Delete credentials
  const {
    mutateAsync: deleteCredentials,
    isPending: isDeleting,
    error: deleteError,
  } = useMutation({
    mutationFn: async (provider: string) =>
      await agentDeleteProviderCredentials({
        provider,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-providers-status"] })
    },
  })

  return {
    createCredentials,
    updateCredentials,
    deleteCredentials,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    updateError,
    deleteError,
  }
}

export function useProviderCredentialConfigs() {
  const {
    data: providerConfigs,
    isLoading: providerConfigsLoading,
    error: providerConfigsError,
  } = useQuery<ProviderCredentialConfig[]>({
    queryKey: ["agent-provider-credential-configs"],
    queryFn: async () => await agentListProviderCredentialConfigs(),
  })

  return {
    providerConfigs,
    providerConfigsLoading,
    providerConfigsError,
  }
}

export function useProviderCredentialConfig(provider: string | null) {
  const {
    data: providerConfig,
    isLoading: providerConfigLoading,
    error: providerConfigError,
  } = useQuery<AgentGetProviderCredentialConfigResponse>({
    queryKey: ["agent-provider-credential-config", provider],
    queryFn: async () => {
      if (!provider) {
        throw new Error("Provider is required")
      }
      return await agentGetProviderCredentialConfig({ provider })
    },
    enabled: !!provider,
  })

  return {
    providerConfig,
    providerConfigLoading,
    providerConfigError,
  }
}

export function useDeleteProviderCredentials() {
  const queryClient = useQueryClient()

  const mutation = useMutation<void, ApiError, string>({
    mutationFn: async (provider: string) => {
      await agentDeleteProviderCredentials({ provider })
    },
    onSuccess: () => {
      // Invalidate and refetch provider status
      queryClient.invalidateQueries({
        queryKey: ["agent-providers-status"],
      })
    },
    onError: toastMutationError("deleting the provider credentials"),
  })

  return {
    deleteProviderCredentials: mutation.mutate,
    isDeletingCredentials: mutation.isPending,
    deleteCredentialsError: mutation.error,
  }
}

/**
 * Are we ready to chat?
 * Returns { ready, reason, modelInfo }
 *  ready   – boolean
 *  reason  – "no_model" | "default_not_enabled" | "subset_disabled" | null
 *  modelInfo – model info (if any)
 *
 * Without a model override, chat uses the org default model if it is enabled
 * for the workspace. Catalog entries are server-validated, so the frontend
 * does not gate on provider credentials. Runtime invocation errors surface
 * through the normal send-error path.
 */

interface ChatReadinessOptions {
  modelOverride?: {
    name: string
    provider: string
    baseUrl?: string | null
  }
}

export function useChatReadiness(
  workspaceId: string | null | undefined,
  options?: ChatReadinessOptions
) {
  const {
    models,
    defaultCatalogId,
    hasOrgDefault,
    workspaceSubsetDisabled,
    modelsLoading,
  } = useWorkspaceAgentModels(workspaceId)
  const modelOverride = options?.modelOverride

  if (modelsLoading) {
    return {
      ready: false,
      loading: true,
    }
  }

  if (modelOverride) {
    const modelInfo: ModelInfo = {
      name: modelOverride.name,
      provider: modelOverride.provider,
      baseUrl: modelOverride.baseUrl ?? null,
    }
    return {
      ready: true,
      loading: false,
      modelInfo,
    }
  }

  /* no default model, or it is not enabled for this workspace */
  const modelCfg = defaultCatalogId
    ? (models?.find((model) => model.id === defaultCatalogId) ?? null)
    : null
  if (!modelCfg) {
    let reason = "no_model"
    if (workspaceSubsetDisabled) {
      reason = "subset_disabled"
    } else if (hasOrgDefault) {
      reason = "default_not_enabled"
    }
    return {
      ready: false,
      loading: false,
      reason,
    }
  }

  const modelInfo: ModelInfo = {
    name: modelCfg.model_name,
    provider: modelCfg.model_provider,
    baseUrl: modelCfg.custom_provider_base_url ?? null,
  }
  return {
    ready: true,
    loading: false,
    modelInfo,
  }
}

interface UseDragDividerOptions {
  /** Current size (width for vertical divider, height for horizontal) in pixels */
  value: number
  /** Callback fired with the new size while dragging */
  onChange: (newSize: number) => void
  /** Orientation of the divider. Defaults to "vertical" (i.e. a vertical bar that resizes width) */
  orientation?: "vertical" | "horizontal"
  /** Minimum size constraint in pixels */
  min?: number
  /** Maximum size constraint in pixels */
  max?: number
}

/**
 * Hook for handling drag divider logic.
 * Returns mouse event handlers to be attached to the drag handle element.
 *
 * This implementation avoids useEffect and global event listeners by using
 * React's onMouseDown/onMouseMove/onMouseUp events with pointer capture.
 */
export function useDragDivider({
  value,
  onChange,
  orientation = "vertical",
  min = 400,
  max = 600,
}: UseDragDividerOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ coord: 0, size: 0 })

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()

      // Capture the pointer to receive all mouse events
      e.currentTarget.setPointerCapture(e.pointerId)

      const startCoord = orientation === "vertical" ? e.clientX : e.clientY
      dragStartRef.current = { coord: startCoord, size: value }
      setIsDragging(true)
    },
    [orientation, value]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!isDragging) return

      const currentCoord = orientation === "vertical" ? e.clientX : e.clientY
      const delta = dragStartRef.current.coord - currentCoord
      const newSize = Math.min(
        Math.max(dragStartRef.current.size + delta, min),
        max
      )
      onChange(newSize)
    },
    [isDragging, orientation, min, max, onChange]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!isDragging) return

      // Release the pointer capture
      e.currentTarget.releasePointerCapture(e.pointerId)
      setIsDragging(false)
    },
    [isDragging]
  )

  // Handle cases where the pointer is lost (e.g., window loses focus)
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!isDragging) return

      e.currentTarget.releasePointerCapture(e.pointerId)
      setIsDragging(false)
    },
    [isDragging]
  )

  return {
    isDragging,
    dragHandleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      style: {
        cursor: orientation === "vertical" ? "col-resize" : "row-resize",
      },
    },
  }
}

export function useWorkspaceSettings(
  workspaceId: string,
  onWorkspaceDeleted?: () => void
) {
  const queryClient = useQueryClient()

  // Update workspace
  const { mutateAsync: updateWorkspace, isPending: isUpdating } = useMutation({
    mutationFn: async (params: WorkspaceUpdate) => {
      return await workspacesUpdateWorkspace({
        workspaceId,
        requestBody: params,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] })
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      toast({
        title: "已更新工作空间",
        description: "工作空间设置更新成功。",
      })
    },
    onError: (error) => {
      console.error("Failed to update workspace", error)
      toast({
        title: "更新工作空间出错",
        description: "更新工作空间失败，请重试。",
        variant: "destructive",
      })
    },
  })

  // Delete workspace
  const { mutateAsync: deleteWorkspace, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      return await workspacesDeleteWorkspace({
        workspaceId,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      toast({
        title: "已删除工作空间",
        description: "工作空间删除成功。",
      })
      onWorkspaceDeleted?.()
    },
    onError: (error) => {
      console.error("Failed to delete workspace", error)
      toast({
        title: "删除工作空间出错",
        description: "删除工作空间失败，请重试。",
        variant: "destructive",
      })
    },
  })

  return {
    updateWorkspace,
    isUpdating,
    deleteWorkspace,
    isDeleting,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch the current user's effective scopes.
 *
 * When `workspaceId` is provided, workspace-specific role assignments are
 * included in effective scope computation.
 */
export function useUserScopes(
  workspaceId?: string,
  options?: {
    enabled?: boolean
  }
) {
  const {
    data: userScopes,
    isLoading,
    error,
  } = useQuery<UserScopesRead>({
    queryKey: ["user-scopes", workspaceId ?? null],
    queryFn: async () => {
      if (!workspaceId) {
        return await usersGetMyScopes()
      }

      const response = await apiClient.get<UserScopesRead>("/users/me/scopes", {
        params: { workspace_id: workspaceId },
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
  })

  return {
    userScopes,
    isLoading,
    error,
  }
}

/**
 * Hook to manage RBAC scopes.
 */
export function useRbacScopes(options?: {
  includeSystem?: boolean
  source?: ScopeSource
}) {
  const queryClient = useQueryClient()

  // List scopes
  const {
    data: scopes,
    isLoading,
    error,
  } = useQuery<ScopeRead[]>({
    queryKey: ["rbac-scopes", options?.includeSystem, options?.source],
    queryFn: async () => {
      const response = await rbacListScopes({
        includeSystem: options?.includeSystem ?? true,
        source: options?.source,
      })
      return response.items
    },
  })

  // Create scope
  const {
    mutateAsync: createScope,
    isPending: createScopeIsPending,
    error: createScopeError,
  } = useMutation({
    mutationFn: async (params: ScopeCreate) =>
      await rbacCreateScope({ requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-scopes"] })
      toast({
        title: "已创建权限范围",
        description: "自定义权限范围创建成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "权限范围无效",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有创建权限范围的权限。",
            variant: "destructive",
          })
          break
        case 409:
          toast({
            title: "权限范围已存在",
            description: "已存在同名权限范围。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "创建权限范围失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Delete scope
  const {
    mutateAsync: deleteScope,
    isPending: deleteScopeIsPending,
    error: deleteScopeError,
  } = useMutation({
    mutationFn: async (scopeId: string) => await rbacDeleteScope({ scopeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-scopes"] })
      toast({
        title: "已删除权限范围",
        description: "自定义权限范围删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "无法删除权限范围",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有删除权限范围的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到权限范围",
            description: "此权限范围不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "删除权限范围失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  return {
    scopes: scopes ?? [],
    isLoading,
    error,
    createScope,
    createScopeIsPending,
    createScopeError,
    deleteScope,
    deleteScopeIsPending,
    deleteScopeError,
  }
}

/**
 * Hook to manage RBAC roles.
 */
export function useRbacRoles(options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  const enabled = options.enabled ?? true

  // List roles (org-level, shared across all workspaces)
  const {
    data: roles,
    isLoading,
    error,
  } = useQuery<RoleReadWithScopes[]>({
    queryKey: ["rbac-roles", "org"],
    queryFn: async () => {
      const response = await rbacListRoles()
      return response.items
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Get single role
  const getRole = useCallback(
    async (roleId: string): Promise<RoleReadWithScopes> => {
      return await rbacGetRole({ roleId })
    },
    []
  )

  // Create role
  const {
    mutateAsync: createRole,
    isPending: createRoleIsPending,
    error: createRoleError,
  } = useMutation({
    mutationFn: async (params: RoleCreate) =>
      await rbacCreateRole({ requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-roles", "org"] })
      toast({
        title: "已创建角色",
        description: "自定义角色创建成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "角色无效",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有创建角色的权限。",
            variant: "destructive",
          })
          break
        case 409:
          toast({
            title: "角色已存在",
            description: "已存在同名角色。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "创建角色失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Update role
  const {
    mutateAsync: updateRole,
    isPending: updateRoleIsPending,
    error: updateRoleError,
  } = useMutation({
    mutationFn: async ({
      roleId,
      ...params
    }: RoleUpdate & { roleId: string }) =>
      await rbacUpdateRole({ roleId, requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-roles", "org"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已更新角色",
        description: "角色更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "无法修改角色",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有更新角色的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到角色",
            description: "此角色不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "更新角色失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Delete role
  const {
    mutateAsync: deleteRole,
    isPending: deleteRoleIsPending,
    error: deleteRoleError,
  } = useMutation({
    mutationFn: async (roleId: string) => await rbacDeleteRole({ roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-roles", "org"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已删除角色",
        description: "角色删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "无法删除角色",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有删除角色的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到角色",
            description: "此角色不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "删除角色失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  return {
    roles: roles ?? [],
    isLoading,
    error,
    getRole,
    createRole,
    createRoleIsPending,
    createRoleError,
    updateRole,
    updateRoleIsPending,
    updateRoleError,
    deleteRole,
    deleteRoleIsPending,
    deleteRoleError,
  }
}

/** Short reason for a failed add of one user to an RBAC group. */
function getAddGroupMemberFailureReason(error: unknown): string {
  const apiError = error as Partial<TracecatApiError>
  const detail = apiError.body?.detail
  if (typeof detail === "string") {
    return detail
  }
  switch (apiError.status) {
    case 403:
      return "你没有添加用户组成员的权限。"
    case 404:
      return "用户组或用户不存在。"
    case 409:
      return "此用户已是用户组成员。"
    default:
      return "添加成员失败"
  }
}

/**
 * Hook to manage RBAC groups.
 */
export function useRbacGroups() {
  const queryClient = useQueryClient()

  // List groups (org-level, shared across all workspaces)
  const {
    data: groups,
    isLoading,
    error,
  } = useQuery<GroupReadWithMembers[]>({
    queryKey: ["rbac-groups", "org"],
    queryFn: async () => {
      const response = await rbacListGroups()
      return response.items
    },
  })

  // Create group
  const {
    mutateAsync: createGroup,
    isPending: createGroupIsPending,
    error: createGroupError,
  } = useMutation({
    mutationFn: async (params: GroupCreate) =>
      await rbacCreateGroup({ requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-groups", "org"] })
      toast({
        title: "已创建用户组",
        description: "用户组创建成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "用户组无效",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有创建用户组的权限。",
            variant: "destructive",
          })
          break
        case 409:
          toast({
            title: "用户组已存在",
            description: "已存在同名用户组。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "创建用户组失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Update group
  const {
    mutateAsync: updateGroup,
    isPending: updateGroupIsPending,
    error: updateGroupError,
  } = useMutation({
    mutationFn: async ({
      groupId,
      ...params
    }: GroupUpdate & { groupId: string }) =>
      await rbacUpdateGroup({ groupId, requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-groups", "org"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已更新用户组",
        description: "用户组更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "权限不足",
            description: "你没有更新用户组的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到用户组",
            description: "此用户组不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "更新用户组失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Delete group
  const {
    mutateAsync: deleteGroup,
    isPending: deleteGroupIsPending,
    error: deleteGroupError,
  } = useMutation({
    mutationFn: async (groupId: string) => await rbacDeleteGroup({ groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-groups", "org"] })
      queryClient.invalidateQueries({ queryKey: ["rbac-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已删除用户组",
        description: "用户组删除成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "权限不足",
            description: "你没有删除用户组的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到用户组",
            description: "此用户组不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "删除用户组失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Add group members. There is no bulk endpoint, so add users one by one.
  const {
    mutateAsync: addGroupMembers,
    isPending: addGroupMembersIsPending,
    error: addGroupMembersError,
  } = useMutation({
    mutationFn: async ({
      groupId,
      userIds,
    }: {
      groupId: string
      userIds: string[]
    }) => {
      // Each add takes an organization-wide lock, so run them one at a time.
      const failures: { userId: string; reason: string }[] = []
      for (const userId of userIds) {
        try {
          await rbacAddGroupMember({
            groupId,
            requestBody: { user_id: userId },
          })
        } catch (error) {
          failures.push({
            userId,
            reason: getAddGroupMemberFailureReason(error),
          })
        }
      }
      return {
        failedUserIds: failures.map((failure) => failure.userId),
        failures,
      }
    },
    onSuccess: ({ failedUserIds, failures }, { userIds }) => {
      queryClient.invalidateQueries({ queryKey: ["rbac-groups", "org"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      const total = userIds.length
      const noun = "位成员"
      if (failedUserIds.length > 0) {
        toast({
          title: `已添加 ${total - failedUserIds.length}/${total} ${noun}`,
          description: [
            ...new Set(failures.map((failure) => failure.reason)),
          ].join("\n"),
          variant: "destructive",
        })
        return
      }
      toast({ title: `已添加 ${total} ${noun}` })
    },
  })

  // Remove group member
  const {
    mutateAsync: removeGroupMember,
    isPending: removeGroupMemberIsPending,
    error: removeGroupMemberError,
  } = useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string
      userId: string
    }) => await rbacRemoveGroupMember({ groupId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-groups", "org"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已移除成员",
        description: "已成功从用户组移除成员。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "权限不足",
            description: "你没有移除用户组成员的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到",
            description: "用户组或成员不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "移除成员失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  return {
    groups: groups ?? [],
    isLoading,
    error,
    createGroup,
    createGroupIsPending,
    createGroupError,
    updateGroup,
    updateGroupIsPending,
    updateGroupError,
    deleteGroup,
    deleteGroupIsPending,
    deleteGroupError,
    addGroupMembers,
    addGroupMembersIsPending,
    addGroupMembersError,
    removeGroupMember,
    removeGroupMemberIsPending,
    removeGroupMemberError,
  }
}

/**
 * Hook to fetch a single RBAC group with its members.
 */
export function useRbacGroup(groupId: string) {
  const {
    data: group,
    isLoading,
    error,
  } = useQuery<GroupReadWithMembers>({
    queryKey: ["rbac-groups", "org", groupId],
    queryFn: async () => await rbacGetGroup({ groupId }),
  })

  return { group, isLoading, error }
}

/**
 * Hook to manage RBAC group assignments.
 */
export function useRbacAssignments(options?: {
  groupId?: string
  workspaceId?: string
}) {
  const queryClient = useQueryClient()

  // List assignments
  const {
    data: assignments,
    isLoading,
    error,
  } = useQuery<GroupRoleAssignmentReadWithDetails[]>({
    queryKey: ["rbac-assignments", options?.groupId, options?.workspaceId],
    queryFn: async () => {
      const response = await rbacListAssignments({
        groupId: options?.groupId,
        workspaceId: options?.workspaceId,
      })
      return response.items
    },
  })

  // Create assignment
  const {
    mutateAsync: createAssignment,
    isPending: createAssignmentIsPending,
    error: createAssignmentError,
  } = useMutation({
    mutationFn: async (params: GroupRoleAssignmentCreate) =>
      await rbacCreateAssignment({ requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["user-scopes"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已创建授权",
        description: "已成功为用户组分配角色。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "授权无效",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有创建授权的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到",
            description: "用户组、角色或工作空间不存在。",
            variant: "destructive",
          })
          break
        case 409:
          toast({
            title: "授权已存在",
            description: "此用户组已有此范围的授权。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "创建授权失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Update assignment
  const {
    mutateAsync: updateAssignment,
    isPending: updateAssignmentIsPending,
    error: updateAssignmentError,
  } = useMutation({
    mutationFn: async ({
      assignmentId,
      ...params
    }: GroupRoleAssignmentUpdate & { assignmentId: string }) =>
      await rbacUpdateAssignment({ assignmentId, requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["user-scopes"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已更新授权",
        description: "授权更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "权限不足",
            description: "你没有更新授权的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到",
            description: "授权或角色不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "更新授权失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Delete assignment
  const {
    mutateAsync: deleteAssignment,
    isPending: deleteAssignmentIsPending,
    error: deleteAssignmentError,
  } = useMutation({
    mutationFn: async (assignmentId: string) =>
      await rbacDeleteAssignment({ assignmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac-assignments"] })
      queryClient.invalidateQueries({ queryKey: ["user-scopes"] })
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({
        title: "已删除授权",
        description: "已成功移除授权。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "权限不足",
            description: "你没有删除授权的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到",
            description: "此授权不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "删除授权失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  return {
    assignments: assignments ?? [],
    isLoading,
    error,
    createAssignment,
    createAssignmentIsPending,
    createAssignmentError,
    updateAssignment,
    updateAssignmentIsPending,
    updateAssignmentError,
    deleteAssignment,
    deleteAssignmentIsPending,
    deleteAssignmentError,
  }
}

/**
 * Hook to manage RBAC user role assignments (direct user-to-role assignments).
 */
export function useRbacUserAssignments(options?: {
  userId?: string
  workspaceId?: string
  enabled?: boolean
}) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled ?? true

  const invalidateAssignmentQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["rbac-user-assignments"] }),
      queryClient.invalidateQueries({ queryKey: ["user-scopes"] }),
      queryClient.invalidateQueries({ queryKey: ["org-members"] }),
    ])
  }

  // List user assignments
  const {
    data: userAssignments,
    isLoading,
    error,
  } = useQuery<UserRoleAssignmentReadWithDetails[]>({
    queryKey: ["rbac-user-assignments", options?.userId, options?.workspaceId],
    queryFn: async () => {
      const response = await rbacListUserAssignments({
        userId: options?.userId,
        workspaceId: options?.workspaceId,
      })
      return response.items
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // Create user assignment
  const {
    mutateAsync: createUserAssignment,
    isPending: createUserAssignmentIsPending,
    error: createUserAssignmentError,
  } = useMutation({
    mutationFn: async (params: UserRoleAssignmentCreate) =>
      await rbacCreateUserAssignment({ requestBody: params }),
    onSuccess: async () => {
      await invalidateAssignmentQueries()
      toast({
        title: "已创建用户授权",
        description: "已成功为用户分配角色。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 400:
          toast({
            title: "授权无效",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
          break
        case 403:
          toast({
            title: "权限不足",
            description: "你没有创建用户授权的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到",
            description: "用户、角色或工作空间不存在。",
            variant: "destructive",
          })
          break
        case 409:
          toast({
            title: "授权已存在",
            description: "此用户已有此范围的授权。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "创建用户授权失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Update user assignment
  const {
    mutateAsync: updateUserAssignment,
    isPending: updateUserAssignmentIsPending,
    error: updateUserAssignmentError,
  } = useMutation({
    mutationFn: async ({
      assignmentId,
      ...params
    }: UserRoleAssignmentUpdate & { assignmentId: string }) =>
      await rbacUpdateUserAssignment({ assignmentId, requestBody: params }),
    onSuccess: async () => {
      await invalidateAssignmentQueries()
      toast({
        title: "已更新用户授权",
        description: "用户授权更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "权限不足",
            description: "你没有更新用户授权的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到",
            description: "授权或角色不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "更新用户授权失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  // Delete user assignment
  const {
    mutateAsync: deleteUserAssignment,
    isPending: deleteUserAssignmentIsPending,
    error: deleteUserAssignmentError,
  } = useMutation({
    mutationFn: async (assignmentId: string) =>
      await rbacDeleteUserAssignment({ assignmentId }),
    onSuccess: async () => {
      await invalidateAssignmentQueries()
      toast({
        title: "已删除用户授权",
        description: "已成功移除用户授权。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "权限不足",
            description: "你没有删除用户授权的权限。",
            variant: "destructive",
          })
          break
        case 404:
          toast({
            title: "未找到",
            description: "此授权不存在。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "删除用户授权失败",
            description: String(error.body?.detail ?? error.message),
            variant: "destructive",
          })
      }
    },
  })

  return {
    userAssignments: userAssignments ?? [],
    isLoading,
    error,
    createUserAssignment,
    createUserAssignmentIsPending,
    createUserAssignmentError,
    updateUserAssignment,
    updateUserAssignmentIsPending,
    updateUserAssignmentError,
    deleteUserAssignment,
    deleteUserAssignmentIsPending,
    deleteUserAssignmentError,
  }
}

export function useCaseDropdownDefinitions(
  workspaceId: string,
  enabled = true
) {
  const queryClient = useQueryClient()

  const {
    data: dropdownDefinitions,
    isLoading: dropdownDefinitionsIsLoading,
    isFetching: dropdownDefinitionsIsFetching,
    error: dropdownDefinitionsError,
  } = useQuery<CaseDropdownDefinitionRead[], Error>({
    queryKey: ["case-dropdown-definitions", workspaceId],
    queryFn: async () =>
      await caseDropdownsListDropdownDefinitions({ workspaceId }),
    enabled: Boolean(workspaceId) && enabled,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["case-dropdown-definitions", workspaceId],
    })

  const { mutateAsync: createDropdownDefinition } = useMutation({
    mutationFn: async (data: CaseDropdownsCreateDropdownDefinitionData) =>
      await caseDropdownsCreateDropdownDefinition(data),
    onSuccess: invalidate,
  })

  const {
    mutateAsync: deleteDropdownDefinition,
    isPending: deleteDropdownDefinitionIsPending,
  } = useMutation({
    mutationFn: async (data: CaseDropdownsDeleteDropdownDefinitionData) =>
      await caseDropdownsDeleteDropdownDefinition(data),
    onSuccess: invalidate,
  })

  const {
    mutateAsync: updateDropdownDefinition,
    isPending: updateDropdownDefinitionIsPending,
  } = useMutation({
    mutationFn: async (data: CaseDropdownsUpdateDropdownDefinitionData) =>
      await caseDropdownsUpdateDropdownDefinition(data),
    onSuccess: invalidate,
  })

  const { mutateAsync: addDropdownOption } = useMutation({
    mutationFn: async (data: CaseDropdownsAddDropdownOptionData) =>
      await caseDropdownsAddDropdownOption(data),
    onSuccess: invalidate,
  })

  const { mutateAsync: updateDropdownOption } = useMutation({
    mutationFn: async (data: CaseDropdownsUpdateDropdownOptionData) =>
      await caseDropdownsUpdateDropdownOption(data),
    onSuccess: invalidate,
  })

  const { mutateAsync: deleteDropdownOption } = useMutation({
    mutationFn: async (data: CaseDropdownsDeleteDropdownOptionData) =>
      await caseDropdownsDeleteDropdownOption(data),
    onSuccess: invalidate,
  })

  const { mutateAsync: reorderDropdownOptions } = useMutation({
    mutationFn: async (data: CaseDropdownsReorderDropdownOptionsData) =>
      await caseDropdownsReorderDropdownOptions(data),
    onSuccess: invalidate,
  })

  return {
    dropdownDefinitions,
    dropdownDefinitionsIsLoading,
    dropdownDefinitionsIsFetching,
    dropdownDefinitionsError,
    createDropdownDefinition,
    deleteDropdownDefinition,
    deleteDropdownDefinitionIsPending,
    updateDropdownDefinition,
    updateDropdownDefinitionIsPending,
    addDropdownOption,
    updateDropdownOption,
    deleteDropdownOption,
    reorderDropdownOptions,
  }
}

export function useSetCaseDropdownValue(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      caseId,
      definitionId,
      optionId,
    }: {
      caseId: string
      definitionId: string
      optionId: string | null
    }) =>
      await casesSetCaseDropdownValue({
        caseId,
        definitionId,
        workspaceId,
        requestBody: { option_id: optionId },
      }),
    onSuccess: (_data, variables) => {
      invalidateCaseActivityQueries(queryClient, variables.caseId, workspaceId)
    },
  })
}
