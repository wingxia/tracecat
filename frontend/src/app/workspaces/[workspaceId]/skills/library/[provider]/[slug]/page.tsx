"use client"

import { useParams } from "next/navigation"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { CenteredSpinner } from "@/components/loading/spinner"
import { SkillLibrarySkillView } from "@/components/skills/skill-library-skill-view"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * Read-only preview of one library skill.
 *
 * @returns The library skill preview, or an access notice.
 */
export default function SkillLibrarySkillPage() {
  const params = useParams<{ slug: string }>()
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

  return <SkillLibrarySkillView slug={params.slug} />
}
