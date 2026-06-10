# 天文暮光 · 观测助手

纯前端天文小工具：输入经纬度与日期，计算民用/航海/天文暮光时段，并生成本月深空观测适宜度日历。

## 功能

- **暮光计算**：选择 Mock 城市预设或手动输入经纬度，计算日出日落、民用暮光结束、天文暮光开始/结束等时刻
- **观测日历**：按天文黑夜时长（太阳 < −18°）评估每日观测适宜度，分极佳/良好/一般/不适宜四档

## 技术

- [Vite](https://vitejs.dev/) + 原生 JavaScript
- [SunCalc](https://github.com/mourner/suncalc) 天文算法库

## 运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5101`。

## 构建

```bash
npm run build
npm run preview
```

## Mock 城市

北京、上海、广州、成都、乌鲁木齐、拉萨、漠河、三亚
