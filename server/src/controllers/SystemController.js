import { PROVIDERS } from '../llm/providers.js';
import { getLogs, clearLogs } from '../monitor.js';

/**
 * 获取模型列表
 * 返回所有可用LLM提供商及其配置信息
 */
export async function getModels(req, res) {
  const out = {};
  for (const key of Object.keys(PROVIDERS)) {
    const p = PROVIDERS[key];
    out[key] = {
      name: p.name,
      baseURL: p.baseURL(),
      model: p.model(),
      compatible: p.compatible,
    };
  }
  res.json({ providers: out });
}

/**
 * 获取监控日志
 * 返回最近的API调用日志，用于调试
 */
export async function getMonitorLogs(req, res) {
  const limit = Number.parseInt(String(req.query.limit || '100'), 10) || 100;
  res.json({ logs: getLogs(limit) });
}

/**
 * 清除监控日志
 * 清空内存中的日志记录
 */
export async function clearMonitorLogs(req, res) {
  clearLogs();
  res.json({ ok: true });
}
