import { z } from "zod"

export const GIT_SSH_URL_REGEX =
  /^git\+ssh:\/\/(?<user>[^/@:]+)@(?<hostname>[^/:]+)(?::(?<port>\d+))?\/(?<path>[^/@]+(?:\/[^/@]+)+)(?:\.git)?(?:@(?<ref>[^@]+))?$/

// Mirrors the backend validation in tracecat/git/constants.py but enforces at least
// an <org>/<repo> path structure on the client.

/**
 * Extract the `<org>/<repo>` display name from a Git SSH URL.
 *
 * @param url - A `git+ssh://` repository URL.
 * @returns The `<org>/<repo>` path without the `.git` suffix, or `null` if the
 *   URL cannot be parsed.
 */
export function getRepoDisplayName(
  url: string | null | undefined
): string | null {
  if (!url) return null
  const match = GIT_SSH_URL_REGEX.exec(url)
  const path = match?.groups?.path
  if (!path) return null
  // The `path` capture group is greedy and includes a trailing `.git`.
  return path.replace(/\.git$/, "")
}

/**
 * Extract the `@ref` suffix from a Git SSH URL.
 *
 * @param url - A `git+ssh://` repository URL.
 * @returns The branch, tag, or commit after `@`, or `null` when the URL has
 *   no ref or cannot be parsed.
 */
export function getRepoRef(url: string): string | null {
  return GIT_SSH_URL_REGEX.exec(url)?.groups?.ref ?? null
}

export function validateGitSshUrl(
  url: string | null | undefined,
  ctx: z.RefinementCtx
) {
  if (!url) return

  if (GIT_SSH_URL_REGEX.test(url)) return

  if (!url.startsWith("git+ssh://")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "URL 必须以“git+ssh://”协议开头",
    })
    return
  }

  const protocolWithoutScheme = url.replace("git+ssh://", "")

  if (!protocolWithoutScheme.includes("@")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "URL 必须包含 SSH 用户（如 git@ 或 someuser@）",
    })
    return
  }

  const afterProtocol = protocolWithoutScheme
  const firstSlashIndex = afterProtocol.indexOf("/")

  if (firstSlashIndex === -1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "URL 必须包含仓库路径",
    })
    return
  }

  const hostname = afterProtocol.substring(0, firstSlashIndex)
  const repoPath = afterProtocol.substring(firstSlashIndex + 1)

  if (!hostname) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "缺少主机名",
    })
    return
  }

  if (hostname.includes(":")) {
    const colonIndex = hostname.lastIndexOf(":")
    const portPart = hostname.substring(colonIndex + 1)

    if (!portPart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "“:”后缺少端口号",
      })
      return
    }

    if (!/^\d+$/.test(portPart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "端口必须是数字",
      })
      return
    }
  }

  const pathSegments = repoPath
    .split("/")
    .filter((segment) => segment.length > 0)

  if (pathSegments.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "仓库路径至少需要两段（如 org/repo）",
    })
    return
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message:
      "必须是有效的 Git SSH URL（如 git+ssh://<user>@github.com/org/repo.git）",
  })
}

/**
 * Why a short branch name fails `git check-ref-format --branch`, or null when
 * it is valid. Empty input is not an error, only incomplete.
 */
export function getGitBranchNameError(name: string): string | null {
  if (name === "") {
    return null
  }
  if (/[\s~^:?*[\\\x00-\x1f\x7f]/.test(name)) {
    return "分支名称不能包含空格或 ~ ^ : ? * [ 以及反斜杠"
  }
  if (name.startsWith("refs/")) {
    return "省略 refs/，仅输入分支名称。"
  }
  if (name.includes("..") || name.includes("@{") || name === "@") {
    return "分支名称不能包含 .. 或 @{，也不能仅为 @。"
  }
  if (name.startsWith("-")) {
    return "分支名称不能以 - 开头。"
  }
  if (name.startsWith("/") || name.endsWith("/") || name.includes("//")) {
    return "分支名称不能以 / 开头或结尾，也不能包含 //。"
  }
  const parts = name.split("/")
  if (
    name.endsWith(".") ||
    parts.some((part) => part.startsWith(".") || part.endsWith(".lock"))
  ) {
    return "分支名称的各段不能以 . 开头，也不能以 .lock 或 . 结尾。"
  }
  return null
}
