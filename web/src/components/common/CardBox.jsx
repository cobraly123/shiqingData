import React from 'react'

/**
 * 通用卡片容器组件
 * 用于统一页面中的区块样式，提供边框和圆角
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 卡片内容
 * @param {Object} props.style - 自定义样式
 * @param {number|string} props.padding - 内边距，默认为 16
 */
export function CardBox({ children, style, padding = 16 }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding, ...(style || {}) }}>
      {children}
    </div>
  )
}
