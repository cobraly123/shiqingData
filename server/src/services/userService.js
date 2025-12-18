import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure users file exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

/**
 * 读取所有用户
 * @returns {Array} 用户列表
 */
const getUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

/**
 * 保存用户列表
 * @param {Array} users 用户列表
 */
const saveUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users file:', error);
  }
};

/**
 * 根据用户名或邮箱查找用户
 * @param {string} identifier 用户名或邮箱
 * @returns {Object|null} 用户对象
 */
export const findUser = (identifier) => {
  const users = getUsers();
  return users.find(u => u.username === identifier || u.email === identifier) || null;
};

/**
 * 根据ID查找用户
 * @param {string} id 用户ID
 * @returns {Object|null} 用户对象
 */
export const findUserById = (id) => {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
};

/**
 * 创建新用户
 * @param {Object} userData 用户数据
 * @returns {Object} 创建的用户
 */
export const createUser = async (userData) => {
  const users = getUsers();
  
  // 检查用户是否存在
  if (users.find(u => u.username === userData.username)) {
    throw new Error('Username already exists');
  }
  if (users.find(u => u.email === userData.email)) {
    throw new Error('Email already exists');
  }

  // 加密密码
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  const newUser = {
    id: Date.now().toString(),
    username: userData.username,
    email: userData.email,
    password: hashedPassword,
    role: userData.role || 'user', // 默认角色为 user，但允许传入 admin
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

/**
 * 验证密码
 * @param {string} inputPassword 输入的密码
 * @param {string} storedPassword 存储的哈希密码
 * @returns {boolean} 是否匹配
 */
export const validatePassword = async (inputPassword, storedPassword) => {
  return await bcrypt.compare(inputPassword, storedPassword);
};
