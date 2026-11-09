"use client"

import { Loader2Icon } from "lucide-react"
import type { ValidationResult } from "@/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ValidationErrorMessage } from "@/components/validation-errors"
import { getExportError } from "@/components/workspace-sync/export-error"

/** Failure details from one explicit Publish attempt, separate from editor errors. */
export type PublishFirstError = {
  message: string
  validationErrors?: ValidationResult[] | null
}

/** Only the server's explicit prerequisite code selects Publish-first guidance. */
export function isPublishRequired(error: unknown): boolean {
  return (
    getExportError(error)?.diagnostics?.some(
      (diagnostic) => diagnostic.code === "publish_required"
    ) ?? false
  )
}

/** Offer an explicit Publish action before the user retries Git Push. */
export function PublishFirstDialog({
  open,
  onOpenChange,
  onPublish,
  isPublishing,
  publishError,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublish: () => Promise<void>
  isPublishing: boolean
  publishError: PublishFirstError | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The required Got it action is this dialog's only dismiss button. */}
      <DialogContent size="sm" className="[&>button]:hidden">
        <DialogHeader>
          <DialogTitle>请先发布此工作流</DialogTitle>
          <DialogDescription>
            推送到 Git 前，请先发布此工作流。
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-muted-foreground">
            发布当前更改的版本，然后重试“推送到 Git”。
          </p>
          {publishError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                {publishError.message}
                {publishError.validationErrors?.map((error, index) => (
                  <ValidationErrorMessage
                    key={index}
                    error={error}
                    className="mt-2"
                  />
                ))}
              </AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button size="sm" variant="outline">
              知道了
            </Button>
          </DialogClose>
          <Button size="sm" onClick={onPublish} disabled={isPublishing}>
            {isPublishing && (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            )}
            {isPublishing ? "发布中…" : "发布工作流"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
