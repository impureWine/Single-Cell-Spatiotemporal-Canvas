# CellFlow Canvas

面向单细胞发育轨迹探索的空间与 UMAP 双视口看板。启动时加载固定随机种子的 10,000 个模拟细胞。

## 架构

React 18、TypeScript、Vite 与 Tailwind 构建界面。Zustand 保存细胞、选区、着色、拟时序范围和流场参数。Deck.gl 正交相机渲染两个坐标空间，共享细胞 ID 完成双向套索联动。Canvas 2D 使用 65 × 65 网格平均速度绘制粒子尾迹，ECharts 展示 40 个拟时序分箱的平均基因表达。

- 空间与流形探针共享选区，微环境卡片展示构成及平均拟时序。
- 粒子层复用 Deck.gl 正交投影，移动相机时清理旧尾迹。
- 宽度 0.18 的时间窗口在约 10 秒内扫过轨迹，曲线阴影带同步更新。
- 分叉口、Beta 核心和全局书签以一次状态更新应用筛选与着色。
- CSV 导出选中细胞，未选中时导出全量。PNG 以两倍 CSS 分辨率合成工作区。
- JSON 导入逐项检查唯一 ID、六种亚群、有限数值、[0,1] 拟时序及非负基因表达，验证成功后整体替换数据并复位。

## 色彩规范

| 用途 | 色值 |
| --- | --- |
| 陶瓷冷灰画布 | #F8FAFC |
| 面板 | #FFFFFF |
| 边框 | #E2E8F0 |
| 微点阵 | #CBD5E1 |
| 主文字 | #222222 |
| 次文字 | #64748B |
| 柔蓝 | #95BCE5 |
| 紫灰 | #D4C5E2 |
| 浅粉 | #F39DA0 |

字体使用 Inter、Noto Sans CJK SC、Microsoft YaHei、sans-serif，数字使用 tabular-nums。

## 前端启动

需要 Node.js 22 或更新版本。

```powershell
npm ci
npm run dev
npm run build
npm run preview
```

顶栏“数据导出 / 导入”中选择 JSON 文件。文件顶层是 CellRecord 数组，字段见 src/types/cell.ts。导入保留原始坐标和速度，两个视口按数据边界适配相机。

书签分叉口采用 [0.42,0.65] 和 Neurog3，Beta 核心选中全部 Beta 并采用 Ins1。全局书签复位筛选、相机及流场参数。收起时序抽屉停止播放。

## scVelo 数据转换

建议在独立 Python 3.11 虚拟环境安装依赖。

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install scanpy scvelo numpy pandas scipy
python backend/export_scvelo_to_json.py --umap-as-spatial --output pancreas_cells.json
```

脚本加载 scv.datasets.pancreas()，保留前端支持的六个亚群，执行过滤、归一化、PCA、邻居矩、stochastic velocity、velocity graph、velocity pseudotime 与 UMAP 速度投影。核心基因采用全转录组库大小归一化后的 log1p 表达。其他终末亚群被排除，导出结果不包含它们。

经典 pancreas 数据没有组织空间坐标。--umap-as-spatial 显式复用 UMAP 作为左侧演示坐标。真实空间数据请提供按细胞 ID 对齐的 CSV。

```powershell
python backend/export_scvelo_to_json.py --spatial-csv tissue_coordinates.csv --output pancreas_cells.json
```

CSV 列为 id、spatialX、spatialY，必须覆盖导出细胞。所有值检查通过后原子写入 JSON。真实数据空间单位需自行校准，界面默认比例尺沿用每单位 50 μm 的模拟约定。

处理流程参考 [scVelo RNA Velocity Basics](https://scvelo.readthedocs.io/en/stable/VelocityBasics.html) 和 [velocity_embedding](https://scvelo.readthedocs.io/en/stable/scvelo.tl.velocity_embedding.html)。

## 验证范围

前端生产构建与浏览器交互可在本机验证。scVelo 脚本需要首次联网下载数据和科学计算依赖，其完整计算耗时由环境决定。PNG 是当前工作区的栅格快照，动态播放期间各层可能存在采样时间差。
