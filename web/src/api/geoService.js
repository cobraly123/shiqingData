import { post, get, del } from './apiClient'

/**
 * 地理信息服务对象
 * 封装了所有与后端交互的业务 API 接口
 * 对应 server/src/routes/index.js 中的路由定义
 */
export const geoService = {
  /**
   * 解码品牌和分类信息
   * @param {Object} data - 请求数据，包含需要解码的内容
   * @returns {Promise<any>}
   */
  decode: (data) => post('/api/decode', data),

  /**
   * 挖掘相关查询词
   * @param {Object} data - 请求数据，包含关键词等
   * @returns {Promise<any>}
   */
  mineQueries: (data) => post('/api/mine-queries', data),

  /**
   * 生成GEO问题
   * @param {Object} data - 请求数据
   * @returns {Promise<any>}
   */
  generateGeoQuestions: (data) => post('/api/generate-geo-questions', data),

  /**
   * 扩展矩阵（预留）
   * @param {Object} data - 请求数据
   * @returns {Promise<any>}
   */
  expandMatrix: (data) => post('/api/expand-matrix', data),

  /**
   * 生成图谱数据
   * @param {Object} data - 请求数据
   * @returns {Promise<any>}
   */
  graph: (data) => post('/api/graph', data),

  /**
   * 创建新的报告任务
   * @param {Object} data - 报告配置数据
   * @returns {Promise<any>}
   */
  createReport: (data) => post('/api/report/create', data),

  /**
   * 获取报告状态
   * @param {string} id - 报告任务 ID
   * @returns {Promise<any>}
   */
  getReportStatus: (id) => get(`/api/report/status?id=${id}`),

  /**
   * 查看报告详情
   * @param {string} id - 报告任务 ID
   * @returns {Promise<any>}
   */
  getReportView: (id) => get(`/api/report/view?id=${id}`),

  /**
   * 获取报告详情 (Alias for getReportView)
   * @param {string} id 
   * @returns {Promise<any>}
   */
  getReport: (id) => get(`/api/report/view?id=${id}`),

  /**
   * 获取监控日志
   * @param {number} limit - 日志条数限制
   * @returns {Promise<any>}
   */
  getLogs: (limit) => get(`/api/monitor/logs?limit=${limit}`),

  /**
   * 清除监控日志
   * @returns {Promise<any>}
   */
  clearLogs: () => del('/api/monitor/logs'),

  /**
   * 测试策略生成
   * @param {Object} params - 查询参数
   * @returns {Promise<any>}
   */
  testStrategy: (params) => {
    const query = new URLSearchParams(params).toString()
    return get(`/api/test-strategy?${query}`)
  },

  /**
   * 分析来源
   * @param {Object} data 
   * @returns {Promise<any>}
   */
  analyzeSources: (data) => post('/api/analyze-sources', data),

  /**
   * 分析竞品
   * @param {Object} data { text: string }
   * @returns {Promise<any>}
   */
  analyzeCompetitors: (data) => post('/api/analyze-competitors', data),

  /**
   * 生成内容
   * @param {Object} data - 内容生成配置
   * @returns {Promise<any>}
   */
  generateContent: (data) => post('/api/generate-content', data),

  /**
   * 查询词评分
   * @param {Object} data - 请求数据
   * @returns {Promise<any>}
   */
  scoreQueries: (data) => post('/api/score-queries', data),

  /**
   * 分析来源域名
   * @param {Object} data - 请求数据
   * @returns {Promise<any>}
   */
  analyzeSources: (data) => post('/api/analyze-sources', data),

  /**
   * 获取所有可用模型列表
   * @returns {Promise<any>}
   */
  getModels: () => get('/api/models'),
}
