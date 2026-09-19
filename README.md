# EasyTrip

**自驾行程地图 · 想去的地方，一图安排。**

EasyTrip 是一款无需后端的自驾行程规划工具。使用 HTML、CSS、原生 JavaScript 和 Leaflet 构建，内置 42 个川西示例地点，可搜索并添加其他目的地。

## 高德接入（待配置）

当前开发分支已加入高德 JS API 2.0 地图与地点搜索，详见 [接入说明](docs/AMAP.md)。需创建高德开发者账号、JS API Key 并部署安全代理；尚未使用真实账号验收。未配置时显示提示并保留 OpenStreetMap。

## v0.1.0 功能

- 地图选点与地点清单联动，支持关键词、区域、海拔和步行条件筛选。
- 按海拔分色：低于 2500 米绿色、2500–3499 米蓝色、3500–4499 米橙色、4500 米及以上红色，缺失灰色。
- 逐点显示/隐藏，切换地名标签。
- 使用 Nominatim 搜索地点、预览位置并加入个人地点库。
- 为地点保存行程天数：地图标记显示数字，同一天可以安排多个地点。
- 天气日期自动定位为“出行开始日期 + 行程天数 − 1”；超出行程范围会提示。
- 编辑出行日期，保存后更新全部地点（含隐藏地点）的天气和前一年同期参考。
- 桌面与手机响应式布局；操作状态保存在当前浏览器。

## 本地运行

需要 Python 3，无需安装前端依赖或构建。

```sh
git clone https://github.com/john-ops-lab/EasyTrip.git
cd EasyTrip
python3 -m http.server 8768 --directory dist
```

在浏览器打开 http://localhost:8768 。请通过 HTTP 服务访问，不要直接双击 HTML 文件。

## 使用方法

1. 点击顶部“编辑日期”，选择开始和结束日期，再保存并更新天气。
2. 点击地图标记或地点清单，在“行程第几天”填写数字并保存。
3. 地图显示该数字；打开详情时天气自动选择对应日期。
4. 使用“搜索新地点”扩展地点库，用“显示/隐藏”控制地图标记。

## 日期与天气

日期以北京时间计算，开始和结束日期均限制在今天至两个月后同日之间，月份末尾自动截断。预报只查询行程与未来 16 天窗口的交集，实际可用性由服务决定，更远日期显示暂无预报。

历史对照按日期减一年计算，2027 年对照 2026 年，2 月 29 日对照前一年 2 月 28 日，支持跨年行程。历史天气是 ERA5 再分析估计，不是本地气象站实测；历史降水量不等于降水概率。

内置日期和天气是 **2026 年 9 月的演示快照**，不会随时间自动更新。开始使用时请编辑日期并保存，获取当前可用数据。保存日期时最多并发两条天气请求，每批最多八个地点；失败会提示，可再次保存重试。

## 技术架构

| 部分 | 技术或服务 |
| --- | --- |
| 界面 | HTML、CSS、原生 JavaScript |
| 地图组件 | Leaflet 1.9.4（随仓库提供） |
| 底图 | OpenStreetMap 标准瓦片 |
| 地点搜索 | Nominatim |
| 天气、历史与海拔 | Open-Meteo |
| 地点数据 | `dist/places.json` |
| 状态保存 | 浏览器 localStorage |

默认 OpenStreetMap 模式没有应用后端、账户系统或数据库；高德模式需配置单独的安全代理以保护安全密钥。浏览器直接访问外部服务，因此需要联网。隐藏状态、日期、天数、自定义地点和天气缓存只保存在当前浏览器及当前网站源中，不跨设备同步；清除网站数据会删除这些设置。切换域名或本地端口也不会自动迁移。

## 部署

将 `dist/` 作为网站根目录部署到任意静态托管服务即可。不依赖原开发环境或专用站点账户；启用高德前需完成上述接入配置。此仓库没有启用 GitHub Pages，也不包含私人部署配置。

搜索服务地址可在 `dist/search-config.json` 中配置。默认搜索使用显式提交、不做输入联想，单浏览器请求至少间隔 1.1 秒并缓存结果。大规模部署需根据服务使用政策配置合适的供应商；单浏览器限速不等于全站限速。

## 验证

需要 Node.js，无第三方测试依赖：

```sh
node tests/trip-dates.cjs
node --check dist/app.js
node --check dist/search.js
node --check dist/trip.js
```

日期测试覆盖日期边界、跨年、闰日和预报窗口。

## 数据来源与许可

- 本项目原创代码采用 MIT 许可，见 [LICENSE](LICENSE)。第三方库与数据不因该许可而改变原有许可。
- Leaflet：BSD-2-Clause，见 [dist/vendor/LICENSE](dist/vendor/LICENSE)。
- 地图数据：© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)，遵守 [瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)。
- 地点搜索：遵守 [Nominatim 使用政策](https://operations.osmfoundation.org/policies/nominatim/)。
- 天气与海拔：[Open-Meteo](https://open-meteo.com/)，遵守其 [使用条款](https://open-meteo.com/en/terms) 和数据署名要求。
- 示例地点的来源链接保存在各记录中。标记可能是观景点或湖区，不一定是停车入口；到达方式以详情和当地最新信息为准。
