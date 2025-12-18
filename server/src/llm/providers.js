/**
 * 多平台 LLM 适配配置
 * 目标：以统一接口封装不同平台，便于后续扩展与切换。
 * 已实现：OpenAI 兼容平台（千问/Qwen、深度求索/DeepSeek、Kimi/Moonshot）
 * 待实现：百度文心、豆包（非OpenAI兼容，需独立SDK/HTTP实现）
 */

export const PROVIDERS = {
  qwen: {
    name: 'DashScope/Qwen',
    baseURL: () => process.env.QWEN_BASE_URL || process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: () => process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY,
    model: () => process.env.QWEN_MODEL || (process.env.QIANWEN_MODEL || 'qwen-turbo'),
    compatible: true,
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: () => process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    apiKey: () => process.env.DEEPSEEK_API_KEY,
    model: () => process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    compatible: true,
  },
  kimi: {
    name: 'Moonshot/Kimi',
    baseURL: () => process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
    apiKey: () => process.env.KIMI_API_KEY,
    model: () => process.env.KIMI_MODEL || 'moonshot-v1-32k',
    compatible: true,
  },
  wenxin: {
    name: 'Baidu Wenxin',
    baseURL: () => process.env.WENXIN_BASE_URL || 'https://qianfan.baidubce.com/v2/chat/completions',
    apiKey: () => process.env.WENXIN_API_KEY || process.env.wenxin_api_key || '',
    model: () => process.env.WENXIN_MODEL || 'ernie-4.5-turbo-128k',
    compatible: false,
  },
  doubao: {
    name: 'ByteDance Doubao',
    baseURL: () => process.env.DOUBAO_BASE_URL || '',
    apiKey: () => process.env.DOUBAO_API_KEY || '',
    model: () => process.env.DOUBAO_MODEL || (process.env.DOUBAO_ENDPOINT_ID || 'doubao-seed-1-6-251015'),
    compatible: false,
  },
};

export const MODEL_DEFAULTS = {
  gemini: 'gemini-2.5-flash',
  deepseek: 'deepseek-chat',
  wenxin: 'ernie-4.5-turbo-128k',
  doubao: process.env.DOUBAO_ENDPOINT_ID || 'doubao-seed-1-6-251015',
  qianwen: 'qwen-turbo',
  kimi: 'moonshot-v1-32k',
};
