"use client"

import {
  AlertTriangleIcon,
  ChevronRight,
  Link2,
  SquareAsterisk,
  Unlink2,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { SecretDefinition } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import {
  CatalogHeader,
  type CatalogHeaderSelectFilter,
} from "@/components/catalog/catalog-header"
import { AwsIcon, SecretIcon } from "@/components/icons"
import { CenteredSpinner } from "@/components/loading/spinner"
import { ManagedResourceStatus } from "@/components/managed/managed-resource-status"
import { AlertNotification } from "@/components/notifications"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  type AwsSecretReferenceCheck,
  AwsSecretReferenceCheckButton,
  AwsSecretReferenceCheckHint,
  AwsSecretReferenceCheckScope,
} from "@/components/workspaces/aws-secret-reference-check-button"
import { CreateCredentialDialog } from "@/components/workspaces/create-credential-dialog"
import {
  buildCredentialGroups,
  type CredentialConnectionFilter,
  type CredentialSecretTypeFilter,
  credentialSecretTypeLabels,
  normalizeSecretEnvironment,
  workspaceSecretTypeLabels,
} from "@/components/workspaces/credentials-utils"
import {
  DeleteSecretAlertDialog,
  DeleteSecretAlertDialogTrigger,
} from "@/components/workspaces/delete-workspace-secret"
import { EditAwsSecretReferenceDialog } from "@/components/workspaces/edit-aws-secret-reference-dialog"
import {
  EditCredentialsDialog,
  EditCredentialsDialogTrigger,
} from "@/components/workspaces/edit-workspace-secret"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useManagedResources } from "@/hooks/use-managed-resources"
import {
  useSecretDefinitions,
  useWorkspaceSecrets,
  type WorkspaceSecretListItem,
} from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

const SECRET_TYPE_OPTIONS: Array<{
  value: CredentialSecretTypeFilter
  label: string
}> = [
  { value: "all", label: "所有类型" },
  ...Object.entries(workspaceSecretTypeLabels).map(([value, label]) => ({
    value: value as CredentialSecretTypeFilter,
    label,
  })),
]

