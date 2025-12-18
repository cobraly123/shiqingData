import React, { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

/**
 * 品牌提及趋势图组件
 * 展示不同品牌在过去一周内的提及率变化趋势
 * 支持交互式筛选显示的品牌
 */
export function BrandMentionTrends() {
  // 品牌配置：名称和对应的颜色
  const brands = [
    { key: '问界', color: 'rgba(59, 131, 246, 0.65)' },
    { key: 'Tesla', color: '#22c55eab' },
    { key: '蔚来', color: 'rgba(244, 63, 93, 0.57)' },
    { key: '理想', color: 'rgba(249, 116, 22, 0.64)' },
    { key: '比亚迪', color: 'rgba(124, 58, 237, 0.64)' },
    { key: '小米', color: 'rgba(100, 116, 139, 0.64)' },
  ]
  
  // 状态：当前激活显示的品牌，默认显示前3个
  const [active, setActive] = useState(brands.slice(0, 3).map(b => b.key))
  
  // 生成最近7天的日期标签
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`
  })
  
  // 模拟数据：每个品牌每天的提及率数据
  const data = days.map((date, idx) => ({
    date,
    问界: [39, 34, 37, 40, 42, 39, 38][idx],
    Tesla: [75, 76, 68, 65, 72, 66, 66][idx],
    蔚来: [70, 65, 63, 64, 59, 62, 60][idx],
    理想: [45, 43, 48, 40, 38, 42, 43][idx],
    比亚迪: [80, 76, 74, 77, 75, 78, 80][idx],
    小米: [40, 42, 43, 38, 40, 48, 53][idx],
  }))
  
  // 切换品牌显示状态，最多允许选择5个
  const toggle = (key) => {
    setActive((prev) => {
      if (prev.includes(key)) return prev.filter(k => k !== key)
      if (prev.length >= 5) return prev
      return [...prev, key]
    })
  }
  
  return (
    <div className="card" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      {/* 品牌筛选按钮区域 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
        {brands.map(b => {
          const on = active.includes(b.key)
          const bg = on ? b.color : '#ffffff'
          const color = on ? '#ffffff' : '#64748B'
          const border = on ? b.color : '#e5e7eb'
          return (
            <button key={b.key} onClick={() => toggle(b.key)} style={{
              border: `1px solid ${border}`, borderRadius: 999, padding: '8px 14px', cursor: 'pointer',
              background: bg, color, fontSize: 13, fontWeight: 600, boxShadow: on ? '0 2px 6px rgba(0,0,0,0.08)' : 'none', transition: 'all .18s ease'
            }}>{b.key}</button>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 10 }}>限制每次勾选最多5个品牌</div>
      
      {/* 图表区域：面积图 + 折线图 */}
      <div style={{ height: 300, borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(180deg, rgba(59,130,246,0.06), rgba(124,58,237,0.04))' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 12, right: 24, top: 12, bottom: 12 }}>
            <defs>
              {brands.map(b => (
                <linearGradient key={b.key} id={`grad-${b.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={b.color} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={b.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickMargin={6} />
            <YAxis domain={[20, 80]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickMargin={6} />
            <Tooltip
              formatter={(v) => `${v}%`}
              contentStyle={{ background: 'rgba(255,255,255,0)', border: 'none', boxShadow: 'none', borderRadius: 12, padding: 6 }}
              labelStyle={{ color: '#1E293B', fontSize: 12, fontWeight: 600 }}
              itemStyle={{ color: '#374151', fontSize: 12 }}
            />
            {brands.filter(b => active.includes(b.key)).map(b => (
              <Area key={`a-${b.key}`} type="monotone" dataKey={b.key} stroke={b.color} strokeWidth={0} fill={`url(#grad-${b.key})`} isAnimationActive animationDuration={400} />
            ))}
            {brands.filter(b => active.includes(b.key)).map(b => (
              <Line key={`lf-${b.key}`} type="monotone" dataKey={b.key} stroke={b.color} strokeWidth={1.6} strokeOpacity={0.4} strokeDasharray="4 4" dot={false} isAnimationActive animationDuration={400} />
            ))}
            {brands.filter(b => active.includes(b.key)).map(b => (
              <Line key={`l-${b.key}`} type="monotone" dataKey={b.key} stroke={b.color} strokeWidth={4} dot={{ r: 4, fill: b.color, stroke: '#ffffff', strokeWidth: 1.5 }} activeDot={{ r: 5, fill: b.color, stroke: '#ffffff', strokeWidth: 2 }} strokeLinejoin="round" strokeLinecap="round" isAnimationActive animationDuration={400} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
