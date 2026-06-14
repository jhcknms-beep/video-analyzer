# 短视频批量分析工具

基于 **Qwen3-VL-8B** 视觉大模型的 AI 短视频内容分析平台，支持批量上传、7 维度深度分析、实时进度追踪。

## 系统要求

| 组件 | 要求 |
|------|------|
| 操作系统 | Windows 11 / macOS / Linux |
| GPU | NVIDIA GPU 建议 8GB+ 显存 (RTX 3070+) |
| Python | 3.11+ |
| Node.js | 22+ |
| Ollama | ≥ 0.12.7 |
| ffmpeg | 已安装并在 PATH 中 |

## 快速开始

### 1. 安装模型

```bash
ollama pull qwen3-vl:8b
```

### 2. 安装依赖

```bash
# 后端
cd backend
pip install -r requirements.txt

# 前端
cd ../frontend
npm install
```

### 3. 启动服务

**一键启动：**
```powershell
powershell -File scripts/start_all.ps1
```

**分别启动：**
```bash
# 终端 1: 后端
cd backend && uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# 终端 2: 前端
cd frontend && npm run dev
```

### 4. 打开浏览器访问 **http://localhost:3000**

## 项目结构

```
video-analyzer/
├── backend/               # FastAPI 后端
│   ├── main.py            # 应用入口
│   ├── config.py          # 配置管理
│   ├── models/            # Pydantic 数据模型
│   ├── services/          # 核心服务 (LLM客户端, Prompt, 视频处理, 解析)
│   ├── workers/           # 异步任务消费者
│   ├── api/               # REST + WebSocket 路由
│   └── storage/           # 文件系统存储
├── frontend/              # Next.js 前端
│   ├── app/               # 页面 (主页 + 结果详情)
│   ├── components/        # UI 组件 (上传, 表格, 结果)
│   └── hooks/             # React Hooks
├── data/                  # 运行时数据 (gitignore)
└── scripts/               # 启动脚本
```

## 分析维度 (7 维度)

| 维度 | 说明 |
|------|------|
| 📝 内容描述与标签 | 视频内容概述 + 自动标签生成 |
| 📢 营销文案分析 | 画面文字提取、卖点话术、说服力评分 |
| 🏗️ 内容结构分析 | 开头钩子、主体叙事、结尾转化三段拆解 |
| 👥 目标用户画像 | 用户画像、年龄段、兴趣、痛点 |
| 🎯 用户需求洞察 | 显性/隐性需求、需求层次、紧迫度 |
| 💎 价值塑造分析 | 价值主张、独特卖点、需求-方案映射 |
| 🚀 转化引导分析 | CTA 策略、紧迫感触发器、改进建议 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/videos/upload` | 批量上传视频 |
| GET | `/api/videos/status` | 查询任务状态 |
| GET | `/api/videos/{id}/results` | 获取分析结果 |
| GET | `/api/videos/{id}/export?format=json\|csv` | 导出结果 |
| DELETE | `/api/videos/{id}` | 删除任务 |
| WS | `/ws/progress` | 实时进度推送 |

## 配置

通过环境变量或 `backend/.env` 文件配置（前缀 `VA_`）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VA_LLM_BASE_URL` | `http://localhost:11434/v1` | Ollama API 地址 |
| `VA_LLM_MODEL_NAME` | `qwen3-vl:8b` | 模型名称 |
| `VA_PORT` | `8001` | 后端端口 |
| `VA_MAX_FRAMES_PER_VIDEO` | `16` | 每视频提取帧数 |

## 常见问题

**Q: 上传后一直"排队中"？**
A: 确认 Ollama 已启动且模型已安装：`ollama list | grep qwen3-vl`

**Q: 分析报错 "No JSON object found"？**
A: 模型返回格式异常，系统自动重试 3 次。如持续失败请重启 Ollama
