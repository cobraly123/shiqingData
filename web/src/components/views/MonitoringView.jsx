import React, { useState, useEffect } from 'react'
import { geoService } from '../../api/geoService'

/**
 * 监控视图组件
 * 核心功能：
 * 1. 日志监控：展示最近的 AI API 调用记录
 * 2. 日志管理：支持刷新和清空日志
 * 3. 状态追踪：展示调用时间、平台、模型、操作类型及成功与否
 */
export function MonitoringView() {
  const [logs, setLogs] = useState([])

  /**
   * 获取日志列表
   * 从后端获取最近的 200 条日志
   */
  const fetchLogs = async () => {
    try {
      const j = await geoService.getLogs(200)
      setLogs(j.logs || [])
    } catch (e) {
      console.error('Failed to fetch logs', e)
    }
  }

  // 组件挂载时自动获取日志
  useEffect(() => {
    fetchLogs()
  }, [])

  return (
    <div className="container">
      {/* 日志监控卡片 */}
      <div className="card" style={{ marginTop: -10, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>AI 访问日志</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>最近 200 条调用记录</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={fetchLogs}>刷新</button>
            <button className="btn btn-secondary" onClick={async () => { try { await geoService.clearLogs(); await fetchLogs() } catch {} }}>清空</button>
          </div>
        </div>
        
        {/* 日志表格 */}
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid var(--border)', padding: 8, textAlign: 'left', whiteSpace: 'nowrap' }}>时间</th>
                <th style={{ border: '1px solid var(--border)', padding: 8, textAlign: 'left' }}>平台</th>
                <th style={{ border: '1px solid var(--border)', padding: 8, textAlign: 'left' }}>模型</th>
                <th style={{ border: '1px solid var(--border)', padding: 8, textAlign: 'left' }}>操作</th>
                <th style={{ border: '1px solid var(--border)', padding: 8, textAlign: 'left' }}>Query</th>
                <th style={{ border: '1px solid var(--border)', padding: 8, textAlign: 'left' }}>成功</th>
                <th style={{ border: '1px solid var(--border)', padding: 8, textAlign: 'left' }}>错误</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid var(--border)', padding: 8, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{l.startedAt || ''}</td>
                  <td style={{ border: '1px solid var(--border)', padding: 8, verticalAlign: 'top' }}>{l.platform || ''}</td>
                  <td style={{ border: '1px solid var(--border)', padding: 8, verticalAlign: 'top' }}>{l.model || ''}</td>
                  <td style={{ border: '1px solid var(--border)', padding: 8, verticalAlign: 'top' }}>{l.operation || ''}</td>
                  <td style={{ border: '1px solid var(--border)', padding: 8, verticalAlign: 'top' }}>{l.query || ''}</td>
                  <td style={{ border: '1px solid var(--border)', padding: 8, verticalAlign: 'top' }}>{String(l.success)}</td>
                  <td style={{ border: '1px solid var(--border)', padding: 8, verticalAlign: 'top' }}>{l.error || ''}</td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td colSpan="7" style={{ border: '1px solid var(--border)', padding: 12, color: '#9ca3af', textAlign: 'center' }}>暂无日志</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
