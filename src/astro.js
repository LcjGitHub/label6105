import SunCalc from 'suncalc'

/** 暮光时段定义（太阳高度角，度） */
export const TWILIGHT = {
  civil: -6,
  nautical: -12,
  astronomical: -18
}

/** 摄影师时段定义 */
export const PHOTOGRAPHY_PERIODS = {
  goldenHourDuration: 60,
  blueHourMorning: { startKey: 'dawn', endKey: 'sunrise', label: '晨蓝调时刻' },
  blueHourEvening: { startKey: 'sunset', endKey: 'dusk', label: '暮蓝调时刻' }
}

/**
 * SunCalc 返回的时刻键与中文标签
 *  evening: 日落方向（暮）；morning: 日出方向（晨）
 */
export const TIME_EVENTS = [
  { key: 'sunrise', label: '日出', desc: '太阳上边缘出现地平线', phase: 'morning' },
  { key: 'sunriseEnd', label: '日出结束', desc: '太阳完全离开地平线', phase: 'morning' },
  { key: 'dawn', label: '民用晨光结束', desc: '太阳升至 −6°，民用晨光结束', phase: 'morning' },
  {
    key: 'nauticalDawn',
    label: '航海晨光结束',
    desc: '太阳升至 −12°，航海晨光结束',
    phase: 'morning'
  },
  { key: 'nightEnd', label: '天文晨光结束', desc: '太阳升至 −18°，天文黑夜结束', phase: 'morning' },
  { key: 'sunset', label: '日落', desc: '太阳完全落入地平线', phase: 'evening' },
  { key: 'sunsetStart', label: '日落开始', desc: '太阳上边缘触及地平线', phase: 'evening' },
  { key: 'dusk', label: '民用暮光结束', desc: '太阳降至 −6°，民用暮光结束', phase: 'evening' },
  {
    key: 'nauticalDusk',
    label: '航海暮光结束',
    desc: '太阳降至 −12°，航海暮光结束',
    phase: 'evening'
  },
  { key: 'night', label: '天文暮光结束', desc: '太阳降至 −18°，天文黑夜开始', phase: 'evening' }
]

/** 用户关心的核心时段（单独展示） */
export const KEY_EVENTS = [
  { key: 'dusk', label: '民用暮光结束', note: '太阳高度 −6°' },
  { key: 'nauticalDusk', label: '天文暮光开始', note: '航海暮光结束，太阳 −12°' },
  { key: 'night', label: '天文暮光结束', note: '天文黑夜开始，太阳 −18°' },
  { key: 'nightEnd', label: '天文晨光结束', note: '天文黑夜结束（次日晨）' }
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
      durationHours: diffHours(morningStart, morningEnd)
    },
    evening: {
      start: eveningStart,
      end: eveningEnd,
      startStr: formatTime(eveningStart),
      endStr: formatTime(eveningEnd),
      label: '暮黄金时刻',
      durationHours: diffHours(eveningStart, eveningEnd)
    }
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
      durationHours: diffHours(morningStart, morningEnd)
    },
    evening: {
      start: eveningStart,
      end: eveningEnd,
      startStr: formatTime(eveningStart),
      endStr: formatTime(eveningEnd),
      label: '暮蓝调时刻',
      durationHours: diffHours(eveningStart, eveningEnd)
    }
  }
}

export function getMinutesOfDay(date) {
  if (!date || Number.isNaN(date.getTime())) return null
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60
}

