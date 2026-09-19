# 高德接入

本分支使用高德官方 JS API 2.0，不使用未经授权的瓦片地址。

## 当前状态

接入代码已准备，但未配置实际开发者账号，**尚未完成高德底图、搜索权限及线上端到端验收**。`map-config.json` 默认请求高德；缺少配置或脚本加载失败时明确提示并继续使用 OpenStreetMap。现有线上站点和 v0.1.0 不因本分支改变。

## 开通

1. 在 https://console.amap.com/ 注册并完成适用的开发者认证。
2. 在应用管理中创建应用，添加 **Web端（JS API）** 类型的 Key。
3. 按高德控制台要求配置网站域名限制，并确认地图与地点搜索的权限、额度和有效期。
4. 按[官方安全密钥文档](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode)部署安全代理，在服务器配置 securityJsCode。安全密钥不得写入网页、公开仓库或浏览器 localStorage。
5. 在部署用的 `dist/map-config.json` 配置 JS API Key 和安全代理地址：

```json
{
  "provider": "amap",
  "key": "YOUR_JS_API_KEY",
  "serviceHost": "https://YOUR_PROXY_HOST/_AMapService"
}
```

JS API Key 会由浏览器发送给高德，是前端标识；securityJsCode 由代理保管。此仓库不包含运行中的安全代理，静态托管本身不能保管服务端密钥。部署者需要单独部署代理，或为站点增加服务器端代理路由。不要把 Web服务 Key 当成 JS API Key。

恢复原底图可将 `provider` 设置为 `osm`。调整配置后刷新页面。

## 数据兼容

- 原地点经纬度仍为 WGS84，不修改 ID、坐标或 localStorage key，保留行程数字及隐藏状态。
- 高德地图显示时将 WGS84 近似转换为 GCJ-02；保存视角时转回 WGS84。
- 高德搜索结果保留 POI ID 和 GCJ-02 原始位置；另存近似 WGS84 坐标供天气、海拔和原底图使用。
- 高德搜索结果按服务来源区分缓存，并通过 POI ID 与同名近邻位置去重。
- 坐标变换不是测绘级精度，边界和特殊地区需实际验收。

坐标变换库：[wandergis/coordtransform](https://github.com/wandergis/coordtransform)，固定提交 `606c6f3b57b6f1d60458793fea39928d2b11b637`，MIT 许可保留在 `dist/vendor/coordtransform.LICENSE`。

## 验证边界

已测试：缺少配置与脚本加载失败回退；模拟高德 SDK 的交互契约；地图数字和日期联动、隐藏/显示、刷新保留、搜索加入、自定义地点坐标保存和手机宽度。模拟 SDK 不证明真实高德服务已经可用。

开通后的必要验收：真实 SDK 加载和域名校验、真实地图点位及中文地名、真实搜索与加入地点、数字/天气联动、已有浏览器数据保留，以及安全代理不会将 securityJsCode 返回浏览器。
