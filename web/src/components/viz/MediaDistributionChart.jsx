import React from 'react'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, LabelList } from 'recharts'

/**
 * 媒体内容分布图表组件
 * 展示不同媒体平台的内容占比
 * 使用横向条形图展示
 */
export function MediaDistributionChart() {
  // 模拟数据：各媒体平台的占比
  const arr = [
    { name: '微信公众号', pct: 12.16, label: '12.16%' },
    { name: '懂车帝', pct: 11.28, label: '11.28%' },
    { name: '百家号', pct: 10.12, label: '10.12%' },
    { name: '太平洋汽车', pct: 6.93, label: '6.93%' },
    { name: '搜狐', pct: 3.23, label: '3.23%' },
    { name: '汽车之家', pct: 3.04, label: '3.04%' },
    { name: '新浪财经', pct: 1.69, label: '1.69%' },
    { name: '车家号', pct: 1.54, label: '1.54%' },
  ]
  
  // 颜色调色板，用于不同条目的着色
  const palette = ['#2563eb','#1d4ed8','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#0ea5e9','#38bdf8']
  
  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={arr} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" domain={[0, 15]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#374151' }} />
          <YAxis type="category" dataKey="name" width={120} interval={0} tick={{ fontSize: 11, fill: '#374151' }} />
          <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: 'rgba(255,255,255,0)', border: 'none', boxShadow: 'none', borderRadius: 12, padding: 6 }} labelStyle={{ color: '#1E293B', fontSize: 12, fontWeight: 600 }} itemStyle={{ color: '#374151', fontSize: 12 }} cursor={false} />
          <Bar dataKey="pct" radius={[4,4,4,4]} barSize={12}>
            {arr.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
            ))}
            <LabelList dataKey="label" position="right" style={{ fontSize: 10, fill: '#374151' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
