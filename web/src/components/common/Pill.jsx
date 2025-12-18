import React from 'react'

/**
 * 胶囊样式标签组件
 * 用于展示短小的标签或状态
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 标签内容
 * @param {string} props.bg - 背景色，默认为淡蓝色
 * @param {string} props.color - 文字颜色，默认为深蓝色
 */
export function Pill({ children, bg = '#dbeafe', color = '#2563EB' }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: bg, color }}>{children}</span>
  )
}
