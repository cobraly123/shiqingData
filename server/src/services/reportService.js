/**
 * 报告任务存储
 * 内存中存储正在进行或已完成的报告任务
 */
export const REPORT_TASKS = new Map();

// 报告任务的生存时间 (默认12小时)
const REPORT_TTL_MS = Number.parseInt(String(process.env.REPORT_TTL_MS || 12 * 60 * 60 * 1000), 10) || 12 * 60 * 60 * 1000;

// 定期清理过期的报告任务
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of REPORT_TASKS.entries()) {
    const created = new Date(s.createdAt || Date.now()).getTime();
    const age = now - created;
    if (age > REPORT_TTL_MS) {
      REPORT_TASKS.delete(id);
    }
  }
}, 10 * 60 * 1000);

/**
 * 获取报告任务
 * @param {string} id - 任务ID
 * @returns {Object|undefined} - 任务状态对象
 */
export function getTask(id) {
  return REPORT_TASKS.get(id);
}

/**
 * 设置报告任务
 * @param {string} id - 任务ID
 * @param {Object} state - 任务状态对象
 */
export function setTask(id, state) {
  REPORT_TASKS.set(id, state);
}
