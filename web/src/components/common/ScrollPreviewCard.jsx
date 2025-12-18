import React from 'react'

/**
 * 滚动预览卡片组件
 * 用于展示一个可滚动的列表，常用于展示预选结果或预览项
 * 
 * @param {Object} props
 * @param {number} props.height - 卡片高度，默认 180
 * @param {string} props.title - 标题文本
 * @param {Array} props.items - 数据项数组
 * @param {Function} props.renderItem - 自定义渲染每一项的函数，默认为直接显示字符串
 */
export function ScrollPreviewCard({ height = 180, title, items, renderItem }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#ffffff', height }}>
      <div style={{ color: '#64748B', fontSize: 12, marginBottom: 8 }}>{title}</div>
      <div className="scroll-area" style={{ display: 'grid', gap: 6, height: 'calc(100% - 24px)', overflowY: 'auto', paddingRight: 4, scrollBehavior: 'smooth' }}>
        {(items || []).map((it, i) => (
          <div key={i} style={{ fontSize: 12, color: '#111827', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {renderItem ? renderItem(it, i) : String(it)}
          </div>
        ))}
        {!items?.length ? (
          <div style={{ color: '#9ca3af', fontSize: 12 }}>暂无可预选项</div>
        ) : null}
      </div>
    </div>
  )
}
