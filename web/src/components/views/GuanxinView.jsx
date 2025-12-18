import React from 'react'
import { GraphCanvas } from '../viz/GraphCanvas'
import { RowItem } from '../business/RowItem'

/**
 * 观心视图组件
 * 核心功能：
 * 1. 品牌/产品信息解码 (Decode)
 * 2. 查询词挖掘 (Mine)
 * 3. 知识图谱展示 (Graph)
 * 4. 查询词评分与筛选
 * 
 * @param {Object} props
 * @param {Object} props.form - 表单状态
 * @param {Function} props.setForm - 设置表单状态
 * @param {Function} props.handleChange - 处理表单变更
 * @param {Function} props.decode - 执行解码操作
 * @param {boolean} props.loading - 加载状态
 * @param {Object} props.decoded - 解码结果
 * @param {Function} props.mine - 执行挖掘操作
 * @param {Object} props.graph - 图谱数据
 * @param {Object} props.selected - 当前选中的查询词
 * @param {Function} props.setSelected - 设置选中查询词
 * @param {Array} props.mined - 挖掘出的查询词列表
 * @param {Object} props.sort - 排序状态
 * @param {Function} props.toggleSort - 切换排序方式
 * @param {Function} props.goTianwen - 跳转到天问视图
 */
export function GuanxinView({
  form,
  setForm,
  handleChange,
  decode,
  loading,
  decoded,
  mine,
  graph,
  selected,
  setSelected,
  mined,
  sort,
  toggleSort,
  goTianwen
}) {
  return (
    <>
      {/* 1. 信息输入卡片 */}
      <div className="card card-form">
        <div className="form-2col" style={{ marginBottom: 12 }}>
          <div>
            <label className="label" htmlFor="productBrand">产品/品牌名称 <span style={{ color: '#ef4444' }}>*</span></label>
            <input id="productBrand" className="input" name="productBrand" placeholder="如：问界 M9, iPhone 17" value={form.productBrand} onChange={handleChange} />
            <div style={{ height: 16 }} />
            <label className="label" htmlFor="seedKeyword">核心关键词 <span style={{ color: '#ef4444' }}>*</span></label>
            <input id="seedKeyword" className="input" name="seedKeyword" placeholder="如：安全, 去痘印, 商务宴请" value={form.seedKeyword} onChange={handleChange} />
          </div>
          <div>
            <label className="label" htmlFor="sellingPoints">核心卖点 (选填)</label>
            <textarea id="sellingPoints" className="textarea" name="sellingPoints" placeholder="如：数据安全认证, 100% 纯天然" value={form.sellingPoints} onChange={handleChange} />
          </div>
        </div>
        <button className="btn cta-btn" onClick={decode} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2"/>
            <path d="M20 20l-4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          开始分析
        </button>
      </div>

      <div className="divider" />

      {/* 2. 引导与示例 */}
      <div className="card">
        <div style={{ fontSize: 26, lineHeight: '32px' }}>✨</div>
        <div style={{ fontWeight: 700, marginTop: 6 }}>准备好开始研究？</div>
        <div style={{ color: 'var(--muted)', marginTop: 6 }}>
          根据关键词，深度分析用户意图，并找到最适合您的AI Query矩阵
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          <span className="chip" role="button" tabIndex={0} onClick={() => setForm({ ...form, seedKeyword: 'AI SEO 工具' })} onKeyDown={(e) => { if (e.key === 'Enter') setForm({ ...form, seedKeyword: 'AI SEO 工具' }) }}>示例：AI SEO 工具</span>
          <span className="chip" role="button" tabIndex={0} onClick={() => setForm({ ...form, seedKeyword: '内容营销策略' })} onKeyDown={(e) => { if (e.key === 'Enter') setForm({ ...form, seedKeyword: '内容营销策略' }) }}>示例：内容营销策略</span>
          <span className="chip" role="button" tabIndex={0} onClick={() => setForm({ ...form, seedKeyword: '跑鞋' })} onKeyDown={(e) => { if (e.key === 'Enter') setForm({ ...form, seedKeyword: '跑鞋' }) }}>示例：跑鞋</span>
        </div>
      </div>

      {/* 3. 解码结果展示 */}
      {decoded && (
        <div className="result">
          <div className="result-header">
            <strong>分析结果</strong>
            <span className="badge badge-primary">模型：{decoded.channelName}（{decoded.channel}）</span>
          </div>
          <div className="grid">
            <div className="card-sm">
              <div style={{ color: 'var(--muted)', marginBottom: 6 }}>心态画像</div>
              <div>
                {(decoded.persona?.persona || []).map((p, i) => (<span key={i} className="pill">{p}</span>))}
              </div>
            </div>
            <div className="card-sm">
              <div style={{ color: 'var(--muted)', marginBottom: 6 }}>竞品锚点</div>
              <div>
                {(decoded.persona?.competitors || []).map((p, i) => (<span key={i} className="pill">{p}</span>))}
              </div>
            </div>
            <div className="card-sm">
              <div style={{ color: 'var(--muted)', marginBottom: 6 }}>意图信号</div>
              <div>
                <span className="pill">{decoded.signals?.intentType || '未知意图'}</span>
              </div>
            </div>
          </div>
          {decoded.expandedSeeds?.length ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ color: 'var(--muted)', marginBottom: 6 }}>扩展关键词</div>
              <div>
                {decoded.expandedSeeds.map((p, i) => (<span key={i} className="pill">{p}</span>))}
              </div>
            </div>
          ) : null}
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={mine} disabled={loading}>挖掘Query并生成图谱</button>
          </div>
        </div>
      )}

      {/* 4. 图谱与挖掘结果 */}
      {graph?.nodes?.length ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 24, height: 600 }}>
              {/* 知识图谱画布 */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <GraphCanvas graph={graph} height={'100%'} onSelect={(q) => {
                  const found = mined.find(m => m.query === q.query) || { query: q.query, angle: q.angle, score: q.score }
                  setSelected(found)
                }} />
              </div>
              
              {/* 选中节点详情 */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', padding: 16 }}>
                <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 12 }}>节点洞察</div>
                {selected ? (
                  <div>
                    <div style={{ background: '#eff6ff', padding: 16, borderRadius: 12, fontWeight: 600, marginBottom: 12 }}>{selected.query}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>角度</div>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{selected.angle}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: 12 }}>维度</div>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{selected.dimension || '未知'}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12, gridColumn: '1 / span 2' }}>
                        <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>总分（100）</div>
                          <div style={{ fontWeight: 600 }}>{selected.score?.total ?? '暂无'}</div>
                        </div>
                      </div>
                    </div>
                    {/* 评分详情 */}
                    {selected.score ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                        <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>真实拟人（30）</div>
                          <div style={{ fontWeight: 600 }}>{selected.score.realism}</div>
                        </div>
                        <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>需求普适（20）</div>
                          <div style={{ fontWeight: 600 }}>{selected.score.demand}</div>
                        </div>
                        <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>用户习惯（20）</div>
                          <div style={{ fontWeight: 600 }}>{selected.score.habit}</div>
                        </div>
                        <div style={{ background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>策略对齐（30）</div>
                          <div style={{ fontWeight: 600 }}>{selected.score.align}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--muted)', marginTop: 12 }}>暂无评分</div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center', height: '100%' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 40 }}>🧭</div>
                      点击图谱节点查看详情
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
        
        {/* 5. 挖掘结果列表 */}
        <div className="card" style={{ marginTop: 12, padding: 16 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ height: 220, overflowY: 'auto' }}>
                <table className="table" style={{ margin: 0, borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f3f4f6', color: '#374151', borderBottom: '1px solid #d1d5db' }}>
                    <tr>
                      <th style={{ width: 90, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em', color: '#374151', cursor: 'pointer', borderRight: '1px solid #d1d5db' }} onClick={() => toggleSort('score')}>
                        评分 {sort.key === 'score' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em', color: '#374151', borderRight: '1px solid #d1d5db' }}>提问</th>
                      <th style={{ width: 140, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em', color: '#374151', cursor: 'pointer', borderRight: '1px solid #d1d5db' }} onClick={() => toggleSort('dimension')}>
                        维度 {sort.key === 'dimension' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ width: 160, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.08em', color: '#374151', cursor: 'pointer', borderRight: '1px solid #d1d5db' }} onClick={() => toggleSort('angle')}>
                        切角 {sort.key === 'angle' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mined.map((m, i) => (
                      <RowItem key={i} item={m} selected={selected} onSelect={setSelected} />
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
        
        {/* 6. 下一步引导 */}
        <div className="card" style={{ marginTop: 12, padding: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1E293B' }}>✨ 准备好开始体检?</div>
            <div style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>根据观心分析得出的prompt矩阵，帮助品牌展开多维度的GEO体检。</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {['示例：提及率','示例：首次提及率','示例：情绪影响'].map((t, i) => (
                <span key={i} style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 999, padding: '6px 10px', fontSize: 12 }}>{t}</span>
              ))}
            </div>
          <button className="btn cta-btn" onClick={goTianwen} disabled={loading}>进入天问，开始您的品牌体检</button>
        </div>
      </>
      ) : null}
    </>
  )
}
