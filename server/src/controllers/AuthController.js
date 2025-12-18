import jwt from 'jsonwebtoken';
import { findUser, createUser, validatePassword } from '../services/userService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it-in-production';
const JWT_EXPIRES_IN = '24h';

class AuthController {
  /**
   * 用户注册
   */
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const user = await createUser({ username, email, password });
      
      // 生成 Token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * 用户登录
   */
  async login(req, res) {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ message: 'Username/Email and password are required' });
      }

      // 查找用户
      const user = findUser(identifier);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // 验证密码
      // 这里需要从数据库中重新获取带密码的用户对象，因为 findUser 返回的是完整对象
      // userService.js 中的 findUser 实现目前是返回完整对象的，所以直接用
      const isValid = await validatePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // 生成 Token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

      // 返回不带密码的用户信息
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * 获取当前用户信息
   */
  async getMe(req, res) {
    try {
      // req.user 由 authMiddleware 设置
      res.json({ user: req.user });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new AuthController();