export function WorkspaceCredentialsInventory() {
  const workspaceId = useWorkspaceId()
  const {
    secretDefinitions,
    secretDefinitionsIsLoading,
    secretDefinitionsError,
  } = useSecretDefinitions(workspaceId)
  const { secrets, secretsIsLoading, secretsError } =
    useWorkspaceSecrets(workspaceId)
  const { hasEntitlement } = useEntitlements()
  const externalSecretStoresEnabled = hasEntitlement("external_secret_stores")
  const canUpdateSecrets = useScopeCheck("secret:update") === true
  const canDeleteSecrets = useScopeCheck("secret:delete") === true
  // Managed secrets keep values editable but cannot be deleted.
  const { isManaged } = useManagedResources(workspaceId)
  const [searchQuery, setSearchQuery] = useState("")
  const [connectionFilter, setConnectionFilter] =
    useState<CredentialConnectionFilter>("all")
  const [environmentFilter, setEnvironmentFilter] = useState("all")
  const [secretTypeFilter, setSecretTypeFilter] =
    useState<CredentialSecretTypeFilter>("all")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  )
  const [selectedSecret, setSelectedSecret] =
    useState<WorkspaceSecretListItem | null>(null)
  const [editingAwsSecret, setEditingAwsSecret] =
    useState<WorkspaceSecretListItem | null>(null)
  const [activeTemplate, setActiveTemplate] = useState<SecretDefinition | null>(
    null
  )

  const allSecrets = secrets ?? []
  const allSecretDefinitions = secretDefinitions ?? []

  const credentialGroups = useMemo(
    () => buildCredentialGroups(allSecretDefinitions, allSecrets),
    [allSecretDefinitions, allSecrets]
  )

  const availableEnvironments = useMemo(
    () =>
      Array.from(
        new Set(
          allSecrets.map((secret) =>
            normalizeSecretEnvironment(secret.environment)
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allSecrets]
  )

  const corruptedSecrets = useMemo(
    () => allSecrets.filter((secret) => secret.is_corrupted),
    [allSecrets]
  )

  const filteredGroups = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return credentialGroups.filter((group) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        group.name.toLowerCase().includes(normalizedSearch)
      const matchesConnection =
        connectionFilter === "all"
          ? true
          : connectionFilter === "connected"
            ? group.isConnected
            : !group.isConnected
      const matchesEnvironment =
        environmentFilter === "all"
          ? true
          : group.environments.includes(environmentFilter)
      const matchesSecretType =
        secretTypeFilter === "all" ||
        group.secretTypes.includes(secretTypeFilter)

      return (
        matchesSearch &&
        matchesConnection &&
        matchesEnvironment &&
        matchesSecretType
      )
    })
  }, [
    connectionFilter,
    credentialGroups,
    environmentFilter,
    searchQuery,
    secretTypeFilter,
  ])

  const selectFilters: CatalogHeaderSelectFilter[] = [
    {
      key: "connection",
      value: connectionFilter,
      onValueChange: (value) =>
        setConnectionFilter(value as CredentialConnectionFilter),
      placeholder: "连接",
      allValue: "all",
      options: [
        { value: "all", label: "所有连接" },
        { value: "connected", label: "已连接", icon: Link2 },
        {
          value: "not_connected",
          label: "未连接",
          icon: Unlink2,
        },
      ],
    },
    {
      key: "environment",
      value: environmentFilter,
      onValueChange: setEnvironmentFilter,
      placeholder: "环境",
      allValue: "all",
      widthClassName: "w-[190px]",
      options: [
        { value: "all", label: "所有环境" },
        ...availableEnvironments.map((environment) => ({
          value: environment,
          label: environment,
        })),
      ],
    },
    {
      key: "secret-type",
      value: secretTypeFilter,
      onValueChange: (value) =>
        setSecretTypeFilter(value as CredentialSecretTypeFilter),
      placeholder: "密钥类型",
      allValue: "all",
      widthClassName: "w-[170px]",
      options: SECRET_TYPE_OPTIONS,
    },
  ]

  if (secretDefinitionsIsLoading || secretsIsLoading) {
    return <CenteredSpinner />
  }

  if (secretDefinitionsError || secretsError) {
    return (
      <AlertNotification
        level="error"
        message={
          secretDefinitionsError?.message ||
          secretsError?.message ||
          "加载凭据出错。"
        }
      />
    )
  }

  return (
    <>
      <DeleteSecretAlertDialog
        selectedSecret={selectedSecret}
        setSelectedSecret={setSelectedSecret}
      >
        <EditCredentialsDialog
          selectedSecret={selectedSecret}
          setSelectedSecret={setSelectedSecret}
        >
          <div className="flex h-full min-h-0 flex-col">
            {corruptedSecrets.length > 0 ? (
              <Alert className="mx-6 mb-4 mt-6">
                <AlertTriangleIcon className="size-4 !text-amber-600" />
                <AlertTitle>部分密钥无法解密</AlertTitle>
                <AlertDescription>
                  无法解密键名和值，密钥为{" "}
                  {corruptedSecrets.map((secret) => secret.name).join(", ")}
                  。密钥名称仍可查看，但必须重新输入所有键名和值才能恢复。SSH
                  密钥需要删除后重新创建。
                </AlertDescription>
              </Alert>
            ) : null}

            <CatalogHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={"搜索凭据…"}
              selectFilters={selectFilters}
              displayCount={filteredGroups.length}
              countLabel="credentials"
            />

            <ScrollArea className="flex-1 min-h-0 [&>[data-radix-scroll-area-viewport]]:[scrollbar-width:none] [&>[data-radix-scroll-area-viewport]::-webkit-scrollbar]:hidden [&>[data-orientation=vertical]]:!hidden [&>[data-orientation=horizontal]]:!hidden">
              <div className="w-full pb-10">
                {filteredGroups.map((group) => {
                  const isExpandable = group.secrets.length > 0
                  const isExpanded = expandedGroups[group.name] ?? false

                  return (
                    <Collapsible
                      key={group.name}
                      open={isExpanded}
                      onOpenChange={(nextOpen) =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [group.name]: nextOpen,
                        }))
                      }
                    >
                      <div className="border-b border-border/50">
                        <div
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 transition-colors",
                            isExpandable && "hover:bg-muted/50"
                          )}
                        >
                          {isExpandable ? (
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 items-center gap-2 text-left [&[data-state=open]_.chevron]:rotate-90"
                              >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                                  <ChevronRight className="chevron size-4 text-muted-foreground transition-transform duration-200" />
                                </div>
                                <CredentialGroupContent
                                  name={group.name}
                                  label={
                                    credentialSecretTypeLabels[
                                      group.secretType
                                    ] ?? "凭据"
                                  }
                                  environments={group.environments}
                                  isConnected={group.isConnected}
                                  connectedHoverCard={
                                    <ConnectedEnvironmentsHoverCard
                                      groupName={group.name}
                                      environments={group.environments}
                                      isConnected={group.isConnected}
                                    />
                                  }
                                />
                              </button>
                            </CollapsibleTrigger>
                          ) : (
                            <>
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center" />
                              <div className="min-w-0 flex-1">
                                <CredentialGroupContent
                                  name={group.name}
                                  label={
                                    credentialSecretTypeLabels[
                                      group.secretType
                                    ] ?? "凭据"
                                  }
                                  environments={group.environments}
                                  isConnected={group.isConnected}
                                  connectedHoverCard={
                                    <ConnectedEnvironmentsHoverCard
                                      groupName={group.name}
                                      environments={group.environments}
                                      isConnected={group.isConnected}
                                    />
                                  }
                                />
                              </div>
                            </>
                          )}

                          <ItemActions className="ml-auto flex shrink-0 items-center gap-1.5 pl-3">
                            {group.template ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 border-input bg-background px-2.5 text-[11px] text-foreground hover:bg-muted"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setActiveTemplate(group.template)
                                }}
                              >
                                配置
                              </Button>
                            ) : null}
                          </ItemActions>
                        </div>

                        {isExpandable ? (
                          <CollapsibleContent>
                            <div className="divide-y divide-border/50">
                              {group.secrets.map((secret) => {
                                const isAws =
                                  secret.source === "aws_secrets_manager"
                                const renderItem = (
                                  check: AwsSecretReferenceCheck | null
                                ) => (
                                  <Item
                                    key={secret.id}
                                    variant="default"
                                    size="sm"
                                    className="w-full flex-nowrap rounded-none border-none px-3 py-1.5 pl-12 text-left"
                                  >
                                    <ItemMedia className="translate-y-0 self-center">
                                      {isAws ? (
                                        <AwsIcon
                                          aria-label="AWS Secrets Manager"
                                          className="size-6 rounded"
                                        />
                                      ) : (
                                        <SecretIcon
                                          secretName={group.name}
                                          className="size-6 rounded"
                                        />
                                      )}
                                    </ItemMedia>
                                    <ItemContent className="min-w-0 gap-1">
                                      <ItemTitle className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                        <span className="truncate font-medium">
                                          {normalizeSecretEnvironment(
                                            secret.environment
                                          )}
                                        </span>
                                        {isAws &&
                                          secret.keys.map((key) => (
                                            <Badge
                                              key={`${secret.id}-${key}`}
                                              variant="secondary"
                                              className="font-mono text-[10px]"
                                            >
                                              {key}
                                            </Badge>
                                          ))}
                                        <ManagedResourceStatus
                                          resourceType="secret_metadata"
                                          id={secret.id}
                                          name={secret.name}
                                          showDetach
                                        />
                                        {secret.is_corrupted ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] text-amber-700"
                                          >
                                            需要重新配置
                                          </Badge>
                                        ) : null}
                                        {isAws && !secret.store_id ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] text-amber-700"
                                          >
                                            选择存储
                                          </Badge>
                                        ) : null}
                                      </ItemTitle>
                                      {isAws ? (
                                        <p
                                          className="truncate text-xs text-muted-foreground"
                                          title={
                                            secret.remote_reference ?? undefined
                                          }
                                        >
                                          {secret.store_name ?? "无存储"}
                                          {" · "}
                                          <code className="font-mono text-[11px]">
                                            {secret.remote_reference}
                                          </code>
                                        </p>
                                      ) : (
                                        <div className="flex flex-wrap gap-1">
                                          {secret.keys.length > 0 ? (
                                            secret.keys.map((key) => (
                                              <Badge
                                                key={`${secret.id}-${key}`}
                                                variant="secondary"
                                                className="font-mono text-[10px]"
                                              >
                                                {key}
                                              </Badge>
                                            ))
                                          ) : (
                                            <span className="text-xs text-muted-foreground">
                                              暂无可用键
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {check && (
                                        <AwsSecretReferenceCheckHint
                                          state={check.state}
                                        />
                                      )}
                                    </ItemContent>
                                    <ItemActions className="ml-auto flex shrink-0 items-center gap-1.5 self-start pl-3">
                                      {check && (
                                        <AwsSecretReferenceCheckButton
                                          state={check.state}
                                          onCheck={check.run}
                                        />
                                      )}
                                      {isAws
                                        ? externalSecretStoresEnabled &&
                                          canUpdateSecrets && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-6 border-input bg-background px-2.5 text-[11px] text-foreground hover:bg-muted"
                                              onClick={(event) => {
                                                event.stopPropagation()
                                                setEditingAwsSecret(secret)
                                              }}
                                            >
                                              编辑
                                            </Button>
                                          )
                                        : canUpdateSecrets && (
                                            <EditCredentialsDialogTrigger
                                              asChild
                                            >
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-6 border-input bg-background px-2.5 text-[11px] text-foreground hover:bg-muted"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  setSelectedSecret(secret)
                                                }}
                                              >
                                                编辑
                                              </Button>
                                            </EditCredentialsDialogTrigger>
                                          )}
                                      {canDeleteSecrets && (
                                        <DeleteSecretAlertDialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isManaged(
                                              "secret_metadata",
                                              secret.id
                                            )}
                                            className="h-6 border-input bg-background px-2.5 text-[11px] text-foreground hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={(event) => {
                                              event.stopPropagation()
                                              setSelectedSecret(secret)
                                            }}
                                          >
                                            删除
                                          </Button>
                                        </DeleteSecretAlertDialogTrigger>
                                      )}
                                    </ItemActions>
                                  </Item>
                                )
                                if (
                                  !isAws ||
                                  !externalSecretStoresEnabled ||
                                  !secret.store_id
                                ) {
                                  return renderItem(null)
                                }
                                return (
                                  <AwsSecretReferenceCheckScope
                                    // Editing the reference clears a stale result.
                                    key={
                                      editingAwsSecret?.id === secret.id
                                        ? `${secret.id}-editing`
                                        : secret.id
                                    }
                                    workspaceId={workspaceId}
                                    secretId={secret.id}
                                  >
                                    {renderItem}
                                  </AwsSecretReferenceCheckScope>
                                )
                              })}
                            </div>
                          </CollapsibleContent>
                        ) : null}
                      </div>
                    </Collapsible>
                  )
                })}
              </div>

              {filteredGroups.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    没有符合条件的凭据。
                  </p>
                </div>
              ) : null}
            </ScrollArea>
          </div>
        </EditCredentialsDialog>
      </DeleteSecretAlertDialog>

      {editingAwsSecret && (
        <EditAwsSecretReferenceDialog
          key={editingAwsSecret.id}
          secret={editingAwsSecret}
          onClose={() => setEditingAwsSecret(null)}
        />
      )}
      <CreateCredentialDialog
        open={Boolean(activeTemplate)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setActiveTemplate(null)
          }
        }}
        template={activeTemplate}
      />
    </>
  )
}

