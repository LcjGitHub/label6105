import {
  DEFAULT_CITY_ID,
  getCityById,
  populateCitySelect,
} from './cities.js'
import {
  computeTwilightTimes,
  computeMonthCalendar,
  computeMoonInfo,
} from './astro.js'

// ── Navigation ──
const navBtns = document.querySelectorAll('.nav__btn')
const pages = document.querySelectorAll('.page')

navBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page
    navBtns.forEach((b) => {
      b.classList.toggle('nav__btn--active', b === btn)
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false')
    })
    pages.forEach((p) => {
      p.classList.toggle('page--active', p.id === `page-${page}`)
    })
  })
})

// ── Helpers ──
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatNightHours(h) {
  if (h == null || h <= 0) return '无天文黑夜'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs} 小时 ${mins} 分`
}

// ── Page 1: Calculator ──
const cityPreset = document.getElementById('city-preset')
const latInput = document.getElementById('latitude')
const lngInput = document.getElementById('longitude')
const dateInput = document.getElementById('date')
const calcForm = document.getElementById('calc-form')
const resultsEl = document.getElementById('results')

populateCitySelect(cityPreset, DEFAULT_CITY_ID)
dateInput.value = todayStr()

function applyCity(cityId) {
  const city = getCityById(cityId)
  latInput.value = city.lat
  lngInput.value = city.lng
}

applyCity(DEFAULT_CITY_ID)

cityPreset.addEventListener('change', () => applyCity(cityPreset.value))

function renderTimeline(keyTimes, summary) {
  const timeline = document.getElementById('timeline')
  const eveningEvents = keyTimes.filter((k) =>
    ['dusk', 'nauticalDusk', 'night'].includes(k.key),
  )
  const { goldenHours, blueHours } = summary

  timeline.innerHTML = `
    <div class="timeline__bar">
      <div class="timeline__segment timeline__segment--day" style="flex:2">
        <span class="segment-label">白昼</span>
        <span class="segment-sub">黄金时刻</span>
      </div>
      <div class="timeline__segment timeline__segment--blue">
        <span class="segment-label">蓝调时刻</span>
      </div>
      <div class="timeline__segment timeline__segment--civil">民用暮光</div>
      <div class="timeline__segment timeline__segment--nautical">航海暮光</div>
      <div class="timeline__segment timeline__segment--astro">天文暮光</div>
      <div class="timeline__segment timeline__segment--night">天文黑夜</div>
    </div>
    <div class="timeline__photography">
      <div class="photo-period photo-period--blue-morning">
        <span class="photo-period__label">🌅 晨蓝调时刻</span>
        <span class="photo-period__time">${blueHours.morning.startStr} → ${blueHours.morning.endStr}</span>
      </div>
      <div class="photo-period photo-period--golden-morning">
        <span class="photo-period__label">🌞 晨黄金时刻</span>
        <span class="photo-period__time">${goldenHours.morning.startStr} → ${goldenHours.morning.endStr}</span>
      </div>
      <div class="photo-period photo-period--golden-evening">
        <span class="photo-period__label">🌇 暮黄金时刻</span>
        <span class="photo-period__time">${goldenHours.evening.startStr} → ${goldenHours.evening.endStr}</span>
      </div>
      <div class="photo-period photo-period--blue-evening">
        <span class="photo-period__label">🌆 暮蓝调时刻</span>
        <span class="photo-period__time">${blueHours.evening.startStr} → ${blueHours.evening.endStr}</span>
      </div>
    </div>
    <div class="timeline__markers">
      ${eveningEvents
        .map(
          (ev) => `
        <div class="timeline__marker">
          <span class="timeline__dot"></span>
          <span class="timeline__label">${ev.label}</span>
          <span class="timeline__time">${ev.timeStr}</span>
        </div>`
        )
        .join('')}
    </div>
    <div class="timeline__night">
      <strong>天文黑夜</strong>：${formatTime(summary.nightStart)} → 次日 ${formatTime(summary.nightEnd)}
      （${formatNightHours(summary.nightHours)}）
    </div>
  `
}

function formatTime(d) {
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function renderMoonInfo(moon) {
  document.getElementById('moon-icon').textContent = moon.phase.emoji
  document.getElementById('moon-phase').textContent = moon.phase.name
  document.getElementById('moon-desc').textContent = moon.phase.desc
  document.getElementById('moon-age').textContent = moon.ageStr
  document.getElementById('moon-rise').textContent = moon.moonriseStr
  document.getElementById('moon-set').textContent = moon.moonsetStr
}

function renderResults(city, dateStr, data, moon) {
  document.getElementById('result-location').textContent = `${city.name}（${city.lat}°N, ${city.lng}°E）`
  document.getElementById('result-date').textContent = dateStr

  renderTimeline(data.keyTimes, data.summary)

  const tbody = document.querySelector('#times-table tbody')
  tbody.innerHTML = data.rows
    .map(
      (row) => {
        const azimuthCell = row.azimuth
          ? `<td class="table__azimuth"><span class="azimuth__dir">${row.azimuth.direction}</span><span class="azimuth__deg">${row.azimuth.degrees}°</span></td>`
          : `<td class="table__azimuth table__azimuth--empty">—</td>`
        return `
    <tr class="table__row table__row--${row.phase}">
      <td>${row.label}</td>
      <td class="table__time">${row.timeStr}</td>
      ${azimuthCell}
      <td class="table__desc">${row.desc}</td>
    </tr>`
      }
    )
    .join('')

  const nightSummary = document.getElementById('night-summary')
  const level = data.summary.nightHours >= 3 ? '适合深空观测' : data.summary.nightHours > 0 ? '观测窗口较短' : '无完整天文黑夜'
  const sunriseAz = data.summary.sunriseAzimuth
  const sunsetStartAz = data.summary.sunsetStartAzimuth
  const sunriseAzStr = sunriseAz
    ? `<span class="azimuth__dir">${sunriseAz.direction}</span> <span class="azimuth__deg">${sunriseAz.degrees}°</span>`
    : '—'
  const sunsetStartAzStr = sunsetStartAz
    ? `<span class="azimuth__dir">${sunsetStartAz.direction}</span> <span class="azimuth__deg">${sunsetStartAz.degrees}°</span>`
    : '—'
  const { goldenHours, blueHours } = data.summary
  nightSummary.innerHTML = `
    <h3>观测评估</h3>
    <p class="night-summary__main">${level}</p>
    <h3 class="photo-section-title">📸 摄影师时段</h3>
    <div class="photo-grid">
      <div class="photo-card photo-card--golden">
        <div class="photo-card__header">🌞 晨黄金时刻</div>
        <div class="photo-card__time">${goldenHours.morning.startStr} → ${goldenHours.morning.endStr}</div>
        <div class="photo-card__desc">日出后一小时，暖金色光线</div>
      </div>
      <div class="photo-card photo-card--blue">
        <div class="photo-card__header">🌅 晨蓝调时刻</div>
        <div class="photo-card__time">${blueHours.morning.startStr} → ${blueHours.morning.endStr}</div>
        <div class="photo-card__desc">民用晨光期间，冷蓝色调</div>
      </div>
      <div class="photo-card photo-card--golden">
        <div class="photo-card__header">🌇 暮黄金时刻</div>
        <div class="photo-card__time">${goldenHours.evening.startStr} → ${goldenHours.evening.endStr}</div>
        <div class="photo-card__desc">日落前一小时，暖金色光线</div>
      </div>
      <div class="photo-card photo-card--blue">
        <div class="photo-card__header">🌆 暮蓝调时刻</div>
        <div class="photo-card__time">${blueHours.evening.startStr} → ${blueHours.evening.endStr}</div>
        <div class="photo-card__desc">民用暮光期间，冷蓝色调</div>
      </div>
    </div>
    <h3>🌌 天文观测</h3>
    <ul class="night-summary__list">
      <li>日出方位：<strong>${sunriseAzStr}</strong></li>
      <li>日落开始方位：<strong>${sunsetStartAzStr}</strong></li>
      <li>民用暮光结束（暮）：<strong>${formatTime(data.times.dusk)}</strong></li>
      <li>天文暮光开始（暮）：<strong>${formatTime(data.times.nauticalDusk)}</strong></li>
      <li>天文暮光结束（暮）：<strong>${formatTime(data.times.night)}</strong></li>
      <li>天文晨光结束（晨）：<strong>${formatTime(data.times.nightEnd)}</strong></li>
      <li>天文黑夜时长：<strong>${formatNightHours(data.summary.nightHours)}</strong></li>
    </ul>
  `

  renderMoonInfo(moon)

  resultsEl.hidden = false
  document.getElementById('moon-info').scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

calcForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const city = getCityById(cityPreset.value)
  const lat = parseFloat(latInput.value)
  const lng = parseFloat(lngInput.value)
  const dateStr = dateInput.value

  if (Number.isNaN(lat) || Number.isNaN(lng)) return

  const data = computeTwilightTimes(lat, lng, dateStr)
  const moon = computeMoonInfo(lat, lng, dateStr)
  renderResults(city, dateStr, data, moon)
})

// Auto-calc on load
calcForm.dispatchEvent(new Event('submit'))

// ── Page 2: Calendar ──
const calCity = document.getElementById('cal-city')
const calMonth = document.getElementById('cal-month')
const calendarForm = document.getElementById('calendar-form')
const calendarWrap = document.getElementById('calendar-wrap')
const calendarGrid = document.getElementById('calendar-grid')

populateCitySelect(calCity, DEFAULT_CITY_ID)
calMonth.value = currentMonthStr()

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function renderCalendar(city, year, month, days) {
  document.getElementById('cal-title').textContent = `${city.name} · ${year} 年 ${month} 月`

  const firstWeekday = new Date(year, month - 1, 1).getDay()
  let html = WEEKDAYS.map((w) => `<div class="calendar__weekday">${w}</div>`).join('')

  for (let i = 0; i < firstWeekday; i++) {
    html += '<div class="calendar__cell calendar__cell--empty"></div>'
  }

  days.forEach((d) => {
    const hoursStr =
      d.nightHours != null && d.nightHours > 0
        ? `${d.nightHours.toFixed(1)}h`
        : '—'
    html += `
      <div class="calendar__cell calendar__cell--${d.level.class}" title="${d.dateStr}&#10;天文黑夜: ${d.nightStartStr} ~ 次日 ${d.nightEndStr}&#10;时长: ${formatNightHours(d.nightHours)}">
        <span class="calendar__day">${d.day}</span>
        <span class="calendar__hours">${hoursStr}</span>
        <span class="calendar__badge">${d.level.label}</span>
      </div>`
  })

  calendarGrid.innerHTML = html
  calendarWrap.hidden = false
}

calendarForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const city = getCityById(calCity.value)
  const [year, month] = calMonth.value.split('-').map(Number)
  const days = computeMonthCalendar(city.lat, city.lng, year, month)
  renderCalendar(city, year, month, days)
})

// Auto-generate calendar on first visit to page 3
let calendarInitialized = false
document.querySelector('[data-page="calendar"]').addEventListener('click', () => {
  if (!calendarInitialized) {
    calendarForm.dispatchEvent(new Event('submit'))
    calendarInitialized = true
  }
})

// ── Page 2: Date Comparison ──
const compareCity = document.getElementById('compare-city')
const compareDateA = document.getElementById('compare-date-a')
const compareDateB = document.getElementById('compare-date-b')
const compareForm = document.getElementById('compare-form')
const compareResults = document.getElementById('compare-results')

populateCitySelect(compareCity, DEFAULT_CITY_ID)

function addDaysToToday(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

compareDateA.value = todayStr()
compareDateB.value = addDaysToToday(30)

function applyCompareCity(cityId) {
  const city = getCityById(cityId)
  return city
}

compareCity.addEventListener('change', () => applyCompareCity(compareCity.value))

function renderCompareTimeline(timelineId, keyTimes, summary) {
  const timeline = document.getElementById(timelineId)
  const eveningEvents = keyTimes.filter((k) =>
    ['dusk', 'nauticalDusk', 'night'].includes(k.key),
  )
  const { goldenHours, blueHours } = summary

  timeline.innerHTML = `
    <div class="timeline__bar">
      <div class="timeline__segment timeline__segment--day" style="flex:2">
        <span class="segment-label">白昼</span>
        <span class="segment-sub">黄金时刻</span>
      </div>
      <div class="timeline__segment timeline__segment--blue">
        <span class="segment-label">蓝调时刻</span>
      </div>
      <div class="timeline__segment timeline__segment--civil">民用暮光</div>
      <div class="timeline__segment timeline__segment--nautical">航海暮光</div>
      <div class="timeline__segment timeline__segment--astro">天文暮光</div>
      <div class="timeline__segment timeline__segment--night">天文黑夜</div>
    </div>
    <div class="timeline__photography">
      <div class="photo-period photo-period--blue-morning">
        <span class="photo-period__label">🌅 晨蓝调</span>
        <span class="photo-period__time">${blueHours.morning.startStr} → ${blueHours.morning.endStr}</span>
      </div>
      <div class="photo-period photo-period--golden-morning">
        <span class="photo-period__label">🌞 晨黄金</span>
        <span class="photo-period__time">${goldenHours.morning.startStr} → ${goldenHours.morning.endStr}</span>
      </div>
      <div class="photo-period photo-period--golden-evening">
        <span class="photo-period__label">🌇 暮黄金</span>
        <span class="photo-period__time">${goldenHours.evening.startStr} → ${goldenHours.evening.endStr}</span>
      </div>
      <div class="photo-period photo-period--blue-evening">
        <span class="photo-period__label">🌆 暮蓝调</span>
        <span class="photo-period__time">${blueHours.evening.startStr} → ${blueHours.evening.endStr}</span>
      </div>
    </div>
    <div class="timeline__markers">
      ${eveningEvents
        .map(
          (ev) => `
        <div class="timeline__marker">
          <span class="timeline__dot"></span>
          <span class="timeline__label">${ev.label}</span>
          <span class="timeline__time">${ev.timeStr}</span>
        </div>`
        )
        .join('')}
    </div>
    <div class="timeline__night">
      <strong>天文黑夜</strong>：${formatTime(summary.nightStart)} → 次日 ${formatTime(summary.nightEnd)}
      （${formatNightHours(summary.nightHours)}）
    </div>
  `
}

function renderCompareTable(tableId, rows) {
  const tbody = document.querySelector(`#${tableId} tbody`)
  tbody.innerHTML = rows
    .map(
      (row) => `
    <tr class="table__row table__row--${row.phase}">
      <td>${row.label}</td>
      <td class="table__time">${row.timeStr}</td>
      ${formatAzimuth(row.azimuth)}
      <td class="table__desc">${row.desc}</td>
    </tr>`
    )
    .join('')
}

