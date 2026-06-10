/** Mock 城市预设数据 */
export const CITIES = [
  { id: 'beijing', name: '北京', lat: 39.9042, lng: 116.4074, timezone: 'Asia/Shanghai' },
  { id: 'shanghai', name: '上海', lat: 31.2304, lng: 121.4737, timezone: 'Asia/Shanghai' },
  { id: 'guangzhou', name: '广州', lat: 23.1291, lng: 113.2644, timezone: 'Asia/Shanghai' },
  { id: 'chengdu', name: '成都', lat: 30.5728, lng: 104.0668, timezone: 'Asia/Shanghai' },
  { id: 'urumqi', name: '乌鲁木齐', lat: 43.8256, lng: 87.6168, timezone: 'Asia/Urumqi' },
  { id: 'lhasa', name: '拉萨', lat: 29.652, lng: 91.172, timezone: 'Asia/Shanghai' },
  { id: 'mohe', name: '漠河', lat: 52.9721, lng: 122.5379, timezone: 'Asia/Shanghai' },
  { id: 'sanya', name: '三亚', lat: 18.2528, lng: 109.5119, timezone: 'Asia/Shanghai' }
]

export const DEFAULT_CITY_ID = 'beijing'

export function getCityById(id) {
  return CITIES.find(c => c.id === id) ?? CITIES[0]
}

export function populateCitySelect(selectEl, selectedId = DEFAULT_CITY_ID) {
  selectEl.innerHTML = CITIES.map(
    c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`
  ).join('')
}
