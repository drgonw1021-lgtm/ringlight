# 补光照相机 (Ring Light Camera)

专业自拍补光灯 PWA 应用 — 化妆镜边框灯管 + 色环选色 + 美颜滤镜 + 一键拍照。

## 在线体验

🌐 **https://drgonw1021-lgtm.github.io/ringlight/**

用手机浏览器打开 → 允许摄像头权限 → 即可使用。可安装到手机主屏幕（像原生 App 一样）。

## 下载

📦 **GitHub Release**: https://github.com/drgonw1021-lgtm/ringlight/releases/tag/v1.0.0

## 功能

- 🔦 **化妆镜边框灯管** — 屏幕四周边框即环形补光，暖光/冷光/任意色温
- 🎨 **色环选色** — 手指在灯光按钮上转圈滑动，像调色盘一样选颜色
- 🌡️ **亮度/色温调节** — 屏幕上下滑动调亮度，左右滑动调色温
- ✨ **智能美颜** — 磨皮/美白/瘦脸/大眼，实时作用于摄像头画面
- 📸 **一键拍照** — 自动合成补光效果，照片自带柔光滤镜感
- 🔆 **屏幕常亮** — Wake Lock API 保持屏幕不灭
- 📱 **PWA 安装** — 可添加到手机主屏幕，全屏运行，离线可用

## 技术栈

纯前端 PWA：HTML + CSS + JavaScript，无需后端。getUserMedia 接入摄像头，CSS Filter 实现美颜。

## 文件说明

```
├── index.html              # 主应用
├── manifest.json           # PWA 清单
├── sw.js                   # Service Worker（离线缓存）
├── icon.svg                # SVG 图标源文件
├── icon-512.png            # App 图标 512px
├── icon-192.png            # App 图标 192px
├── icon-maskable-512.png   # 自适应图标 512px
├── icon-maskable-192.png   # 自适应图标 192px
├── apple-touch-icon.png    # iOS 主屏图标
├── feature-graphic.png     # Google Play 横幅图 (1024x500)
├── privacy-policy.html     # 隐私政策页
├── publish-guide.html      # 上架 & 变现完整指南（可视化页面）
├── STORE-LISTING.md        # Google Play 商店素材（描述、关键词等）
├── FREE-PUBLISH-GUIDE.md   # 免费上架完整指南
├── twa-config.json         # Bubblewrap CLI TWA 打包配置
└── gen-icons.js            # 图标生成脚本
```

## 上架

详细的上架步骤和免费渠道请查看 [FREE-PUBLISH-GUIDE.md](./FREE-PUBLISH-GUIDE.md)，
或打开可视化指南 [publish-guide.html](./publish-guide.html)。

快速打包：
1. 打开 https://www.pwabuilder.com
2. 输入 `https://drgonw1021-lgtm.github.io/ringlight/`
3. 选 Android → 生成 AAB/APK

## License

MIT
