import {
  DEFAULT_CITY_ID,
  getCityById,
  populateCitySelect,
} from './cities.js'
import {
  computeTwilightTimes,
  computeMonthCalendar,
  computeMoonInfo,
  getMinutesOfDay,
  computeObservationScore,
  generateObservingSuggestions,
  compareMoonPhases,
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
let toastTimer = null

function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast')
  if (!toast) return

  toast.textContent = message
  toast.classList.add('toast--visible')

  if (toastTimer) {
    clearTimeout(toastTimer)
  }

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible')
    toastTimer = null
  }, duration)
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制')
    return true
  } catch (err) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      showToast('已复制')
      return true
    } catch (e) {
      showToast('复制失败')
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

function buildCopyButton(row) {
  if (!row.isPeriod) return ''
  const copyText = `${row.label}：${row.timeStr}`
  return `<td><button class="copy-btn" type="button" data-copy="${encodeURIComponent(copyText)}" aria-label="复制${row.label}到剪贴板" title="复制到剪贴板">📋 复制</button></td>`
}

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

function buildTimelineSegments(times, goldenHours, blueHours) {
  const TOTAL_MIN = 24 * 60
  const m = (d) => d == null ? null : getMinutesOfDay(d)

  const segments = []
  const addSeg = (startMin, endMin, className, label, subLabel = '') => {
    if (startMin == null || endMin == null || endMin <= startMin) return
    const width = ((endMin - startMin) / TOTAL_MIN) * 100
    segments.push({
      left: (startMin / TOTAL_MIN) * 100,
      width,
      className,
      label,
      subLabel,
    })
  }

  const nightEndMin = m(times.nightEnd)
  const nauticalDawnMin = m(times.nauticalDawn)
  const dawnMin = m(times.dawn)
  const blueMStart = m(blueHours.morning.start)
  const blueMEnd = m(blueHours.morning.end)
  const goldenMStart = m(goldenHours.morning.start)
  const goldenMEnd = m(goldenHours.morning.end)
  const goldenEStart = m(goldenHours.evening.start)
  const goldenEEnd = m(goldenHours.evening.end)
  const blueEStart = m(blueHours.evening.start)
  const blueEEnd = m(blueHours.evening.end)
  const duskMin = m(times.dusk)
  const nauticalDuskMin = m(times.nauticalDusk)
  const nightStartMin = m(times.night)

  if (nightEndMin != null && nightEndMin > 0) {
    addSeg(0, nightEndMin, 'timeline__segment--night', '夜')
  }
  addSeg(nightEndMin, nauticalDawnMin, 'timeline__segment--astro', '天文晨')
  addSeg(nauticalDawnMin, dawnMin, 'timeline__segment--nautical', '航海晨')
  addSeg(blueMStart, blueMEnd, 'timeline__segment--blue', '晨蓝调')
  addSeg(goldenMStart, goldenMEnd, 'timeline__segment--golden', '晨黄金')
  if (goldenMEnd != null && goldenEStart != null && goldenEStart > goldenMEnd) {
    addSeg(goldenMEnd, goldenEStart, 'timeline__segment--day', '白昼')
  }
  addSeg(goldenEStart, goldenEEnd, 'timeline__segment--golden', '暮黄金')
  addSeg(blueEStart, blueEEnd, 'timeline__segment--blue', '暮蓝调')
  addSeg(duskMin, nauticalDuskMin, 'timeline__segment--civil', '民用暮')
  addSeg(nauticalDuskMin, nightStartMin, 'timeline__segment--nautical', '航海暮')
  if (nightStartMin != null && nightStartMin < TOTAL_MIN) {
    addSeg(nightStartMin, TOTAL_MIN, 'timeline__segment--night', '夜')
  }

  return segments
}

function renderTimeline(keyTimes, summary, times) {
  const timeline = document.getElementById('timeline')
  const { goldenHours, blueHours } = summary
  const segments = buildTimelineSegments(times, goldenHours, blueHours)

  const morningMarkers = [
    { label: '天文晨光结束', time: times.nightEnd, key: 'nightEnd' },
    { label: '航海晨光结束', time: times.nauticalDawn, key: 'nauticalDawn' },
    { label: '晨蓝调开始', time: blueHours.morning.start, key: 'blueMorningStart', custom: true },
    { label: '晨黄金开始', time: goldenHours.morning.start, key: 'goldenMorningStart', custom: true },
  ]
  const eveningMarkers = keyTimes.filter((k) =>
    ['dusk', 'nauticalDusk', 'night'].includes(k.key),
  )

  timeline.innerHTML = `
    <div class="timeline__bar">
      ${segments.map((s) => `
        <div class="timeline__segment ${s.className}" style="left:${s.left.toFixed(2)}%;width:${s.width.toFixed(2)}%">
          <span class="segment-label">${s.label}</span>
          ${s.subLabel ? `<span class="segment-sub">${s.subLabel}</span>` : ''}
        </div>
      `).join('')}
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
    <div class="timeline__markers-wrap">
      <div class="timeline__markers-title">早晨暮光关键节点</div>
      <div class="timeline__markers timeline__markers--morning">
        ${morningMarkers
          .filter((m) => m.time)
          .map(
            (ev) => `
          <div class="timeline__marker">
            <span class="timeline__dot timeline__dot--blue"></span>
            <span class="timeline__label">${ev.label}</span>
            <span class="timeline__time">${formatTime(ev.time)}</span>
          </div>`
          )
          .join('')}
      </div>
    </div>
    <div class="timeline__markers-wrap">
      <div class="timeline__markers-title">傍晚暮光关键节点</div>
      <div class="timeline__markers">
        ${eveningMarkers
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

function renderScoreCard(lat, dateStr, data, moon, targetId = 'score-card') {
  const scoreEl = document.getElementById(targetId)
  if (!scoreEl) return

  const moonIllum = parseFloat(moon.illumination) / 100
  const scoreData = computeObservationScore({
    nightHours: data.summary.nightHours,
    lat,
    dateStr,
    moonIllumination: moonIllum,
    nightStart: data.summary.nightStart,
    nightEnd: data.summary.nightEnd,
    moonrise: moon.moonrise,
    moonset: moon.moonset,
  })

  const suggestions = generateObservingSuggestions(scoreData, moon.phase.name)
  const { total, level, breakdown } = scoreData

  scoreEl.innerHTML = `
    <div class="score-card score-level--${level.class}">
      <div class="score-display">
        <div class="score-title">观测适宜度评分</div>
        <div class="score-number">${total}</div>
        <div class="score-label">${level.label}</div>
      </div>
      <div>
        <div class="score-breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">黑夜时长</span>
            <div class="breakdown-bar">
              <div class="breakdown-progress progress-night" style="width: ${(breakdown.nightHours.score / breakdown.nightHours.max * 100).toFixed(0)}%"></div>
            </div>
            <span class="breakdown-score">${breakdown.nightHours.score}/${breakdown.nightHours.max}</span>
            <div class="breakdown-detail">${breakdown.nightHours.detail}</div>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">月相条件</span>
            <div class="breakdown-bar">
              <div class="breakdown-progress progress-moon" style="width: ${(breakdown.moon.score / breakdown.moon.max * 100).toFixed(0)}%"></div>
            </div>
            <span class="breakdown-score">${breakdown.moon.score}/${breakdown.moon.max}</span>
            <div class="breakdown-detail">${breakdown.moon.detail}（照度 ${breakdown.moon.illumination}）</div>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">季节因素</span>
            <div class="breakdown-bar">
              <div class="breakdown-progress progress-season" style="width: ${(breakdown.season.score / breakdown.season.max * 100).toFixed(0)}%"></div>
            </div>
            <span class="breakdown-score">${breakdown.season.score}/${breakdown.season.max}</span>
            <div class="breakdown-detail">${breakdown.season.detail}</div>
          </div>
        </div>
        <div class="suggestions-section">
          <div class="suggestions-title">🌟 适合观测项目</div>
          <div class="suitable-list">
            ${suggestions.suitable.map((s) => `<span class="suitable-tag">${s}</span>`).join('')}
          </div>
          <div class="suggestions-title">💡 观测建议</div>
          <ul class="tips-list">
            ${suggestions.tips.map((t) => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `
}

function renderResults(city, dateStr, data, moon) {
  document.getElementById('result-location').textContent = `${city.name}（${city.lat}°N, ${city.lng}°E）`
  document.getElementById('result-date').textContent = dateStr

  renderTimeline(data.keyTimes, data.summary, data.times)
  renderScoreCard(city.lat, dateStr, data, moon)

  const tbody = document.querySelector('#times-table tbody')
  tbody.innerHTML = data.allRows
    .map(
      (row) => {
        const azimuthCell = row.azimuth
          ? `<td class="table__azimuth"><span class="azimuth__dir">${row.azimuth.direction}</span><span class="azimuth__deg">${row.azimuth.degrees}°</span></td>`
          : `<td class="table__azimuth table__azimuth--empty">—</td>`
        const rowClass = row.isPeriod
          ? `table__row--period table__row--period-${row.periodType}`
          : `table__row--${row.phase}`
        const descCell = row.isPeriod
          ? `<td class="table__desc">${row.desc}</td>`
          : `<td class="table__desc" colspan="2">${row.desc}</td>`
        return `
    <tr class="table__row ${rowClass}">
      <td>${row.label}</td>
      <td class="table__time">${row.timeStr}</td>
      ${azimuthCell}
      ${descCell}
      ${buildCopyButton(row)}
    </tr>`
      }
    )
    .join('')

  const nightSummary = document.getElementById('night-summary')
  const moonIllum = parseFloat(moon.illumination) / 100
  const scoreData = computeObservationScore({
    nightHours: data.summary.nightHours,
    lat: city.lat,
    dateStr,
    moonIllumination: moonIllum,
    nightStart: data.summary.nightStart,
    nightEnd: data.summary.nightEnd,
    moonrise: moon.moonrise,
    moonset: moon.moonset,
  })
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
    <p class="night-summary__main night-summary--${scoreData.level.class}">${scoreData.level.label} · 综合评分 ${scoreData.total}/100</p>
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
  document.getElementById('score-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
    const scoreStr = d.score != null ? `${d.score}` : '—'
    const dayOfWeek = new Date(year, month - 1, d.day).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const weekendClass = isWeekend ? ' calendar__cell--weekend' : ''
    const weekendIcon = isWeekend ? '<span class="calendar__weekend-icon">🏖️</span>' : ''
    html += `
      <div class="calendar__cell calendar__cell--${d.level.class}${weekendClass}" title="${d.dateStr}&#10;观测适宜度: ${d.level.label}（${d.score}/100）&#10;天文黑夜: ${d.nightStartStr} ~ 次日 ${d.nightEndStr}&#10;时长: ${formatNightHours(d.nightHours)}${isWeekend ? '&#10;周末' : ''}">
        <span class="calendar__day">${d.day}</span>
        <span class="calendar__hours">${scoreStr} 分</span>
        <span class="calendar__badge">${d.level.label}</span>
        ${weekendIcon}
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

function renderCompareTimeline(timelineId, keyTimes, summary, times) {
  const timeline = document.getElementById(timelineId)
  const { goldenHours, blueHours } = summary
  const segments = buildTimelineSegments(times, goldenHours, blueHours)

  const morningMarkers = [
    { label: '天文晨光结束', time: times.nightEnd, key: 'nightEnd' },
    { label: '航海晨光结束', time: times.nauticalDawn, key: 'nauticalDawn' },
    { label: '晨蓝调开始', time: blueHours.morning.start, key: 'blueMorningStart', custom: true },
    { label: '晨黄金开始', time: goldenHours.morning.start, key: 'goldenMorningStart', custom: true },
  ]
  const eveningMarkers = keyTimes.filter((k) =>
    ['dusk', 'nauticalDusk', 'night'].includes(k.key),
  )

  timeline.innerHTML = `
    <div class="timeline__bar">
      ${segments.map((s) => `
        <div class="timeline__segment ${s.className}" style="left:${s.left.toFixed(2)}%;width:${s.width.toFixed(2)}%">
          <span class="segment-label">${s.label}</span>
          ${s.subLabel ? `<span class="segment-sub">${s.subLabel}</span>` : ''}
        </div>
      `).join('')}
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
    <div class="timeline__markers-wrap">
      <div class="timeline__markers-title">早晨关键节点</div>
      <div class="timeline__markers timeline__markers--morning">
        ${morningMarkers
          .filter((m) => m.time)
          .map(
            (ev) => `
          <div class="timeline__marker">
            <span class="timeline__dot timeline__dot--blue"></span>
            <span class="timeline__label">${ev.label}</span>
            <span class="timeline__time">${formatTime(ev.time)}</span>
          </div>`
          )
          .join('')}
      </div>
    </div>
    <div class="timeline__markers-wrap">
      <div class="timeline__markers-title">傍晚关键节点</div>
      <div class="timeline__markers">
        ${eveningMarkers
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
      (row) => {
        const rowClass = row.isPeriod
          ? `table__row--period table__row--period-${row.periodType}`
          : `table__row--${row.phase}`
        return `
    <tr class="table__row ${rowClass}">
      <td>${row.label}</td>
      <td class="table__time">${row.timeStr}</td>
      ${formatAzimuth(row.azimuth)}
      <td class="table__desc">${row.desc}</td>
    </tr>`
      }
    )
    .join('')
}

function renderCompareSummary(summaryId, data, lat, dateStr, moon) {
  const summaryEl = document.getElementById(summaryId)
  const moonIllum = parseFloat(moon.illumination) / 100
  const scoreData = computeObservationScore({
    nightHours: data.summary.nightHours,
    lat,
    dateStr,
    moonIllumination: moonIllum,
    nightStart: data.summary.nightStart,
    nightEnd: data.summary.nightEnd,
    moonrise: moon.moonrise,
    moonset: moon.moonset,
  })
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
    <p class="night-summary__main night-summary--${scoreData.level.class}">${scoreData.level.label} · 综合评分 ${scoreData.total}/100</p>
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
  const compareKeys = [
    { key: 'blueHourMorning', label: '晨蓝调时刻（开始）', period: 'blue', type: 'start' },
    { key: 'goldenHourMorning', label: '晨黄金时刻（开始）', period: 'golden', type: 'start' },
    { key: 'sunrise', label: '日出' },
    { key: 'dawn', label: '民用晨光结束' },
    { key: 'nauticalDawn', label: '航海晨光结束' },
    { key: 'nightEnd', label: '天文黑夜结束' },
    { key: 'sunset', label: '日落' },
    { key: 'goldenHourEvening', label: '暮黄金时刻（开始）', period: 'golden', type: 'start' },
    { key: 'blueHourEvening', label: '暮蓝调时刻（开始）', period: 'blue', type: 'start' },
    { key: 'dusk', label: '民用暮光结束' },
    { key: 'nauticalDusk', label: '航海暮光结束' },
    { key: 'night', label: '天文黑夜开始' },
  ]

  const getTimeFor = (data, entry) => {
    if (entry.period) {
      const periods = entry.period === 'golden' ? data.goldenHours : data.blueHours
      const which = entry.key.includes('Morning') ? 'morning' : 'evening'
      return entry.type === 'start' ? periods[which].start : periods[which].end
    }
    return data.times[entry.key]
  }

  tbody.innerHTML = compareKeys
    .map((entry) => {
      const timeA = getTimeFor(dataA, entry)
      const timeB = getTimeFor(dataB, entry)
      const diff = diffMinutes(timeA, timeB)
      const diffClass = getDiffClass(diff)
      const rowClass = entry.period ? `table__row--period table__row--period-${entry.period}` : ''
      return `
        <tr class="${rowClass}">
          <td>${entry.label}</td>
          <td class="table__time">${formatTime(timeA)}</td>
          <td class="table__time">${formatTime(timeB)}</td>
          <td class="${diffClass}">${formatDiffMinutes(diff)}</td>
        </tr>
      `
    })
    .join('')
}

function renderCompareSummaryDiff(dataA, dataB, moonA, moonB) {
  const container = document.getElementById('compare-summary-diff')
  const nightHoursDiff = dataB.summary.nightHours - dataA.summary.nightHours
  const nightStartDiff = diffMinutes(dataA.summary.nightStart, dataB.summary.nightStart)
  const nightEndDiff = diffMinutes(dataA.summary.nightEnd, dataB.summary.nightEnd)
  const moonDiff = compareMoonPhases(moonA, moonB)

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

  function getMoonBadge(trendClass) {
    if (trendClass === 'same') return '<span class="compare-summary-diff__badge badge--same">相近</span>'
    if (trendClass === 'better') return '<span class="compare-summary-diff__badge badge--better">B 更暗</span>'
    return '<span class="compare-summary-diff__badge badge--worse">B 更亮</span>'
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
    <div class="compare-summary-diff__item">
      <div class="compare-summary-diff__label">月相差异</div>
      <div class="compare-summary-diff__value">
        ${moonA.phase.emoji} ${moonA.phase.name} → ${moonB.phase.emoji} ${moonB.phase.name}
        ${getMoonBadge(moonDiff.trendClass)}
      </div>
      <div class="compare-summary-diff__sub">
        照度差：${moonDiff.illumDiffPercent > 0 ? '+' : ''}${moonDiff.illumDiffPercent}% ·
        月龄差：${moonDiff.ageDiffStr}
      </div>
      <div class="compare-summary-diff__note">${moonDiff.observationNote}</div>
    </div>
  `
}

function renderCompareResults(city, dateStrA, dateStrB, dataA, dataB, moonA, moonB) {
  document.getElementById('compare-location').textContent = `${city.name}（${city.lat}°N, ${city.lng}°E）`
  document.getElementById('compare-title-a').textContent = `日期 A · ${dateStrA}`
  document.getElementById('compare-title-b').textContent = `日期 B · ${dateStrB}`

  renderCompareTimeline('compare-timeline-a', dataA.keyTimes, dataA.summary, dataA.times)
  renderCompareTimeline('compare-timeline-b', dataB.keyTimes, dataB.summary, dataB.times)

  renderScoreCard(city.lat, dateStrA, dataA, moonA, 'score-card-a')
  renderScoreCard(city.lat, dateStrB, dataB, moonB, 'score-card-b')

  renderCompareTable('compare-table-a', dataA.allRows)
  renderCompareTable('compare-table-b', dataB.allRows)

  renderCompareSummary('compare-summary-a', dataA, city.lat, dateStrA, moonA)
  renderCompareSummary('compare-summary-b', dataB, city.lat, dateStrB, moonB)

  renderDiffTable(dataA, dataB)
  renderCompareSummaryDiff(dataA, dataB, moonA, moonB)

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
  const moonA = computeMoonInfo(city.lat, city.lng, dateStrA)
  const moonB = computeMoonInfo(city.lat, city.lng, dateStrB)
  renderCompareResults(city, dateStrA, dateStrB, dataA, dataB, moonA, moonB)
})

// Auto-calc on first visit to compare page
let compareInitialized = false
document.querySelector('[data-page="compare"]').addEventListener('click', () => {
  if (!compareInitialized) {
    compareForm.dispatchEvent(new Event('submit'))
    compareInitialized = true
  }
})

// ── Copy Button Event Delegation ──
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn')
  if (!btn) return
  const encoded = btn.getAttribute('data-copy')
  if (!encoded) return
  const text = decodeURIComponent(encoded)
  copyToClipboard(text)
})
