import { ExternalLinkIcon } from "lucide-react"
import { DEFAULT_ACTION_TIMEOUT_SECONDS } from "@/lib/action-timeout"

export function RunIfTooltip() {
  return (
    <div className="w-full space-y-4">
      <div className="flex w-full items-center justify-between text-muted-foreground ">
        <span className="font-mono text-sm font-semibold">run_if</span>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="flex w-full items-center justify-between text-muted-foreground ">
        <span>run_if 条件表达式的计算结果为真值或假值：</span>
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">{"${{ <condition> }}"}</pre>
      </div>
      <div className="w-full items-center text-start">
        <span>输入示例： </span>
      </div>
      <div className="flex w-full flex-col space-y-2 text-muted-foreground">
        <div className="rounded-md border bg-muted-foreground/10 p-2">
          <pre className="whitespace-pre-wrap text-xs text-foreground/70">
            <span className="text-xs text-muted-foreground">
              # 检查用户是否具有管理员角色
            </span>
            <p>{"${{ ACTIONS.check_user.result.role == 'admin' }}"}</p>
            {"\n"}
            <span className="text-xs text-muted-foreground">
              # 检查告警严重程度
            </span>
            <p>{"${{ TRIGGER.alert.severity in ['high', 'critical'] }}"}</p>
            {"\n"}
            <span className="text-xs text-muted-foreground">
              # 检查登录失败次数是否超过阈值
            </span>
            <p>{"${{ ACTIONS.count_failed_logins.result > 5 }}"}</p>
            {"\n"}
            <span className="text-xs text-muted-foreground">
              # 在日志中搜索错误模式
            </span>
            <p>
              {"${{ FN.regex_match('error|failed', ACTIONS.get_logs.result) }}"}
            </p>
            {"\n"}
            <span className="text-xs text-muted-foreground">
              # 验证日志不为空
            </span>
            <p>{"${{ FN.not_empty(ACTIONS.get_logs.result) }}"}</p>
          </pre>
        </div>
      </div>
    </div>
  )
}

export function ForEachTooltip() {
  return (
    <div className="w-full space-y-4">
      <div className="flex w-full items-center justify-between text-muted-foreground ">
        <span className="font-mono text-sm font-semibold">for_each</span>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="flex w-full items-center justify-between text-muted-foreground ">
        <span>循环表达式的格式为：</span>
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">
          {"${{ for var.item in <collection> }}"}
        </pre>
      </div>
      <div className="w-full items-center text-start text-muted-foreground ">
        <span>
          `var.item`
          引用集合中的元素，仅在单次循环迭代内有效，相当于定义一个循环变量。
        </span>
      </div>
      <div className="w-full items-center text-start">
        <span>输入示例： </span>
      </div>
      <div className="flex w-full flex-col text-muted-foreground ">
        <span className="mt-2">单个表达式（字符串）：</span>
        <div className="rounded-md border bg-muted-foreground/10 p-2">
          <pre className="text-xs text-foreground/70">
            {"${{ for var.item in ACTIONS.my_action.result }}"}
          </pre>
        </div>
      </div>
      <div className="w-full text-muted-foreground ">
        <span className="mt-2">多个表达式（数组；按位置同步迭代）：</span>
        <div className="rounded-md border bg-muted-foreground/10 p-2">
          <pre className="flex flex-col text-xs text-foreground/70">
            <span>
              {"- ${{ for var.first in ACTIONS.first_action.result }}"}
            </span>
            <span>
              {"- ${{ for var.second in ACTIONS.second_action.result }}"}
            </span>
          </pre>
        </div>
      </div>
    </div>
  )
}

export function MaxAttemptsTooltip() {
  return (
    <div className="w-full space-y-3">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">max_attempts</span>
          <span className="text-xs font-normal text-muted-foreground/80">
            integer
          </span>
        </div>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="w-full items-center space-y-2 text-start text-muted-foreground">
        <div>指定动作失败后的最大尝试次数。</div>
        <div>默认为 1。</div>
        <div>
          <b className="text-rose-500">警告</b> 设为 0 时，动作会无限重试。
        </div>
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">max_attempts: 5</pre>
      </div>
    </div>
  )
}

