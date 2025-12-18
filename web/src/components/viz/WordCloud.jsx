import React, { useState, useEffect, useRef } from 'react'

/**
 * 词云可视化组件
 * 使用 HTML Canvas 测量文本并计算无重叠布局
 * 支持螺旋布局和网格布局
 * 
 * @param {Object} props
 * @param {Array} props.items - 词云数据项数组，每项包含 { text, weight, color }
 * @param {number} props.width - 容器默认宽度
 * @param {number} props.height - 容器默认高度
 * @param {number} props.maxWords - 最大显示的词语数量
 * @param {number} props.minWeight - 最小权重阈值，低于此权重的词不显示
 * @param {number} props.fontScale - 字体大小缩放比例
 * @param {string} props.layout - 布局算法 'spiral' (螺旋) | 'grid' (网格)
 * @param {boolean} props.debug - 是否开启调试模式，输出布局日志
 */
export function WordCloud({ items, width = 360, height = 300, maxWords = Infinity, minWeight = 0, fontScale = 6, layout = 'spiral', debug = false }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: width, h: height })
  const [placed, setPlaced] = useState([]) // 已放置的词语列表

  // 监听容器尺寸变化
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.clientWidth || width
    const h = el.clientHeight || height
    setSize({ w, h })
    
    // 使用 ResizeObserver 监听容器大小变化
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nw = entry.contentRect.width
        const nh = entry.contentRect.height
        setSize({ w: Math.round(nw), h: Math.round(nh) })
      }
    }) : null
    if (ro) ro.observe(el)
    
    // 窗口缩放时的降级处理
    const onResize = () => {
      const ew = el.clientWidth || width
      const eh = el.clientHeight || height
      setSize({ w: ew, h: eh })
    }
    window.addEventListener('resize', onResize)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // 计算词语布局
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // 过滤和排序数据
    const source = [...items].filter(it => ((it.weight || 1) >= minWeight))
    const sorted = source.sort((a,b)=> (b.weight||1) - (a.weight||1)).slice(0, Number.isFinite(maxWords) ? maxWords : source.length)
    
    const placedRect = [] // 已放置的矩形区域，用于碰撞检测
    const out = [] // 输出结果
    const diagnostics = [] // 调试信息

    // 测量文本尺寸
    const measure = (t, fs, fw) => {
      ctx.font = `${fw || 600} ${fs}px system-ui, -apple-system, Inter, sans-serif`
      const w = Math.ceil(ctx.measureText(t).width)
      const h = Math.ceil(fs * 1.2)
      return { w, h }
    }
    
    const pad = 2 // 间距
    // 碰撞检测：检查新矩形是否与已放置的矩形重叠
    const collide = (r) => placedRect.some(p => !((r.x + r.w + pad) < p.x || (p.x + p.w + pad) < r.x || (r.y + r.h + pad) < p.y || (p.y + p.h + pad) < r.y))
    
    for (const it of sorted) {
      // 根据权重计算字体大小
      const base = Math.max(9, Math.min(28, Math.round((it.weight || 1) * fontScale)))
      const fw = (it.weight || 1) >= 4 ? 800 : 600
      let placedOne = false
      const cx = size.w / 2
      const cy = size.h / 2
      let attempts = 0
      
      // 尝试不同大小（如果放置失败则缩小字体）
      for (let shrink = 0; shrink < 10 && !placedOne; shrink++) {
        const fs = Math.max(9, base - shrink * 2)
        const m = measure(it.text, fs, fw)
        
        if (layout === 'spiral') {
          // 螺旋布局算法
          let angle = 0
          let radius = 0
          const golden = 3.883 // 黄金角近似值
          
          // 沿螺旋线尝试放置
          for (let step = 0; step < 1200; step++) {
            attempts++
            angle += golden
            radius += 2.0
            const x = Math.round(cx + Math.cos(angle) * radius - m.w / 2)
            const y = Math.round(cy + Math.sin(angle) * radius - m.h / 2)
            const rect = { x, y, w: m.w, h: m.h }
            
            // 检查边界
            if (x < pad || y < pad || x + m.w + pad > size.w || y + m.h + pad > size.h) continue
            // 检查碰撞
            if (collide(rect)) continue
            
            // 放置成功
            placedRect.push(rect)
            out.push({ ...it, x, y, fs, fw })
            placedOne = true
            break
          }
        } else {
          // 简单的网格布局算法（从左上角开始）
          let x = pad
          let y = pad
          const lineH = Math.ceil(fs * 1.3)
          while (y + m.h + pad <= size.h && !placedOne) {
            const rect = { x, y, w: m.w, h: m.h }
            attempts++
            if (x + m.w + pad > size.w) {
              x = pad
              y += lineH
              continue
            }
            if (collide(rect)) {
              x += Math.max(6, Math.floor(m.w * 0.25))
              continue
            }
            placedRect.push(rect)
            out.push({ ...it, x, y, fs, fw })
            placedOne = true
          }
        }
      }
      diagnostics.push({ text: it.text, weight: it.weight || 1, placed: placedOne, attempts })
    }
    
    setPlaced(out)
    
    if (debug) {
      try {
        const diag = { items: sorted.map(it => ({ text: it.text, weight: it.weight || 1 })), placed: out.length, total: sorted.length, details: diagnostics }
        window.__wordcloud_diag = diag
        console.table(diag.details)
        console.log('WordCloud items:', diag.items)
        console.log('WordCloud placed/total:', diag.placed, '/', diag.total)
      } catch {}
    }
  }, [items, size.w, size.h])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: height }}>
      {placed.map((it, i) => (
        <span key={i} style={{
          position: 'absolute', left: it.x, top: it.y, fontSize: it.fs, fontWeight: it.fw,
          color: it.color, whiteSpace: 'nowrap'
        }}>{it.text}</span>
      ))}
    </div>
  )
}
