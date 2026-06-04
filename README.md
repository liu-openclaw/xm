# 闲趣二手 - 移动端二手交易平台

Vue3 + Node.js 全栈项目，涵盖双 Token 认证、单点登录、虚拟列表、WebSocket 实时聊天、支付宝沙箱支付、移动端适配。

## 技术栈

### 前端
- Vue 3 (Composition API) + TypeScript
- Vite 5 + Vant 4
- Pinia + pinia-plugin-persistedstate
- Vue Router 4
- Socket.io-client
- Axios（双 Token 无感刷新）
- postcss-px-to-viewport（移动端 vw 适配）

### 后端
- Node.js + Express
- MongoDB + Mongoose
- JWT 双 Token（Access 15min / Refresh 7天）
- Socket.io（WebSocket 实时通信）
- alipay-sdk（支付宝沙箱）
- bcryptjs（密码加密）

## 功能模块

| 模块 | 功能 | 技术亮点 |
|------|------|----------|
| 登录/注册 | 账号密码登录 + 注册 | 双 Token 无感刷新、单点登录互踢、并发请求队列 |
| 商品列表 | 首页商品浏览 + 搜索 + 分类筛选 | 虚拟列表（只渲染可视区域）、图片懒加载 |
| 商品详情 | 图片轮播、卖家信息 | 骨架屏加载 |
| 发布商品 | 图片上传、表单校验 | Uploader 组件 |
| 实时聊天 | 买卖双方即时通讯 | WebSocket + Socket.io、心跳保活、断线重连 |
| 订单管理 | 下单、订单列表 | 支付宝沙箱支付（alipay-sdk） |
| 移动端适配 | vw 视口适配 | postcss-px-to-viewport、安全区域适配 |

## 快速启动

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 2. 配置环境变量

编辑 `backend/.env`，填入实际参数：

```
MONGODB_URI=mongodb://localhost:27017/second_hand_trade
JWT_ACCESS_SECRET=自定义密钥
JWT_REFRESH_SECRET=自定义密钥
ALIPAY_APP_ID=你的支付宝沙箱APPID
ALIPAY_PRIVATE_KEY=你的应用私钥
ALIPAY_PUBLIC_KEY=支付宝公钥
```

### 3. 启动服务

```bash
# 启动 MongoDB
mongod

# 启动后端（端口 3000）
cd backend
npm run dev

# 启动前端（端口 5173）
cd frontend
npm run dev
```

访问 http://localhost:5173

## 项目结构

```
second-hand-trade/
├── backend/
│   ├── config/          # 配置（数据库、JWT、支付宝）
│   ├── controllers/     # 控制器
│   ├── middlewares/     # 中间件（JWT 认证）
│   ├── models/          # 数据模型（User、Goods、Order、Message）
│   ├── routes/          # 路由
│   ├── services/        # 业务逻辑层
│   ├── socket/          # WebSocket 服务
│   ├── utils/           # 工具（JWT 签发/校验）
│   ├── .env             # 环境变量
│   ├── app.js           # 入口
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/         # 接口封装（auth、goods、order、chat）
    │   ├── components/  # 公共组件（TabBar）
    │   ├── composables/ # 组合式函数（虚拟列表、WebSocket）
    │   ├── router/      # 路由配置
    │   ├── stores/      # Pinia 状态管理
    │   ├── styles/      # 全局样式
    │   ├── types/       # TypeScript 类型定义
    │   ├── utils/       # 工具（Token 管理、请求拦截器）
    │   └── views/       # 页面
    ├── index.html
    ├── vite.config.ts
    └── package.json
```

## 双 Token 认证流程

1. 登录成功 → 返回 accessToken（15min）+ refreshToken（7天）
2. 每次请求携带 accessToken
3. accessToken 过期 → 拦截器自动用 refreshToken 换取新双 Token
4. 并发请求时只发起一次刷新，其余请求排队等待
5. 刷新失败 → 跳转登录页
6. 单点登录：新设备登录时更新 refreshToken，旧设备刷新时校验失败 → 强制下线

## 待配置项

- [ ] MongoDB 数据库连接
- [ ] 支付宝沙箱 APPID 和密钥
- [ ] JWT Secret 密钥
- [ ] 图片上传服务（当前使用 base64 占位）