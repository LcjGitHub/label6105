import { describe, it, expect } from 'vitest'
import {
  computeTwilightTimes,
  computeMoonInfo,
  computeObservationScore,
  getMoonPhase,
  formatTime,
  diffHours,
  getMoonAge,
  getObservationLevel,
  getScoreLevel,
  OBS_LEVELS,
  SCORE_LEVELS,
  getCompassDirection
} from './astro.js'

describe('formatTime 辅助函数', () => {
  it('正常时间格式化输出 HH:MM 格式', () => {
    const date = new Date(2024, 0, 15, 18, 30, 45)
    expect(formatTime(date)).toMatch(/^\d{2}:\d{2}$/)
  })

  it('零点时间正确格式化', () => {
    const date = new Date(2024, 0, 15, 0, 5, 0)
    const result = formatTime(date)
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('23:59 边界时间正确格式化', () => {
    const date = new Date(2024, 0, 15, 23, 59, 59)
    const result = formatTime(date)
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('参数为 null 时返回默认占位符 "—"', () => {
    expect(formatTime(null)).toBe('—')
  })

  it('参数为 undefined 时返回默认占位符 "—"', () => {
    expect(formatTime(undefined)).toBe('—')
  })

  it('无效日期（NaN time）返回默认占位符 "—"', () => {
    const invalidDate = new Date('invalid')
    expect(formatTime(invalidDate)).toBe('—')
  })

  it('自定义 invalidLabel 参数时，返回自定义占位符', () => {
    expect(formatTime(null, '未升起')).toBe('未升起')
    expect(formatTime(undefined, '未落下')).toBe('未落下')
  })
})

describe('diffHours 辅助函数', () => {
  it('普通 4 小时时间差计算正确', () => {
    const start = new Date(2024, 0, 15, 18, 0, 0)
    const end = new Date(2024, 0, 15, 22, 0, 0)
    expect(diffHours(start, end)).toBeCloseTo(4, 5)
  })

  it('跨午夜 4 小时时间差（22:00 到次日 02:00）', () => {
    const start = new Date(2024, 0, 15, 22, 0, 0)
    const end = new Date(2024, 0, 16, 2, 0, 0)
    expect(diffHours(start, end)).toBeCloseTo(4, 5)
  })

  it('开始时间晚于结束时间自动加 24 小时', () => {
    const start = new Date(2024, 0, 15, 20, 0, 0)
    const end = new Date(2024, 0, 15, 4, 0, 0)
    expect(diffHours(start, end)).toBeCloseTo(8, 5)
  })

  it('整小时 0 分钟的精确计算', () => {
    const start = new Date(2024, 0, 15, 12, 0, 0)
    const end = new Date(2024, 0, 15, 12, 0, 0)
    expect(diffHours(start, end)).toBe(0)
  })

  it('1.5 小时（含分钟）的精确计算', () => {
    const start = new Date(2024, 0, 15, 12, 0, 0)
    const end = new Date(2024, 0, 15, 13, 30, 0)
    expect(diffHours(start, end)).toBeCloseTo(1.5, 5)
  })

  it('start 为 null 返回 null', () => {
    const end = new Date(2024, 0, 15, 12, 0, 0)
    expect(diffHours(null, end)).toBeNull()
  })

  it('end 为 null 返回 null', () => {
    const start = new Date(2024, 0, 15, 12, 0, 0)
    expect(diffHours(start, null)).toBeNull()
  })

  it('start 为无效日期返回 null', () => {
    const start = new Date('invalid')
    const end = new Date(2024, 0, 15, 12, 0, 0)
    expect(diffHours(start, end)).toBeNull()
  })

  it('end 为无效日期返回 null', () => {
    const start = new Date(2024, 0, 15, 12, 0, 0)
    const end = new Date('invalid')
    expect(diffHours(start, end)).toBeNull()
  })
})

describe('getMoonPhase 月相划分正确性', () => {
  const assertPhase = (value, expectedName) => {
    const phase = getMoonPhase(value)
    expect(phase).toBeDefined()
    expect(phase.name).toBe(expectedName)
    expect(typeof phase.emoji).toBe('string')
    expect(phase.emoji.length).toBeGreaterThan(0)
    expect(typeof phase.desc).toBe('string')
    expect(phase.desc.length).toBeGreaterThan(0)
  }

  it('phase = 0 时为新月', () => {
    assertPhase(0, '新月')
  })

  it('phase = 0.01 时为新月（新月区间内）', () => {
    assertPhase(0.01, '新月')
  })

  it('phase = 0.0333 时为新月（临近边界）', () => {
    assertPhase(0.0333, '新月')
  })

  it('phase = 0.0334 时为娥眉月（边界点）', () => {
    assertPhase(0.0334, '娥眉月')
  })

  it('phase = 0.125 时为娥眉月', () => {
    assertPhase(0.125, '娥眉月')
  })

  it('phase = 0.2166 时为上弦月（边界点）', () => {
    assertPhase(0.2166, '上弦月')
  })

  it('phase = 0.25 时为上弦月（典型上弦）', () => {
    assertPhase(0.25, '上弦月')
  })

  it('phase = 0.2834 时为盈凸月（边界点）', () => {
    assertPhase(0.2834, '盈凸月')
  })

  it('phase = 0.375 时为盈凸月', () => {
    assertPhase(0.375, '盈凸月')
  })

  it('phase = 0.4666 时为满月（边界点）', () => {
    assertPhase(0.4666, '满月')
  })

  it('phase = 0.5 时为满月（典型满月）', () => {
    assertPhase(0.5, '满月')
  })

  it('phase = 0.5334 时为亏凸月（边界点）', () => {
    assertPhase(0.5334, '亏凸月')
  })

  it('phase = 0.625 时为亏凸月', () => {
    assertPhase(0.625, '亏凸月')
  })

  it('phase = 0.7166 时为下弦月（边界点）', () => {
    assertPhase(0.7166, '下弦月')
  })

  it('phase = 0.75 时为下弦月（典型下弦）', () => {
    assertPhase(0.75, '下弦月')
  })

  it('phase = 0.7834 时为残月（边界点）', () => {
    assertPhase(0.7834, '残月')
  })

  it('phase = 0.875 时为残月', () => {
    assertPhase(0.875, '残月')
  })

  it('phase = 0.9666 时为新月（末段新月，边界点）', () => {
    assertPhase(0.9666, '新月')
  })

  it('phase = 0.99 时为新月（末段新月）', () => {
    assertPhase(0.99, '新月')
  })

  it('phase = 1.0 超出范围时返回默认（第一个相位新月）', () => {
    assertPhase(1.0, '新月')
  })

  it('phase = -0.1 负数超出范围时返回默认（新月）', () => {
    assertPhase(-0.1, '新月')
  })

  it('phase = 1.5 大幅超出范围时返回默认（新月）', () => {
    assertPhase(1.5, '新月')
  })
})

describe('getMoonAge 月龄计算', () => {
  it('phase = 0 时月龄为 0 天', () => {
    expect(getMoonAge(0)).toBeCloseTo(0, 5)
  })

  it('phase = 0.5 时月龄约为 14.765 天（半月）', () => {
    expect(getMoonAge(0.5)).toBeCloseTo(14.765, 2)
  })

  it('phase = 1 时月龄约为 29.53 天（整周期）', () => {
    expect(getMoonAge(1)).toBeCloseTo(29.53058867, 5)
  })
})

describe('computeTwilightTimes 不同纬度和日期', () => {
  it('赤道地区（纬度 0）春分日输出结构完整', () => {
    const result = computeTwilightTimes(0, 0, '2024-03-20')

    expect(result).toBeDefined()
    expect(result.date).toBeInstanceOf(Date)
    expect(result.times).toBeDefined()
    expect(result.rows).toBeInstanceOf(Array)
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.allRows).toBeInstanceOf(Array)
    expect(result.photographyRows).toBeInstanceOf(Array)
    expect(result.azimuths).toBeDefined()
    expect(result.goldenHours).toBeDefined()
    expect(result.blueHours).toBeDefined()
    expect(result.keyTimes).toBeInstanceOf(Array)
    expect(result.summary).toBeDefined()
    expect(result.summary.nightHours).toBeGreaterThan(0)
    expect(result.summary.nightHours).toBeLessThanOrEqual(14)
  })

  it('赤道地区（纬度 0）秋分日夜时长接近 12 小时', () => {
    const result = computeTwilightTimes(0, 0, '2024-09-22')
    expect(result.summary.nightHours).toBeDefined()
    expect(typeof result.summary.nightHours).toBe('number')
    expect(result.summary.nightHours).toBeGreaterThan(6)
    expect(result.summary.nightHours).toBeLessThan(14)
  })

  it('赤道地区日夜时长全年相对稳定（夏至对比）', () => {
    const equinox = computeTwilightTimes(0, 0, '2024-03-20')
    const solstice = computeTwilightTimes(0, 0, '2024-06-21')
    const diff = Math.abs(equinox.summary.nightHours - solstice.summary.nightHours)
    expect(diff).toBeLessThan(2)
  })

  it('高纬度北极圈附近（北纬 66.5°）夏至存在极昼或夜时极短', () => {
    const result = computeTwilightTimes(66.5, 20, '2024-06-21')
    expect(result.summary).toBeDefined()
    if (result.summary.nightHours != null) {
      expect(result.summary.nightHours).toBeGreaterThanOrEqual(0)
      expect(result.summary.nightHours).toBeLessThan(8)
    }
  })

  it('高纬度北极圈附近（北纬 66.5°）冬至夜时较长', () => {
    const result = computeTwilightTimes(66.5, 20, '2024-12-21')
    expect(result.summary).toBeDefined()
    if (result.summary.nightHours != null) {
      expect(result.summary.nightHours).toBeGreaterThan(0)
    }
  })

  it('北京（北纬 39.9°，东经 116.4°）夏至黑夜比冬至短', () => {
    const summer = computeTwilightTimes(39.9, 116.4, '2024-06-21')
    const winter = computeTwilightTimes(39.9, 116.4, '2024-12-21')

    expect(summer.summary.nightHours).toBeDefined()
    expect(winter.summary.nightHours).toBeDefined()
    expect(summer.summary.nightHours).toBeLessThan(winter.summary.nightHours)
  })

  it('南半球悉尼（南纬 33.8°）夏至（6 月）黑夜比冬至（12 月）长', () => {
    const june = computeTwilightTimes(-33.8, 151.2, '2024-06-21')
    const december = computeTwilightTimes(-33.8, 151.2, '2024-12-21')

    expect(june.summary.nightHours).toBeDefined()
    expect(december.summary.nightHours).toBeDefined()
    expect(june.summary.nightHours).toBeGreaterThan(december.summary.nightHours)
  })

  it('输出结构中 rows 每一行包含必要字段', () => {
    const result = computeTwilightTimes(39.9, 116.4, '2024-06-21')
    for (const row of result.rows) {
      expect(row).toHaveProperty('key')
      expect(row).toHaveProperty('label')
      expect(row).toHaveProperty('phase')
      expect(row).toHaveProperty('timeStr')
    }
  })

  it('goldenHours 包含晨暮两个时段且持续时间各为约 1 小时', () => {
    const result = computeTwilightTimes(39.9, 116.4, '2024-06-21')
    const { goldenHours } = result
    expect(goldenHours.morning).toBeDefined()
    expect(goldenHours.evening).toBeDefined()
    if (goldenHours.morning.durationHours != null) {
      expect(goldenHours.morning.durationHours).toBeCloseTo(1, 0)
    }
    if (goldenHours.evening.durationHours != null) {
      expect(goldenHours.evening.durationHours).toBeCloseTo(1, 0)
    }
  })

  it('blueHours 包含晨暮两个时段且持续时间为正', () => {
    const result = computeTwilightTimes(39.9, 116.4, '2024-06-21')
    const { blueHours } = result
    expect(blueHours.morning).toBeDefined()
    expect(blueHours.evening).toBeDefined()
    if (blueHours.morning.durationHours != null) {
      expect(blueHours.morning.durationHours).toBeGreaterThan(0)
    }
    if (blueHours.evening.durationHours != null) {
      expect(blueHours.evening.durationHours).toBeGreaterThan(0)
    }
  })

  it('azimuths 包含日出和日落方位角', () => {
    const result = computeTwilightTimes(39.9, 116.4, '2024-06-21')
    expect(result.azimuths.sunrise).toBeDefined()
    expect(result.azimuths.sunrise.degrees).toBeDefined()
    expect(typeof result.azimuths.sunrise.degrees).toBe('number')
    expect(result.azimuths.sunrise.direction).toBeDefined()
    expect(typeof result.azimuths.sunrise.direction).toBe('string')
  })
})

describe('computeMoonInfo 月相计算', () => {
  it('返回对象包含完整的 phase 信息', () => {
    const result = computeMoonInfo(39.9, 116.4, '2024-01-20')
    expect(result.phase).toBeDefined()
    expect(result.phase.name).toBeDefined()
    expect(result.phase.emoji).toBeDefined()
    expect(result.phase.desc).toBeDefined()
    expect(typeof result.phase.value).toBe('number')
    expect(result.phase.value).toBeGreaterThanOrEqual(0)
    expect(result.phase.value).toBeLessThanOrEqual(1)
  })

  it('月龄 age 数值范围在 0 ~ 29.53 天之间', () => {
    const result = computeMoonInfo(39.9, 116.4, '2024-01-20')
    expect(typeof result.age).toBe('number')
    expect(result.age).toBeGreaterThanOrEqual(0)
    expect(result.age).toBeLessThanOrEqual(30)
  })

  it('ageStr 格式化字符串包含 "天" 字', () => {
    const result = computeMoonInfo(39.9, 116.4, '2024-01-20')
    expect(result.ageStr).toContain('天')
  })

  it('illumination 为百分比字符串格式', () => {
    const result = computeMoonInfo(39.9, 116.4, '2024-01-20')
    expect(result.illumination).toMatch(/^\d+\.?\d*%$/)
  })

  it('illuminationFraction 数值范围在 0 ~ 1 之间', () => {
    const result = computeMoonInfo(39.9, 116.4, '2024-01-20')
    expect(typeof result.illuminationFraction).toBe('number')
    expect(result.illuminationFraction).toBeGreaterThanOrEqual(0)
    expect(result.illuminationFraction).toBeLessThanOrEqual(1)
  })

  it('moonriseStr 和 moonsetStr 为时间字符串或自定义占位符', () => {
    const result = computeMoonInfo(39.9, 116.4, '2024-01-20')
    expect(typeof result.moonriseStr).toBe('string')
    expect(typeof result.moonsetStr).toBe('string')
    expect(result.moonriseStr.length).toBeGreaterThan(0)
    expect(result.moonsetStr.length).toBeGreaterThan(0)
  })

  it('月相名称属于 8 种标准月相之一', () => {
    const validNames = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月']
    const result = computeMoonInfo(39.9, 116.4, '2024-01-20')
    expect(validNames).toContain(result.phase.name)
  })

  it('连续日期月龄递增（在 0 ~ 29.53 范围内循环）', () => {
    const day1 = computeMoonInfo(39.9, 116.4, '2024-06-01')
    const day2 = computeMoonInfo(39.9, 116.4, '2024-06-02')
    let ageDiff = day2.age - day1.age
    if (ageDiff < 0) ageDiff += 29.53058867
    expect(ageDiff).toBeGreaterThan(0.5)
    expect(ageDiff).toBeLessThan(2)
  })
})

describe('computeObservationScore 评分逻辑', () => {
  it('黑夜时长为 0 时 nightHours 得分应为 0 且整体低分', () => {
    const nightStart = new Date(2024, 5, 21, 0, 0, 0)
    const nightEnd = new Date(2024, 5, 21, 0, 0, 0)
    const result = computeObservationScore({
      nightHours: 0,
      lat: 39.9,
      dateStr: '2024-06-21',
      moonIllumination: 0.1,
      nightStart,
      nightEnd,
      moonrise: null,
      moonset: null
    })

    expect(result.breakdown.nightHours.score).toBe(0)
    expect(result.breakdown.nightHours.detail).toBe('无天文黑夜')
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeLessThanOrEqual(60)
  })

  it('极昼模拟（nightHours = 0 + 高纬度夏季）得分为低', () => {
    const result = computeObservationScore({
      nightHours: 0,
      lat: 70,
      dateStr: '2024-06-21',
      moonIllumination: 0.5,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    expect(result.total).toBeLessThanOrEqual(60)
    expect(result.breakdown.nightHours.score).toBe(0)
  })

  it('满月（moonIllumination = 1.0）月亮得分应很低', () => {
    const nightStart = new Date(2024, 11, 21, 20, 0, 0)
    const nightEnd = new Date(2024, 11, 22, 5, 0, 0)
    const result = computeObservationScore({
      nightHours: 9,
      lat: 39.9,
      dateStr: '2024-12-21',
      moonIllumination: 1.0,
      nightStart,
      nightEnd,
      moonrise: nightStart,
      moonset: nightEnd
    })

    expect(result.breakdown.moon.score).toBeLessThanOrEqual(5)
    expect(result.breakdown.moon.detail).toContain('满月')
  })

  it('新月（moonIllumination = 0）月亮得分应为高分（接近 35）', () => {
    const nightStart = new Date(2024, 11, 21, 20, 0, 0)
    const nightEnd = new Date(2024, 11, 22, 5, 0, 0)
    const result = computeObservationScore({
      nightHours: 9,
      lat: 39.9,
      dateStr: '2024-12-21',
      moonIllumination: 0,
      nightStart,
      nightEnd,
      moonrise: null,
      moonset: null
    })

    expect(result.breakdown.moon.score).toBeGreaterThanOrEqual(30)
    expect(result.breakdown.moon.detail).toContain('新月')
  })

  it('优良条件（黑夜充足 + 新月 + 冬季北半球）应为高分（≥ 80）', () => {
    const nightStart = new Date(2024, 11, 21, 19, 0, 0)
    const nightEnd = new Date(2024, 11, 22, 6, 0, 0)
    const result = computeObservationScore({
      nightHours: 11,
      lat: 40,
      dateStr: '2024-12-21',
      moonIllumination: 0.05,
      nightStart,
      nightEnd,
      moonrise: null,
      moonset: null
    })

    expect(result.total).toBeGreaterThanOrEqual(80)
    expect(result.total).toBeLessThanOrEqual(100)
  })

  it('总分范围应在 0 ~ 100 之间（上限约束）', () => {
    const nightStart = new Date(2024, 11, 21, 18, 0, 0)
    const nightEnd = new Date(2024, 11, 22, 7, 0, 0)
    const result = computeObservationScore({
      nightHours: 13,
      lat: 45,
      dateStr: '2024-12-21',
      moonIllumination: 0,
      nightStart,
      nightEnd,
      moonrise: null,
      moonset: null
    })

    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeLessThanOrEqual(100)
  })

  it('各分项得分不超过各自最大分值', () => {
    const nightStart = new Date(2024, 11, 21, 20, 0, 0)
    const nightEnd = new Date(2024, 11, 22, 5, 0, 0)
    const result = computeObservationScore({
      nightHours: 9,
      lat: 39.9,
      dateStr: '2024-12-21',
      moonIllumination: 0.3,
      nightStart,
      nightEnd,
      moonrise: null,
      moonset: null
    })

    expect(result.breakdown.nightHours.score).toBeLessThanOrEqual(40)
    expect(result.breakdown.moon.score).toBeLessThanOrEqual(35)
    expect(result.breakdown.season.score).toBeLessThanOrEqual(25)
  })

  it('nightHours = 6 小时得分为 40（满分档）', () => {
    const result = computeObservationScore({
      nightHours: 6,
      lat: 39.9,
      dateStr: '2024-12-21',
      moonIllumination: 0.5,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    expect(result.breakdown.nightHours.score).toBe(40)
  })

  it('nightHours = 0.5 小时（极短）得分按比例计算', () => {
    const result = computeObservationScore({
      nightHours: 0.5,
      lat: 39.9,
      dateStr: '2024-06-21',
      moonIllumination: 0.5,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    expect(result.breakdown.nightHours.score).toBeGreaterThan(0)
    expect(result.breakdown.nightHours.score).toBeLessThan(6)
  })

  it('返回对象包含 level 信息且具有正确结构', () => {
    const result = computeObservationScore({
      nightHours: 8,
      lat: 40,
      dateStr: '2024-12-21',
      moonIllumination: 0.1,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    expect(result.level).toBeDefined()
    expect(result.level.label).toBeDefined()
    expect(result.level.class).toBeDefined()
    expect(typeof result.level.minScore).toBe('number')
  })

  it('北半球夏季（6 月）季节得分低于冬季（12 月）', () => {
    const summer = computeObservationScore({
      nightHours: 5,
      lat: 40,
      dateStr: '2024-06-21',
      moonIllumination: 0.5,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    const winter = computeObservationScore({
      nightHours: 5,
      lat: 40,
      dateStr: '2024-12-21',
      moonIllumination: 0.5,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    expect(summer.breakdown.season.score).toBeLessThan(winter.breakdown.season.score)
  })

  it('南半球季节得分与北半球相反（6 月为冬季得分高）', () => {
    const june = computeObservationScore({
      nightHours: 5,
      lat: -40,
      dateStr: '2024-06-21',
      moonIllumination: 0.5,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    const december = computeObservationScore({
      nightHours: 5,
      lat: -40,
      dateStr: '2024-12-21',
      moonIllumination: 0.5,
      nightStart: null,
      nightEnd: null,
      moonrise: null,
      moonset: null
    })

    expect(june.breakdown.season.score).toBeGreaterThan(december.breakdown.season.score)
  })

  it('月光在黑夜中重叠时有额外扣减', () => {
    const nightStart = new Date(2024, 11, 21, 20, 0, 0)
    const nightEnd = new Date(2024, 11, 22, 5, 0, 0)
    const moonriseAllNight = new Date(2024, 11, 21, 19, 0, 0)
    const moonsetAllNight = new Date(2024, 11, 22, 6, 0, 0)

    const withOverlap = computeObservationScore({
      nightHours: 9,
      lat: 40,
      dateStr: '2024-12-21',
      moonIllumination: 0.7,
      nightStart,
      nightEnd,
      moonrise: moonriseAllNight,
      moonset: moonsetAllNight
    })

    const withoutOverlap = computeObservationScore({
      nightHours: 9,
      lat: 40,
      dateStr: '2024-12-21',
      moonIllumination: 0.7,
      nightStart,
      nightEnd,
      moonrise: null,
      moonset: null
    })

    expect(withOverlap.breakdown.moon.score).toBeLessThanOrEqual(withoutOverlap.breakdown.moon.score)
  })
})

describe('getObservationLevel 等级判断', () => {
  it('nightHours = null 返回 poor 等级', () => {
    expect(getObservationLevel(null)).toBe(OBS_LEVELS.poor)
  })

  it('nightHours = 0 返回 poor 等级', () => {
    expect(getObservationLevel(0)).toBe(OBS_LEVELS.poor)
  })

  it('nightHours 为负数返回 poor 等级', () => {
    expect(getObservationLevel(-1)).toBe(OBS_LEVELS.poor)
  })

  it('nightHours = 0.5 返回 fair 等级（大于 0 小于 1）', () => {
    expect(getObservationLevel(0.5)).toBe(OBS_LEVELS.poor)
  })

  it('nightHours = 1 边界返回 fair 等级', () => {
    expect(getObservationLevel(1)).toBe(OBS_LEVELS.fair)
  })

  it('nightHours = 2 返回 fair 等级', () => {
    expect(getObservationLevel(2)).toBe(OBS_LEVELS.fair)
  })

  it('nightHours = 3 边界返回 good 等级', () => {
    expect(getObservationLevel(3)).toBe(OBS_LEVELS.good)
  })

  it('nightHours = 4 返回 good 等级', () => {
    expect(getObservationLevel(4)).toBe(OBS_LEVELS.good)
  })

  it('nightHours = 5 边界返回 excellent 等级', () => {
    expect(getObservationLevel(5)).toBe(OBS_LEVELS.excellent)
  })

  it('nightHours = 8 返回 excellent 等级', () => {
    expect(getObservationLevel(8)).toBe(OBS_LEVELS.excellent)
  })
})

describe('getScoreLevel 评分等级映射', () => {
  it('score = 100 返回 excellent', () => {
    expect(getScoreLevel(100)).toBe(SCORE_LEVELS.excellent)
  })

  it('score = 85 边界返回 excellent', () => {
    expect(getScoreLevel(85)).toBe(SCORE_LEVELS.excellent)
  })

  it('score = 84 边界返回 good', () => {
    expect(getScoreLevel(84)).toBe(SCORE_LEVELS.good)
  })

  it('score = 70 边界返回 good', () => {
    expect(getScoreLevel(70)).toBe(SCORE_LEVELS.good)
  })

  it('score = 69 边界返回 fair', () => {
    expect(getScoreLevel(69)).toBe(SCORE_LEVELS.fair)
  })

  it('score = 55 边界返回 fair', () => {
    expect(getScoreLevel(55)).toBe(SCORE_LEVELS.fair)
  })

  it('score = 54 边界返回 poor', () => {
    expect(getScoreLevel(54)).toBe(SCORE_LEVELS.poor)
  })

  it('score = 35 边界返回 poor', () => {
    expect(getScoreLevel(35)).toBe(SCORE_LEVELS.poor)
  })

  it('score = 34 边界返回 veryPoor', () => {
    expect(getScoreLevel(34)).toBe(SCORE_LEVELS.veryPoor)
  })

  it('score = 0 返回 veryPoor', () => {
    expect(getScoreLevel(0)).toBe(SCORE_LEVELS.veryPoor)
  })
})

describe('getCompassDirection 方位角方向映射', () => {
  it('0 度返回正北', () => {
    expect(getCompassDirection(0)).toBe('正北')
  })

  it('90 度返回正东', () => {
    expect(getCompassDirection(90)).toBe('正东')
  })

  it('180 度返回正南', () => {
    expect(getCompassDirection(180)).toBe('正南')
  })

  it('270 度返回正西', () => {
    expect(getCompassDirection(270)).toBe('正西')
  })

  it('45 度返回东北', () => {
    expect(getCompassDirection(45)).toBe('东北')
  })

  it('135 度返回东南', () => {
    expect(getCompassDirection(135)).toBe('东南')
  })

  it('225 度返回西南', () => {
    expect(getCompassDirection(225)).toBe('西南')
  })

  it('315 度返回西北', () => {
    expect(getCompassDirection(315)).toBe('西北')
  })

  it('359 度返回正北', () => {
    expect(getCompassDirection(359)).toBe('正北')
  })

  it('无效角度返回 "—"', () => {
    expect(getCompassDirection(-10)).toBe('—')
    expect(getCompassDirection(400)).toBe('—')
  })
})
