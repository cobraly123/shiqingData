import React from 'react'
import { CardBox } from '../common/CardBox'
import { SectionTitle } from '../common/SectionTitle'
import { Pill } from '../common/Pill'
import { MediaDistributionChart } from '../viz/MediaDistributionChart'
import { BrandMentionTrends } from '../viz/BrandMentionTrends'

/**
 * 仪表盘视图组件
 * 展示 AI 品牌感知全景、提及率、情绪分析等核心指标
 * @param {Object} props
 * @param {Array} props.domainCounts - 域名统计数据，用于计算提及率等
 */
export function DashboardView({ domainCounts = [] }) {
  return (
    <div className="container" style={{ background: '#F4F6F9', padding: 12, borderRadius: 12 }}>
      {/* 核心指标卡片区域 */}
      <div className="card" style={{ marginTop: -10, padding: 24, background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#1E293B' }}>AI 品牌感知全景</div>
            <div style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>深度解析主流AI平台如何理解、定义并向用户推荐您的品牌</div>
          </div>
        </div>
        
        {/* 四大核心指标展示 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
          {(() => {
            // 计算 SOV (Share of Voice) 品牌提及率
            const sov = Math.round(((domainCounts.find(d => String(d.domain).includes('official'))?.count || 0) / Math.max(1, domainCounts.reduce((a,b)=>a+b.count,0))) * 1000) / 10
            // 计算总引用次数
            const citation = domainCounts.reduce((a,b)=>a+b.count,0)
            return [
              (
                <CardBox key="k1" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ color: '#64748B', fontSize: 12 }}>品牌提及率</div>
                  <div style={{ fontWeight: 800, fontSize: 24, color: '#1E293B', marginTop: 4 }}>{sov || 38.5}%</div>
                  <Pill bg="#dcfce7" color="#10B981">↑ 4.2%</Pill>
                  <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>在相关行业问询中，AI提及您品牌的概率</div>
                </CardBox>
              ),
              (
                <CardBox key="k3">
                  <div style={{ color: '#64748B', fontSize: 12 }}>首位提及率</div>
                  <div style={{ fontWeight: 800, fontSize: 24, color: '#1E293B', marginTop: 4 }}>{sov || 16.5}%</div>
                  <Pill bg="#dcfce7" color="#10B981">↑ 5.2%</Pill>
                  <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>来自文心、千问等平台的首位推荐率</div>
                </CardBox>
              ),
              (
                <CardBox key="k2" style={{ position: 'relative' }}>
                  <div style={{ color: '#64748B', fontSize: 12 }}>引文增长</div>
                  <div style={{ fontWeight: 800, fontSize: 24, color: '#1E293B', marginTop: 4 }}>{citation || 1240}</div>
                  <Pill bg="#dcfce7" color="#10B981">↑ 2.6%</Pill>
                  <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>AI回答中直接引用您内容的次数</div>
                </CardBox>
              ),
              (
                <CardBox key="k4" style={{ position: 'relative' }}>
                  <div style={{ color: '#64748B', fontSize: 12 }}>提及情绪</div>
                  <Pill bg="#dcfce7" color="#10B981">82.6%</Pill>
                  <Pill bg="#fdfdfdff" color="#000000ff">VS</Pill>
                  <Pill bg="rgba(186, 186, 186, 0.28)" color="#949191ff">8.4%</Pill>
                  <div style={{ color: '#64748B', fontSize: 12, marginTop: 28 }}>AI 描述品牌时的积极程度。指数越高越信任</div>
                </CardBox>
              ),
            ]
          })()}
        </div>
        
        {/* 趋势图与洞察分析 */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12, marginTop: 16 }}>
          <BrandMentionTrends />
          <CardBox>
            <SectionTitle text="洞察" />
            <div style={{ color: '#64748B', fontSize: 13, textAlign: 'left' }}>本周小红书的声量呈现显著的“去驾驶化”趋势。 <br></br>职场人和宝妈为主的用户，在高压环境下产生的“静止陪伴”需求，推动了品牌认知的“场景剥离”，从交通工具转向私密庇护所。小红书算法对“午休”、“露营”等软性生活流内容的加权，进一步将问界定义为“移动不动产”。<br></br>这种与高频生活场景的深度锚定，不仅引发了高赞共鸣，更赋予了品牌超越汽车本身的话题黏性。</div>
          </CardBox>
        </div>
        
        {/* 用户旅程与媒体分布 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 16 }}>
          <CardBox>
            <SectionTitle text="用户旅程" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr 60px 1fr', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'inline-block', background: '#F3F4F6', borderRadius: 12, padding: '8px 10px', color: '#1E293B' }}>哪家新能源车最智能？</div>
                <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>高频用户意图</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5l8 7-8 7" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill bg="#dcfce7" color="#10B981">技术参数</Pill>
                  <Pill>安全案例</Pill>
                  <Pill>风险场景</Pill>
                  <Pill bg="#23232325" color="#140901ff">售后服务</Pill>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5l8 7-8 7" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'inline-block', background: '#F3F4F6', borderRadius: 12, padding: '8px 10px', color: '#1E293B' }}>生成品牌内容</div>
                <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>内容分发</div>
              </div>
            </div>
          </CardBox>
          <CardBox style={{ gridColumn: '1 / -1' }}>
            <SectionTitle text="媒体内容分布分析" />
            <MediaDistributionChart />
          </CardBox>
        </div>
      </div>
    </div>
  )
}
