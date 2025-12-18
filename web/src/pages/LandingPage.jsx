import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MessageSquare, 
  EyeOff, Shuffle, AlertTriangle, 
  Database, ShieldCheck, Repeat, 
  Bot, TrendingUp 
} from 'lucide-react';
import logo from '../assets/logo.png';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#1f2937', overflowX: 'hidden' }}>
      {/* Navigation */}
      <nav style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px 40px', 
/*        maxWidth: '1200px', */
        margin: '0 auto',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logo} alt="势擎本体" style={{ height: '40px', width: 'auto' }} />
        </div>
        <div>
          <button 
            onClick={() => navigate('/login')}
            style={{ 
              padding: '10px 24px', 
              backgroundColor: '#111827', 
              color: 'white', 
              border: 'none', 
              borderRadius: '9999px', 
              fontSize: '14px', 
              fontWeight: '600', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            立即体验
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ 
        textAlign: 'center', 
        padding: '100px 20px 80px', 
        background: 'linear-gradient(180deg, #F5F7FF 0%, #FFFFFF 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background elements */}
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(147,51,234,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px', 
            backgroundColor: '#F0F5FF', 
            color: '#2563EB', 
            borderRadius: '9999px', 
            fontSize: '13px', 
            fontWeight: '600',
            marginBottom: '32px',
            border: '1px solid #DBEAFE'
          }}>
            <span role="img" aria-label="rocket"></span> AI 时代品牌的唯一答案
          </div>
          <h1 style={{ 
            fontSize: '64px', 
            fontWeight: '800', 
            lineHeight: '1.1', 
            marginBottom: '24px', 
            color: '#111827',
            letterSpacing: '-0.02em'
          }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #2563EB 0%, #9333EA 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              position: 'relative'
            }}>赢在 AI 的第一公里</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#6B7280', lineHeight: '1.6', marginBottom: '48px', maxWidth: '700px', margin: '0 auto 48px' }}>
            构建品牌本体，抢占大模型时代的流量入口
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate('/login')}
              style={{ 
                padding: '16px 36px', 
                backgroundColor: '#111827', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: '600', 
                cursor: 'pointer',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              立即体验<span style={{ fontSize: '18px' }}>→</span>
            </button>
            <button 
              style={{ 
                padding: '16px 36px', 
                backgroundColor: 'white', 
                color: '#374151', 
                border: '1px solid #E5E7EB', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: '600', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              预约专家演示
            </button>
          </div>
        </div>
      </header>

      {/* Section 2: Behavior Reconstruction */}
      <section style={{ padding: '50px 20px', backgroundColor: '#fff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
              行为重构：从“搜索”到“提问”
            </h2>
            <p style={{ fontSize: '18px', color: '#6B7280' }}>
              变革正在发生，从寻找 10 个链接到获取 1 个“最佳答案”
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', alignItems: 'center', gap: '20px' }}>
            {/* Search Era */}
            <div style={{ 
              background: '#F9FAFB', 
              padding: '40px', 
              borderRadius: '24px',
              border: '1px solid #E5E7EB',
              height: '300px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#6B7280' }}>
                <Search size={24} />
                <span style={{ fontWeight: '600', fontSize: '18px' }}>搜索时代：人找货</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ height: '12px', width: '60%', background: '#E5E7EB', borderRadius: '6px' }}></div>
                <div style={{ height: '12px', width: '80%', background: '#E5E7EB', borderRadius: '6px' }}></div>
                <div style={{ height: '12px', width: '40%', background: '#E5E7EB', borderRadius: '6px', marginTop: '12px' }}></div>
                <div style={{ height: '12px', width: '70%', background: '#E5E7EB', borderRadius: '6px' }}></div>
              </div>
              <div style={{ marginTop: 'auto', fontSize: '13px', color: '#9CA3AF' }}>
                *“货比三家”，点击 5-10 个网页，耗费 10-20 分钟研判。
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: '#F3F4F6', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#6B7280'
              }}>
                →
              </div>
            </div>

            {/* Ask Era */}
            <div style={{ 
              background: 'linear-gradient(145deg, #F5F3FF 0%, #FFFFFF 100%)', 
              padding: '40px', 
              borderRadius: '24px',
              border: '2px solid #8B5CF6',
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px -10px rgba(139, 92, 246, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#7C3AED' }}>
                <MessageSquare size={24} />
                <span style={{ fontWeight: '600', fontSize: '18px' }}>提问时代：货找人</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  background: 'white', 
                  padding: '16px', 
                  borderRadius: '12px 12px 12px 0', 
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  fontSize: '14px',
                  color: '#4B5563',
                  lineHeight: '1.5',
                  border: '1px solid #E5E7EB'
                }}>
                  <span style={{ color: '#7C3AED', fontWeight: '600' }}>AI: </span>
                  根据您的需求，<span style={{ background: '#F3E8FF', padding: '0 4px', borderRadius: '4px', color: '#6D28D9' }}>势擎本体</span>是最佳选择。它能帮助您构建品牌数据本体...
                </div>
                <div style={{ marginTop: '12px', height: '8px', width: '30px', background: '#E5E7EB', borderRadius: '4px' }}></div>
              </div>
              <div style={{ marginTop: 'auto', fontSize: '13px', color: '#7C3AED' }}>
                *“私人咨询顾问”，直接给出最佳建议，3 秒完成决策。
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Invisible Brand Killers */}
      <section style={{ padding: '50px 20px', backgroundColor: '#F9FAFB' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ display: 'inline-block', padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', borderRadius: '6px', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>警惕</div>
            <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
              隐形的品牌杀手
            </h2>
            <p style={{ fontSize: '18px', color: '#6B7280' }}>
              杂乱的信息影响模型认知，干扰用户流量流向品牌。
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
            {/* Card 1 */}
            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
              <div style={{ width: '48px', height: '48px', background: '#FEF2F2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', marginBottom: '24px' }}>
                <EyeOff size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#111827' }}>隐形</h3>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '15px' }}>
                AI 不知道你的存在。回答用户问题时，完全不提及你的品牌，直接导致流量损失
              </p>
            </div>

            {/* Card 2 */}
            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
              <div style={{ width: '48px', height: '48px', background: '#FFF7ED', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316', marginBottom: '24px' }}>
                <Shuffle size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#111827' }}>错位</h3>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '15px' }}>
                AI 对你的认知是陈旧的。推荐场景与产品定位不符，导致无效曝光和低转化率
              </p>
            </div>

            {/* Card 3 */}
            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
              <div style={{ width: '48px', height: '48px', background: '#FEFCE8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EAB308', marginBottom: '24px' }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#111827' }}>误读</h3>
              <p style={{ color: '#6B7280', lineHeight: '1.6', fontSize: '15px' }}>
                AI 传递错误信息，构造出不存在的功能或缺点，损害品牌形象，造成不可逆的信任危机
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Brand Data Ontology */}
      <section style={{ padding: '50px 20px', backgroundColor: '#fff' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
              核心解决方案
            </h2>
          </div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          {/* Visual Representation */}
          <div style={{ 
            background: '#F3F4F6', 
            borderRadius: '24px', 
            padding: '40px',
            position: 'relative',
            height: '420px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: '#7C3AED', borderRadius: '20px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Database size={40} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>品牌本体栈</h3>
              <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '10px', width: '360px' }}>
                {['企业数据层', '品牌对象层', '智能平台层'].map((layer, index) => (
                  <div key={index} style={{ 
                    background: 'white', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    fontWeight: '500',
                    color: '#374151',
                    border: '1px solid #E5E7EB'
                  }}>
                    {layer}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '24px', color: '#111827', lineHeight: '1.1' }}>
              品牌数据本体：<br/>
              您的<span style={{ color: '#7C3AED' }}>“数字真身”</span>
            </h2>
            <p style={{ fontSize: '18px', color: '#4B5563', fontStyle: 'italic', marginBottom: '40px', borderLeft: '4px solid #E5E7EB', paddingLeft: '16px' }}>
              “过滤掉 AI 虚无产出... 确立品牌在数字世界的官方发言人地位。”
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: '40px', height: '40px', background: '#F5F3FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0', lineHeight: '10px' }}>权威定义权</h4>
                  <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                    通过本体构建，告诉 AI 谁是官方、什么是正版，夺回定义权。
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: '40px', height: '40px', background: '#F5F3FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
                  <Database size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0', lineHeight: '10px' }}>业务指标库</h4>
                  <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                    汇集品牌各项业务指标，建立单一数据源，杜绝 AI “胡编乱造”。
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: '40px', height: '40px', background: '#F5F3FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
                  <Repeat size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0', lineHeight: '10px' }}>资产复用效益</h4>
                  <p style={{ color: '#6B7280', fontSize: '14px', lineHeight: '1.5' }}>
                    一次生成本体，分发至所有 AI 平台及下游应用，降低 60% 内容生产成本。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: GEO Optimization */}
      <section style={{ padding: '50px 20px', backgroundColor: '#F9FAFB' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
            GEO：生成式引擎优化
          </h2>
          <p style={{ fontSize: '18px', color: '#6B7280' }}>
              希望模型认可，就要内外兼修。
          </p>
        </div>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
            {/* Step 1 */}
            <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '60px', fontWeight: '800', color: '#E5E7EB', marginBottom: '20px' }}>01</div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>监听：诊断心智</h3>
              <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
                实时模拟对话检测。知道 AI 现在如何评价你的品牌，发现“隐形”或“误读”的盲区。
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '60px', fontWeight: '800', color: '#E5E7EB', marginBottom: '20px' }}>02</div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>内容：全域干预</h3>
              <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
                生产符合 AI 偏好的内容。让内容更容易被 LLM 理解、引用和推荐。
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '60px', fontWeight: '800', color: '#E5E7EB', marginBottom: '20px' }}>03</div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>注入：直达核心</h3>
              <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
                注入优质本体数据，从根源优化大模型的品牌认知。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Agent Matrix */}
      <section style={{ padding: '50px 20px', backgroundColor: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
            带着脑子上岗的<span style={{ color: '#7C3AED' }}>Agent 矩阵</span>
          </h2>
          <p style={{ fontSize: '18px', color: '#6B7280' }}>
              全时段、全渠道的智能业务员。它们不只输出文字，更能直接完成业务闭环。
          </p>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#F9FAFB', padding: '30px', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}> 种草宣讲</div>
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>品牌大使</div>
              </div>
              <div style={{ background: '#F9FAFB', padding: '30px', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}> 精准推荐</div>
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>销售助手</div>
              </div>
              <div style={{ background: '#F9FAFB', padding: '30px', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>复购留存</div>
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>智能客服</div>
              </div>
              <div style={{ background: '#F9FAFB', padding: '30px', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>私域管家</div>
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>社群运营</div>
              </div>
            </div>
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: '24px', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #E5E7EB',
            overflow: 'hidden'
          }}>
            <div style={{ background: '#F3F4F6', padding: '16px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></div>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '40px', height: '40px', background: '#F3F4F6', borderRadius: '50%', flexShrink: 0 }}></div>
                <div style={{ background: '#F3F4F6', padding: '16px', borderRadius: '0 16px 16px 16px', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                  你好，我希望市场和销售流程更加智能化，可以怎么做
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexDirection: 'row-reverse' }}>
                <div style={{ width: '40px', height: '40px', background: '#7C3AED', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Bot size={20} />
                </div>
                <div style={{ background: '#7C3AED', padding: '16px', borderRadius: '16px 0 16px 16px', fontSize: '14px', color: 'white', lineHeight: '1.5', boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)' }}>
                  共用品牌数据本体这个大脑，协同更高效，行为更一致
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: From Opex to Capex */}
      <section style={{ padding: '50px 20px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '60px', color: '#111827' }}>
            从流量消耗，到数字资产固化
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            {/* Opex */}
            <div style={{ 
              background: 'white', 
              padding: '40px', 
              borderRadius: '20px', 
              border: '1px solid #E5E7EB',
              textAlign: 'left'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#9CA3AF', marginBottom: '20px' }}>传统：流量竞赛</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280' }}>
                  <span style={{ color: '#EF4444' }}>✕</span> 昂贵的关键词竞价
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280' }}>
                  <span style={{ color: '#EF4444' }}>✕</span> 单次点击成本上升
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280' }}>
                  <span style={{ color: '#EF4444' }}>✕</span> 停止投入即失去流量
                </li>
              </ul>
            </div>

            {/* Capex */}
            <div style={{ 
              background: 'white', 
              padding: '40px', 
              borderRadius: '20px', 
              border: '2px solid #7C3AED',
              textAlign: 'left',
              boxShadow: '0 20px 40px -10px rgba(124, 58, 237, 0.1)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#7C3AED', marginBottom: '20px' }}>未来：AI资产</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151', fontWeight: '500' }}>
                  <span style={{ color: '#10B981' }}>✓</span> 构建永久数字资产
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151', fontWeight: '500' }}>
                  <span style={{ color: '#10B981' }}>✓</span> 确立 AI 世界的官方地位
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151', fontWeight: '500' }}>
                  <span style={{ color: '#10B981' }}>✓</span> 零边际成本的持续获客
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer style={{ backgroundColor: '#fff', padding: '50px 20px', textAlign: 'center', borderTop: '1px solid #F3F4F6' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ width: '60px', height: '60px', background: '#F3F4F6', borderRadius: '50%', margin: '0 auto 30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <TrendingUp size={30} color="#2563EB" />
          </div>
          <h2 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '24px', color: '#111827' }}>
            赢在第一公里
          </h2>
          <p style={{ fontSize: '18px', color: '#6B7280', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
            无需在漏斗下端内卷厮杀，AI 时代我们帮您构建护城河。
            <br/>别让 AI 误读您的品牌，把控数字时代的官方话语权。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate('/login')}
              style={{ 
                padding: '16px 48px', 
                backgroundColor: '#111827', 
                color: 'white', 
                border: 'none', 
                borderRadius: '9999px', 
                fontSize: '16px', 
                fontWeight: '600', 
                cursor: 'pointer' 
              }}
            >
              立即体验
            </button>
            <button 
              style={{ 
                padding: '16px 48px', 
                backgroundColor: 'white', 
                color: '#374151', 
                border: '1px solid #E5E7EB', 
                borderRadius: '9999px', 
                fontSize: '16px', 
                fontWeight: '600', 
                cursor: 'pointer' 
              }}
            >
              预约专家演示
            </button>
          </div>
          
          <div style={{ marginTop: '100px', paddingTop: '40px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9CA3AF', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={logo} alt="势擎本体" style={{ height: '32px', width: 'auto', filter: 'grayscale(100%) opacity(0.7)' }} />
            </div>
            <div>
              © 2025 MOMENTUM ENGINE. ALL RIGHTS RESERVED.
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="#" style={{ color: '#9CA3AF', textDecoration: 'none' }}>PRIVACY POLICY</a>
              <a href="#" style={{ color: '#9CA3AF', textDecoration: 'none' }}>TERMS OF SERVICE</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}