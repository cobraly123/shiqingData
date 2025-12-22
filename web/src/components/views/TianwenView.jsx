import React from 'react'
import { ModelSelector } from '../business/ModelSelector'
import { ScrollPreviewCard } from '../common/ScrollPreviewCard'
import { CardBox } from '../common/CardBox'
import { SectionTitle } from '../common/SectionTitle'

/**
 * 天问视图组件
 * 核心功能：
 * 1. GEO 品牌体检：评估品牌在各大模型中的表现
 * 2. 媒体内容分布分析：分析大模型引用的媒体源（目前禁用）
 * 3. 引导用户进入文泉模块进行内容创作
 * 
 * @param {Object} props
 * @param {Array} props.modelOptions - 可用的模型选项列表
 * @param {Array} props.selectedModelsEval - 已选中的评估模型
 * @param {Function} props.toggleModelEval - 切换评估模型的选择状态
 * @param {boolean} props.evaluating - 是否正在进行评估
 * @param {number} props.preselectCountEval - 预选查询词数量
 * @param {Function} props.onCountChangeEval - 处理预选数量变更
 * @param {string} props.countErrorEval - 预选数量错误信息
 * @param {Array} props.hvPreviewEval - 预选结果预览列表
 * @param {Object} props.evalProgress - 评估进度对象 { percent, done, total }
 * @param {string} props.reportTaskId - 报告任务 ID
 * @param {Function} props.startEvalBrand - 开始品牌体检
 * @param {Array} props.hvQueries - 高价值查询词列表（评估结果）
 * @param {Array} props.resultModels - 产生结果的模型列表
 * @param {Function} props.getResponse - 获取特定查询词和模型的响应内容
 * @param {Array} props.selectedModelsQA - 已选中的 QA 分析模型
 * @param {Function} props.toggleModelQA - 切换 QA 分析模型的选择状态
 * @param {number} props.preselectCountQA - QA 分析预选数量
 * @param {Function} props.onCountChangeQA - 处理 QA 分析数量变更
 * @param {string} props.countErrorQA - QA 分析数量错误信息
 * @param {Function} props.startEvalAnalysis - 开始 QA 分析（目前禁用）
 * @param {Function} props.goWenquan - 跳转到文泉视图
 * @param {Function} props.getDomains - 获取域名信息
 * @param {Array} props.domainCounts - 域名统计数据
 */
