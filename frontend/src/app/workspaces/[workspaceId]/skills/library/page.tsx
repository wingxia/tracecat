"use client"

import { useScopeCheck } from "@/components/auth/scope-guard"
import { CenteredSpinner } from "@/components/loading/spinner"
import { SkillLibraryView } from "@/components/skills/skill-library-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SkillLibraryPage() {
  const canRead = useScopeCheck("agent:read")

  if (canRead === undefined) return <CenteredSpinner />

  if (canRead === false) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertTitle>访问被拒绝</AlertTitle>
          <AlertDescription>你没有查看技能库的权限。</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <SkillLibraryView />
}
