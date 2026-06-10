import SunCalc from 'suncalc'

/** 暮光时段定义（太阳高度角，度） */
export const TWILIGHT = {
  civil: -6,
  nautical: -12,
  astronomical: -18,
}

/**
 * SunCalc 返回的时刻键与中文标签
 *  evening: 日落方向（暮）；morning: 日出方向（晨）
 */
export const TIME_EVENTS = [
  { key: 'sunrise', label: '日出', desc: '太阳上边缘出现地平线', phase: 'morning' },
  { key: 'sunriseEnd', label: '日出结束', desc: '太阳完全离开地平线', phase: 'morning' },
  { key: 'dawn', label: '民用晨光结束', desc: '太阳升至 −6°，民用晨光结束', phase: 'morning' },
  { key: 'nauticalDawn', label: '航海晨光结束', desc: '太阳升至 −12°，航海晨光结束', phase: 'morning' },
  { key: 'nightEnd', label: '天文晨光结束', desc: '太阳升至 −18°，天文黑夜结束', phase: 'morning' },
  { key: 'sunset', label: '日落', desc: '太阳完全落入地平线', phase: 'evening' },
  { key: 'sunsetStart', label: '日落开始', desc: '太阳上边缘触及地平线', phase: 'evening' },
  { key: 'dusk', label: '民用暮光结束', desc: '太阳降至 −6°，民用暮光结束', phase: 'evening' },
  { key: 'nauticalDusk', label: '航海暮光结束', desc: '太阳降至 −12°，航海暮光结束', phase: 'evening' },
  { key: 'night', label: '天文暮光结束', desc: '太阳降至 −18°，天文黑夜开始', phase: 'evening' },
]

/** 用户关心的核心时段（单独展示） */
export const KEY_EVENTS = [
  { key: 'dusk', label: '民用暮光结束', note: '太阳高度 −6°' },
  { key: 'nauticalDusk', label: '天文暮光开始', note: '航海暮光结束，太阳 −12°' },
  { key: 'night', label: '天文暮光结束', note: '天文黑夜开始，太阳 −18°' },
  { key: 'nightEnd', label: '天文晨光结束', note: '天文黑夜结束（次日晨）' },
]

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

function formatTime(date, invalidLabel = '—') {
  if (!date || Number.isNaN(date.getTime())) return invalidLabel
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function diffHours(start, end) {
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  let ms = end - start
  if (ms < 0) ms += 24 * 60 * 60 * 1000
  return ms / (1000 * 60 * 60)
}

/**
 * 计算指定位置、日期的暮光时刻
 */
export function computeTwilightTimes(lat, lng, dateStr) {
  const date = parseLocalDate(dateStr)
  const times = SunCalc.getTimes(date, lat, lng)

  const rows = TIME_EVENTS.map((ev) => ({
    ...ev,
    time: times[ev.key],
    timeStr: formatTime(times[ev.key]),
  }))

  const nightStart = times.night
  const nightEnd = times.nightEnd
  const nightHours = diffHours(nightStart, nightEnd)

  const civilTwilightEvening = diffHours(times.dusk, times.night)
  const astronomicalNight = nightHours

  return {
    date,
    times,
    rows,
    keyTimes: KEY_EVENTS.map((ev) => ({
      ...ev,
      time: times[ev.key],
      timeStr: formatTime(times[ev.key]),
    })),
    summary: {
      nightStart,
      nightEnd,
      nightHours,
      civilTwilightEvening,
      astronomicalNight,
      solarNoon: times.solarNoon,
    },
  }
}

/** 观测适宜度等级 */
export const OBS_LEVELS = {
  excellent: { minHours: 5, label: '极佳', class: 'excellent' },
  good: { minHours: 3, label: '良好', class: 'good' },
  fair: { minHours: 1, label: '一般', class: 'fair' },
  poor: { minHours: 0, label: '不适宜', class: 'poor' },
}

export function getObservationLevel(nightHours) {
  if (nightHours == null || nightHours <= 0) return OBS_LEVELS.poor
  if (nightHours >= OBS_LEVELS.excellent.minHours) return OBS_LEVELS.excellent
  if (nightHours >= OBS_LEVELS.good.minHours) return OBS_LEVELS.good
  if (nightHours >= OBS_LEVELS.fair.minHours) return OBS_LEVELS.fair
  return OBS_LEVELS.poor
}

/**
 * 生成本月每日观测数据
 */
export function computeMonthCalendar(lat, lng, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const { summary, times } = computeTwilightTimes(lat, lng, dateStr)
    const level = getObservationLevel(summary.nightHours)

    days.push({
      day,
      dateStr,
      weekday: new Date(year, month - 1, day).getDay(),
      nightHours: summary.nightHours,
      nightStart: times.night,
      nightEnd: times.nightEnd,
      level,
      nightStartStr: formatTime(times.night),
      nightEndStr: formatTime(times.nightEnd),
    })
  }

  return days
}

export { formatTime, diffHours }
