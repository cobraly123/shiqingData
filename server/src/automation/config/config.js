// Configuration for different AI models
export const config = {
  models: {
    wenxin: {
      name: 'Wenxin (Ernie)',
      url: 'https://yiyan.baidu.com/',
      auth: {
        cookies: process.env.WENXIN_COOKIES || ''
      },
      selectors: {
        input: 'textarea, #dialog-input, div[contenteditable="true"]', 
        submit: 'div[class*="send-btn"], span[class*="send-btn"], button[class*="submit"], div[class*="send"], span[class*="send"], button[class*="send"]',
        response: 'div[class*="answer"], .markdown-body, div[class*="response"]'
      },
      timeout: 30000
    },
    qwen: {
      name: 'Qwen (Tongyi Qianwen)',
      url: 'https://tongyi.aliyun.com/qianwen/',
      auth: {
        cookies: process.env.QWEN_COOKIES || ''
      },
      selectors: {
        // Login selectors
        loginButton: '.login-btn', 
        usernameInput: '#username',
        passwordInput: '#password',
        submitLogin: '#login-submit',
        
        // Chat selectors
        input: 'textarea, #chat-input',
        submit: 'div[class*="send-btn"]', 
        response: 'div[class*="answer-content"], div[class*="message-content"], div[class*="markdown"], .markdown-body',
        citation: 'div[class*="citation"]', 
        regenerate: 'div[class*="regenerate"]'
      },
      timeout: 60000
    },
    doubao: {
      name: 'Doubao',
      url: 'https://www.doubao.com/chat/',
      auth: {
        cookies: process.env.DOUBAO_COOKIES || ''
      },
      selectors: {
        input: 'textarea, div[contenteditable="true"]',
        submit: 'button[data-testid="chat_input_send_button"], button[class*="send"]',
        response: 'div[data-testid="message_text_content"], div[data-testid="receive_message"], div[data-testid="answer_content"], div[data-testid="message-content"], .markdown-body, div[class*="message-content"], div[class*="msg-content"], div[class*="answer_content"], div[class*="message-bubble"]'
      },
      timeout: 30000
    },
    kimi: {
      name: 'Kimi',
      url: 'https://www.kimi.com/',
      auth: {
        cookies: process.env.KIMI_COOKIES || '', // Added cookie support
        token: process.env.KIMI_COOKIES || '' // Fallback to cookies env if token not explicitly set, though logic handles it
      },
      selectors: {
        input: 'div[contenteditable="true"]',
        submit: 'div[class*="send-button"], button[class*="send"]',
        response: 'div[class*="markdown"], div[class*="answer"], div[data-testid="msh-chat-bubble"], div[class*="chat-message"]'
      },
      timeout: 30000
    },
    deepseek: {
      name: 'Deepseek',
      url: 'https://chat.deepseek.com/',
      auth: {
        cookies: process.env.DEEPSEEK_COOKIES || '',
        userToken: process.env.DEEPSEEK_USER_TOKEN || ''
      },
      selectors: {
        input: 'textarea, div[contenteditable="true"]',
        submit: 'div[class*="send-button"], button[class*="send"]',
        response: 'div[class*="markdown"], div[class*="response"]'
      },
      timeout: 30000
    },
    yuanbao: {
      name: 'Yuanbao',
      url: 'https://yuanbao.tencent.com/',
      selectors: {
        input: 'div[role="textbox"], div[contenteditable="true"]',
        submit: 'button[type="submit"], div[class*="send"]',
        response: '.answer-content, .markdown-body'
      },
      timeout: 30000
    }
  },
  global: {
    headless: process.env.HEADLESS !== 'false', // Default to true
    defaultTimeout: 60000,
    viewport: { width: 1280, height: 720 },
    screenshotDir: 'reports/screenshots'
  }
};
