/** A title and explanation for a chat that has no usable model. */
export interface ChatModelNotice {
  title: string
  message: string
}

/** Shown when the organization has no usable default model. */
export const NO_DEFAULT_MODEL_MESSAGE =
  "请在智能体设置中选择默认模型，以启用对话。"

/**
 * Explain a chat that has no usable model because of the workspace's model
 * subset, which organization agent settings alone cannot fix. Returns null for
 * every other readiness reason.
 */
export function getWorkspaceModelNotice(
  reason: string | undefined
): ChatModelNotice | null {
  switch (reason) {
    case "subset_disabled":
      return {
        title: "工作空间模型已禁用",
        message:
          "组织已禁用此工作空间启用的所有模型。工作空间管理员可在 AI 模型设置中选择新模型，组织管理员也可启用更多模型。",
      }
    case "default_not_enabled":
      return {
        title: "默认模型未启用",
        message:
          "此工作空间未启用组织默认模型，工作空间管理员可在 AI 模型设置中启用。",
      }
    default:
      return null
  }
}

/** One-line reason a chat has no usable model, for a disabled composer. */
export function getModelUnavailableMessage(reason: string | undefined): string {
  return getWorkspaceModelNotice(reason)?.message ?? NO_DEFAULT_MODEL_MESSAGE
}