function renderCompareSummary(summaryId, data) {
  const summaryEl = document.getElementById(summaryId)
  const level = data.summary.nightHours >= 3 ? '适合深空观测' : data.summary.nightHours > 0 ? '观测窗口较短' : '无完整天文黑夜'
  const sunriseAz = data.summary.sunriseAzimuth
  const sunsetStartAz = data.summary.sunsetStartAzimuth
  const sunriseAzStr = sunriseAz
    ? `<span class="azimuth__dir">${sunriseAz.direction}</span> <span class="azimuth__deg">${sunriseAz.degrees}°</span>`
    : '—'
  const sunsetStartAzStr = sunsetStartAz
    ? `<span class="azimuth__dir">${sunsetStartAz.direction}</span> <span class="azimuth__deg">${sunsetStartAz.degrees}°</span>`
    : '—'
  const { goldenHours, blueHours } = data.summary
  summaryEl.innerHTML = `
    <h3>观测评估</h3>
    <p class="night-summary__main">${level}</p>
    <h3 class="photo-section-title">📸 摄影师时段</h3>
    <div class="photo-grid photo-grid--compact">
      <div class="photo-card photo-card--golden">
        <div class="photo-card__header">🌞 晨黄金</div>
        <div class="photo-card__time">${goldenHours.morning.startStr} → ${goldenHours.morning.endStr}</div>
      </div>
      <div class="photo-card photo-card--blue">
        <div class="photo-card__header">🌅 晨蓝调</div>
        <div class="photo-card__time">${blueHours.morning.startStr} → ${blueHours.morning.endStr}</div>
      </div>
      <div class="photo-card photo-card--golden">
        <div class="photo-card__header">🌇 暮黄金</div>
        <div class="photo-card__time">${goldenHours.evening.startStr} → ${goldenHours.evening.endStr}</div>
      </div>
      <div class="photo-card photo-card--blue">
        <div class="photo-card__header">🌆 暮蓝调</div>
        <div class="photo-card__time">${blueHours.evening.startStr} → ${blueHours.evening.endStr}</div>
      </div>
    </div>
    <h3>🌌 天文观测</h3>
    <ul class="night-summary__list">
      <li>日出方位：<strong>${sunriseAzStr}</strong></li>
      <li>日落开始方位：<strong>${sunsetStartAzStr}</strong></li>
      <li>民用暮光结束（暮）：<strong>${formatTime(data.times.dusk)}</strong></li>
      <li>天文暮光开始（暮）：<strong>${formatTime(data.times.nauticalDusk)}</strong></li>
      <li>天文暮光结束（暮）：<strong>${formatTime(data.times.night)}</strong></li>
      <li>天文晨光结束（晨）：<strong>${formatTime(data.times.nightEnd)}</strong></li>
      <li>天文黑夜时长：<strong>${formatNightHours(data.summary.nightHours)}</strong></li>
    </ul>
  `
}

