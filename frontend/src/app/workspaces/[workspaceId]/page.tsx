"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import TracecatIcon from "public/icon.png"
import { useEffect, useMemo } from "react"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Button } from "@/components/ui/button"
import { useEntitlements } from "@/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

function NoAccessibleSections() {
  const router = useRouter()

  return (
    <main className="container flex size-full max-w-[400px] flex-col items-center justify-center space-y-4">
      <Image src={TracecatIcon} alt="Tracecat" className="mb-4 size-16" />
      <h1 className="text-2xl font-semibold tracking-tight">
        没有可访问的页面
      </h1>
      <span className="text-center text-muted-foreground">
        你可以访问此工作空间，但没有任何工作空间功能的读取权限。
      </span>
      <Button variant="outline" onClick={() => router.replace("/workspaces")}>
        返回工作空间列表
      </Button>
    </main>
  )
}

export default function WorkspacePage() {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const canViewWorkflows = useScopeCheck("workflow:read")
  const canViewCases = useScopeCheck("case:read")
  const canViewAgents = useScopeCheck("agent:read")
  const canExecuteAgents = useScopeCheck("agent:execute")
  const canViewTables = useScopeCheck("table:read")
  const canViewVariables = useScopeCheck("variable:read")
  const canViewSecrets = useScopeCheck("secret:read")
  const canViewIntegrations = useScopeCheck("integration:read")
  const canViewServiceAccounts = useScopeCheck("workspace:service_account:read")
  const canViewMembers = useScopeCheck("workspace:member:read")
  const canViewInbox = useScopeCheck("inbox:read")
  const canReadWorkspace = useScopeCheck("workspace:read")

  const { hasEntitlement, isLoading: entitlementsLoading } = useEntitlements()
  const serviceAccountsEnabled = hasEntitlement("service_accounts")
  const workspaceChatEnabled = hasEntitlement("workspace_chat")

  const isLoading =
    entitlementsLoading ||
    [
      canViewWorkflows,
      canViewCases,
      canViewAgents,
      canExecuteAgents,
      canViewTables,
      canViewVariables,
      canViewSecrets,
      canViewIntegrations,
      canViewServiceAccounts,
      canViewMembers,
      canViewInbox,
      canReadWorkspace,
    ].some((value) => value === undefined)

  const landingPath = useMemo(() => {
    if (isLoading) {
      return undefined
    }
    const basePath = `/workspaces/${workspaceId}`
    const canUseWorkspaceChat =
      canReadWorkspace === true &&
      canViewAgents === true &&
      canExecuteAgents === true &&
      workspaceChatEnabled

    if (canUseWorkspaceChat) {
      return `${basePath}/chat`
    }
    if (canViewWorkflows === true) {
      return `${basePath}/workflows`
    }
    if (canViewCases === true) {
      return `${basePath}/cases`
    }
    if (canViewAgents === true) {
      return `${basePath}/agents`
    }
    if (canViewTables === true) {
      return `${basePath}/tables`
    }
    if (canViewVariables === true) {
      return `${basePath}/variables`
    }
    if (canViewSecrets === true) {
      return `${basePath}/credentials`
    }
    if (canViewIntegrations === true) {
      return `${basePath}/integrations`
    }
    if (
      canReadWorkspace === true &&
      canViewServiceAccounts === true &&
      serviceAccountsEnabled
    ) {
      return `${basePath}/service-accounts`
    }
    if (canViewMembers === true) {
      return `${basePath}/members`
    }
    if (canViewInbox === true) {
      return `${basePath}/inbox`
    }
    return null
  }, [
    canExecuteAgents,
    workspaceChatEnabled,
    canViewAgents,
    canViewCases,
    canViewInbox,
    canViewIntegrations,
    canViewMembers,
    canViewSecrets,
    canViewServiceAccounts,
    canReadWorkspace,
    canViewTables,
    canViewVariables,
    canViewWorkflows,
    isLoading,
    serviceAccountsEnabled,
    workspaceId,
  ])

  useEffect(() => {
    if (!landingPath) {
      return
    }
    router.replace(landingPath)
  }, [landingPath, router])

  if (landingPath === undefined || landingPath !== null) {
    return <CenteredSpinner />
  }

  return <NoAccessibleSections />
}
