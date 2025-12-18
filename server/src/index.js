import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();
const localEnvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvPath)) dotenv.config({ path: localEnvPath });

import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';

// 初始化后台任务
// 导入即可，模块内部会启动定时任务等
import './services/reportService.js';

const app = express();

// 配置中间件
app.use(cors()); // 允许跨域
app.use(express.json({ limit: '2mb' })); // 解析JSON请求体

// 挂载API路由
app.use('/api', apiRouter);

// 启动后端服务器
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`GEO backend listening on http://localhost:${port}`);
});

// 静态文件服务器配置 (用于表单页和报告页)
const staticRoot = path.resolve(process.cwd(), '..', 'web');
const formPort = Number.parseInt(String(process.env.FORM_PORT || '8081'), 10) || 8081;
const reportPort = Number.parseInt(String(process.env.REPORT_PORT || '8082'), 10) || 8082;

// 表单页服务
const appForm = express();
appForm.use(express.static(staticRoot));
appForm.listen(formPort, () => {
  console.log(`GEO form page on http://localhost:${formPort}`);
});

// 报告页服务
const appReport = express();
appReport.use(express.static(staticRoot));
appReport.listen(reportPort, () => {
  console.log(`GEO report page on http://localhost:${reportPort}`);
});
