"use client"

import {
  type ApiError,
  type AwsSecretReferenceCreate,
  type AwsSecretReferenceUpdate,
  organizationSecretStoresAuthorizeSecretStoreWorkspace,
  organizationSecretStoresCreateSecretStore,
  organizationSecretStoresDeleteSecretStore,
  organizationSecretStoresListSecretStores,
  organizationSecretStoresRevokeSecretStoreWorkspace,
  organizationSecretStoresUpdateSecretStore,
  type SecretReferenceCheckResult,
  type SecretStoreCreate,
  type SecretStoreRead,
  type SecretStoreUpdate,
  secretsCheckAwsSecretReference,
  secretsCreateAwsSecretReference,
  secretsListAuthorizedSecretStores,
  secretsSearchSecrets,
  secretsUpdateAwsSecretReference,
  type WorkspaceSecretStoreRead,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import {
  isRequestValidationErrorArray,
  type RequestValidationError,
} from "@/lib/errors"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"

const ORG_SECRET_STORES_KEY = ["organization-secret-stores"]

/**
 * Organization-level management of external secret stores (AWS Secrets
 * Manager). Tracecat stores role/region metadata and a persisted external ID;
 * it never stores AWS credentials or remote values.
 */
export function useOrgSecretStores() {
  const queryClient = useQueryClient()
  const {
    data: stores,
    isLoading,
    error,
  } = useQuery<SecretStoreRead[], ApiError>({
    queryKey: ORG_SECRET_STORES_KEY,
    queryFn: async () => {
      const stores: SecretStoreRead[] = []
      let cursor: string | undefined
      do {
        const page = await organizationSecretStoresListSecretStores({ cursor })
        stores.push(...page.items)
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return stores
    },
    retry: false,
  })

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ORG_SECRET_STORES_KEY })
  }

  function invalidateStoreAccess() {
    return Promise.all([
      invalidate(),
      queryClient.invalidateQueries({ queryKey: ["workspace-secret-stores"] }),
    ])
  }

  const { mutateAsync: createStore, isPending: createStorePending } =
    useMutation({
      mutationFn: async (params: SecretStoreCreate) =>
        await organizationSecretStoresCreateSecretStore({
          requestBody: params,
        }),
      onSuccess: () => {
        toast({ title: "已创建密钥存储" })
        return invalidateStoreAccess()
      },
      onError: (err: ApiError) => {
        toast({
          title: "创建密钥存储失败",
          description: describeApiError(err),
        })
      },
    })

  const { mutateAsync: updateStore } = useMutation({
    mutationFn: async ({
      storeId,
      params,
    }: {
      storeId: string
      params: SecretStoreUpdate
    }) =>
      await organizationSecretStoresUpdateSecretStore({
        storeId,
        requestBody: params,
      }),
    onSuccess: () => {
      toast({ title: "已更新密钥存储" })
      return invalidateStoreAccess()
    },
    onError: (err: ApiError) => {
      toast({
        title: "更新密钥存储失败",
        description: describeApiError(err),
      })
    },
  })

  const { mutateAsync: deleteStore } = useMutation({
    mutationFn: async (storeId: string) =>
      await organizationSecretStoresDeleteSecretStore({ storeId }),
    onSuccess: () => {
      toast({ title: "已删除密钥存储" })
      return invalidateStoreAccess()
    },
    onError: (err: ApiError) => {
      toast({
        title: "删除密钥存储失败",
        description: describeApiError(err),
      })
    },
  })

  const { mutateAsync: authorizeWorkspace } = useMutation({
    mutationFn: async ({
      storeId,
      workspaceId,
    }: {
      storeId: string
      workspaceId: string
    }) =>
      await organizationSecretStoresAuthorizeSecretStoreWorkspace({
        storeId,
        requestBody: { workspace_id: workspaceId },
      }),
    onSuccess: (_data, { workspaceId }) => {
      toast({ title: "已授权工作空间" })
      return Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: ["workspace-secret-stores", workspaceId],
        }),
      ])
    },
    onError: (err: ApiError) => {
      toast({
        title: "授权工作空间失败",
        description: describeApiError(err),
      })
    },
  })

  const { mutateAsync: revokeWorkspace } = useMutation({
    mutationFn: async ({
      storeId,
      workspaceId,
    }: {
      storeId: string
      workspaceId: string
    }) =>
      await organizationSecretStoresRevokeSecretStoreWorkspace({
        storeId,
        workspaceId,
      }),
    onSuccess: (_data, { workspaceId }) => {
      toast({ title: "已撤销工作空间授权" })
      return Promise.all([
        invalidate(),
        queryClient.invalidateQueries({
          queryKey: ["workspace-secret-stores", workspaceId],
        }),
      ])
    },
    onError: (err: ApiError) => {
      toast({
        title: "撤销工作空间授权失败",
        description: describeApiError(err),
      })
    },
  })

  return {
    stores,
    isLoading,
    error,
    createStore,
    createStorePending,
    updateStore,
    deleteStore,
    authorizeWorkspace,
    revokeWorkspace,
  }
}

