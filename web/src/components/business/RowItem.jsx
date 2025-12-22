import React, { useState } from 'react'

/**
 * 表格行组件
 * 用于展示挖掘出的查询词信息
 * 
 * @param {Object} props
 * @param {Object} props.item - 数据项 { query, score, dimension, angle }
 * @param {Object} props.selected - 当前选中的项
 * @param {Function} props.onSelect - 选中回调
 * @param {boolean} props.checked - 是否被勾选
 * @param {Function} props.onCheck - 勾选回调
 */
export function RowItem({ item, selected, onSelect, checked, onCheck }) {
  const [hover, setHover] = useState(false)
  const active = selected?.query === item.query
  const bg = hover ? '#eff6ff' : active ? 'var(--bg)' : 'transparent'
  return (
    <tr
      style={{ background: bg, cursor: 'pointer', height: 40, borderBottom: '1px solid #d1d5db' }}
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <td style={{ borderRight: '1px solid #d1d5db', textAlign: 'center', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={!!checked} 
          onChange={(e) => onCheck(e.target.checked)}
          style={{ cursor: 'pointer' }} 
        />
      </td>
      <td style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
        {typeof item.score?.total === 'number' ? (
          <span style={{ display: 'inline-block', minWidth: 36, textAlign: 'center', padding: '4px 8px', borderRadius: 999, background: '#dcfce7', color: '#16a34a', fontWeight: 600 }}>{Math.round(item.score.total)}</span>
        ) : (
          <span style={{ display: 'inline-block', minWidth: 36, textAlign: 'center', padding: '4px 8px', borderRadius: 999, background: '#e5e7eb', color: '#374151' }}>—</span>
        )}
      </td>
      <td style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', color: '#111827' }}>{item.query}</div>
      </td>
      <td style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#dcfce7', color: '#16a34a' }}>{item.dimension}</span>
      </td>
      <td style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#b45309' }}>{item.angle}</span>
      </td>
    </tr>
  )
}