function diffMinutes(timeA, timeB) {
  if (!timeA || !timeB || Number.isNaN(timeA.getTime()) || Number.isNaN(timeB.getTime())) return null
  const minsA = timeA.getHours() * 60 + timeA.getMinutes()
  const minsB = timeB.getHours() * 60 + timeB.getMinutes()
  return minsB - minsA
}

function formatAzimuth(azimuth) {
  if (!azimuth) return '<td class="table__azimuth table__azimuth--empty">—</td>'
  return `<td class="table__azimuth"><span class="azimuth__dir">${azimuth.direction}</span><span class="azimuth__deg">${azimuth.degrees}°</span></td>`
}

function formatDiffMinutes(mins) {
  if (mins == null) return '—'
  if (mins === 0) return '0 分'
  const sign = mins > 0 ? '+' : '−'
  const abs = Math.abs(mins)
  const hrs = Math.floor(abs / 60)
  const m = abs % 60
  if (hrs > 0) return `${sign}${hrs} 时 ${m} 分`
  return `${sign}${m} 分`
}

function getDiffClass(mins) {
  if (mins == null) return 'diff-zero'
  if (mins > 0) return 'diff-positive'
  if (mins < 0) return 'diff-negative'
  return 'diff-zero'
}

function renderDiffTable(dataA, dataB) {
  const tbody = document.querySelector('#compare-diff-table tbody')
  const compareKeys = ['sunset', 'dusk', 'nauticalDusk', 'night', 'nightEnd', 'nauticalDawn', 'dawn', 'sunrise']
  const labelMap = {
    sunset: '日落',
    dusk: '民用暮光结束',
    nauticalDusk: '航海暮光结束',
    night: '天文黑夜开始',
    nightEnd: '天文黑夜结束',
    nauticalDawn: '航海晨光结束',
    dawn: '民用晨光结束',
    sunrise: '日出',
  }

  tbody.innerHTML = compareKeys
    .map((key) => {
      const timeA = dataA.times[key]
      const timeB = dataB.times[key]
      const diff = diffMinutes(timeA, timeB)
      const diffClass = getDiffClass(diff)
      return `
        <tr>
          <td>${labelMap[key] || key}</td>
          <td class="table__time">${formatTime(timeA)}</td>
          <td class="table__time">${formatTime(timeB)}</td>
          <td class="${diffClass}">${formatDiffMinutes(diff)}</td>
        </tr>
      `
    })
    .join('')
}

