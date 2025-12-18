import React from 'react'

/**
 * 模型选择器组件
 * 用于选择一个或多个 AI 模型
 * 
 * @param {Object} props
 * @param {Array} props.options - 选项列表，每项包含 { key, label }
 * @param {Array} props.selectedKeys - 当前选中的 key 列表
 * @param {Function} props.onToggle - 切换选中状态的回调函数 (key) => void
 * @param {boolean} props.disabled - 是否禁用交互
 */
export function ModelSelector({ options, selectedKeys, onToggle, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = selectedKeys.includes(opt.key)
        const border = active ? '#3b82f6' : '#e5e7eb'
        const bg = active ? 'rgba(219,234,254,0.6)' : '#ffffff'
        const dot = active ? '#2563eb' : '#9ca3af'
        const color = active ? '#1f2937' : '#374151'
        return (
          <button
            key={opt.key}
            onClick={() => onToggle(opt.key)}
            onKeyDown={(e) => { if (e.key === 'Enter') onToggle(opt.key) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: bg, color,
              border: `1px solid ${border}`, borderRadius: 10,
              padding: '10px 12px', cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 160ms ease-in-out',
              opacity: disabled ? 0.6 : 1,
              pointerEvents: disabled ? 'none' : 'auto',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border }}
            aria-disabled={disabled}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }}></span>
            <span style={{ fontWeight: 600 }}>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
