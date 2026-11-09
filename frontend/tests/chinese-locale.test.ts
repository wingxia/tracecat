import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { getRelativeTime } from "@/lib/event-history"
import {
  durationToISOString,
  formatDurationLong,
  formatRelative,
  parseISODuration,
} from "@/lib/time"
import { shortTimeAgo } from "@/lib/utils"

describe("Chinese time display", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-11-09T12:00:00Z"))
  })

  afterEach(() => jest.useRealTimers())

  it("renders elapsed and future times in Chinese without changing the instant", () => {
    const earlier = new Date("2026-11-09T11:55:00Z")
    expect(formatRelative(earlier)).toBe("5 分钟前")
    expect(shortTimeAgo(earlier)).toBe("5 分钟前")
    expect(getRelativeTime(earlier)).toBe("约 5 分钟前")
    expect(formatRelative("2026-11-09T12:05:00Z")).toBe("5 分钟内")
    expect(earlier.toISOString()).toBe("2026-11-09T11:55:00.000Z")
    expect(formatRelative("not-a-date")).toBeNull()
  })

  it("keeps ISO durations stable while localizing their readable form", () => {
    const value = parseISODuration("P1DT2H3M")
    expect(formatDurationLong(value)).toBe("1 天，2 小时，3 分钟")
    expect(durationToISOString(value)).toBe("P1DT2H3M")
  })

  it("uses Chinese month and weekday names", () => {
    const date = new Date(2026, 10, 9, 12, 0)
    expect(format(date, "PPP EEEE", { locale: zhCN })).toBe(
      "2026年11月9日 星期一"
    )
  })
})
