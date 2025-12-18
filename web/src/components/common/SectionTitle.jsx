import React from 'react'

/**
 * 区域标题组件
 * 用于统一页面中各个区块的标题样式
 * 
 * @param {Object} props
 * @param {string} props.text - 标题文本
 * @param {string} props.color - 字体颜色，默认为深灰色
 * @param {number|string} props.weight - 字体粗细，默认为 700
 * @param {number|string} props.mb - 底部外边距，默认为 8
 */
export function SectionTitle({ text, color = '#1E293B', weight = 700, mb = 8 }) {
  return (
    <div style={{ fontWeight: weight, marginBottom: mb, color }}>{text}</div>
  )
}
