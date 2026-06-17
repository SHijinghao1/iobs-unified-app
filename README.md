# IOBS Unified App — 手术室机电一体化智能管控平台

> 面向数字化手术室的 Web 3D 可视化控制与管理平台，Monorepo 架构，含桌面端 3D 控制中心、日志管理后台与平板触控终端。

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 7 |
| 3D 渲染 | Three.js + React Three Fiber + Drei + URDF Loader |
| 状态管理 | Zustand 5 |
| UI | Tailwind CSS 4 + Framer Motion + shadcn |
| 图表 | Recharts 3 |
| 实时通信 | WebSocket |
| 测试 | Vitest |

## 项目结构

```
src/apps/
├── new space/     # 桌面端 3D 控制中心（手术室场景 + 设备操控 + 姿态预设）
├── logs/          # 日志管理后台（实时监控 + 图表分析 + 告警阈值）
└── pad/           # 平板触控终端（3D 数字孪生 + 设备控制 + 生命体征）
```

## 核心功能

### 桌面端 3D 控制中心（New Space）
- URDF 机器人模型加载与渲染（手术床 20+ 关节、C 臂 6 连杆）
- 实时设备控制（升降/平移/倾斜/折叠）+ 速度调节
- 后端双向状态同步（三态机模型：交互中 → 等待回传 → 空闲）
- 熔断器轮询系统（100ms 间隔，连续失败自动冷却恢复）
- 姿态预设库（标准体位一键应用 + 自定义保存）
- 标注工具 & 两点测距
- C 臂模式切换（同步/镜像/脱离）

### 日志管理系统
- 多设备实时日志流（WebSocket）+ 历史数据回溯
- LTTB 时序降采样（压缩至 500 点/序列）
- 多候选地址回退 + 离线检测冷却
- 用户/设备/流程/病历管理 + 告警阈值配置

### 平板触控终端（Pad）
- 按需渲染（frameloop="demand"）、DPR 自适应优化
- 六标签页设备控制面板
- 生命体征监护（HR/NIBP/SpO₂）
- 模型预加载 + 紧急停止

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build

# 测试
npm test
```

