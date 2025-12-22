import { z } from 'zod';

/**
 * 输入验证模式
 * 用于解码接口
 */
export const InputSchema = z.object({
  product: z.string().min(1),
  brand: z.string().optional(),
  seedKeyword: z.string().min(1),
  usp: z.string().optional(),
  sellingPoints: z.string().optional(),
  userQuery: z.string().optional(),
});

/**
 * 竞品分析验证模式
 */
export const AnalyzeCompetitorsSchema = z.object({
  text: z.string().min(1),
});

/**
 * 评估查询词验证模式
 * 用于评估查询词接口
 */
export const EvalQueriesSchema = z.object({
  queries: z.array(z.object({ query: z.string().min(1), angle: z.string().optional() })).min(1),
  providers: z.array(z.string().min(1)).min(1),
});

/**
 * 分析来源验证模式
 * 用于分析来源接口
 */
export const AnalyzeSourcesSchema = z.object({
  queries: z.array(z.object({ query: z.string().min(1) })).min(1),
  providers: z.array(z.string().min(1)).min(1),
});

/**
 * 内容生成验证模式
 * 用于内容生成接口
 */
export const GenerateContentSchema = z.object({
  prompt: z.string().min(1),
  template: z.string().optional(),
  channel: z.enum(['blog','twitter','reddit','linkedin','press','faq']).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
});

/**
 * 查询词评分验证模式
 * 用于查询词评分接口
 */
export const ScoreQueriesSchema = z.object({
  items: z.array(z.object({
    query: z.string().min(1),
    angle: z.string().optional(),
    dimension: z.string().optional(),
    dimensionKey: z.string().optional(),
  })).min(1),
});

/**
 * 挖掘查询词验证模式
 * 用于挖掘查询词接口
 */
export const MineQueriesSchema = z.object({
  product: z.string().optional(),
  brand: z.string().optional(),
  seedKeyword: z.string().optional(),
  channel: z.string().optional(),
  signals: z.any().optional(),
  direct: z.boolean().optional(),
}).refine(data => data.brand || data.product, { message: "Either brand or product is required" });

/**
 * GEO问题生成验证模式
 * 用于GEO问题生成器接口
 */
export const GenerateGeoQuestionsSchema = z.object({
  brand: z.string().min(1),
  keyword: z.string().min(1),
  industry: z.string().optional(),
  competitor: z.string().optional(),
  scenario: z.string().optional(),
});

/**
 * 扩展矩阵验证模式
 * 用于扩展矩阵接口
 */
export const ExpandMatrixSchema = z.object({
  items: z.array(z.any()).min(1),
  dimensionStrategy: z.string().optional(),
  evidence: z.string().optional(),
  tone: z.string().optional(),
});

/**
 * 图谱数据验证模式
 * 用于图谱接口
 */
export const GraphSchema = z.object({
  product: z.string().min(1),
  brand: z.string().optional(),
  usp: z.string().optional(),
  seedKeyword: z.string().optional(),
  mined: z.array(z.any()).optional(),
});

/**
 * 创建报告验证模式
 * 用于创建报告接口
 */
export const ReportCreateSchema = z.object({
  queries: z.array(z.object({ 
    query: z.string().min(1),
    angle: z.string().optional(),
    dimension: z.string().optional(),
    type: z.string().optional(),
    tag: z.string().optional()
  })).min(1),
  providers: z.array(z.string().min(1)).min(1),
  product: z.string().optional(),
  brand: z.string().optional(),
  seedKeyword: z.string().optional(),
  sellingPoints: z.string().optional(),
  mode: z.string().optional(),
});