function renderCompareSummaryDiff(dataA, dataB) {
  const container = document.getElementById('compare-summary-diff')
  const nightHoursDiff = dataB.summary.nightHours - dataA.summary.nightHours
  const nightStartDiff = diffMinutes(dataA.summary.nightStart, dataB.summary.nightStart)
  const nightEndDiff = diffMinutes(dataA.summary.nightEnd, dataB.summary.nightEnd)

  function getHoursBadge(diff) {
    if (Math.abs(diff) < 0.05) return '<span class="compare-summary-diff__badge badge--same">相同</span>'
    if (diff > 0) return '<span class="compare-summary-diff__badge badge--better">B 更长</span>'
    return '<span class="compare-summary-diff__badge badge--worse">B 更短</span>'
  }

  function getMinutesBadge(mins, context) {
    if (mins == null) return '<span class="compare-summary-diff__badge badge--same">—</span>'
    if (mins === 0) return '<span class="compare-summary-diff__badge badge--same">相同</span>'
    if (context === 'start') {
      return mins < 0
        ? '<span class="compare-summary-diff__badge badge--better">B 更早</span>'
        : '<span class="compare-summary-diff__badge badge--worse">B 更晚</span>'
    } else {
      return mins > 0
        ? '<span class="compare-summary-diff__badge badge--better">B 更晚</span>'
        : '<span class="compare-summary-diff__badge badge--worse">B 更早</span>'
    }
  }

  container.innerHTML = `
    <div class="compare-summary-diff__item">
      <div class="compare-summary-diff__label">天文黑夜时长差异</div>
      <div class="compare-summary-diff__value">
        ${nightHoursDiff >= 0 ? '+' : ''}${nightHoursDiff.toFixed(2)} 小时
        ${getHoursBadge(nightHoursDiff)}
      </div>
    </div>
    <div class="compare-summary-diff__item">
      <div class="compare-summary-diff__label">天文黑夜开始</div>
      <div class="compare-summary-diff__value">
        ${formatDiffMinutes(nightStartDiff)}
        ${getMinutesBadge(nightStartDiff, 'start')}
      </div>
    </div>
    <div class="compare-summary-diff__item">
      <div class="compare-summary-diff__label">天文黑夜结束</div>
      <div class="compare-summary-diff__value">
        ${formatDiffMinutes(nightEndDiff)}
        ${getMinutesBadge(nightEndDiff, 'end')}
      </div>
    </div>
  `
}