export function TimeoutTooltip({ isAgent = false }: { isAgent?: boolean }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">timeout</span>
          <span className="text-xs font-normal text-muted-foreground/80">
            integer
          </span>
        </div>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="w-full items-center space-y-2 text-start text-muted-foreground">
        {isAgent ? (
          <>
            <div>
              定义智能体可连续执行的时长。审批后恢复执行时会重新开始计时。
            </div>
            <div>
              使用部署的默认值，且不超过部署的超时上限。保存时会将超出范围的值调整到最近的边界。
            </div>
          </>
        ) : (
          <>
            <div>定义动作被终止前允许执行的最长时间（秒）。</div>
            <div>默认为 {DEFAULT_ACTION_TIMEOUT_SECONDS}秒（5 分钟）。</div>
          </>
        )}
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">
          {isAgent ? (
            <>
              timeout: 7200{" "}
              <span className="text-xs text-muted-foreground"># 2 小时</span>
            </>
          ) : (
            <>
              timeout: {DEFAULT_ACTION_TIMEOUT_SECONDS}{" "}
              <span className="text-xs text-muted-foreground"># 5 分钟</span>
            </>
          )}
        </pre>
      </div>
    </div>
  )
}

export function RetryUntilTooltip() {
  return (
    <div className="w-full space-y-3">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">retry_until</span>
          <span className="text-xs font-normal text-muted-foreground/80">
            表达式字符串
          </span>
        </div>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="w-full items-center space-y-2 text-start text-muted-foreground">
        <div>
          持续重试动作，直到表达式的值为
          `true`。仅适用于成功执行的动作；发生错误时仍使用常规重试策略。
        </div>
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="whitespace-pre-wrap text-xs text-foreground/70">
          retry_until: ${`{{ ACTIONS.this_action.result == "success" }}`}{" "}
          <span className="text-xs text-muted-foreground">
            # 等待结果为 `success`
          </span>
        </pre>
      </div>
    </div>
  )
}

export function StartDelayTooltip() {
  return (
    <div className="w-full space-y-3">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">start_delay</span>
          <span className="text-xs font-normal text-muted-foreground/80">
            float
          </span>
        </div>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="w-full items-center space-y-2 text-start text-muted-foreground">
        <div>指定动作启动前的延迟（秒）。</div>
        <div>默认为 0.0 秒。</div>
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">start_delay: 5.5</pre>
      </div>
    </div>
  )
}

export function JoinStrategyTooltip() {
  return (
    <div className="w-full space-y-3">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">join_strategy</span>
          <span className="text-xs font-normal text-muted-foreground/80">
            string
          </span>
        </div>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="w-full items-center space-y-2 text-start text-muted-foreground">
        <div>多个分支汇合到此动作时使用的策略。</div>
        <div>可以设为 `all`（等待所有分支）或 `any`（等待任一分支）。</div>
        <div>默认为 `all`。</div>
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">join_strategy: all</pre>
      </div>
    </div>
  )
}

export function WaitUntilTooltip() {
  return (
    <div className="w-full space-y-3">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">wait_until</span>
          <span className="text-xs font-normal text-muted-foreground/80">
            string
          </span>
        </div>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <div className="w-full items-center space-y-2 text-start text-muted-foreground">
        <div>
          使用自然语言或日期时间字符串指定动作开始时间。字符串由 Python
          `dateparser` 库解析。
        </div>
        <div>支持以下格式：</div>
        <ul className="list-disc pl-4 text-xs">
          <li>自然语言：“tomorrow at 3pm”、“yesterday 5pm”</li>
          <li>相对时间：“3 days ago”、“in 2 weeks”</li>
          <li>绝对时间：“2024-03-21 15:30:00”、“March 21st 3:30pm”</li>
        </ul>
        {/* docs link */}
        <a
          href="https://dateparser.readthedocs.io/en/latest/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline"
        >
          <span>查看 dateparser 文档</span>
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">
          <span className="text-xs text-muted-foreground">
            # 次日下午 3 点运行
          </span>
          {"\n"}wait_until: tomorrow at 3pm{"\n"}
          <span className="text-xs text-muted-foreground">
            # 动作调度后 2 小时运行
          </span>
          {"\n"}wait_until: in 2 hours{"\n"}
          <span className="text-xs text-muted-foreground">
            # 2026 年 3 月 21 日下午 3:30 运行
          </span>
          {"\n"}wait_until: &quot;2026-03-21 15:30:00&quot;
        </pre>
      </div>
    </div>
  )
}
