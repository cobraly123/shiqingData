import jwt from 'jsonwebtoken';
import { findUserById } from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it-in-production';

/**
 * 身份验证中间件
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 * @param {Function} next 下一步函数
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // 获取 Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    // 验证 Token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 查找用户
    const user = findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};