function renderCompareResults(city, dateStrA, dateStrB, dataA, dataB) {
  document.getElementById('compare-location').textContent = `${city.name}（${city.lat}°N, ${city.lng}°E）`
  document.getElementById('compare-title-a').textContent = `日期 A · ${dateStrA}`
  document.getElementById('compare-title-b').textContent = `日期 B · ${dateStrB}`

  renderCompareTimeline('compare-timeline-a', dataA.keyTimes, dataA.summary)
  renderCompareTimeline('compare-timeline-b', dataB.keyTimes, dataB.summary)

  renderCompareTable('compare-table-a', dataA.rows)
  renderCompareTable('compare-table-b', dataB.rows)

  renderCompareSummary('compare-summary-a', dataA)
  renderCompareSummary('compare-summary-b', dataB)

  renderDiffTable(dataA, dataB)
  renderCompareSummaryDiff(dataA, dataB)

  compareResults.hidden = false
}

compareForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const city = getCityById(compareCity.value)
  const dateStrA = compareDateA.value
  const dateStrB = compareDateB.value

  if (!dateStrA || !dateStrB) return

  const dataA = computeTwilightTimes(city.lat, city.lng, dateStrA)
  const dataB = computeTwilightTimes(city.lat, city.lng, dateStrB)
  renderCompareResults(city, dateStrA, dateStrB, dataA, dataB)
})

// Auto-calc on first visit to compare page
let compareInitialized = false
document.querySelector('[data-page="compare"]').addEventListener('click', () => {
  if (!compareInitialized) {
    compareForm.dispatchEvent(new Event('submit'))
    compareInitialized = true
  }
})
