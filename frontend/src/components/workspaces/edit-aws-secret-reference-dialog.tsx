"use client"

import type { SecretReadMinimal } from "@/client"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AwsSecretReferenceForm } from "@/components/workspaces/aws-secret-reference-form"
import { useAwsSecretReference } from "@/hooks/use-secret-stores"
import { useWorkspaceId } from "@/providers/workspace-id"

/** Edit an existing AWS reference using metadata, never remote secret values. */
export function EditAwsSecretReferenceDialog({
  secret,
  onClose,
}: {
  secret: SecretReadMinimal
  onClose: () => void
}) {
  const workspaceId = useWorkspaceId()
  const { data, isLoading, error } = useAwsSecretReference(
    workspaceId,
    secret.id,
    secret.environment
  )

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>编辑密钥</DialogTitle>
          <DialogDescription>
            更新 AWS 密钥引用和键映射，密钥值仍保留在 AWS Secrets Manager 中。
          </DialogDescription>
        </DialogHeader>
        {(isLoading || error) && (
          <DialogBody>
            {isLoading && <CenteredSpinner />}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>无法加载密钥引用</AlertTitle>
                <AlertDescription>
                  请关闭后重新打开对话框以重试。
                </AlertDescription>
              </Alert>
            )}
          </DialogBody>
        )}
        {data && !error && (
          <AwsSecretReferenceForm secret={data} onSaved={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}