export function getPhotographyRows(goldenHours, blueHours) {
  return [
    {
      key: 'blueHourMorning',
      label: blueHours.morning.label,
      desc: `民用晨光期间 · ${blueHours.morning.startStr} ~ ${blueHours.morning.endStr}`,
      phase: 'morning',
      time: blueHours.morning.start,
      timeStr: `${blueHours.morning.startStr} → ${blueHours.morning.endStr}`,
      azimuth: null,
      isPeriod: true,
      periodType: 'blue'
    },
    {
      key: 'goldenHourMorning',
      label: goldenHours.morning.label,
      desc: `日出后一小时 · ${goldenHours.morning.startStr} ~ ${goldenHours.morning.endStr}`,
      phase: 'morning',
      time: goldenHours.morning.start,
      timeStr: `${goldenHours.morning.startStr} → ${goldenHours.morning.endStr}`,
      azimuth: null,
      isPeriod: true,
      periodType: 'golden'
    },
    {
      key: 'goldenHourEvening',
      label: goldenHours.evening.label,
      desc: `日落前一小时 · ${goldenHours.evening.startStr} ~ ${goldenHours.evening.endStr}`,
      phase: 'evening',
      time: goldenHours.evening.start,
      timeStr: `${goldenHours.evening.startStr} → ${goldenHours.evening.endStr}`,
      azimuth: null,
      isPeriod: true,
      periodType: 'golden'
    },
    {
      key: 'blueHourEvening',
      label: blueHours.evening.label,
      desc: `民用暮光期间 · ${blueHours.evening.startStr} ~ ${blueHours.evening.endStr}`,
      phase: 'evening',
      time: blueHours.evening.start,
      timeStr: `${blueHours.evening.startStr} → ${blueHours.evening.endStr}`,
      azimuth: null,
      isPeriod: true,
      periodType: 'blue'
    }
  ]
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
  const photographyRows = getPhotographyRows(goldenHours, blueHours)

  const rows = TIME_EVENTS.map(ev => ({
    ...ev,
    time: times[ev.key],
    timeStr: formatTime(times[ev.key]),
    azimuth: azimuths[ev.key] || null
  }))

  const allRows = [...photographyRows, ...rows]

  const nightStart = times.night
  const nightEnd = times.nightEnd
  const nightHours = diffHours(nightStart, nightEnd)

  const civilTwilightEvening = diffHours(times.dusk, times.night)
  const astronomicalNight = nightHours

  return {
    date,
    times,
    rows,
    allRows,
    photographyRows,
    azimuths,
    goldenHours,
    blueHours,
    keyTimes: KEY_EVENTS.map(ev => ({
      ...ev,
      time: times[ev.key],
      timeStr: formatTime(times[ev.key])
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
      blueHours
    }
  }
}

/** 观测适宜度等级 */
export const OBS_LEVELS = {
  excellent: { minHours: 5, label: '极佳', class: 'excellent' },
  good: { minHours: 3, label: '良好', class: 'good' },
  fair: { minHours: 1, label: '一般', class: 'fair' },
  poor: { minHours: 0, label: '不适宜', class: 'poor' }
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
    const moonIllum = SunCalc.getMoonIllumination(parseLocalDate(dateStr))
    const moonTimes = SunCalc.getMoonTimes(parseLocalDate(dateStr), lat, lng, false)

    const scoreData = computeObservationScore({
      nightHours: summary.nightHours,
      lat,
      dateStr,
      moonIllumination: moonIllum.fraction,
      nightStart: times.night,
      nightEnd: times.nightEnd,
      moonrise: moonTimes.rise,
      moonset: moonTimes.set
    })

    days.push({
      day,
      dateStr,
      weekday: new Date(year, month - 1, day).getDay(),
      nightHours: summary.nightHours,
      nightStart: times.night,
      nightEnd: times.nightEnd,
      level: scoreData.level,
      score: scoreData.total,
      nightStartStr: formatTime(times.night),
      nightEndStr: formatTime(times.nightEnd)
    })
  }

  return days
}

const SYNODIC_MONTH = 29.53058867

const MOON_PHASES = [
  {
    min: 0,
    max: 0.0334,
    name: '新月',
    emoji: '🌑',
    desc: '月亮位于太阳与地球之间，以暗面朝向地球'
  },
  {
    min: 0.0334,
    max: 0.2166,
    name: '娥眉月',
    emoji: '🌒',
    desc: '月亮逐渐露出一丝银钩，日落后出现在西方天空'
  },
  {
    min: 0.2166,
    max: 0.2834,
    name: '上弦月',
    emoji: '🌓',
    desc: '月亮呈现右半边明亮，中午升起、半夜落下'
  },
  { min: 0.2834, max: 0.4666, name: '盈凸月', emoji: '🌔', desc: '月亮大部分明亮，亮度逐日增加' },
  { min: 0.4666, max: 0.5334, name: '满月', emoji: '🌕', desc: '月亮整个圆面都被照亮，整夜可见' },
  { min: 0.5334, max: 0.7166, name: '亏凸月', emoji: '🌖', desc: '月亮大部分明亮，亮度逐日减少' },
  {
    min: 0.7166,
    max: 0.7834,
    name: '下弦月',
    emoji: '🌗',
    desc: '月亮呈现左半边明亮，半夜升起、中午落下'
  },
  {
    min: 0.7834,
    max: 0.9666,
    name: '残月',
    emoji: '🌘',
    desc: '月亮逐渐变成一丝银钩，黎明前出现在东方天空'
  },
  {
    min: 0.9666,
    max: 1.0001,
    name: '新月',
    emoji: '🌑',
    desc: '月亮位于太阳与地球之间，以暗面朝向地球'
  }
]

export function getMoonPhase(phaseValue) {
  return MOON_PHASES.find(p => phaseValue >= p.min && phaseValue < p.max) || MOON_PHASES[0]
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
      value: illum.phase
    },
    age,
    ageStr: `${age.toFixed(1)} 天`,
    illumination: `${(illum.fraction * 100).toFixed(1)}%`,
    illuminationFraction: illum.fraction,
    moonrise: times.rise,
    moonset: times.set,
    moonriseStr: formatTime(times.rise, '未升起'),
    moonsetStr: formatTime(times.set, '未落下')
  }
}

