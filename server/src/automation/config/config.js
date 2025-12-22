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
      timeout: 300000
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
      timeout: 300000
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
        response: 'div[data-testid="answer_content"], .markdown-body, div[data-testid="receive_message"]',
        popups: [
          'div[class*="close-btn"]', 
          'button[class*="close-btn"]', 
          'div[class*="modal"] button[aria-label="Close"]',
          'div[role="dialog"] button[aria-label="Close"]',
          '.semi-modal-close'
        ]
      },
      timeout: 300000
    },
    kimi: {
      name: 'Kimi',
      url: 'https://www.kimi.com/',
      auth: {
        cookies: process.env.KIMI_COOKIES || '',
        localStorage: process.env.KIMI_LOCAL_STORAGE || '',
        token: process.env.KIMI_TOKEN || '', // Added specific token support
        cookieDomain: '.kimi.com'
      },
      selectors: {
        input: 'div[contenteditable="true"]',
        submit: 'div[class*="send-button"], button[class*="send"]',
        response: 'div[class*="markdown"], div[class*="answer"], div[data-testid="msh-chat-bubble"], div[class*="chat-message"]',
        popups: [
          'div[class*="close"]', 
          'button[class*="close"]', 
          '[aria-label="Close"]', 
          'img[alt="christmas"]', // Try clicking the splash image itself if it blocks
          '.popover-close'
        ]
      },
      timeout: 300000
    },
    deepseek: {
      name: 'Deepseek',
      url: 'https://chat.deepseek.com/',
      auth: {
        cookies: process.env.DEEPSEEK_COOKIES || '',
        userToken: process.env.DEEPSEEK_USER_TOKEN || '',
        cookieDomain: '.deepseek.com'
      },
      selectors: {
        input: 'textarea, div[contenteditable="true"]',
        submit: 'div[class*="send-button"], button[class*="send"]',
        response: 'div[class*="markdown"], div[class*="response"]',
        popups: ['div[class*="modal"] button[class*="close"]']
      },
      timeout: 300000 // 5 minutes for R1 thinking
    },
    yuanbao: {
      name: 'Yuanbao',
      url: 'https://yuanbao.tencent.com/chat',
      auth: {
        cookies: process.env.YUANBAO_COOKIES || '',
        cookieDomain: '.tencent.com'
      },
      selectors: {
        input: 'div[role="textbox"], div[contenteditable="true"]',
        submit: 'button[type="submit"], div[class*="send"]',
        response: '.answer-content, .markdown-body',
        popups: ['button[aria-label="关闭"]', '.dialog-close']
      },
      timeout: 300000
    }
  },
  global: {
    headless: process.env.HEADLESS !== 'false', // Default to true
    defaultTimeout: 300000,
    viewport: { width: 1280, height: 720 },
    screenshotDir: 'reports/screenshots'
  }
};
