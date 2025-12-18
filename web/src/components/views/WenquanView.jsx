import React, { useState } from 'react'
import { geoService } from '../../api/geoService'

/**
 * 文泉视图组件
 * 核心功能：
 * 1. 内容创作：基于大模型的 AI 内容生成
 * 2. 多渠道支持：支持小红书、微信公众号、微博、知乎等多种渠道模板
 * 3. 内容扩写：支持基于已有内容进行续写和优化
 * 4. 内容导出：支持将生成的内容导出为文本文件
 */
export function WenquanView() {
  const [contentPrompt, setContentPrompt] = useState('')
  const [contentChannel, setContentChannel] = useState('blog')
  const [contentTemplate, setContentTemplate] = useState('')
  const [contentResult, setContentResult] = useState('')

  /**
   * 渠道预设模板配置
   * 包含不同平台的标题公式、正文结构和示例
   */
  const channelTemplates = {
    linkedin: `小红书好文参考模板\n\n标题公式：\n- 挖到宝了！✨这个[产品名]真的不是智商税！\n- 无限回购！我的年度爱用物Top 3，按头安利 📢\n- [产品A] vs [产品B]，谁才是性价比之王？🤔\n\n正文模板：\n[引入] 作为一个[你的身份，如：成分党/资深熬夜党]，对于[产品品类]真的很挑剔！最近风很大的[产品名]我终于入手了，用了一周/一个月，忍不住来跟姐妹们汇报！📝\n[真实体验/痛点] 以前我的[皮肤/生活状态]是...（描述糟糕状态），真的很焦虑。\n[产品亮点]\n✅ 亮点一：[比如：质地/手感] 真的很惊喜，完全不输大牌...\n✅ 亮点二：[比如：效果/功能] 坚持用了几天，明显感觉...\n❌ 小缺点：（写一点无伤大雅的缺点，如：包装不太好看/味道有点重）\n[总结/适合谁] 总体来说，瑕不掩瑜！特别适合[具体人群，如：学生党/上班族]。\n[互动] 你们用过吗？觉得好用吗？👇\n[标签] #好物分享 #平价好物 #[产品名]测评 #避坑指南`,
    blog: `微信公众号\n\n标题公式（CTR关键）：\n- 反常识：为什么90%的[行业从业者]都做不好[某事]？\n- 强观点：[行业]变天了！[新趋势]正在取代[旧模式]，看不懂的将被淘汰。\n- 数据流：万字长文：关于[主题]的底层逻辑，看这一篇就够了。\n\n正文模板：\n[摘要/引导语] 本文约[3000]字，阅读需[8]分钟。核心观点：[一句话提炼最有价值的结论]。\n[开头：黄金3秒] 最近，我和一位[行业]的朋友聊天，他问了一个问题：[抛出一个行业共性痛点/焦虑]。这让我想起最近发生的[热点事件/数据]。其实，这背后的本质是...\n[第一部分：现状与误区] 大家普遍认为...但实际上，数据告诉我们要...\n[第二部分：深度拆解（核心干货）] 从三个维度来看：\n1. [小标题] 配合图表/模型阐述\n2. [小标题] 结合案例阐述\n3. [小标题] 提出方法论（可用引用 > 金句）\n[第三部分：未来预判/建议] 未来3年，[行业]将呈现[趋势]。最大的机会在于...\n[结尾：情绪/行动] 如果你对[主题]感兴趣，欢迎在评论区交流。`,
    twitter: `微博\n\n文案公式：\n- 话题词：#热点话题#\n- 核心态度：一句话表明立场\n- 深度解析：1-2点专业分析\n- 结尾互动：抛出有争议的问题\n\n微博模板：\n#OpenAI新模型# #ChatGPT#\n这次更新真的炸了！很多人只看到了[大众关注点]，但作为从业者，我看到的是**[你的独特发现，如：GEO的机会]**。\n1️⃣ 以前我们认为...\n2️⃣ 现在AI直接...\n这对于[具体行业]来说既是降维打击，也是重塑机会。\n你们觉得这次更新对打工人利好吗？评论区聊👇\n[配图]`,
    reddit: `知乎\n\n文章标题：\n- 如何评价[某品牌]最新发布的[车型]？\n- 预算[XX]万，[车型A]和[车型B]怎么选？\n- [技术名词]到底是噱头还是刚需？\n\n正文模板：\n[开头：谢邀+身份] 利益相关：[身份]，不吹不黑分享真实感受。\n[先说结论] 针对[需求]，这车是同价位天花板；但追求[另一需求]建议看[竞品]。\n[硬核参数/技术拆解] 重点在底盘/三电系统。列出对比数据并解释技术解决的痛点。\n[动态试驾体验] 过减速带、高速静谧性等体验描述。\n[购买建议] 适合与不适合的人群。\n[结尾] 有问题评论区见。`,
    press: `新闻稿发布平台\n\n标题公式：\n- [品牌]发布“[技术品牌名]”架构，让[痛点]更安全\n- [车企A]携手[科技公司B]，共建智能出行新生态\n- 打破国外垄断！[品牌]自研[核心零部件]量产下线\n\n正文模板：\n[城市，日期] —— 在汽车行业向“电动化、智能化”转型的关键节点，[品牌名]发布新一代“[技术名称]”，并将在新款[车型]率先搭载。\n【背景与意义】 针对[痛点]投入[数额]亿元，历时[时间]取得突破。\n【技术原理解析】 采用行业首创的[原理]，[指标A]提升[X]% ，[指标B]降低[X]%。标志着跻身第一梯队。\n【行业评价】 专家/合作伙伴认为该技术解决实际痛点并引领方向。`,
    faq: `官网 Q&A\n\nQ： [车型名] 的不同配置版本主要区别在哪里？\nA： 标准版：适合市区通勤，标配[X]项辅助驾驶。\n长续航版：电池容量[X]kWh，适合跨城出行。\n性能版：双电机四驱，零百[X]秒，适合操控玩家。\n👉 [点击] 查看参数对比或预约顾问。\n\nQ：现在预订，多久能提车？\nA： 预计交付周期 4-6 周，App 可查看排产进度。可查看现车库，最快 3 天提车。\n\nQ：可以用旧车置换吗？\nA： 支持，上门评估。品牌置换最高 [X] 万，其他品牌 [X] 千。👉 [点击] 输入旧车信息获取报价。`,
  }

  /**
   * 生成内容
   * 调用后端 API，根据用户输入的提示词和选择的模板生成内容
   */
  const generateContent = async () => {
    const title = contentChannel === 'blog' ? '【公众号长文草稿】' : contentChannel === 'twitter' ? '【微博短文草稿】' : contentChannel === 'reddit' ? '【知乎回答草稿】' : contentChannel === 'linkedin' ? '【小红书笔记草稿】' : contentChannel === 'press' ? '【新闻稿草稿】' : '【官网/产品页草稿】'
    setContentResult(`${title}\n\n生成中...`)
    try {
      const j = await geoService.generateContent({ prompt: contentPrompt, template: contentTemplate, channel: contentChannel, provider: 'qwen' })
      const txt = String(j?.content || '').trim()
      setContentResult(`${title}\n\n${txt || '(未生成内容)'}`)
    } catch (e) {
      setContentResult(`${title}\n\n[错误] ${String(e)}`)
    }
  }

  /**
   * 扩写内容
   * 基于当前生成的内容，请求 AI 进行续写和丰富
   */
  const handleExpand = async () => {
    const title = contentChannel === 'blog' ? '【公众号长文草稿】' : contentChannel === 'twitter' ? '【微博短文草稿】' : contentChannel === 'reddit' ? '【知乎回答草稿】' : contentChannel === 'linkedin' ? '【小红书笔记草稿】' : contentChannel === 'press' ? '【新闻稿草稿】' : '【官网/产品页草稿】'
    const base = String(contentResult || '').trim()
    const ctx = base.replace(/^【[^】]+】\s*/,'')
    setContentResult(`${title}\n\n继续扩写中...`)
    try {
      const j = await geoService.generateContent({ prompt: `请在以下已有内容之后续写，保持风格一致，不重复已有内容，增强细节、案例与论据，并延展当前结构：\n\n${ctx}`, template: contentTemplate, channel: contentChannel, provider: 'qwen' })
      const txt = String(j?.content || '').trim()
      setContentResult(`${title}\n\n${txt || '(未生成内容)'}`)
    } catch (e) {
      setContentResult(`${title}\n\n[错误] ${String(e)}`)
    }
  }

  /**
   * 导出内容
   * 将当前编辑框中的内容导出为 TXT 文件下载
   */
  const handleExport = () => {
    const txt = String(contentResult || '').trim()
    const name = contentChannel === 'blog' ? '公众号' : contentChannel === 'twitter' ? '微博' : contentChannel === 'reddit' ? '知乎' : contentChannel === 'linkedin' ? '小红书' : contentChannel === 'press' ? '新闻稿' : '官网'
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `内容_${name}_${ts}.txt`
    const blob = new Blob([txt || ''], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container">
      {/* 内容创作模块卡片 */}
      <div className="card" style={{ marginTop: -10, padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>内容创作模块</div>
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>AI 驱动的多渠道内容生成</div>
        <div style={{ marginTop: 16 }}>
          {/* 输入区域：主题与模板 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>输入您的内容主题或问题</div>
              <textarea value={contentPrompt} onChange={(e) => setContentPrompt(e.target.value)} className="input" style={{ width: '100%', height: 160 }} placeholder="例如：为 AI 搜索引擎优化内容"></textarea>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>输入您的媒体模板内容（可选）</div>
              <textarea value={contentTemplate} onChange={(e) => setContentTemplate(e.target.value)} className="input" style={{ width: '100%', height: 160, color: '#6b7280' }} placeholder="例如：公众号长文结构：标题-导语-正文-总结"></textarea>
            </div>
          </div>
          
          {/* 渠道选择区域 */}
          <div style={{ marginTop: 14, textAlign: 'left' }}>
            <label style={{ color: '#6b7280', fontSize: 12 }}>选择待发布的内容渠道</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 10 }}>
              {[
                { key: 'blog', title: '微信公众号', desc: '长篇深度内容，适合 SEO 和 GEO' },
                { key: 'twitter', title: '微博', desc: '简短观点，快速传播' },
                { key: 'reddit', title: '知乎', desc: '社区讨论，建立权威' },
                { key: 'linkedin', title: '小红书', desc: '强种草属性、女性/年轻用户为主、图文/短视频种草' },
                { key: 'press', title: '新闻稿发布平台', desc: '官方声明，媒体传播' },
                { key: 'faq', title: '官网/产品页', desc: '问答格式，直接回答 AI' },
              ].map((c) => {
                const active = contentChannel === c.key
                const border = active ? '#3b82f6' : '#e5e7eb'
                const bg = active ? 'rgba(219,234,254,0.6)' : '#ffffff'
                const color = active ? '#1f2937' : '#374151'
                return (
                  <button key={c.key} onClick={() => { setContentChannel(c.key); setContentTemplate(channelTemplates[c.key] || '') }} style={{ textAlign: 'left', background: bg, color, border: `1px solid ${border}`, borderRadius: 12, padding: 14, cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700 }}>{c.title}</div>
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>{c.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* 操作按钮：内容撰写 */}
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button className="btn cta-btn" onClick={generateContent} disabled={!contentPrompt}>内容撰写</button>
          </div>
          
          {/* 结果展示与后续操作 */}
          <div style={{ marginTop: 14, textAlign: 'left' }}>
            <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>生成的内容展示</div>
            <textarea
              value={contentResult}
              readOnly
              className="input"
              rows={22}
              style={{ width: '100%', lineHeight: '1.4', height: 'calc(22 * 1.4em + 16px)', resize: 'none' }}
              placeholder="生成的内容将展示在此"
            ></textarea>
            <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleExpand} disabled={!contentResult}>继续扩写</button>
              <button className="btn btn-secondary" onClick={handleExport} disabled={!contentResult}>内容分发</button>
            </div>
          </div>
        </div>
        
        
      </div>
    </div>
  )
}
