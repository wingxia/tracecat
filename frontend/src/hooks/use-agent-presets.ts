import { useMemo } from "react"
import {
  type AgentFolderCreate,
  type AgentFolderDirectoryItem,
  type AgentFolderRead,
  type AgentPresetCreate,
  type AgentPresetDirectoryItem,
  type AgentPresetMoveToFolder,
  type AgentPresetRead,
  type AgentPresetReadMinimal,
  type AgentPresetToolPolicyPreview,
  type AgentPresetToolPolicyRead,
  type AgentPresetUpdate,
  type AgentPresetVersionRead,
  type AgentPresetVersionReadMinimal,
  type AgentPresetWorkflowReference,
  type AgentTagRead,
  agentFoldersCreateFolder,
  agentFoldersDeleteFolder,
  agentFoldersGetDirectory,
  agentFoldersListFolders,
  agentFoldersMoveFolder,
  agentFoldersUpdateFolder,
  agentPresetsCreateAgentPreset,
  agentPresetsDeleteAgentPreset,
  agentPresetsGetAgentPreset,
  agentPresetsGetAgentPresetVersion,
  agentPresetsListAgentPresets,
  agentPresetsListAgentPresetVersions,
  agentPresetsListAgentPresetWorkflowReferences,
  agentPresetsMoveAgentPresetToFolder,
  agentPresetsPreviewToolPolicy,
  agentPresetsRestoreAgentPresetVersion,
  agentPresetsUpdateAgentPreset,
  agentTagsCreateAgentTag,
  agentTagsDeleteAgentTag,
  agentTagsListAgentTags,
  agentTagsUpdateAgentTag,
  type TagCreate,
  type TagUpdate,
  workspacesUpdateWorkspace,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import { getAgentPresetErrorMessage } from "@/lib/agent-presets"
import {
  getApiErrorDetail,
  retryHandler,
  type TracecatApiError,
} from "@/lib/errors"
import { useMutation, useQueries, useQuery, useQueryClient } from "@/lib/query"

/** Preview unsaved skill tools without surfacing validation failures as toasts. */
export function useAgentPresetToolPolicyPreview(
  workspaceId: string,
  requestBody: AgentPresetToolPolicyPreview,
  { enabled }: { enabled: boolean }
) {
  return useQuery<AgentPresetToolPolicyRead>({
    queryKey: ["agent-preset-tool-policy-preview", workspaceId, requestBody],
    queryFn: () => agentPresetsPreviewToolPolicy({ workspaceId, requestBody }),
    enabled: enabled && Boolean(workspaceId),
    retry: false,
    meta: { suppressErrorToast: true },
  })
}

async function listAllAgentFolders({
  workspaceId,
  parentPath,
}: {
  workspaceId: string
  parentPath?: string
}): Promise<AgentFolderRead[]> {
  const folders: AgentFolderRead[] = []
  let cursor: string | undefined

  do {
    const response = await agentFoldersListFolders({
      workspaceId,
      parentPath,
      limit: 200,
      cursor,
    })
    folders.push(...response.items)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return folders
}

async function listAllAgentTags(workspaceId: string): Promise<AgentTagRead[]> {
  const agentTags: AgentTagRead[] = []
  let cursor: string | undefined

  do {
    const response = await agentTagsListAgentTags({
      workspaceId,
      limit: 200,
      cursor,
    })
    agentTags.push(...response.items)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return agentTags
}

async function listAllAgentPresetWorkflowReferences(
  workspaceId: string
): Promise<AgentPresetWorkflowReference[]> {
  const references: AgentPresetWorkflowReference[] = []
  let cursor: string | undefined

  do {
    const response = await agentPresetsListAgentPresetWorkflowReferences({
      workspaceId,
      limit: 200,
      cursor,
    })
    references.push(...response.items)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return references
}

/** List the workflows whose drafts run each agent preset. */
export function useAgentPresetWorkflowReferences(
  workspaceId: string,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const { data, isLoading, error } = useQuery<
    AgentPresetWorkflowReference[],
    TracecatApiError
  >({
    queryKey: ["agent-preset-workflow-references", workspaceId],
    queryFn: () => listAllAgentPresetWorkflowReferences(workspaceId),
    enabled: enabled && Boolean(workspaceId),
    retry: retryHandler,
    // Each fetch walks every page of a workspace-wide scan.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    workflowReferences: data,
    workflowReferencesIsLoading: isLoading,
    workflowReferencesError: error,
  }
}

export function useAgentPresets(
  workspaceId?: string,
  {
    enabled = true,
    useInChat,
    staleTime,
  }: { enabled?: boolean; useInChat?: boolean; staleTime?: number } = {}
) {
  const {
    data: presets,
    isLoading: presetsIsLoading,
    error: presetsError,
    refetch: refetchPresets,
  } = useQuery<AgentPresetReadMinimal[], TracecatApiError>({
    queryKey: ["agent-presets", workspaceId, { useInChat }],
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error("workspaceId is required to list agent presets")
      }
      return await agentPresetsListAgentPresets({
        workspaceId,
        useInChat,
      })
    },
    enabled: enabled && Boolean(workspaceId),
    retry: retryHandler,
    staleTime,
  })

  return {
    presets,
    presetsIsLoading,
    presetsError,
    refetchPresets,
  }
}

export function useAgentPresetVersions(
  workspaceId: string,
  presetId?: string | null,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const {
    data: versions,
    isLoading: versionsIsLoading,
    error: versionsError,
    refetch: refetchVersions,
  } = useQuery<AgentPresetVersionReadMinimal[], TracecatApiError>({
    queryKey: ["agent-preset-versions", workspaceId, presetId],
    queryFn: async () => {
      if (!workspaceId || !presetId) {
        throw new Error("workspaceId and presetId are required")
      }
      return await fetchAgentPresetVersions(workspaceId, presetId)
    },
    enabled: enabled && Boolean(workspaceId) && Boolean(presetId),
    retry: retryHandler,
  })

  return {
    versions,
    versionsIsLoading,
    versionsError,
    refetchVersions,
  }
}

export function useAgentPresetVersionsByPresetIds(
  workspaceId: string,
  presetIds: string[],
  { enabled = true }: { enabled?: boolean } = {}
) {
  const uniquePresetIds = useMemo(
    () => Array.from(new Set(presetIds.filter(Boolean))).sort(),
    [presetIds]
  )
  const results = useQueries({
    queries: uniquePresetIds.map((presetId) => ({
      queryKey: ["agent-preset-versions", workspaceId, presetId],
      queryFn: async () =>
        await fetchAgentPresetVersions(workspaceId, presetId),
      enabled: enabled && Boolean(workspaceId) && Boolean(presetId),
      retry: retryHandler,
    })),
  })
  const versionsByPresetId = useMemo(() => {
    const versions = new Map<string, AgentPresetVersionReadMinimal[]>()
    uniquePresetIds.forEach((presetId, index) => {
      const data = results[index]?.data
      if (data) {
        versions.set(presetId, data)
      }
    })
    return versions
  }, [results, uniquePresetIds])

  return {
    versionsByPresetId,
    versionsByPresetIdIsLoading: results.some((result) => result.isLoading),
    versionsByPresetIdError:
      results.find((result) => result.error)?.error ?? null,
  }
}

export function useAgentPreset(
  workspaceId: string,
  presetId?: string | null,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const {
    data: preset,
    isLoading: presetIsLoading,
    error: presetError,
    refetch: refetchPreset,
  } = useQuery<AgentPresetRead, TracecatApiError>({
    queryKey: ["agent-preset", workspaceId, presetId],
    queryFn: async () => {
      if (!workspaceId || !presetId) {
        throw new Error("workspaceId and presetId are required")
      }
      return await agentPresetsGetAgentPreset({ workspaceId, presetId })
    },
    enabled: enabled && Boolean(workspaceId) && Boolean(presetId),
    retry: retryHandler,
  })

  return {
    preset,
    presetIsLoading,
    presetError,
    refetchPreset,
  }
}

async function fetchAgentPresetVersions(
  workspaceId: string,
  presetId: string
): Promise<AgentPresetVersionReadMinimal[]> {
  const versions: AgentPresetVersionReadMinimal[] = []
  let cursor: string | undefined

  do {
    const response = await agentPresetsListAgentPresetVersions({
      workspaceId,
      presetId,
      limit: 200,
      cursor,
    })
    versions.push(...response.items)
    cursor = response.next_cursor ?? undefined
  } while (cursor)

  return versions
}

export function useAgentPresetVersion(
  workspaceId: string,
  presetId?: string | null,
  versionId?: string | null,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const {
    data: presetVersion,
    isLoading: presetVersionIsLoading,
    error: presetVersionError,
    refetch: refetchPresetVersion,
  } = useQuery<AgentPresetVersionRead, TracecatApiError>({
    queryKey: ["agent-preset-version", workspaceId, presetId, versionId],
    queryFn: async () => {
      if (!workspaceId || !presetId || !versionId) {
        throw new Error("workspaceId, presetId, and versionId are required")
      }
      return await agentPresetsGetAgentPresetVersion({
        workspaceId,
        presetId,
        versionId,
      })
    },
    enabled:
      enabled &&
      Boolean(workspaceId) &&
      Boolean(presetId) &&
      Boolean(versionId),
    retry: retryHandler,
  })

  return {
    presetVersion,
    presetVersionIsLoading,
    presetVersionError,
    refetchPresetVersion,
  }
}

export function useCreateAgentPreset(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: createAgentPreset,
    isPending: createAgentPresetIsPending,
    error: createAgentPresetError,
  } = useMutation<AgentPresetRead, TracecatApiError, AgentPresetCreate>({
    mutationFn: async (payload) =>
      await agentPresetsCreateAgentPreset({
        workspaceId,
        requestBody: payload,
      }),
    onSuccess: (preset) => {
      queryClient.setQueryData<AgentPresetRead>(
        ["agent-preset", workspaceId, preset.id],
        preset
      )
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-workflow-references", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-versions", workspaceId, preset.id],
      })
      toast({
        title: "已创建智能体预设",
        description: `已保存 ${preset.name}`,
      })
    },
    onError: (error) => {
      const detail = getAgentPresetErrorMessage(error, "创建智能体预设失败。")
      toast({
        title: "创建失败",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    createAgentPreset,
    createAgentPresetIsPending,
    createAgentPresetError,
  }
}

export function useUpdateAgentPreset(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: updateAgentPreset,
    isPending: updateAgentPresetIsPending,
    error: updateAgentPresetError,
  } = useMutation<
    AgentPresetRead,
    TracecatApiError,
    AgentPresetUpdate & { presetId: string }
  >({
    mutationFn: async ({ presetId, ...requestBody }) =>
      await agentPresetsUpdateAgentPreset({
        workspaceId,
        presetId,
        requestBody,
      }),
    onSuccess: (preset, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset", workspaceId, preset.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      // Only a slug change re-resolves which workflows run the preset.
      if ("slug" in variables) {
        queryClient.invalidateQueries({
          queryKey: ["agent-preset-workflow-references", workspaceId],
        })
      }
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-versions", workspaceId, preset.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-providers-status"],
      })
      toast({
        title: "已更新智能体预设",
        description: `已保存 ${preset.name}`,
      })
    },
    onError: (error) => {
      const detail = getAgentPresetErrorMessage(error, "更新智能体预设失败。")
      toast({
        title: "更新失败",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    updateAgentPreset,
    updateAgentPresetIsPending,
    updateAgentPresetError,
  }
}

export function useDeleteAgentPreset(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: deleteAgentPreset,
    isPending: deleteAgentPresetIsPending,
    error: deleteAgentPresetError,
  } = useMutation<
    void,
    TracecatApiError,
    { presetId: string; presetName?: string }
  >({
    mutationFn: async ({ presetId }) =>
      await agentPresetsDeleteAgentPreset({
        workspaceId,
        presetId,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] })
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-workflow-references", workspaceId],
      })
      const label = variables.presetName ?? variables.presetId
      toast({
        title: "已删除智能体预设",
        description: `已移除 ${label}`,
      })
    },
    onError: (error, variables) => {
      const label =
        variables?.presetName ?? variables?.presetId ?? "agent preset"
      const detail =
        typeof error.body?.detail === "string"
          ? error.body.detail
          : "删除智能体预设失败。"
      toast({
        title: "删除失败",
        description: `${label}: ${detail}`,
        variant: "destructive",
      })
    },
  })

  return {
    deleteAgentPreset,
    deleteAgentPresetIsPending,
    deleteAgentPresetError,
  }
}

