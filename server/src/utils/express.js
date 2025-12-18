/**
 * Express路由包装器
 * 自动捕获异步处理函数中的错误并统一返回JSON错误响应
 * 
 * @param {Function} handler - 异步处理函数 (req, res, next)
 * @returns {Function} Express中间件
 */
export function route(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  };
}