function ConnectedEnvironmentsHoverCard({
  groupName,
  environments,
  isConnected,
}: {
  groupName: string
  environments: string[]
  isConnected: boolean
}) {
  if (!isConnected) {
    return null
  }

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          role="img"
          className="flex items-center justify-center"
          aria-label={`查看 ${groupName} 已配置的环境`}
          onClick={(event) => event.stopPropagation()}
        >
          <SquareAsterisk className="icon-success size-3.5" />
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-auto max-w-[240px] p-3"
        align="start"
        side="top"
        sideOffset={6}
      >
        <div className="space-y-2 text-xs">
          <div className="font-medium text-foreground">已配置的环境</div>
          <div className="flex flex-wrap gap-1">
            {environments.map((environment) => (
              <Badge
                key={environment}
                variant="secondary"
                className="text-[10px]"
              >
                {environment}
              </Badge>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

function CredentialGroupContent({
  name,
  label,
  environments,
  isConnected,
  connectedHoverCard,
}: {
  name: string
  label: string
  environments: string[]
  isConnected: boolean
  connectedHoverCard?: React.ReactNode
}) {
  return (
    <Item className="w-full flex-nowrap rounded-none border-none px-0 py-0">
      <ItemMedia className="translate-y-0 self-center">
        <SecretIcon secretName={name} className="size-6 rounded" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <ItemTitle className="flex w-full min-w-0 items-center gap-2 text-xs">
          <span className="min-w-0 truncate">{name}</span>
          {connectedHoverCard}
          <span className="text-xs text-muted-foreground">{label}</span>
        </ItemTitle>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{isConnected ? "已连接" : "未连接"}</span>
          {environments.length > 0 ? (
            <span>{environments.length} 个环境</span>
          ) : null}
        </div>
      </ItemContent>
    </Item>
  )
}
