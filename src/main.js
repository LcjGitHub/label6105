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
    console.log(`当前页面：${PAGE_NAMES[page]}`)
  })
})

const PAGE_NAMES = {
  calc: '暮光计算',
  compare: '日期对比',
  calendar: '观测日历',
}

const SHORTCUT_MAP = { 1: 'calc', 2: 'compare', 3: 'calendar' }

navBtns.forEach((btn) => {
  const page = btn.dataset.page
  const key = Object.entries(SHORTCUT_MAP).find(([, v]) => v === page)
  if (key) {
    const badge = document.createElement('span')
    badge.className = 'nav__shortcut'
    badge.textContent = `Ctrl+${key[0]}`
    btn.style.position = 'relative'
    btn.appendChild(badge)
  }
})

function switchToPage(pageKey) {
  const btn = document.querySelector(`.nav__btn[data-page="${pageKey}"]`)
  if (!btn) return
  btn.click()
}

document.addEventListener('keydown', (e) => {
  if (!e.ctrlKey && !e.metaKey) return
  const num = parseInt(e.key, 10)
  if (num < 1 || num > 3) return
  const el = document.activeElement
  const tag = el ? el.tagName : ''
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return
  e.preventDefault()
  switchToPage(SHORTCUT_MAP[num])
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

let lastShareData = null

function renderScoreCard(lat, dateStr, data, moon, city, targetId = 'score-card') {
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

  if (targetId === 'score-card') {
    lastShareData = {
      city,
      dateStr,
      total,
      level,
      breakdown,
      data,
      moon,
      lat,
    }
  }

  const shareBtn = targetId === 'score-card'
    ? `<button type="button" class="share-btn" id="btn-share-result">
        <span>📤</span><span>分享此结果</span>
      </button>`
    : ''

  scoreEl.innerHTML = `
    <div class="score-card score-level--${level.class}">
      <div class="score-display">
        <div class="score-title">观测适宜度评分</div>
        <div class="score-number">${total}</div>
        <div class="score-label">${level.label}</div>
        ${shareBtn}
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
  renderScoreCard(city.lat, dateStr, data, moon, city)

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
        ${moonDiff.illumDiffPercent > 0 ? '+' : ''}${moonDiff.illumDiffPercent}%
        ${getMoonBadge(moonDiff.trendClass)}
        <span class="compare-summary-diff__trend">${moonDiff.trend}</span>
      </div>
      <div class="compare-summary-diff__sub">
        <span>A：${moonA.phase.emoji} ${moonA.phase.name} · ${moonA.ageStr} · ${moonA.illumination}</span>
        <span>B：${moonB.phase.emoji} ${moonB.phase.name} · ${moonB.ageStr} · ${moonB.illumination}</span>
      </div>
    </div>
  `
}

function renderCompareResults(city, dateStrA, dateStrB, dataA, dataB, moonA, moonB) {
  document.getElementById('compare-location').textContent = `${city.name}（${city.lat}°N, ${city.lng}°E）`
  document.getElementById('compare-title-a').textContent = `日期 A · ${dateStrA}`
  document.getElementById('compare-title-b').textContent = `日期 B · ${dateStrB}`

  renderCompareTimeline('compare-timeline-a', dataA.keyTimes, dataA.summary, dataA.times)
  renderCompareTimeline('compare-timeline-b', dataB.keyTimes, dataB.summary, dataB.times)

  renderScoreCard(city.lat, dateStrA, dataA, moonA, null, 'score-card-a')
  renderScoreCard(city.lat, dateStrB, dataB, moonB, null, 'score-card-b')

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

// ── Share Image Feature ──
function getLevelColors(levelClass) {
  const map = {
    excellent: { main: '#50fa7b', glow: 'rgba(80, 250, 123, 0.35)', label: '极佳' },
    good: { main: '#8be9fd', glow: 'rgba(139, 233, 253, 0.35)', label: '良好' },
    fair: { main: '#f1fa8c', glow: 'rgba(241, 250, 140, 0.35)', label: '一般' },
    poor: { main: '#ffb86c', glow: 'rgba(255, 184, 108, 0.35)', label: '较差' },
    verypoor: { main: '#6272a4', glow: 'rgba(98, 114, 164, 0.35)', label: '不适宜' },
  }
  return map[levelClass] || map.fair
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawShareCanvas(shareData) {
  const canvas = document.getElementById('share-canvas')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  const { city, dateStr, total, level, breakdown, data, moon, lat } = shareData

  ctx.clearRect(0, 0, W, H)

  const bgGradient = ctx.createLinearGradient(0, 0, 0, H)
  bgGradient.addColorStop(0, '#0f1628')
  bgGradient.addColorStop(0.5, '#0a0e17')
  bgGradient.addColorStop(1, '#060810')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  const starCount = 60
  for (let i = 0; i < starCount; i++) {
    const x = (i * 97.31) % W
    const y = (i * 53.71) % (H * 0.65)
    const r = 0.5 + ((i * 31) % 10) / 10
    const alpha = 0.2 + ((i * 17) % 50) / 100
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  let y = 40

  ctx.save()
  roundRect(ctx, 40, y, W - 80, 90, 16)
  ctx.fillStyle = 'rgba(110, 181, 255, 0.08)'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(110, 181, 255, 0.25)'
  ctx.stroke()

  ctx.font = '36px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#6eb5ff'
  ctx.fillText('🌌', 68, y + 58)

  ctx.font = 'bold 26px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#e8edf5'
  ctx.fillText('天文暮光 · 观测助手', 120, y + 50)

  ctx.font = '14px "JetBrains Mono", monospace'
  ctx.fillStyle = '#8899b0'
  ctx.fillText('Astronomical Twilight Observer', 120, y + 75)
  ctx.restore()

  y += 120

  ctx.save()
  ctx.font = 'bold 28px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#e8edf5'
  ctx.fillText(city.name, 40, y)

  ctx.font = '16px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#8899b0'
  ctx.fillText(`${city.lat}°N, ${city.lng}°E`, 40, y + 28)

  ctx.font = '18px "JetBrains Mono", monospace'
  ctx.fillStyle = '#6eb5ff'
  ctx.textAlign = 'right'
  ctx.fillText(dateStr, W - 40, y + 8)
  ctx.textAlign = 'left'
  ctx.restore()

  y += 68

  const colors = getLevelColors(level.class)

  ctx.save()
  roundRect(ctx, 40, y, W - 80, 180, 16)
  const scoreBg = ctx.createLinearGradient(40, y, 40, y + 180)
  scoreBg.addColorStop(0, 'rgba(18, 28, 52, 0.95)')
  scoreBg.addColorStop(1, 'rgba(12, 18, 36, 0.95)')
  ctx.fillStyle = scoreBg
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = colors.glow
  ctx.stroke()

  ctx.font = '16px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#8899b0'
  ctx.fillText('📊 观测适宜度综合评分', 64, y + 40)

  ctx.font = 'bold 88px "JetBrains Mono", monospace'
  ctx.fillStyle = colors.main
  ctx.shadowColor = colors.glow
  ctx.shadowBlur = 30
  ctx.textAlign = 'center'
  ctx.fillText(total, W / 2 - 80, y + 125)
  ctx.shadowBlur = 0
  ctx.textAlign = 'left'

  ctx.font = 'bold 22px "Noto Sans SC", sans-serif'
  ctx.fillStyle = colors.main
  roundRect(ctx, W / 2 + 20, y + 85, 180, 44, 22)
  ctx.fill()
  ctx.fillStyle = '#0a0e17'
  ctx.textAlign = 'center'
  ctx.fillText(level.label, W / 2 + 110, y + 115)
  ctx.textAlign = 'left'

  ctx.font = '14px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#8899b0'
  ctx.textAlign = 'right'
  ctx.fillText('满分 100 分', W - 64, y + 40)
  ctx.textAlign = 'left'
  ctx.restore()

  y += 210

  ctx.save()
  ctx.font = 'bold 18px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#e8edf5'
  ctx.fillText('📋 评分分项', 40, y)
  ctx.restore()

  y += 30

  const breakdownItems = [
    { label: '黑夜时长', data: breakdown.nightHours, colors: ['#6272a4', '#8be9fd'] },
    { label: '月相条件', data: breakdown.moon, colors: ['#bd93f9', '#ff79c6'] },
    { label: '季节因素', data: breakdown.season, colors: ['#50fa7b', '#f1fa8c'] },
  ]

  breakdownItems.forEach((item) => {
    ctx.save()
    ctx.font = '15px "Noto Sans SC", sans-serif'
    ctx.fillStyle = '#8899b0'
    ctx.fillText(item.label, 56, y + 16)

    const barX = 180
    const barW = W - 80 - barX - 80
    const barH = 12
    roundRect(ctx, barX, y + 4, barW, barH, 6)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.fill()

    const progress = (item.data.score / item.data.max) * barW
    if (progress > 0) {
      roundRect(ctx, barX, y + 4, progress, barH, 6)
      const pGrad = ctx.createLinearGradient(barX, y, barX + barW, y)
      pGrad.addColorStop(0, item.colors[0])
      pGrad.addColorStop(1, item.colors[1])
      ctx.fillStyle = pGrad
      ctx.fill()
    }

    ctx.font = 'bold 15px "JetBrains Mono", monospace'
    ctx.fillStyle = '#e8edf5'
    ctx.textAlign = 'right'
    ctx.fillText(`${item.data.score}/${item.data.max}`, W - 56, y + 16)
    ctx.textAlign = 'left'

    ctx.font = '12px "Noto Sans SC", sans-serif'
    ctx.fillStyle = '#6272a4'
    ctx.fillText(item.data.detail, barX, y + 40)

    ctx.restore()
    y += 58
  })

  y += 16

  ctx.save()
  ctx.font = 'bold 18px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#e8edf5'
  ctx.fillText('⏱️ 暮光时间线', 40, y)
  ctx.restore()

  y += 30

  const tSegW = W - 80
  const tSegH = 44
  const tSegX = 40
  const tSegY = y

  ctx.save()
  roundRect(ctx, tSegX, tSegY, tSegW, tSegH, 10)
  ctx.fillStyle = '#0f1525'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(100, 130, 180, 0.15)'
  ctx.stroke()

  const TOTAL_MIN = 24 * 60
  const m = (d) => d == null ? null : getMinutesOfDay(d)
  const segments = buildTimelineSegments(data.times, data.summary.goldenHours, data.summary.blueHours)

  ctx.save()
  ctx.beginPath()
  roundRect(ctx, tSegX, tSegY, tSegW, tSegH, 10)
  ctx.clip()

  segments.forEach((seg) => {
    const sx = tSegX + (seg.left / 100) * tSegW
    const sw = (seg.width / 100) * tSegW
    if (sw < 0.5) return

    const colorMap = {
      'timeline__segment--day': ['#3d5a80', '#5c7a9e'],
      'timeline__segment--golden': ['#e8a94f', '#ffd166'],
      'timeline__segment--blue': ['#2e6ba8', '#4d9de0'],
      'timeline__segment--civil': ['#ffb86c', '#ffb86c'],
      'timeline__segment--nautical': ['#bd93f9', '#bd93f9'],
      'timeline__segment--astro': ['#6272a4', '#6272a4'],
      'timeline__segment--night': ['#0f1525', '#0f1525'],
    }
    const colors = colorMap[seg.className] || ['#6272a4', '#6272a4']

    const sGrad = ctx.createLinearGradient(sx, tSegY, sx, tSegY + tSegH)
    sGrad.addColorStop(0, colors[0])
    sGrad.addColorStop(1, colors[1])
    ctx.fillStyle = sGrad
    ctx.fillRect(sx, tSegY, sw, tSegH)
  })
  ctx.restore()

  const tickPositions = [0, 0.25, 0.5, 0.75, 1]
  const tickLabels = ['00:00', '06:00', '12:00', '18:00', '24:00']
  ctx.font = '11px "JetBrains Mono", monospace'
  ctx.fillStyle = '#6272a4'
  tickPositions.forEach((p, i) => {
    const tx = tSegX + p * tSegW
    ctx.fillText(tickLabels[i], tx - 22, tSegY + tSegH + 18)
  })
  ctx.restore()

  y += 90

  ctx.save()
  roundRect(ctx, 40, y, (W - 90) / 2, 110, 12)
  ctx.fillStyle = 'rgba(255, 209, 102, 0.06)'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.25)'
  ctx.stroke()

  ctx.font = '15px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#ffd166'
  ctx.fillText('🌞 摄影黄金时刻', 60, y + 32)

  ctx.font = '13px "JetBrains Mono", monospace'
  ctx.fillStyle = '#e8edf5'
  const { goldenHours, blueHours } = data.summary
  ctx.fillText(`晨间：${goldenHours.morning.startStr} → ${goldenHours.morning.endStr}`, 60, y + 62)
  ctx.fillText(`傍晚：${goldenHours.evening.startStr} → ${goldenHours.evening.endStr}`, 60, y + 88)
  ctx.restore()

  ctx.save()
  const card2X = 40 + (W - 90) / 2 + 10
  roundRect(ctx, card2X, y, (W - 90) / 2, 110, 12)
  ctx.fillStyle = 'rgba(77, 157, 224, 0.06)'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(77, 157, 224, 0.25)'
  ctx.stroke()

  ctx.font = '15px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#4d9de0'
  ctx.fillText('🌅 蓝调时刻', card2X + 20, y + 32)

  ctx.font = '13px "JetBrains Mono", monospace'
  ctx.fillStyle = '#e8edf5'
  ctx.fillText(`晨间：${blueHours.morning.startStr} → ${blueHours.morning.endStr}`, card2X + 20, y + 62)
  ctx.fillText(`傍晚：${blueHours.evening.startStr} → ${blueHours.evening.endStr}`, card2X + 20, y + 88)
  ctx.restore()

  y += 130

  ctx.save()
  roundRect(ctx, 40, y, W - 80, 80, 12)
  ctx.fillStyle = 'rgba(189, 147, 249, 0.06)'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(189, 147, 249, 0.2)'
  ctx.stroke()

  ctx.font = '30px sans-serif'
  ctx.fillText(moon.phase.emoji, 64, y + 52)

  ctx.font = 'bold 16px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#bd93f9'
  ctx.fillText(`${moon.phase.name} · 月龄 ${moon.ageStr}`, 120, y + 34)

  ctx.font = '13px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#8899b0'
  ctx.fillText(moon.phase.desc, 120, y + 58)

  ctx.font = '13px "JetBrains Mono", monospace'
  ctx.fillStyle = '#e8edf5'
  ctx.textAlign = 'right'
  ctx.fillText(`照度 ${moon.illumination}    月出 ${moon.moonriseStr}    月落 ${moon.moonsetStr}`, W - 60, y + 48)
  ctx.textAlign = 'left'
  ctx.restore()

  y += 108

  ctx.save()
  ctx.font = '12px "JetBrains Mono", monospace'
  ctx.fillStyle = '#6272a4'
  ctx.textAlign = 'center'
  ctx.fillText(`天文黑夜：${formatTime(data.summary.nightStart)} → 次日 ${formatTime(data.summary.nightEnd)}（${formatNightHours(data.summary.nightHours)}）`, W / 2, y)
  ctx.restore()

  y += 30

  ctx.save()
  const footerGrad = ctx.createLinearGradient(40, y, W - 40, y)
  footerGrad.addColorStop(0, 'rgba(110, 181, 255, 0.4)')
  footerGrad.addColorStop(0.5, 'rgba(189, 147, 249, 0.4)')
  footerGrad.addColorStop(1, 'rgba(110, 181, 255, 0.4)')
  ctx.strokeStyle = footerGrad
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(40, y)
  ctx.lineTo(W - 40, y)
  ctx.stroke()

  ctx.font = '12px "Noto Sans SC", sans-serif'
  ctx.fillStyle = '#6272a4'
  ctx.textAlign = 'center'
  ctx.fillText('由「天文暮光 · 观测助手」生成 · 纯前端本地计算 · SunCalc 天文算法', W / 2, y + 28)
  ctx.textAlign = 'left'
  ctx.restore()
}

function openShareModal() {
  if (!lastShareData) {
    showToast('暂无观测数据可分享')
    return
  }

  const modal = document.getElementById('share-modal')
  if (!modal) return

  try {
    drawShareCanvas(lastShareData)
  } catch (e) {
    console.error('生成分享图片失败:', e)
    showToast('生成分享图片失败')
    return
  }

  modal.hidden = false
}

function closeShareModal() {
  const modal = document.getElementById('share-modal')
  if (modal) modal.hidden = true
}

function downloadShareImage() {
  const canvas = document.getElementById('share-canvas')
  if (!canvas) return

  try {
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    const dateStr = lastShareData ? lastShareData.dateStr : todayStr()
    link.download = `观测结果_${dateStr}_${lastShareData ? lastShareData.city.name : ''}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('图片已下载')
  } catch (e) {
    console.error('下载图片失败:', e)
    showToast('下载图片失败')
  }
}

async function copyShareImage() {
  const canvas = document.getElementById('share-canvas')
  if (!canvas) return

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png')
      })
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        showToast('图片已复制到剪贴板')
        return
      }
    }
  } catch (e) {
    console.warn('Clipboard API 复制失败，尝试降级方案:', e)
  }

  try {
    const dataUrl = canvas.toDataURL('image/png')
    await copyToClipboard(dataUrl)
    showToast('图片数据已复制（粘贴为链接，可下载完整图片）')
  } catch (e2) {
    console.error('复制图片失败:', e2)
    showToast('复制图片失败，请尝试下载')
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-share-result')) {
    openShareModal()
    return
  }

  if (e.target.closest('[data-close-share]')) {
    closeShareModal()
    return
  }

  if (e.target.closest('#btn-download-img')) {
    downloadShareImage()
    return
  }

  if (e.target.closest('#btn-copy-img')) {
    copyShareImage()
    return
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('share-modal')
    if (modal && !modal.hidden) closeShareModal()
  }
})
