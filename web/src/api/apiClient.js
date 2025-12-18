
// 存储 Auth Token
let authToken = null;

/**
 * 设置认证 Token
 * @param {string} token 
 */
export const setAuthToken = (token) => {
  authToken = token;
};

/**
 * 获取认证 Token
 */
export const getAuthToken = () => authToken;

/**
 * 通用 API 请求函数
 * 封装了 fetch API，支持自动处理 JSON 响应和错误
 * 包含后端端口回退机制（3011 -> 3001）
 *
 * @param {string} url - 请求的 URL 路径
 * @param {Object} options - fetch 选项 (method, headers, body 等)
 * @returns {Promise<any>} - 解析后的 JSON 响应数据
 * @throws {Error} - 当请求失败或后端不可达时抛出错误
 */
async function apiFetch(url, options = {}) {
  // 注入 Authorization 头
  if (authToken) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`
    };
  }

  // 判断是否为 API 请求
  const isApi = url.startsWith('/api/')
  
  // 获取当前主机名，如果在浏览器环境则使用 window.location.hostname，否则默认为 localhost
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

  // 如果不是 API 请求，直接使用原生 fetch
  if (!isApi) {
    const r = await fetch(url, options)
    if (!r.ok) {
      throw new Error(await r.text())
    }
    // 尝试解析 JSON，如果失败则返回 null
    try {
      return await r.json()
    } catch {
      return null
    }
  }

  // 生产环境直接使用相对路径（由 Nginx 转发）
  if (import.meta.env?.PROD) {
    const r = await fetch(url, options)
    if (r.ok) {
      try {
        return await r.json()
      } catch {
        return null
      }
    }
    throw new Error(await r.text())
  }

  // API 请求的端口列表，优先尝试 3011，如果失败则尝试 3001
  const ports = [3011, 3001]
  
  // 遍历端口尝试连接
  for (const p of ports) {
    try {
      // 构建完整的请求 URL
      const fullUrl = `${window.location.protocol}//${host}:${p}${url}`
      const r = await fetch(fullUrl, options)
      
      // 如果请求成功，解析并返回 JSON
      if (r.ok) {
        try {
          return await r.json()
        } catch {
          return null
        }
      }
      // 如果响应状态码不是 2xx，抛出错误
      throw new Error(await r.text())
    } catch (e) {
      // 如果是最后一个端口且尝试失败，则抛出错误
      // 否则忽略错误，继续尝试下一个端口
      if (p === ports[ports.length - 1]) {
        console.error(`Failed to connect to backend on ports ${ports.join(', ')}`, e)
      }
    }
  }
  
  // 所有端口都尝试失败
  throw new Error('后端不可达或接口异常')
}

/**
 * 发送 POST 请求
 * @param {string} url - 请求路径
 * @param {Object} data - 请求体数据
 * @returns {Promise<any>}
 */
export const post = (url, data) => apiFetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})

/**
 * 发送 GET 请求
 * @param {string} url - 请求路径
 * @returns {Promise<any>}
 */
export const get = (url) => apiFetch(url)

/**
 * 发送 DELETE 请求
 * @param {string} url - 请求路径
 * @returns {Promise<any>}
 */
export const del = (url) => apiFetch(url, { method: 'DELETE' })
