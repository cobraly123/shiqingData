import express from 'express';
import { route } from '../utils/express.js';
import * as DecodeController from '../controllers/DecodeController.js';
import * as QueryController from '../controllers/QueryController.js';
import * as ReportController from '../controllers/ReportController.js';
import * as ContentController from '../controllers/ContentController.js';
import * as SystemController from '../controllers/SystemController.js';
import AuthController from '../controllers/AuthController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// 认证相关接口 (Auth)
// 注册与登录 (公开接口)
router.post('/auth/register', route((req, res) => AuthController.register(req, res)));
router.post('/auth/login', route((req, res) => AuthController.login(req, res)));

// 应用认证中间件 - 以下所有路由都需要登录
// 注意：如果需要某些接口公开，请将其移到此行之前
router.use(authMiddleware);

// 获取当前用户信息
router.get('/auth/me', route((req, res) => AuthController.getMe(req, res)));

// 解码相关接口 (Decode)
// 处理品牌/产品解码，确定分类、画像和维度
router.post('/decode', route(DecodeController.decode));

// 查询词挖掘与策略接口 (Query Mining & Strategy)
// 挖掘查询词
router.post('/mine-queries', route(QueryController.mineQueries));
// 测试策略生成
router.get('/test-strategy', route(QueryController.testStrategy));
// 扩展矩阵（预留）
router.post('/expand-matrix', route(QueryController.expandMatrix));
// 生成图谱数据
router.post('/graph', route(QueryController.graph));
// 查询词评分
router.post('/score-queries', route(QueryController.scoreQueries));
// 测试分类查询词生成
router.get('/test-generate-category-queries', route(QueryController.testGenerateCategoryQueries));

// 报告与分析接口 (Report & Analysis)
// 评估查询词
router.post('/eval-queries', route(ReportController.evalQueries));
// 创建新报告
router.post('/report/create', route(ReportController.createReport));
// 获取报告状态
router.get('/report/status', route(ReportController.getReportStatus));
// 查看报告详情
router.get('/report/view', route(ReportController.viewReport));
// 分析来源域名
router.post('/analyze-sources', route(ReportController.analyzeSources));

// 内容生成接口 (Content Generation)
// 生成多渠道内容
router.post('/generate-content', route(ContentController.generateContent));

// 系统与监控接口 (System & Monitor)
// 获取可用模型列表
router.get('/models', route(SystemController.getModels));
// 获取监控日志
router.get('/monitor/logs', route(SystemController.getMonitorLogs));
// 清除监控日志
router.delete('/monitor/logs', route(SystemController.clearMonitorLogs));

export default router;