export function compareMoonPhases(moonA, moonB) {
  const illumDiff = moonB.illuminationFraction - moonA.illuminationFraction
  const illumDiffPercent = (illumDiff * 100).toFixed(1)
  const ageDiff = moonB.age - moonA.age

  let trend
  let trendClass
  let observationNote

  if (Math.abs(illumDiff) < 0.02) {
    trend = '月光强度相近'
    trendClass = 'same'
    observationNote = '两日夜空条件接近'
  } else if (illumDiff > 0) {
    trend = '日期 B 月光更强'
    trendClass = 'worse'
    observationNote = '日期 A 更适合暗天体观测'
  } else {
    trend = '日期 B 月光更弱'
    trendClass = 'better'
    observationNote = '日期 B 更适合暗天体观测'
  }

  return {
    illumDiff,
    illumDiffPercent,
    ageDiff,
    ageDiffStr: `${ageDiff > 0 ? '+' : ''}${ageDiff.toFixed(1)} 天`,
    trend,
    trendClass,
    observationNote
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
  { min: 348.75, max: 360, label: '正北' }
]

function sunAzimuthToCompassDegrees(azimuthRad) {
  let deg = (azimuthRad * 180) / Math.PI + 180
  if (deg < 0) deg += 360
  if (deg >= 360) deg -= 360
  return deg
}

export function getCompassDirection(azimuthDeg) {
  const dir = COMPASS_DIRECTIONS.find(d => azimuthDeg >= d.min && azimuthDeg < d.max)
  return dir ? dir.label : '—'
}

export function computeSunAzimuth(lat, lng, date) {
  if (!date || Number.isNaN(date.getTime())) return null
  const pos = SunCalc.getPosition(date, lat, lng)
  const degrees = sunAzimuthToCompassDegrees(pos.azimuth)
  return {
    degrees: Number(degrees.toFixed(1)),
    direction: getCompassDirection(degrees)
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

/**
 * 观测适宜度评分等级定义
 */
export const SCORE_LEVELS = {
  excellent: { minScore: 85, label: '极佳', class: 'excellent' },
  good: { minScore: 70, label: '良好', class: 'good' },
  fair: { minScore: 55, label: '一般', class: 'fair' },
  poor: { minScore: 35, label: '较差', class: 'poor' },
  veryPoor: { minScore: 0, label: '不适宜', class: 'verypoor' }
}

export function getScoreLevel(score) {
  if (score >= SCORE_LEVELS.excellent.minScore) return SCORE_LEVELS.excellent
  if (score >= SCORE_LEVELS.good.minScore) return SCORE_LEVELS.good
  if (score >= SCORE_LEVELS.fair.minScore) return SCORE_LEVELS.fair
  if (score >= SCORE_LEVELS.poor.minScore) return SCORE_LEVELS.poor
  return SCORE_LEVELS.veryPoor
}

function calcNightHoursScore(nightHours) {
  if (nightHours == null || nightHours <= 0) return { score: 0, detail: '无天文黑夜' }
  let score = 0
  let detail = ''
  if (nightHours >= 6) {
    score = 40
    detail = '黑夜充足（≥6 小时）'
  } else if (nightHours >= 5) {
    score = 35 + (nightHours - 5) * 5
    detail = '黑夜较长'
  } else if (nightHours >= 4) {
    score = 30 + (nightHours - 4) * 5
    detail = '黑夜充足'
  } else if (nightHours >= 3) {
    score = 22 + (nightHours - 3) * 8
    detail = '黑夜适中'
  } else if (nightHours >= 2) {
    score = 14 + (nightHours - 2) * 8
    detail = '黑夜较短'
  } else if (nightHours >= 1) {
    score = 6 + (nightHours - 1) * 8
    detail = '黑夜很短'
  } else {
    score = nightHours * 6
    detail = '黑夜极短'
  }
  return { score: Math.round(score), detail }
}

function calcMoonScore(illuminationFraction, nightStart, nightEnd, moonrise, moonset) {
  const illumScoreBase = Math.max(0, 1 - illuminationFraction) * 35

  let moonInNightPenalty = 0
  if (nightStart && nightEnd && (moonrise || moonset)) {
    const nightStartMin = nightStart.getHours() * 60 + nightStart.getMinutes()
    const nightEndMin = nightEnd.getHours() * 60 + nightEnd.getMinutes() + 24 * 60
    const moonriseMin = moonrise ? moonrise.getHours() * 60 + moonrise.getMinutes() : null
    const moonsetMin = moonset
      ? moonset.getHours() * 60 + moonset.getMinutes() + (moonset < nightStart ? 24 * 60 : 0)
      : null

    let overlapMin = 0
    const startMin = Math.max(nightStartMin, moonriseMin ?? nightStartMin)
    const endMin = Math.min(nightEndMin, moonsetMin ?? nightEndMin)
    if (startMin < endMin) {
      overlapMin = endMin - startMin
    }

    const totalNightMin = nightEndMin - nightStartMin
    const overlapRatio = totalNightMin > 0 ? overlapMin / totalNightMin : 0
    moonInNightPenalty = overlapRatio * 5
  }

  const score = Math.max(0, illumScoreBase - moonInNightPenalty)

  let detail
  if (illuminationFraction < 0.1) detail = '新月/残月，月光干扰极小'
  else if (illuminationFraction < 0.3) detail = '娥眉月/残月，月光干扰小'
  else if (illuminationFraction < 0.5) detail = '弦月/盈凸月，有一定月光干扰'
  else if (illuminationFraction < 0.7) detail = '盈凸月/亏凸月，月光干扰较大'
  else detail = '满月附近，月光干扰严重'

  return {
    score: Math.round(score),
    detail,
    illumination: `${(illuminationFraction * 100).toFixed(0)}%`
  }
}

function calcSeasonScore(lat, date) {
  const month = date.getMonth()
  const isNorthernHemisphere = lat >= 0
  let score = 0
  let detail = ''

  if (isNorthernHemisphere) {
    if (month >= 10 || month <= 1) {
      score = 25
      detail = '冬季，观测条件最佳'
    } else if (month === 9 || month === 2) {
      score = 22
      detail = '春秋季过渡，观测条件良好'
    } else if (month === 8 || month === 3) {
      score = 18
      detail = '夏末/初春，观测条件一般'
    } else if (month >= 4 && month <= 7) {
      score = 10 + (month === 6 || month === 7 ? 0 : 3)
      detail = '夏季，观测条件较差'
    }
  } else {
    if (month >= 4 && month <= 7) {
      score = 25
      detail = '冬季，观测条件最佳'
    } else if (month === 3 || month === 8) {
      score = 22
      detail = '春秋季过渡，观测条件良好'
    } else if (month === 2 || month === 9) {
      score = 18
      detail = '夏末/初春，观测条件一般'
    } else {
      score = 10 + (month === 11 || month === 12 ? 0 : 3)
      detail = '夏季，观测条件较差'
    }
  }

  if (Math.abs(lat) > 60) {
    if (score < 15) score = Math.max(5, score - 5)
  }

  return { score, detail }
}

export function computeObservationScore(params) {
  const { nightHours, lat, dateStr, moonIllumination, nightStart, nightEnd, moonrise, moonset } =
    params
  const date = parseLocalDate(dateStr)

  const nightHoursResult = calcNightHoursScore(nightHours)
  const moonResult = calcMoonScore(moonIllumination, nightStart, nightEnd, moonrise, moonset)
  const seasonResult = calcSeasonScore(lat, date)

  const totalScore = Math.min(100, nightHoursResult.score + moonResult.score + seasonResult.score)
  const level = getScoreLevel(totalScore)

  return {
    total: totalScore,
    level,
    breakdown: {
      nightHours: {
        score: nightHoursResult.score,
        max: 40,
        detail: nightHoursResult.detail
      },
      moon: {
        score: moonResult.score,
        max: 35,
        detail: moonResult.detail,
        illumination: moonResult.illumination
      },
      season: {
        score: seasonResult.score,
        max: 25,
        detail: seasonResult.detail
      }
    }
  }
}

export function generateObservingSuggestions(scoreData, moonPhase) {
  const { total, breakdown } = scoreData
  const suggestions = {
    suitable: [],
    tips: []
  }

  if (total >= 85) {
    suggestions.suitable.push('深空天体摄影（长曝光）')
    suggestions.suitable.push('深空天体目视观测')
    suggestions.suitable.push('暗弱星系/星云观测')
    suggestions.tips.push('极佳的观测夜晚，适合安排长时间观测计划')
  } else if (total >= 70) {
    suggestions.suitable.push('深空天体摄影')
    suggestions.suitable.push('深空天体目视观测')
    suggestions.suitable.push('行星观测')
    suggestions.tips.push('良好的观测条件，可进行中等时长曝光')
  } else if (total >= 55) {
    suggestions.suitable.push('行星观测（木星、土星等明亮天体）')
    suggestions.suitable.push('月球观测与摄影')
    suggestions.suitable.push('双星/聚星观测')
    suggestions.tips.push('中等条件，建议选择高对比度目标')
  } else if (total >= 35) {
    suggestions.suitable.push('月球观测与摄影')
    suggestions.suitable.push('行星观测')
    suggestions.suitable.push('明亮深空天体（如M42猎户座大星云等）')
    suggestions.tips.push('条件有限，优先选择明亮目标')
  } else {
    suggestions.suitable.push('月球观测与摄影')
    suggestions.suitable.push('明亮行星观测')
    suggestions.tips.push('观测条件较差，建议以月球和行星等明亮天体为主')
  }

  if (breakdown.moon.score >= 25) {
    suggestions.tips.push('月光干扰小，非常适合深空摄影')
  } else if (breakdown.moon.score >= 15) {
    suggestions.tips.push('有一定月光，可选择远离月球方向观测')
  } else {
    suggestions.tips.push('月光强烈，建议以月球、行星观测为主')
  }

  if (breakdown.nightHours.score >= 30) {
    suggestions.tips.push('黑夜时间充足，可安排丰富的观测列表')
  } else if (breakdown.nightHours.score >= 15) {
    suggestions.tips.push('黑夜时间有限，建议精选观测目标')
  }

  if (['新月', '残月'].includes(moonPhase) && total >= 70) {
    suggestions.suitable.push('暗弱深空目标优先')
  } else if (moonPhase === '满月') {
    suggestions.suitable.unshift('月球细节摄影最佳时机')
  }

  return suggestions
}
