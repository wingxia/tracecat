import type { ApiError } from "@/client"

interface ApiErrorDetail {
  error?: string
  message?: string
  allowed_extensions?: string[]
  current_count?: number
  max_count?: number
  current_size_mb?: number
  new_file_size_mb?: number
  max_size_mb?: number
}

interface ApiErrorBody {
  detail?: ApiErrorDetail | string
}

interface AttachmentUploadErrorToast {
  title: string
  description: string
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  )
}

function getErrorDetail(error: ApiError): ApiErrorDetail | string | undefined {
  if (error.body && typeof error.body === "object") {
    return (error.body as ApiErrorBody).detail
  }
  return undefined
}

/**
 * Map a case attachment upload failure to a human-readable toast payload.
 *
 * Reuses the structured backend error codes for unsupported types, file size,
 * validation failures, and storage/attachment limits surfaced by the API.
 *
 * @param error - The error thrown by the upload mutation.
 * @param fileName - The name of the file the user tried to upload.
 * @returns A `{ title, description }` payload for the toast helper.
 */
export function describeAttachmentUploadError(
  error: unknown,
  fileName: string
): AttachmentUploadErrorToast {
  if (!isApiError(error)) {
    const message = error instanceof Error ? error.message : "未知错误"
    return {
      title: "上传失败",
      description: `上传 ${fileName} 失败。${message}`,
    }
  }

  const detail = getErrorDetail(error)
  const detailObject = typeof detail === "object" ? detail : undefined

  switch (detailObject?.error) {
    case "unsupported_file_extension":
      return {
        title: "不支持此文件类型",
        description: `无法上传 ${fileName}。允许的文件类型：${
          detailObject.allowed_extensions?.join(", ") ||
          "txt, pdf, png, jpeg, gif, csv"
        }`,
      }
    case "unsupported_content_type":
      return {
        title: "不支持此内容类型",
        description: `${fileName} 的内容类型不受支持，请尝试其他文件类型。`,
      }
    case "file_too_large":
      return {
        title: "文件过大",
        description: `${fileName} 过大，无法上传。${detailObject.message || "请选择较小的文件。"}`,
      }
    case "storage_limit_exceeded": {
      let description = `添加 ${fileName} 将超出事件存储限额。`
      if (
        detailObject.current_size_mb &&
        detailObject.new_file_size_mb &&
        detailObject.max_size_mb
      ) {
        description = `添加 ${fileName}（${detailObject.new_file_size_mb}MB）将超出事件存储限额。目前已使用 ${detailObject.current_size_mb}MB，限额为 ${detailObject.max_size_mb}MB。`
      }
      return {
        title: "超出事件存储限制",
        description: `${description} 请移除部分附件或选择较小的文件。`,
      }
    }
    case "max_attachments_exceeded": {
      let description = "此事件的附件数量已达到上限。"
      if (detailObject.current_count && detailObject.max_count) {
        description = `此事件已有 ${detailObject.current_count} 个附件，上限为 ${detailObject.max_count} 个。`
      }
      return {
        title: "附件过多",
        description: `${description} 请先移除部分附件，再添加新附件。`,
      }
    }
    case "file_validation_failed":
      return {
        title: "文件校验失败",
        description: `${fileName} 未通过校验，请检查文件后重试。`,
      }
    default:
      break
  }

  let message = error.message || "未知错误"
  if (detail) {
    message =
      typeof detail === "string"
        ? detail
        : detail.message || JSON.stringify(detail)
  }
  return {
    title: "上传失败",
    description: `上传 ${fileName} 失败。${message}`,
  }
}
