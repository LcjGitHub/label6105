import SunCalc from 'suncalc'

/** 暮光时段定义（太阳高度角，度） */
export const TWILIGHT = {
  civil: -6,
  nautical: -12,
  astronomical: -18,
}

/** 摄影师时段定义 */
export const PHOTOGRAPHY_PERIODS = {
  goldenHourDuration: 60,
  blueHourMorning: { startKey: 'dawn', endKey: 'sunrise', label: '晨蓝调时刻' },
  blueHourEvening: { startKey: 'sunset', endKey: 'dusk', label: '暮蓝调时刻' },
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

function addMinutes(date, minutes) {
  if (!date || Number.isNaN(date.getTime())) return null
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function computeGoldenHours(times) {
  const duration = PHOTOGRAPHY_PERIODS.goldenHourDuration
  const morningStart = times.sunrise
  const morningEnd = times.sunrise ? addMinutes(times.sunrise, duration) : null
  const eveningEnd = times.sunset
  const eveningStart = times.sunset ? addMinutes(times.sunset, -duration) : null

  return {
    morning: {
      start: morningStart,
      end: morningEnd,
      startStr: formatTime(morningStart),
      endStr: formatTime(morningEnd),
      label: '晨黄金时刻',
      durationHours: diffHours(morningStart, morningEnd),
    },
    evening: {
      start: eveningStart,
      end: eveningEnd,
      startStr: formatTime(eveningStart),
      endStr: formatTime(eveningEnd),
      label: '暮黄金时刻',
      durationHours: diffHours(eveningStart, eveningEnd),
    },
  }
}

export function computeBlueHours(times) {
  const morningStart = times.dawn
  const morningEnd = times.sunrise
  const eveningStart = times.sunset
  const eveningEnd = times.dusk

  return {
    morning: {
      start: morningStart,
      end: morningEnd,
      startStr: formatTime(morningStart),
      endStr: formatTime(morningEnd),
      label: '晨蓝调时刻',
      durationHours: diffHours(morningStart, morningEnd),
    },
    evening: {
      start: eveningStart,
      end: eveningEnd,
      startStr: formatTime(eveningStart),
      endStr: formatTime(eveningEnd),
      label: '暮蓝调时刻',
      durationHours: diffHours(eveningStart, eveningEnd),
    },
  }
}

/**
 * 计算指定位置、日期的暮光时刻
 */
export function computeTwilightTimes(lat, lng, dateStr) {
  const date = parseLocalDate(dateStr)
  const times = SunCalc.getTimes(date, lat, lng)
  const azimuths = computeAzimuthForEvents(lat, lng, times)
  const goldenHours = computeGoldenHours(times)
  const blueHours = computeBlueHours(times)

  const rows = TIME_EVENTS.map((ev) => ({
    ...ev,
    time: times[ev.key],
    timeStr: formatTime(times[ev.key]),
    azimuth: azimuths[ev.key] || null,
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
    azimuths,
    goldenHours,
    blueHours,
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
      sunriseAzimuth: azimuths.sunrise,
      sunsetStartAzimuth: azimuths.sunsetStart,
      goldenHours,
      blueHours,
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

const SYNODIC_MONTH = 29.53058867

const MOON_PHASES = [
  { min: 0, max: 0.0334, name: '新月', emoji: '🌑', desc: '月亮位于太阳与地球之间，以暗面朝向地球' },
  { min: 0.0334, max: 0.2166, name: '娥眉月', emoji: '🌒', desc: '月亮逐渐露出一丝银钩，日落后出现在西方天空' },
  { min: 0.2166, max: 0.2834, name: '上弦月', emoji: '🌓', desc: '月亮呈现右半边明亮，中午升起、半夜落下' },
  { min: 0.2834, max: 0.4666, name: '盈凸月', emoji: '🌔', desc: '月亮大部分明亮，亮度逐日增加' },
  { min: 0.4666, max: 0.5334, name: '满月', emoji: '🌕', desc: '月亮整个圆面都被照亮，整夜可见' },
  { min: 0.5334, max: 0.7166, name: '亏凸月', emoji: '🌖', desc: '月亮大部分明亮，亮度逐日减少' },
  { min: 0.7166, max: 0.7834, name: '下弦月', emoji: '🌗', desc: '月亮呈现左半边明亮，半夜升起、中午落下' },
  { min: 0.7834, max: 0.9666, name: '残月', emoji: '🌘', desc: '月亮逐渐变成一丝银钩，黎明前出现在东方天空' },
  { min: 0.9666, max: 1.0001, name: '新月', emoji: '🌑', desc: '月亮位于太阳与地球之间，以暗面朝向地球' },
]

export function getMoonPhase(phaseValue) {
  return MOON_PHASES.find((p) => phaseValue >= p.min && phaseValue < p.max) || MOON_PHASES[0]
}

export function getMoonAge(phaseValue) {
  return phaseValue * SYNODIC_MONTH
}

export function computeMoonInfo(lat, lng, dateStr) {
  const date = parseLocalDate(dateStr)
  const times = SunCalc.getMoonTimes(date, lat, lng, false)
  const illum = SunCalc.getMoonIllumination(date)

  const phase = getMoonPhase(illum.phase)
  const age = getMoonAge(illum.phase)

  return {
    phase: {
      name: phase.name,
      emoji: phase.emoji,
      desc: phase.desc,
      value: illum.phase,
    },
    age,
    ageStr: `${age.toFixed(1)} 天`,
    illumination: `${(illum.fraction * 100).toFixed(1)}%`,
    moonrise: times.rise,
    moonset: times.set,
    moonriseStr: formatTime(times.rise, '未升起'),
    moonsetStr: formatTime(times.set, '未落下'),
  }
}

const COMPASS_DIRECTIONS = [
  { min: 0, max: 11.25, label: '正北' },
  { min: 11.25, max: 33.75, label: '北偏东' },
  { min: 33.75, max: 56.25, label: '东北' },
  { min: 56.25, max: 78.75, label: '东偏北' },
  { min: 78.75, max: 101.25, label: '正东' },
  { min: 101.25, max: 123.75, label: '东偏南' },
  { min: 123.75, max: 146.25, label: '东南' },
  { min: 146.25, max: 168.75, label: '南偏东' },
  { min: 168.75, max: 191.25, label: '正南' },
  { min: 191.25, max: 213.75, label: '南偏西' },
  { min: 213.75, max: 236.25, label: '西南' },
  { min: 236.25, max: 258.75, label: '西偏南' },
  { min: 258.75, max: 281.25, label: '正西' },
  { min: 281.25, max: 303.75, label: '西偏北' },
  { min: 303.75, max: 326.25, label: '西北' },
  { min: 326.25, max: 348.75, label: '北偏西' },
  { min: 348.75, max: 360, label: '正北' },
]

function sunAzimuthToCompassDegrees(azimuthRad) {
  let deg = (azimuthRad * 180) / Math.PI + 180
  if (deg < 0) deg += 360
  if (deg >= 360) deg -= 360
  return deg
}

export function getCompassDirection(azimuthDeg) {
  const dir = COMPASS_DIRECTIONS.find((d) => azimuthDeg >= d.min && azimuthDeg < d.max)
  return dir ? dir.label : '—'
}

export function computeSunAzimuth(lat, lng, date) {
  if (!date || Number.isNaN(date.getTime())) return null
  const pos = SunCalc.getPosition(date, lat, lng)
  const degrees = sunAzimuthToCompassDegrees(pos.azimuth)
  return {
    degrees: Number(degrees.toFixed(1)),
    direction: getCompassDirection(degrees),
  }
}

function computeAzimuthForEvents(lat, lng, times) {
  const result = {}
  const eventsWithAzimuth = ['sunrise', 'sunriseEnd', 'sunset', 'sunsetStart']
  for (const key of eventsWithAzimuth) {
    if (times[key]) {
      result[key] = computeSunAzimuth(lat, lng, times[key])
    }
  }
  return result
}

export { formatTime, diffHours }
