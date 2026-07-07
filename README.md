# GeoToolKit

一款基于 Vue 3 + Capacitor 的跨端户外工具箱 App，面向地质、测绘、户外探险等场景，集中展示位置、运动、信号与传感器实时数据。

> 仓库名称可自定义，应用 ID：`com.geotoolkit.app`，应用名称：`GeoToolKit`。

## 功能模块

| 模块 | 说明 |
|------|------|
| **位置信息** | GPS 实时定位，支持 DD、DMS、UTM、MGRS 多种坐标格式，显示海拔、精度、速度、航向 |
| **运动信息** | 速度、航向、加速度、垂直速度，配合罗盘指针展示运动方向 |
| **信号信息** | Wi-Fi、蜂窝网络、设备网络状态与信号强度展示 |
| **传感器** | 加速度计、陀螺仪、磁力计、数字罗盘，带罗盘指针与方向文字 |
| **设置** | 模块开关、主题（浅色/深色/跟随系统）、单位偏好 |

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite 8
- **跨端容器**：Capacitor 8（目前集成 Android）
- **状态管理**：Pinia 3
- **路由**：Vue Router 5
- **图表**：ECharts
- **坐标转换**：utm-latlng、mgrs

## 目录结构

```text
.
├── android/                  # Capacitor Android 原生工程
├── public/                   # 静态资源
├── src/
│   ├── composables/          # 可复用逻辑（位置、运动、传感器、信号、权限）
│   ├── router/               # 路由配置
│   ├── stores/               # Pinia 状态（设置、模块生命周期）
│   ├── types/                # TypeScript 类型
│   ├── utils/                # 工具函数（坐标、方向解析）
│   ├── views/                # 页面视图
│   ├── App.vue               # 主应用
│   └── main.ts               # 入口
├── capacitor.config.ts       # Capacitor 配置
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 前置条件

- Node.js 18+
- npm 9+
- Android Studio（用于构建 Android APK）
- JDK 17
- Android SDK（API 34 推荐）

## 安装依赖

```bash
npm install
```

## 开发调试

```bash
# 启动 Vite 开发服务器
npm run dev
```

开发服务器默认在浏览器中运行，部分 Capacitor 原生能力（如传感器、GPS）需要在真机或模拟器中测试。

## 构建 Web 资源

```bash
npm run build
```

构建产物输出到 `dist/` 目录，Capacitor 会从中读取 Web 资源。

## 构建并运行 Android

```bash
# 1. 构建 Web 资源
npm run build

# 2. 将 Web 资源同步到 Android 工程
npx cap sync android

# 3. 用 Android Studio 打开工程并运行
npx cap open android
```

也可在 Android Studio 中直接点击 **Run** 按钮部署到真机或模拟器。

## 所需权限

| 权限 | 用途 |
|------|------|
| `ACCESS_FINE_LOCATION` | 高精度 GPS 定位 |
| `ACCESS_COARSE_LOCATION` | 粗略定位 |
| `ACCESS_BACKGROUND_LOCATION` | 后台持续定位（如开启） |
| `INTERNET` | 网络状态与 Wi-Fi 信息 |
| Motion & Orientation（iOS） | 加速度计、陀螺仪、罗盘 |

Android 权限已在 `android/app/src/main/AndroidManifest.xml` 中声明，运行时部分权限需动态申请。

## 坐标与方向说明

- 罗盘航向采用顺时针 0°~360°，正北为 0°。
- 传感器方向解析遵循 W3C Device Orientation 规范：`alpha` 以正北为 0° 逆时针递增，因此转换为顺时针航向的公式为 `heading = (360 - alpha) % 360`。
- iOS 优先使用 `webkitCompassHeading`；Android 优先使用 `deviceorientationabsolute` 事件获取绝对方向。

详见 [`src/utils/orientation.ts`](src/utils/orientation.ts)。

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.0.0 | 2026-07 | 初始版本，包含位置、运动、信号、传感器与设置模块 |

## 许可证

MIT（建议仓库创建后在根目录补充 `LICENSE` 文件）

## 致谢

- [Capacitor](https://capacitorjs.com/)
- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
