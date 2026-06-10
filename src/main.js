import {
  DEFAULT_CITY_ID,
  getCityById,
  populateCitySelect,
} from './cities.js'
import {
  computeTwilightTimes,
  computeMonthCalendar,
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

  timeline.innerHTML = `
    <div class="timeline__bar">
      <div class="timeline__segment timeline__segment--day" style="flex:2">白昼</div>
      <div class="timeline__segment timeline__segment--civil">民用暮光</div>
      <div class="timeline__segment timeline__segment--nautical">航海暮光</div>
      <div class="timeline__segment timeline__segment--astro">天文暮光</div>
      <div class="timeline__segment timeline__segment--night">天文黑夜</div>
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

function renderResults(city, dateStr, data) {
  document.getElementById('result-location').textContent = `${city.name}（${city.lat}°N, ${city.lng}°E）`
  document.getElementById('result-date').textContent = dateStr

  renderTimeline(data.keyTimes, data.summary)

  const tbody = document.querySelector('#times-table tbody')
  tbody.innerHTML = data.rows
    .map(
      (row) => `
    <tr class="table__row table__row--${row.phase}">
      <td>${row.label}</td>
      <td class="table__time">${row.timeStr}</td>
      <td class="table__desc">${row.desc}</td>
    </tr>`
    )
    .join('')

  const nightSummary = document.getElementById('night-summary')
  const level = data.summary.nightHours >= 3 ? '适合深空观测' : data.summary.nightHours > 0 ? '观测窗口较短' : '无完整天文黑夜'
  nightSummary.innerHTML = `
    <h3>观测评估</h3>
    <p class="night-summary__main">${level}</p>
    <ul class="night-summary__list">
      <li>民用暮光结束（暮）：<strong>${formatTime(data.times.dusk)}</strong></li>
      <li>天文暮光开始（暮）：<strong>${formatTime(data.times.nauticalDusk)}</strong></li>
      <li>天文暮光结束（暮）：<strong>${formatTime(data.times.night)}</strong></li>
      <li>天文晨光结束（晨）：<strong>${formatTime(data.times.nightEnd)}</strong></li>
      <li>天文黑夜时长：<strong>${formatNightHours(data.summary.nightHours)}</strong></li>
    </ul>
  `

  resultsEl.hidden = false
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

calcForm.addEventListener('submit', (e) => {
  e.preventDefault()
  const city = getCityById(cityPreset.value)
  const lat = parseFloat(latInput.value)
  const lng = parseFloat(lngInput.value)
  const dateStr = dateInput.value

  if (Number.isNaN(lat) || Number.isNaN(lng)) return

  const data = computeTwilightTimes(lat, lng, dateStr)
  renderResults(city, dateStr, data)
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

// Auto-generate calendar on first visit to page 2
let calendarInitialized = false
document.querySelector('[data-page="calendar"]').addEventListener('click', () => {
  if (!calendarInitialized) {
    calendarForm.dispatchEvent(new Event('submit'))
    calendarInitialized = true
  }
})
