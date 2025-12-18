import React, { useRef, useState, useEffect } from 'react'
import { Network, DataSet } from 'vis-network/standalone'

/**
 * 知识图谱画布组件
 * 使用 vis-network 库展示品牌、维度、角度和用户查询之间的关系
 * 支持物理引擎模拟、节点点击交互和子树折叠
 * 
 * @param {Object} props
 * @param {Object} props.graph - 图谱数据对象，包含 nodes 和 links
 * @param {string} props.height - 画布高度，默认为 '100vh'
 * @param {Function} props.onSelect - 节点选中时的回调函数
 */
export function GraphCanvas({ graph, height = '100vh', onSelect }) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const [physicsOn, setPhysicsOn] = useState(true) // 物理引擎开关状态
  const [collapsed, setCollapsed] = useState(new Set()) // 已折叠的节点 ID 集合
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // 节点类型对应的颜色配置
    const typeColor = {
      Product: '#2563eb',      // 蓝色
      GEO_Dimension: '#22c55e', // 绿色
      Angle: '#f59e0b',        // 橙色
      User_Query: '#e11d48',   // 红色
    }
    
    // 构建节点间的父子关系映射，用于折叠功能
    const children = new Map()
    for (const l of graph.links || []) {
      const arr = children.get(l.source) || []
      arr.push(l.target)
      children.set(l.source, arr)
    }
    
    // 计算需要隐藏的节点（基于折叠状态）
    const hidden = new Set()
    const markDesc = (id) => {
      const stack = [id]
      while (stack.length) {
        const cur = stack.pop()
        const ch = children.get(cur) || []
        for (const c of ch) {
          if (!hidden.has(c)) { hidden.add(c); stack.push(c) }
        }
      }
    }
    for (const id of Array.from(collapsed)) { markDesc(id) }
    
    // 构建 vis-network 节点数据
    const nodesArr = graph.nodes.filter(n => !hidden.has(n.id)).map(n => ({
      id: n.id,
      label: n.label,
      title: n.type === 'User_Query' ? `${n.label}\n角度：${n.angle || ''}` : n.label,
      color: {
        background: typeColor[n.type] || '#64748b',
        border: '#ffffff',
        highlight: { background: '#0ea5e9', border: '#ffffff' },
        hover: { background: '#38bdf8', border: '#ffffff' },
      },
      shape: 'dot',
      size: n.type === 'User_Query' ? 18 : 18,
      font: { color: '#111827', size: 12 },
    }))
    
    // 构建 vis-network 连线数据
    const edgesArr = graph.links.filter(l => !hidden.has(l.source) && !hidden.has(l.target)).map(l => ({
      from: l.source,
      to: l.target,
      arrows: 'to',
      width: l.type === 'EXPANDS_TO' ? 2 : l.type === 'HAS_ANGLE' ? 2 : 1,
      color: l.type === 'EXPANDS_TO' ? { color: '#22c55e', highlight: '#10b981' } : l.type === 'HAS_ANGLE' ? { color: '#f59e0b', highlight: '#f59e0b' } : { color: '#9ca3af', highlight: '#6b7280' },
      smooth: { type: 'curvedCW' },
    }))
    
    const data = { nodes: new DataSet(nodesArr), edges: new DataSet(edgesArr) }
    const options = {
      physics: { enabled: physicsOn, barnesHut: { gravitationalConstant: -3000, centralGravity: 0.4, springLength: 120, springConstant: 0.04 }, stabilization: { iterations: 50 } },
      interaction: { hover: true, tooltipDelay: 200, zoomView: true },
      nodes: { borderWidth: 2, shadow: true },
    }
    
    // 初始化网络实例
    const net = new Network(containerRef.current, data, options)
    networkRef.current = net
    
    // 绑定点击事件
    net.on('click', (p) => {
      const id = p.nodes[0]
      if (id) {
        if (onSelect) {
          const n = graph.nodes.find(x => x.id === id)
          if (n) onSelect(n)
        }
        // 切换折叠状态
        const newSet = new Set(collapsed)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setCollapsed(newSet)
      }
    })
    return () => { net.destroy() }
  }, [graph, physicsOn, collapsed, onSelect])

  return (
    <div style={{ position: 'relative', height, background: '#f8fafc', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 12, right: 12, background: 'white', padding: 8, borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={() => setPhysicsOn(!physicsOn)} style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4, background: physicsOn ? '#dbeafe' : 'white', color: physicsOn ? '#1e40af' : '#374151', cursor: 'pointer' }}>
          {physicsOn ? '物理引擎: ON' : '物理引擎: OFF'}
        </button>
        <div style={{ fontSize: 11, color: '#64748b' }}>Tip: 点击节点折叠/展开</div>
      </div>
    </div>
  )
}
