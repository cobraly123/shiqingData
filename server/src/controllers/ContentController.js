import { GenerateContentSchema } from '../schemas/index.js';
import { chat } from '../qwen.js';

/**
 * 生成内容控制器
 * 处理多渠道内容生成请求
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
export async function generateContent(req, res) {
  // 验证请求体
  const { prompt, template, channel, provider, model } = GenerateContentSchema.parse(req.body);
  const ch = String(channel || '').trim() || 'blog';
  
  // 基础系统提示词
  const baseSys = '你是资深新媒体内容创作助手，擅长基于模板进行结构化写作。要求：严格遵循模板结构；语言自然口语化但专业；避免空话与AI腔；根据渠道风格调整表达；输出纯文本，不要添加任何解释。';
  
  // 不同渠道的特定风格配置
  const sysByChannel = {
    blog: baseSys + ' 风格：公众号长文；结构完整，有小标题；结论前置；适度数据/案例；避免堆砌形容。长度：800-1500字。',
    twitter: baseSys + ' 风格：微博短内容；观点强，句子短；可含1-2个话题标签；轻微使用emoji；结尾抛问题互动。长度：120-280字。',
    reddit: baseSys + ' 风格：知乎回答；先给结论+身份；参数/体验双线拆解；给出选择建议；避免营销口吻。长度：600-1200字。',
    linkedin: baseSys + ' 风格：小红书笔记；生活化口语；明确痛点-亮点-小缺点-总结；适度emoji与标签但不过度。长度：300-800字。',
    press: baseSys + ' 风格：新闻稿；客观专业；含背景意义/技术原理/行业评价；避免夸大；数据用阿拉伯数字。长度：500-1000字。',
    faq: baseSys + ' 风格：官网Q&A；问答体；短句清晰；可包含指引动作（如点击/预约）；避免术语堆砌。长度：每问答80-200字。',
  };
  
  const sys = sysByChannel[ch] || baseSys;
  const usr = `渠道：${ch}\n\n模板：\n${String(template || '').trim()}\n\n提示词：\n${String(prompt || '').trim()}\n\n请依据模板生成完整内容，并满足对应风格与长度约束。`;
  
  // 调用LLM生成内容
  const content = await chat([
    { role: 'system', content: sys },
    { role: 'user', content: usr },
  ], { provider: provider || process.env.LLM_PROVIDER || 'qwen', op: 'generate_content', query: `channel=${ch}`, model });
  
  res.json({ content: String(content || '') });
}