/**
 * Stores the current workspace has been authorized to reference.
 */
export function useAuthorizedSecretStores(
  workspaceId: string,
  options: { enabled?: boolean } = {}
) {
  const {
    data: stores,
    isLoading,
    error,
  } = useQuery<WorkspaceSecretStoreRead[], ApiError>({
    queryKey: ["workspace-secret-stores", workspaceId],
    queryFn: async () => {
      const stores: WorkspaceSecretStoreRead[] = []
      let cursor: string | undefined
      do {
        const page = await secretsListAuthorizedSecretStores({
          workspaceId,
          cursor,
        })
        stores.push(...page.items)
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return stores
    },
    enabled: !!workspaceId && (options.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  return { stores, isLoading, error }
}

/** Load reference metadata for an editor without fetching values from AWS. */
export function useAwsSecretReference(
  workspaceId: string,
  secretId: string,
  environment: string
) {
  return useQuery({
    queryKey: ["workspace-secrets", workspaceId, secretId, environment],
    queryFn: async () => {
      const secrets = await secretsSearchSecrets({
        workspaceId,
        id: [secretId],
        environment,
      })
      const secret = secrets.find((item) => item.id === secretId)
      if (!secret || secret.source !== "aws_secrets_manager") {
        throw new Error("未找到 AWS 密钥引用")
      }
      return secret
    },
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}

/**
 * Create, update, and check AWS-backed workspace secret references.
 * These calls send references and key mappings only, never values.
 */
export function useAwsSecretReferences(workspaceId: string) {
  const queryClient = useQueryClient()

  function invalidateSecrets() {
    queryClient.invalidateQueries({
      queryKey: ["workspace-secrets", workspaceId],
    })
    queryClient.invalidateQueries({ queryKey: ORG_SECRET_STORES_KEY })
  }

  const { mutateAsync: createReference } = useMutation({
    mutationFn: async (params: AwsSecretReferenceCreate) =>
      await secretsCreateAwsSecretReference({
        workspaceId,
        requestBody: params,
      }),
    onSuccess: () => {
      toast({
        title: "已添加 AWS 密钥引用",
        description: "已保存引用，值仍保留在 AWS 中。",
      })
      invalidateSecrets()
    },
    onError: (err: ApiError) => {
      toast({
        title: "添加 AWS 密钥引用失败",
        description: describeApiError(err),
      })
    },
  })

  const { mutateAsync: updateReference } = useMutation({
    mutationFn: async ({
      secretId,
      params,
    }: {
      secretId: string
      params: AwsSecretReferenceUpdate
    }) =>
      await secretsUpdateAwsSecretReference({
        workspaceId,
        secretId,
        requestBody: params,
      }),
    onSuccess: () => {
      toast({ title: "已更新 AWS 密钥引用" })
      invalidateSecrets()
    },
    onError: (err: ApiError) => {
      toast({
        title: "更新 AWS 密钥引用失败",
        description: describeApiError(err),
      })
    },
  })

  const { mutateAsync: checkReference, isPending: checkReferencePending } =
    useMutation<SecretReferenceCheckResult, ApiError, string>({
      mutationFn: async (secretId: string) =>
        await secretsCheckAwsSecretReference({ workspaceId, secretId }),
    })

  return {
    createReference,
    updateReference,
    checkReference,
    checkReferencePending,
  }
}

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  role_arn: "角色 ARN",
  region: "区域",
  name: "名称",
  remote_reference: "密钥名称或 ARN",
  key: "输出键",
  field: "JSON 字段",
}

/** Render one pydantic validation error without exposing its raw regex. */
function describeValidationError(error: RequestValidationError): string {
  const field = [...error.loc]
    .reverse()
    .find((part) => Object.hasOwn(VALIDATION_FIELD_LABELS, part))
  const label = field ? VALIDATION_FIELD_LABELS[field] : null
  if (error.type === "string_pattern_mismatch") {
    return `${label ?? "字段"} 的格式不符合要求。`
  }
  const message = error.msg.replace(/^Value error, /, "")
  return label ? `${label}: ${message}` : message
}

/** Describe an API error for a toast, translating 422 validation details. */
export function describeApiError(err: ApiError): string {
  const body = err.body
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === "string") {
      return detail
    }
    if (isRequestValidationErrorArray(detail) && detail.length > 0) {
      return detail.map(describeValidationError).join("\n")
    }
  }
  return err.message
}