export function TianwenView({
  modelOptions = [],
  selectedModelsEval = [],
  toggleModelEval,
  evaluating = false,
  preselectCountEval = 20,
  onCountChangeEval,
  countErrorEval = '',
  hvPreviewEval = [],
  evalProgress = { percent: 0, done: 0, total: 0 },
  reportTaskId = '',
  startEvalBrand,
  hvQueries = [],
  resultModels = [],
  getResponse,
  selectedModelsQA = [],
  toggleModelQA,
  preselectCountQA = 20,
  onCountChangeQA,
  countErrorQA = '',
  startEvalAnalysis,
  goWenquan,
  getDomains,
  domainCounts = [],
  manualCount = 0
}) {
  const isManual = manualCount > 0
  return (
    <div className="container">
      {/* 1. 品牌体检配置卡片 */}
      <div className="card" style={{ marginTop: -10, padding: 16 }}>
        <div style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ marginBottom: 6, fontWeight: 800, fontSize: 18 }}>GEO品牌体检</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>  
            精选用户关注品牌query以及大模型平台，开始体验
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gridTemplateRows: 'auto auto', gap: 12, alignItems: 'start' }}>
            {/* 目标测试平台选择 */}
            <div style={{ gridColumn: '1', gridRow: '1' }}>
              <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'left' }}>目标测试平台 </div>
              <ModelSelector options={modelOptions} selectedKeys={selectedModelsEval} onToggle={toggleModelEval} disabled={evaluating} />
            </div>
            
            {/* 预选 Query 数量设置 */}
            <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'left' }}>
              <label style={{ color: '#6b7280', fontSize: 12 }}>预选query数量</label>
              <input
                type="number"
                min={1}
                max={100}
                value={isManual ? manualCount : (preselectCountEval || '')}
                onChange={onCountChangeEval}
                onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
                inputMode="numeric"
                className="input"
                disabled={evaluating || (evalProgress.percent > 0 && evalProgress.percent < 100) || isManual}
                style={{ width: 100, cursor: (evaluating || (evalProgress.percent > 0 && evalProgress.percent < 100) || isManual) ? 'not-allowed' : 'text', opacity: (evaluating || (evalProgress.percent > 0 && evalProgress.percent < 100) || isManual) ? 0.6 : 1 }}
                placeholder="20"
              />
              <span style={{ color: '#6b7280', fontSize: 12 }}>个</span>
              {countErrorEval && !isManual && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{countErrorEval}</span>}
              {isManual && <span style={{ color: '#10b981', fontSize: 12 }}>（已使用观心手动选择的Query）</span>}
            </div>
            
            {/* 预选结果预览列表 */}
            <div style={{ gridColumn: '2', gridRow: '1 / span 2' }}>
              <ScrollPreviewCard height={120} title={`预选结果预览（${hvPreviewEval.length}）`} items={hvPreviewEval} renderItem={(q) => q.query} />
            </div>
          </div>
          
          {/* 进度条与操作按钮 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', columnGap: 0, marginTop: 16 }}>
            <div style={{ display: 'grid', gap: 6, width: '100%' }}>
              <div style={{ color: '#6b7280', fontSize: 12 , textAlign: 'left' }}>体检进度: {evalProgress.percent}% ({evalProgress.done} / {evalProgress.total})</div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, evalProgress.percent || 0))} style={{ background: '#e5e7eb', height: 8, borderRadius: 999, width: '100%' }}>
                <div style={{ width: `${Math.max(0, Math.min(100, evalProgress.percent || 0))}%`, background: '#3b82f6', height: 8, borderRadius: 999, transition: 'width 200ms ease' }}></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* 查看报告按钮 */}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (evalProgress.percent === 100 && reportTaskId) {
                    const url = `/report/${reportTaskId}`
                    window.open(url, '_blank')
                  }
                }}
                disabled={evalProgress.percent !== 100}
                style={{
                  background: '#ffffff',
                  color: evalProgress.percent === 100 ? '#111827' : '#9ca3af',
                  border: '1px solid var(--border)',
                  cursor: evalProgress.percent === 100 ? 'pointer' : 'not-allowed',
                  opacity: evalProgress.percent === 100 ? 1 : 0.6
                }}
              >
                {evalProgress.percent === 0 ? '暂无报告' : (evalProgress.percent === 100 ? '查看报告' : '报告生成中')}
              </button>
              
              {/* 开始体检按钮 */}
              <button className="btn" onClick={startEvalBrand} disabled={evaluating || !selectedModelsEval.length || !!countErrorEval || !preselectCountEval} style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', opacity: evaluating || !selectedModelsEval.length || !!countErrorEval || !preselectCountEval ? 0.7 : 1 }}>开始体检</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 2. 体检结果展示表格 (如果有结果且不在评估中) */}
      {hvQueries.length && !evaluating ? (
        <div className="card" style={{ marginTop: 12, padding: 0 }}>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 12, overflow: 'hidden' }}>
            <table className="table table-query-reply" style={{ margin: 0, borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f3f4f6', color: '#374151', borderBottom: '1px solid #d1d5db' }}>
                <tr>
                  <th style={{ width: 360, color: '#374151', borderRight: '1px solid #d1d5db' }}>Query</th>
                  {resultModels.map(m => (
                    <th key={m} style={{ width: 360, color: '#374151', borderRight: '1px solid #d1d5db' }}>{modelOptions.find(x => x.key === m)?.label || m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hvQueries.map((q, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #d1d5db' }}>
                    <td style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
                      <div style={{ textAlign: 'left', color: '#111827', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{q.query}</div>
                    </td>
                    {resultModels.map(m => (
                      <td key={m} style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
                        <div style={{ color: '#111827', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{getResponse(q.query, m)}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      
      {/* 3. 媒体内容分布分析 (目前功能入口已禁用) */}
      <div className="card" style={{ marginTop: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 18, marginTop: 8 }}>媒体内容分布分析</div>
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
          进行 GEO Query 分析，找到大模型引用的媒体网站源头，为溯源和内容生成提供参考。
        </div>
        <div style={{ color: '#6b7280', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 16, marginBottom: 8, textAlign: 'left' }}>目标测试平台 </div>
        <div style={{ justifyContent: 'left' }}>
          <ModelSelector options={modelOptions} selectedKeys={selectedModelsQA} onToggle={toggleModelQA} disabled={evaluating} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'left' }}>
          <label style={{ color: '#6b7280', fontSize: 12 }}>预选 query 数量</label>
          <input
            type="number"
            min={1}
            max={100}
            value={preselectCountQA || ''}
            onChange={onCountChangeQA}
            onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
            inputMode="numeric"
            className="input"
            style={{ width: 100 }}
            placeholder="20"
          />
          <span style={{ color: '#6b7280', fontSize: 12 }}>个</span>
          {countErrorQA && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{countErrorQA}</span>}
        </div>
        <div style={{ marginTop: 14 }}>
          <button
            className="btn cta-btn"
            onClick={startEvalAnalysis}
            disabled={true}
            aria-disabled={true}
            style={{
              background: '#9ca3af',
              color: '#ffffff',
              border: '1px solid #9ca3af',
              cursor: 'not-allowed',
              opacity: 0.85,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 11V8a4 4 0 118 0v3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <rect x="6" y="11" width="12" height="9" rx="2" fill="#fff" opacity="0.85"/>
            </svg>
            开始 GEO Query 分析
          </button>
        </div>
      </div>
      
      {/* 4. 引导进入文泉模块 */}
      <div className="card" style={{ marginTop: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1E293B' }}>✨ 准备好开始创作内容?</div>
          <div style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>根据品牌体检的结果和内容分布的分析，为品牌创作定制化的内容。</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {['示例：小红书','示例：微信公众号','示例：百家号'].map((t, i) => (
              <span key={i} style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 999, padding: '6px 10px', fontSize: 12 }}>{t}</span>
            ))}
          </div>
        <button className="btn cta-btn" onClick={goWenquan}>进入文泉，开始您的内容创建与分发</button>
      </div>
      
      {/* 5. 隐藏的分析表格容器 (可能是遗留代码或调试用) */}
      {hvQueries.length ? (
        <div className="card analysis-table-container analysis-table-hidden" style={{ marginTop: 12, padding: 0 }}>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 12, overflow: 'hidden' }}>
            <table className="table" style={{ margin: 0, borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f3f4f6', color: '#374151', borderBottom: '1px solid #d1d5db' }}>
                <tr>
                  <th style={{ width: 360, color: '#374151', borderRight: '1px solid #d1d5db' }}>Query</th>
                  {resultModels.map(m => (
                    <th key={m} style={{ width: 360, color: '#374151', borderRight: '1px solid #d1d5db' }}>{modelOptions.find(x => x.key === m)?.label || m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hvQueries.map((q, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #d1d5db' }}>
                    <td style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
                      <div style={{ textAlign: 'left', color: '#111827', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{q.query}</div>
                    </td>
                    {resultModels.map(m => (
                      <td key={m} style={{ borderRight: '1px solid #d1d5db', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {getDomains(q.query, m).map((d, idx) => (
                            <span key={idx} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3' }}>{d}</span>
                          ))}
                          {!getDomains(q.query, m).length ? (
                            <span style={{ color: '#9ca3af' }}>—</span>
                          ) : null}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {domainCounts.length ? (
        <div className="card" style={{ marginTop: 12, padding: 16 }}>
          <CardBox style={{ padding: 0, border: 'none' }}>
            <SectionTitle text="域名影响力" />
            <div style={{ display: 'grid', gap: 8 }}>
            {domainCounts.slice(0, 12).map((it, i) => {
              const max = domainCounts[0]?.count || 1
              const w = Math.max(6, Math.round((it.count / max) * 100))
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 60px', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: '#111827' }}>{it.domain}</div>
                  <div style={{ background: '#f3f4f6', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${w}%`, background: '#3b82f6', height: '100%' }}></div>
                  </div>
                  <div style={{ textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{it.count}</div>
                </div>
              )
            })}
            </div>
          </CardBox>
        </div>
      ) : null}
    </div>
  )
}
