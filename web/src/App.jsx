import React, { useMemo, useState, useEffect, useRef, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { geoService } from './api/geoService'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Login } from './pages/Login'
import { LandingPage } from './pages/LandingPage'
import { ReportPage } from './pages/ReportPage'

// Lazy load view components
const WenquanView = React.lazy(() => import('./components/views/WenquanView').then(module => ({ default: module.WenquanView })));
const MonitoringView = React.lazy(() => import('./components/views/MonitoringView').then(module => ({ default: module.MonitoringView })));
const DashboardView = React.lazy(() => import('./components/views/DashboardView').then(module => ({ default: module.DashboardView })));
const TianwenView = React.lazy(() => import('./components/views/TianwenView').then(module => ({ default: module.TianwenView })));
const GuanxinView = React.lazy(() => import('./components/views/GuanxinView').then(module => ({ default: module.GuanxinView })));

/**
 * 排序查询词列表
 * @param {Array} list - 待排序的列表
 * @param {string} key - 排序键 (score, dimension, angle)
 * @param {string} dir - 排序方向 (asc, desc)
 * @returns {Array} - 排序后的新数组
 */
function sortQueries(list, key, dir) {
  const arr = [...list]
  if (key === 'score') {
    arr.sort((a, b) => {
      const av = typeof a.score?.total === 'number' ? a.score.total : -1
      const bv = typeof b.score?.total === 'number' ? b.score.total : -1
      return dir === 'asc' ? av - bv : bv - av
    })
  } else if (key === 'dimension') {
    arr.sort((a, b) => {
      const av = String(a.dimension || '')
      const bv = String(b.dimension || '')
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  } else if (key === 'angle') {
    arr.sort((a, b) => {
      const av = String(a.angle || '')
      const bv = String(b.angle || '')
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }
  return arr
}

/**
 * 主应用内容组件
 * 管理全局状态和路由（视图切换）
 */
function MainApp() {
  const { user, logout } = useAuth()
  // 当前视图状态：'观心' | '天问' | '文泉' | 'Dashboard' | '监控'
  const [view, setView] = useState('Dashboard')
  
  // 表单数据状态
  const [form, setForm] = useState({ productBrand: '', seedKeyword: '', sellingPoints: '' })
  
  // 核心数据状态
  const [decoded, setDecoded] = useState(null) // 解码结果
  const [mined, setMined] = useState([]) // 挖掘的查询词
  const [graph, setGraph] = useState({ nodes: [], links: [] }) // 图谱数据
  
  // UI 状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null) // 当前选中的查询词
  const [sort, setSort] = useState({ key: '', dir: 'desc' }) // 排序状态
  const [selectedQueries, setSelectedQueries] = useState(new Set()) // 手动勾选的查询词

  // 评估（天问）相关状态
  const [selectedModelsEval, setSelectedModelsEval] = useState([]) // 选中的评估模型
  const [preselectCountEval, setPreselectCountEval] = useState(20) // 评估选取的查询词数量
  const [countErrorEval, setCountErrorEval] = useState('')
  
  // 问答分析相关状态
  const [selectedModelsQA, setSelectedModelsQA] = useState([]) // 选中的问答模型
  const [preselectCountQA, setPreselectCountQA] = useState(20) // 问答选取的查询词数量
  const [countErrorQA, setCountErrorQA] = useState('')
  
  // 结果状态
  const [resultModels, setResultModels] = useState([]) // 产生结果的模型列表
  const [analysisResults, setAnalysisResults] = useState([]) // 分析结果列表
  const [domainCounts, setDomainCounts] = useState([]) // 域名统计结果
  
  // 模型选项列表
  const [modelOptions, setModelOptions] = useState([
    { key: 'wenxin', label: '百度文心' },
    { key: 'qwen', label: '千问' },
    { key: 'doubao', label: '豆包' },
    { key: 'deepseek', label: 'DeepSeek' },
    { key: 'kimi', label: 'Kimi' },
  ])
  
  // 初始化时获取可用模型
  useEffect(() => {
    geoService.getModels().then(r => {
      if (r && Array.isArray(r.models)) setModelOptions(r.models)
    }).catch(() => {})
  }, [])

  // 切换评估模型选择
  const toggleModelEval = (key) => {
    if (evaluating) return
    setSelectedModelsEval((prev) => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }
  
  // 切换问答模型选择
  const toggleModelQA = (key) => {
    if (evaluating) return
    setSelectedModelsQA((prev) => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }

  // 评估过程状态
  const [hvQueries, setHvQueries] = useState([]) // 高价值查询词
  const [evalResults, setEvalResults] = useState([]) // 评估结果
  const [evalProgress, setEvalProgress] = useState({ done: 0, total: 0, percent: 0 }) // 进度
  const [evaluating, setEvaluating] = useState(false) // 是否正在评估
  const [reportTaskId, setReportTaskId] = useState('') // 报告任务 ID
  const reportTimerRef = useRef(null) // 轮询定时器

  // 处理评估数量输入变更
  const onCountChangeEval = (e) => {
    const v = e.target.value
    const n = Number.parseInt(String(v || '').trim(), 10)
    if (!Number.isFinite(n) || String(v || '').trim() === '') {
      setCountErrorEval('请输入1-100的整数')
      setPreselectCountEval(0)
      return
    }
    if (n < 1 || n > 100) {
      setCountErrorEval('范围为1-100')
      setPreselectCountEval(n)
      return
    }
    setCountErrorEval('')
    setPreselectCountEval(n)
  }

  // 处理问答数量输入变更
  const onCountChangeQA = (e) => {
    const v = e.target.value
    const n = Number.parseInt(String(v || '').trim(), 10)
    if (!Number.isFinite(n) || String(v || '').trim() === '') {
      setCountErrorQA('请输入1-100的整数')
      setPreselectCountQA(0)
      return
    }
    if (n < 1 || n > 100) {
      setCountErrorQA('范围为1-100')
      setPreselectCountQA(n)
      return
    }
    setCountErrorQA('')
    setPreselectCountQA(n)
  }

  /**
   * 计算高价值查询词
   * 使用随机洗牌算法从列表中选取指定数量的项
   */
  const computeHighValue = (list, limit) => {
    const arr = Array.isArray(list) ? [...list] : []
    if (!arr.length) return []
    let n = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20
    if (n > arr.length) n = arr.length
    const idxs = Array.from({ length: arr.length }, (_, i) => i)
    // Fisher-Yates 洗牌算法
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t
    }
    const pick = idxs.slice(0, n).sort((a, b) => a - b)
    const res = pick.map(i => arr[i])
    return res
  }

  // 预览评估用的高价值查询词
  const hvPreviewEval = useMemo(() => {
    // 如果有手动选择的 query，优先使用
    if (selectedQueries.size > 0) {
      const manual = mined.filter(m => selectedQueries.has(m.query))
      if (manual.length > 0) return manual
    }

    const sortedLocal = (() => {
      const arr = [...mined]
      if (!arr.length) return []
      if (sort.key === 'score') {
        arr.sort((a, b) => {
          const av = typeof a.score?.total === 'number' ? a.score.total : -1
          const bv = typeof b.score?.total === 'number' ? b.score.total : -1
          return sort.dir === 'asc' ? av - bv : bv - av
        })
      } else if (sort.key === 'dimension') {
        arr.sort((a, b) => {
          const av = String(a.dimension || '')
          const bv = String(b.dimension || '')
          return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        })
      } else if (sort.key === 'angle') {
        arr.sort((a, b) => {
          const av = String(a.angle || '')
          const bv = String(b.angle || '')
          return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        })
      }
      return arr
    })()
    let hv = computeHighValue(sortedLocal, preselectCountEval)
    // 如果没有挖掘结果，使用默认样例
    if (!hv.length) {
      const samples = [
        'AEB紧急制动在城市路况表现怎么样？',
        '夜间无路灯遇到鬼探头能刹得住吗？',
        '高速遇到静止异物能否自动避让？',
        '儿童保护碰撞测试谁的分数更高？',
      ]
      hv = samples.slice(0, Math.max(1, Math.min(100, preselectCountEval || 1))).map(q => ({ query: q }))
    }
    return hv
  }, [mined, sort.key, sort.dir, preselectCountEval, selectedQueries])

  /**
   * 开始品牌评估任务
   * 创建报告并轮询状态
   */
  const startEvalBrand = async () => {
    if (!selectedModelsEval.length) {
      setError('请至少选择一个平台')
      return
    }
    // 自动补齐前置步骤：分析与挖掘
    if (!decoded) {
      await decode()
    }
    let minedList = mined
    if (!minedList.length) {
      minedList = await mine() || []
    }
    
    let hv
    if (selectedQueries.size > 0) {
      hv = minedList.filter(m => selectedQueries.has(m.query))
    } else {
      const sortedLocal = sortQueries(minedList, sort.key, sort.dir)
      hv = computeHighValue(sortedLocal, preselectCountEval)
    }

    setHvQueries(hv)
    setEvalResults([])
    const total = hv.length * selectedModelsEval.length
    setEvalProgress({ done: 0, total, percent: 0 })
    setEvaluating(true)
    setError('')
    try {
      // 创建报告任务
      const r = await geoService.createReport({ 
        product: form.productBrand, 
        brand: form.productBrand, 
        seedKeyword: form.seedKeyword, 
        sellingPoints: form.sellingPoints, 
        queries: hv, 
        providers: selectedModelsEval,
        mode: 'automation' // Enable automation flow
      })
      const id = String(r.id || '')
      setReportTaskId(id)
      setResultModels(selectedModelsEval)
      if (reportTimerRef.current) { clearInterval(reportTimerRef.current); reportTimerRef.current = null }
      
      // 轮询报告状态
      reportTimerRef.current = setInterval(async () => {
        try {
          const s = await geoService.getReportStatus(id)
          const pg = s.progress || { done: total, total, percent: 100 }
          setEvalProgress(pg)
          
          // Update real-time results
          if (Array.isArray(s.results)) {
            setEvalResults(s.results)
          }

          if ((s.status || '') === 'completed' || pg.percent >= 100) {
            clearInterval(reportTimerRef.current)
            reportTimerRef.current = null
            setEvaluating(false)
          }
        } catch {}
      }, 1000)
    } catch (e) {
      setError(String(e))
      setEvaluating(false)
    }
  }

  /**
   * 开始来源分析任务
   */
  const startEvalAnalysis = async () => {
    let minedList = mined
    if (!decoded || !form.productBrand || !form.seedKeyword) {
      minedList = []
    } else if (!minedList.length) {
      minedList = await mine() || []
    }
    const sortedLocal = sortQueries(minedList, sort.key, sort.dir)
    let hv = computeHighValue(sortedLocal, preselectCountQA)
    if (!hv.length) {
      const samples = [
        'AEB紧急制动在城市路况表现怎么样？',
        '夜间无路灯遇到鬼探头能刹得住吗？',
        '高速遇到静止异物能否自动避让？',
        '儿童保护碰撞测试谁的分数更高？',
      ]
      hv = samples.slice(0, Math.max(1, Math.min(100, preselectCountQA || 4))).map(q => ({ query: q }))
    }
    setHvQueries(hv)
    setEvalResults([])
    setEvaluating(true)
    const total = hv.length * selectedModelsQA.length
    setEvalProgress({ done: 0, total, percent: total ? 0 : 100 })
    setError('')
    const itemsAll = []
    const counts = new Map()
    let done = 0
    try {
      // 并发执行分析任务
      const tasks = selectedModelsQA.map(async (p) => {
        try {
          const r = await geoService.analyzeSources({ queries: hv, providers: [p] })
          const list = Array.isArray(r.items) ? r.items : []
          const doms = Array.isArray(r.domains) ? r.domains : []
          itemsAll.push(...list)
          doms.forEach(({ domain, count }) => {
            counts.set(domain, (counts.get(domain) || 0) + (count || 0))
          })
        } catch (e) {
        } finally {
          done += hv.length
          const percent = total ? Math.round((done / total) * 100) : 100
          setEvalProgress({ done, total, percent })
        }
      })
      await Promise.allSettled(tasks)
      setAnalysisResults(itemsAll)
      const domainList = Array.from(counts.entries()).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count)
      setDomainCounts(domainList)
    } catch (e) {
      setError('分析接口调用失败，请确认后端已启动并可访问。')
    } finally {
      setEvaluating(false)
      setResultModels(selectedModelsQA)
    }
  }

  // 获取指定查询词和模型的回应
  const getResponse = (qText, provider) => {
    const it = evalResults.find(r => r.query === qText && r.provider === provider)
    const txt = String(it?.response || '').trim()
    return txt ? txt : '(No response)'
  }

  // 获取指定查询词和模型的搜索结果
  const getSearchResults = (qText, provider) => {
    const it = evalResults.find(r => r.query === qText && r.provider === provider)
    // Try to get searchResults from response object (if nested) or direct property
    if (it?.searchResults) return it.searchResults;
    if (it?.response?.searchResults) return it.response.searchResults;
    return [];
  }

  // 获取指定查询词和模型的引用
  const getReferences = (qText, provider) => {
    const it = evalResults.find(r => r.query === qText && r.provider === provider)
    if (it?.references) return it.references;
    if (it?.response?.references) return it.response.references;
    return [];
  }
  
  // 获取指定查询词和模型的来源域名
  const getDomains = (qText, provider) => {
    const it = analysisResults.find(r => r.query === qText && r.provider === provider)
    return Array.isArray(it?.domains) ? it.domains : []
  }

  // 处理表单变更
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  // 导航跳转
  const goTianwen = () => {
    setView('天问')
  }
  const goWenquan = () => {
    setView('文泉')
  }

  /**
   * 解码：分析品牌和关键词
   */
  const decode = async () => {
    if (!form.productBrand || !form.seedKeyword) {
      setError('请填写“产品/品牌（必填）”与“核心关键词（必填）”')
      return
    }
    setLoading(true)
    setError('')
    try {
      const r = await geoService.decode({ product: form.productBrand, brand: form.productBrand, seedKeyword: form.seedKeyword, sellingPoints: form.sellingPoints })
      setDecoded(r)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  /**
   * 挖掘：生成相关查询词并构建图谱
   */
  const mine = async () => {
    if (!decoded) return
    setLoading(true)
    setError('')
    try {
      // 1. 先调用 generateGeoQuestions 生成10个问题
      let geoQuestions = []
      try {
        const geoRes = await geoService.generateGeoQuestions({
          brand: form.productBrand,
          keyword: form.seedKeyword
        })
        if (geoRes && Array.isArray(geoRes.questions)) {
          // 取前10个
          geoQuestions = geoRes.questions.slice(0, 10).map(q => ({
            query: typeof q === 'string' ? q : (q.question || q.query || JSON.stringify(q)),
            angle: '高频',
            dimension: '高频'
          }))
        }
      } catch (e) {
        console.error('Failed to generate GEO questions', e)
        // 不阻断后续流程
      }

      // 2. 继续原有的生成 query 思路
      const r = await geoService.mineQueries({ product: form.productBrand, brand: form.productBrand, seedKeyword: form.seedKeyword, channel: decoded.channel, signals: decoded.signals, category: decoded.category, direct: true })
      
      // 猜测每个查询词的维度
      const originalMined = r.list.map(x => ({ ...x, dimension: guessDimension(decoded.dimensions, x.angle) }))
      
      // 合并结果：GEO问题放在前面
      const enriched = [...geoQuestions, ...originalMined]
      
      setMined(enriched)
      // 构建图谱
      const g = await geoService.graph({ product: form.productBrand, brand: form.productBrand, seedKeyword: form.seedKeyword, mined: enriched })
      setGraph(g)
      setSelected(enriched[0] || null)
      // 异步获取评分
      try {
        const sr = await geoService.scoreQueries({ items: enriched.map(it => ({ query: it.query, angle: it.angle, dimension: it.dimension })) })
        const byQ = new Map(sr.list.map(it => [it.query, it.score]))
        setMined((prev) => prev.map(p => ({ ...p, score: byQ.get(p.query) || p.score })))
        setSelected((prev) => prev ? ({ ...prev, score: byQ.get(prev.query) || prev.score }) : prev)
      } catch {}
      return enriched
    } catch (e) {
      setError(String(e))
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * 根据角度猜测维度归属
   */
  const guessDimension = (dimensions, angle) => {
    for (const [dim, angles] of Object.entries(dimensions || {})) {
      if (angles.includes(angle)) return dim
    }
    return 'Unknown'
  }

  // 记忆化排序后的挖掘结果
  const sorted = useMemo(() => {
    const arr = [...mined]
    if (sort.key === 'score') {
      arr.sort((a, b) => {
        const av = typeof a.score?.total === 'number' ? a.score.total : -1
        const bv = typeof b.score?.total === 'number' ? b.score.total : -1
        return sort.dir === 'asc' ? av - bv : bv - av
      })
    } else if (sort.key === 'dimension') {
      arr.sort((a, b) => {
        const av = String(a.dimension || '')
        const bv = String(b.dimension || '')
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    } else if (sort.key === 'angle') {
      arr.sort((a, b) => {
        const av = String(a.angle || '')
        const bv = String(b.angle || '')
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return arr
  }, [mined, sort])

  // 切换排序方式
  const toggleSort = (k) => {
    setSort((prev) => (prev.key === k ? { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' }))
  }

  return (
    <div>
      <div className="nav">
        <div className="brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" fill="#1890FF"/>
          </svg>
          势擎GEO
        </div>
        <div className="menu">
          <a href="#" className={view === 'Dashboard' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setView('Dashboard') }}>Dashboard</a>
          <a href="#" className={view === '观心' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setView('观心') }}>观心</a>
          <a href="#" className={view === '天问' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setView('天问') }}>天问</a>
          <a href="#" className={view === '文泉' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setView('文泉') }}>文泉</a>
          <div style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <span style={{ color: '#666' }}>{user?.username}</span>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#666'
              }}
            >
              退出
            </button>
          </div>
        </div>
      </div>
      <div className="container">
        <style>{`
          .scroll-area { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
          .scroll-area::-webkit-scrollbar { width: 8px; }
          .scroll-area::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
          .scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
          .scroll-area::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
        <div className="hero">
          <div className="hero-title">势擎GEO {view}</div>
          <div className="hero-sub">SEO 时代争夺的是‘排名’，GEO 时代争夺的是‘答案’。</div>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</div>}
        
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#666' }}>加载视图组件中...</div>}>
          {view === '观心' && (
            <GuanxinView
              form={form}
              setForm={setForm}
              handleChange={handleChange}
              decode={decode}
              loading={loading}
              decoded={decoded}
              mine={mine}
              graph={graph}
              selected={selected}
              setSelected={setSelected}
              mined={sorted}
              sort={sort}
              toggleSort={toggleSort}
              goTianwen={goTianwen}
              selectedQueries={selectedQueries}
              setSelectedQueries={setSelectedQueries}
            />
          )}
          
          {view === '天问' && (
            <TianwenView
              modelOptions={modelOptions}
              selectedModelsEval={selectedModelsEval}
              toggleModelEval={toggleModelEval}
              evaluating={evaluating}
              preselectCountEval={preselectCountEval}
              onCountChangeEval={onCountChangeEval}
              countErrorEval={countErrorEval}
              hvPreviewEval={hvPreviewEval}
              evalProgress={evalProgress}
              reportTaskId={reportTaskId}
              startEvalBrand={startEvalBrand}
              hvQueries={hvQueries}
              resultModels={resultModels}
              getResponse={getResponse}
              getSearchResults={getSearchResults}
              getReferences={getReferences}
              selectedModelsQA={selectedModelsQA}
              toggleModelQA={toggleModelQA}
              preselectCountQA={preselectCountQA}
              onCountChangeQA={onCountChangeQA}
              countErrorQA={countErrorQA}
              startEvalAnalysis={startEvalAnalysis}
              goWenquan={goWenquan}
              getDomains={getDomains}
              domainCounts={domainCounts}
              manualCount={selectedQueries.size}
            />
          )}
          
          {view === '文泉' && <WenquanView />}
          {view === 'Dashboard' && <DashboardView domainCounts={domainCounts} />}
          {view === '监控' && <MonitoringView />}
        </Suspense>
        
        <footer style={{ marginTop: 20, borderTop: '1px solid var(--border)', padding: '16px 0' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" fill="#1890FF"/>
              </svg>
              <span style={{ fontWeight: 600 }}>势擎GEO · {view}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)', fontSize: 12 }}>
              <span>© 2025</span>
              <a href="#" style={{ color: 'var(--muted)' }}>隐私</a>
              <a href="#" style={{ color: 'var(--muted)' }}>条款</a>
              <a href="#" style={{ color: 'var(--muted)' }}>联系</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'#666'}}>系统加载中...</div>;
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          } />
          <Route path="/report/:id" element={
            <ReportPage />
          } />
          <Route path="/dashboard/*" element={
            <RequireAuth>
              <MainApp />
            </RequireAuth>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