/** Set the workspace's default agent without changing other workspace settings. */
export function useSetDefaultAgent(workspaceId: string) {
  const queryClient = useQueryClient()
  const { mutate: setDefaultAgent, isPending: isSettingDefaultAgent } =
    useMutation({
      mutationFn: (presetId: string) =>
        workspacesUpdateWorkspace({
          workspaceId,
          requestBody: { default_agent_preset_id: presetId },
        }),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId],
        })
        toast({ title: "已更新默认智能体" })
      },
      onError: () => {
        toast({
          title: "无法设置默认智能体",
          description: "请重试。",
          variant: "destructive",
        })
      },
    })

  return { setDefaultAgent, isSettingDefaultAgent }
}

export function useRestoreAgentPresetVersion(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: restoreAgentPresetVersion,
    isPending: restoreAgentPresetVersionIsPending,
    error: restoreAgentPresetVersionError,
  } = useMutation<
    AgentPresetRead,
    TracecatApiError,
    { presetId: string; versionId: string }
  >({
    mutationFn: async ({ presetId, versionId }) =>
      await agentPresetsRestoreAgentPresetVersion({
        workspaceId,
        presetId,
        versionId,
      }),
    onSuccess: (preset) => {
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset", workspaceId, preset.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-versions", workspaceId, preset.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      toast({
        title: "已恢复版本",
        description: `${preset.name} 现已指向所选版本。`,
      })
    },
    onError: (error) => {
      const detail = getAgentPresetErrorMessage(error, "恢复预设版本失败。")
      toast({
        title: "恢复失败",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    restoreAgentPresetVersion,
    restoreAgentPresetVersionIsPending,
    restoreAgentPresetVersionError,
  }
}

export type AgentDirectoryItem =
  | AgentFolderDirectoryItem
  | AgentPresetDirectoryItem

/** CRUD hook for agent folders. Mirrors `useFolders` from hooks.tsx. */
export function useAgentFolders(
  workspaceId: string,
  options: { enabled: boolean } = { enabled: true }
) {
  const queryClient = useQueryClient()

  // List folders
  const {
    data: folders,
    isLoading: foldersIsLoading,
    error: foldersError,
  } = useQuery<AgentFolderRead[]>({
    queryKey: ["agent-folders", workspaceId],
    queryFn: async () => await listAllAgentFolders({ workspaceId }),
    enabled: options.enabled,
  })

  // List subfolders under root
  const {
    data: subFolders,
    isLoading: subFoldersIsLoading,
    error: subFoldersError,
    refetch: refetchSubFolders,
  } = useQuery<AgentFolderRead[]>({
    queryKey: ["agent-folders", workspaceId, "parent"],
    queryFn: async () =>
      await listAllAgentFolders({
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
    mutationFn: async (params: AgentFolderCreate) =>
      await agentFoldersCreateFolder({
        workspaceId,
        requestBody: params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-folders", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["agent-directory-items"] })
      toast({
        title: "已创建文件夹",
        description: "文件夹创建成功。",
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

  // Update folder (rename)
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
      await agentFoldersUpdateFolder({
        folderId,
        workspaceId,
        requestBody: { name },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-folders", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["agent-directory-items"] })
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
      await agentFoldersMoveFolder({
        folderId,
        workspaceId,
        requestBody: { new_parent_path: newParentPath },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-folders", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["agent-directory-items"] })
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
    }: {
      folderId: string
      recursive?: boolean
    }) =>
      await agentFoldersDeleteFolder({
        folderId,
        workspaceId,
        requestBody: { recursive },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-folders", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["agent-directory-items"] })
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

/** Fetch the directory listing for agent folders and presets at a given path. */
export function useAgentDirectoryItems(
  path: string,
  workspaceId?: string,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true
  const {
    data: directoryItems,
    isLoading: directoryItemsIsLoading,
    error: directoryItemsError,
  } = useQuery<AgentDirectoryItem[], TracecatApiError>({
    enabled: enabled && !!workspaceId,
    queryKey: ["agent-directory-items", workspaceId, path],
    queryFn: async () =>
      await agentFoldersGetDirectory({
        path,
        workspaceId: workspaceId ?? "",
      }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  return {
    directoryItems,
    directoryItemsIsLoading,
    directoryItemsError,
  }
}

/** CRUD hook for the agent tag catalog. Mirrors `useCaseTagCatalog`. */
export function useAgentTagCatalog(
  workspaceId: string,
  options: { enabled: boolean } = { enabled: true }
) {
  const queryClient = useQueryClient()

  const {
    data: agentTags,
    isLoading: agentTagsIsLoading,
    error: agentTagsError,
  } = useQuery<AgentTagRead[]>({
    queryKey: ["agent-tags", workspaceId],
    queryFn: async () => await listAllAgentTags(workspaceId),
    enabled: options.enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const {
    mutateAsync: createAgentTag,
    isPending: createAgentTagIsPending,
    error: createAgentTagError,
  } = useMutation({
    mutationFn: async (params: TagCreate) =>
      await agentTagsCreateAgentTag({ workspaceId, requestBody: params }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-tags", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      toast({
        title: "已创建智能体标签",
        description: "智能体标签创建成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 409:
          toast({
            title: "创建智能体标签出错",
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
          console.error("Failed to create agent tag", error)
          toast({
            title: "创建智能体标签失败",
            description: `创建智能体标签时出错：${getApiErrorDetail(error) ?? "请重试。"}`,
          })
      }
    },
  })

  const {
    mutateAsync: updateAgentTag,
    isPending: updateAgentTagIsPending,
    error: updateAgentTagError,
  } = useMutation({
    mutationFn: async ({
      tagId,
      ...requestBody
    }: TagUpdate & { tagId: string }) =>
      await agentTagsUpdateAgentTag({ tagId, workspaceId, requestBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-tags", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      toast({
        title: "已更新智能体标签",
        description: "智能体标签更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 409:
          toast({
            title: "更新智能体标签出错",
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
    mutateAsync: deleteAgentTag,
    isPending: deleteAgentTagIsPending,
    error: deleteAgentTagError,
  } = useMutation({
    mutationFn: async ({ tagId }: { tagId: string }) =>
      await agentTagsDeleteAgentTag({ tagId, workspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-tags", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      toast({
        title: "已删除智能体标签",
        description: "智能体标签删除成功。",
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
    agentTags,
    agentTagsIsLoading,
    agentTagsError,
    createAgentTag,
    createAgentTagIsPending,
    createAgentTagError,
    updateAgentTag,
    updateAgentTagIsPending,
    updateAgentTagError,
    deleteAgentTag,
    deleteAgentTagIsPending,
    deleteAgentTagError,
  }
}

/** Move an agent preset into a folder. */
export function useMoveAgentPreset(workspaceId: string) {
  const queryClient = useQueryClient()

  const {
    mutateAsync: moveAgentPreset,
    isPending: moveAgentPresetIsPending,
    error: moveAgentPresetError,
  } = useMutation<
    void,
    TracecatApiError,
    { presetId: string } & AgentPresetMoveToFolder
  >({
    mutationFn: async ({ presetId, ...requestBody }) =>
      await agentPresetsMoveAgentPresetToFolder({
        presetId,
        workspaceId,
        requestBody,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({ queryKey: ["agent-directory-items"] })
      toast({
        title: "已移动智能体预设",
        description: "智能体预设移动成功。",
      })
    },
    onError: (error) => {
      const detail =
        typeof error.body?.detail === "string"
          ? error.body.detail
          : "移动智能体预设失败。"
      toast({
        title: "移动失败",
        description: detail,
        variant: "destructive",
      })
    },
  })

  return {
    moveAgentPreset,
    moveAgentPresetIsPending,
    moveAgentPresetError,
  }
}
