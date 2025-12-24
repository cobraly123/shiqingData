import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { geoService } from '../api/geoService';
import { ResponseAnalyzer } from '../utils/ResponseAnalyzer';
import { MonitoringSelector } from '../components/business/MonitoringSelector';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Download, RefreshCw, Edit, Share2, HelpCircle, Target, TrendingUp, Users, FileJson, ChevronDown, ChevronRight, X, ExternalLink, BookOpen } from 'lucide-react';

export function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedResults, setProcessedResults] = useState([]);
  const [analysisStats, setAnalysisStats] = useState(null);
  
  // Interactive State
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState('');
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [currentSources, setCurrentSources] = useState([]);

  const handleShowSources = (sources) => {
    setCurrentSources(sources || []);
    setShowSourcePanel(true);
  };

  // AI Analysis State
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [competitorAnalysis, setCompetitorAnalysis] = useState([]);
  const [brandAnalysis, setBrandAnalysis] = useState(null);

  // Check for Print Mode
  const isPrintMode = new URLSearchParams(window.location.search).get('print') === 'true';

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await geoService.getReport(id);
        setReport(data);
        if (data.queries && data.queries.length > 0) {
             // Default to first query if none selected? No, show all by default
             // But for selector, maybe?
             // setSelectedQuery(data.queries[0].query);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReport();
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>加载报告中...</div>;
  if (error) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'red' }}>{error}</div>;
  if (!report) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>未找到报告</div>;

  // Process data
  const { results = [], queries = [], providers = [], input = {} } = report || {};
  const brandName = input?.brand || '品牌';

  // --- Analysis Logic ---
  
  // 1. Question Stats
  const activeQueries = selectedQuery ? queries.filter(q => q.query === selectedQuery) : queries;

  // 2. Content Analysis (Brand & Competitors) using Backend Analysis Only

  // Helper to extract text from response (which might be an object)
  const getResponseText = (response) => {
    if (response === null || response === undefined) return '';
    if (typeof response === 'string') return response;
    
    if (typeof response === 'object') {
        // Prioritize 'text' or 'content' fields
        const candidate = response.text || response.content;
        if (typeof candidate === 'string') return candidate;
        
        // Handle nested objects if necessary (e.g. response.text is an object)
        if (candidate && typeof candidate === 'object') {
            return getResponseText(candidate);
        }
        
        // Fallback to JSON string for debugging/display
        try {
            return JSON.stringify(response);
        } catch (e) {
            return '[Object]';
        }
    }
    return String(response);
  };

  // AI Analysis Handler
  // Removed client-side AI analysis handler

  // 1. Analyze ALL results first (Global Analysis Phase)
  const allAnalyzedResults = results.map(r => {
    const responseText = getResponseText(r.response);
    const sources = (r.response && typeof r.response === 'object' && r.response.sources) ? r.response.sources : [];
    
    // Only use backend analysis
    if (r.analysis && Array.isArray(r.analysis.extractedBrands)) {
         const brands = r.analysis.extractedBrands;
         
         // Adapt to frontend structure
         const detectedCompetitors = brands.map((b, idx) => ({
             name: b,
             mentions: 1, // Assume 1 mention per response for now
             ranking: {
                 bestRank: idx + 1,
                 positions: [idx + 1]
             }
         }));

         // Determine target brand stats from the list
         // We look for partial match with brandName
         const targetIndex = brands.findIndex(b => 
            b.toLowerCase().includes(brandName.toLowerCase()) || 
            brandName.toLowerCase().includes(b.toLowerCase())
         );
         
         const brandRank = targetIndex !== -1 ? targetIndex + 1 : null;
         const mentionCount = targetIndex !== -1 ? 1 : 0;

         return {
             ...r,
             isAnalyzed: true,
             responseText,
             sources, // Pass sources to UI state
             mentionCount,
             brandRank,
             detectedCompetitors,
             analysis: r.analysis // Keep raw analysis
         };
    }

    // Fallback if no backend analysis
    return {
        ...r,
        isAnalyzed: false,
        responseText,
        sources,
        mentionCount: 0,
        brandRank: null,
        detectedCompetitors: []
    };
  });

  // Filter based on UI state (Query / Provider)
  const filteredResults = allAnalyzedResults.filter(r => {
      if (selectedQuery && r.query !== selectedQuery) return false;
      if (selectedProvider && r.provider !== selectedProvider) return false;
      return true;
  });

  // Aggregate Stats from FILTERED results (for display)
  // But wait, the "Competitor Analysis" section usually wants to show aggregate of ALL or FILTERED?
  // Usually dashboards show aggregate of current selection.
  
  // Let's aggregate from filteredResults
  
  // 1. Brand Stats
  const totalMentions = filteredResults.reduce((sum, r) => sum + r.mentionCount, 0);
  const mentionRate = filteredResults.length > 0 ? ((totalMentions / filteredResults.length) * 100).toFixed(1) + '%' : '0%';
  
  // Rank Distribution
  const rankDist = { '1': 0, '2': 0, '3': 0, '4+': 0, 'unranked': 0 };
  filteredResults.forEach(r => {
      if (r.brandRank) {
          if (r.brandRank === 1) rankDist['1']++;
          else if (r.brandRank === 2) rankDist['2']++;
          else if (r.brandRank === 3) rankDist['3']++;
          else rankDist['4+']++;
      } else if (r.mentionCount > 0) {
          rankDist['unranked']++; // Mentioned but no rank? Should not happen with list logic, but possible
      }
  });

  // 2. Competitor Stats (Aggregated)
  const competitorMap = new Map();
  filteredResults.forEach(r => {
      r.detectedCompetitors.forEach(c => {
          // Exclude target brand itself if it appears in competitor list (it shouldn't if logic is clean)
          if (c.name.toLowerCase().includes(brandName.toLowerCase())) return;

          if (!competitorMap.has(c.name)) {
              competitorMap.set(c.name, { count: 0, ranks: [] });
          }
          const entry = competitorMap.get(c.name);
          entry.count++;
          if (c.ranking && c.ranking.bestRank) entry.ranks.push(c.ranking.bestRank);
      });
  });

  const sortedCompetitors = Array.from(competitorMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      bestRank: data.ranks.length > 0 ? Math.min(...data.ranks) : '-'
  })).sort((a, b) => b.count - a.count).slice(0, 10); // Top 10

  // 3. URL Analysis (Unique list)
  const allSearchResults = filteredResults.flatMap(r => {
      const resp = r.response || {};
      if (Array.isArray(resp.searchResults) && resp.searchResults.length > 0) {
          return resp.searchResults;
      }
      // Fallback for Qwen: sometimes in references?
      // Actually Qwen 'references' are usually search results.
      if (r.provider === 'Qwen' && Array.isArray(resp.references)) {
          return resp.references;
      }
      return Array.isArray(resp.searchResults) ? resp.searchResults : [];
  });
  
  const allReferences = filteredResults.flatMap(r => {
      const resp = r.response || {};
      
      // 1. Prefer formattedReferences (contains explicit '信源域名')
      if (Array.isArray(resp.formattedReferences) && resp.formattedReferences.length > 0) {
          return resp.formattedReferences.map(ref => ({
              ...ref,
              title: ref['信源文章名'] || ref.title,
              url: ref['信源URL'] || ref.url,
              domain: ref['信源域名'] || ref.domain
          }));
      }

      // 2. Fallback to raw references
      if (Array.isArray(resp.references) && resp.references.length > 0) {
          return resp.references;
      }
      return Array.isArray(resp.sources) ? resp.sources : [];
  });
  
  // Left: Source Domain Analysis (based on References)
  const sourceDomainStats = processUrlList(allReferences);
  
  // Right: Source Content Analysis (based on References)
  const sourceContentStats = processContentList(allReferences);

  // Helper for Print Mode: Render Query Analysis
  const renderQueryAnalysis = (queryObj) => {
      const qText = queryObj.query;
      const qResults = allAnalyzedResults.filter(r => r.query === qText);
      if (qResults.length === 0) return null;

      const qTotalMentions = qResults.reduce((sum, r) => sum + r.mentionCount, 0);
      const qMentionRate = ((qTotalMentions / qResults.length) * 100).toFixed(1) + '%';
      
      const qRankDist = { '1': 0, '2': 0, '3': 0, '4+': 0, 'unranked': 0 };
      qResults.forEach(r => {
          if (r.brandRank) {
             if (r.brandRank === 1) qRankDist['1']++;
             else if (r.brandRank === 2) qRankDist['2']++;
             else if (r.brandRank === 3) qRankDist['3']++;
             else qRankDist['4+']++;
          } else if (r.mentionCount > 0) {
             qRankDist['unranked']++;
          }
      });

      const qCompetitorMap = new Map();
      qResults.forEach(r => {
          r.detectedCompetitors.forEach(c => {
              if (c.name.toLowerCase().includes(brandName.toLowerCase())) return;
              if (!qCompetitorMap.has(c.name)) {
                  qCompetitorMap.set(c.name, { count: 0, ranks: [] });
              }
              const entry = qCompetitorMap.get(c.name);
              entry.count++;
              if (c.ranking && c.ranking.bestRank) entry.ranks.push(c.ranking.bestRank);
          });
      });
      const qSortedCompetitors = Array.from(qCompetitorMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          bestRank: data.ranks.length > 0 ? Math.min(...data.ranks) : '-'
      })).sort((a, b) => b.count - a.count).slice(0, 10);

      return (
          <div key={qText} style={{ marginTop: '40px', pageBreakBefore: 'always' }}>
              <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '24px', borderLeft: '4px solid #10b981' }}>
                  <h2 style={{ margin: 0, color: '#064e3b', fontSize: '24px' }}>Query: {qText}</h2>
                  <p style={{ margin: '4px 0 0 0', color: '#059669' }}>基于 {qResults.length} 条回复</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                 <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>品牌提及率</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{qMentionRate}</div>
                 </div>
                 <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>首位推荐率</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                        {qResults.length > 0 ? ((qRankDist['1'] / qResults.length) * 100).toFixed(1) + '%' : '0%'}
                    </div>
                 </div>
                 <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>主要竞品</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginTop: '4px' }}>
                        {qSortedCompetitors.slice(0, 3).map(c => c.name).join(', ') || '无'}
                    </div>
                 </div>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
                   <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>该 Query 下的竞品表现</h3>
                   <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                       <thead>
                           <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                               <th style={{ padding: '8px' }}>竞品</th>
                               <th style={{ padding: '8px' }}>频次</th>
                               <th style={{ padding: '8px' }}>最佳排名</th>
                           </tr>
                       </thead>
                       <tbody>
                           {qSortedCompetitors.map((c, i) => (
                               <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                   <td style={{ padding: '8px' }}>{c.name}</td>
                                   <td style={{ padding: '8px' }}>{c.count}</td>
                                   <td style={{ padding: '8px' }}>#{c.bestRank}</td>
                               </tr>
                           ))}
                           {qSortedCompetitors.length === 0 && (
                               <tr><td colSpan="3" style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>无竞品数据</td></tr>
                           )}
                       </tbody>
                   </table>
              </div>
          </div>
      );
  };

  // Helper for Print Mode: Render Provider Analysis
  const renderProviderAnalysis = (provider) => {
      const pResults = allAnalyzedResults.filter(r => r.provider === provider);
      if (pResults.length === 0) return null;

      // 1. Stats
      const pTotalMentions = pResults.reduce((sum, r) => sum + r.mentionCount, 0);
      const pMentionRate = ((pTotalMentions / pResults.length) * 100).toFixed(1) + '%';
      
      const pRankDist = { '1': 0, '2': 0, '3': 0, '4+': 0, 'unranked': 0 };
      pResults.forEach(r => {
          if (r.brandRank) {
             if (r.brandRank === 1) pRankDist['1']++;
             else if (r.brandRank === 2) pRankDist['2']++;
             else if (r.brandRank === 3) pRankDist['3']++;
             else pRankDist['4+']++;
          } else if (r.mentionCount > 0) {
             pRankDist['unranked']++;
          }
      });

      // 2. Competitors
      const pCompetitorMap = new Map();
      pResults.forEach(r => {
          r.detectedCompetitors.forEach(c => {
              if (c.name.toLowerCase().includes(brandName.toLowerCase())) return;
              if (!pCompetitorMap.has(c.name)) {
                  pCompetitorMap.set(c.name, { count: 0, ranks: [] });
              }
              const entry = pCompetitorMap.get(c.name);
              entry.count++;
              if (c.ranking && c.ranking.bestRank) entry.ranks.push(c.ranking.bestRank);
          });
      });
      const pSortedCompetitors = Array.from(pCompetitorMap.entries()).map(([name, data]) => ({
          name,
          count: data.count,
          bestRank: data.ranks.length > 0 ? Math.min(...data.ranks) : '-'
      })).sort((a, b) => b.count - a.count).slice(0, 10);

      // 3. Sources
      const pAllReferences = pResults.flatMap(r => {
          const resp = r.response || {};
          if (Array.isArray(resp.formattedReferences) && resp.formattedReferences.length > 0) {
              return resp.formattedReferences.map(ref => ({
                  ...ref,
                  title: ref['信源文章名'] || ref.title,
                  url: ref['信源URL'] || ref.url,
                  domain: ref['信源域名'] || ref.domain
              }));
          }
          if (Array.isArray(resp.references) && resp.references.length > 0) return resp.references;
          return Array.isArray(resp.sources) ? resp.sources : [];
      });
      
      const pSourceDomainStats = processUrlList(pAllReferences);

      return (
          <div key={provider} style={{ marginTop: '40px', pageBreakBefore: 'always' }}>
              <div style={{ padding: '16px', background: '#e0e7ff', borderRadius: '8px', marginBottom: '24px', borderLeft: '4px solid #4f46e5' }}>
                  <h2 style={{ margin: 0, color: '#312e81', fontSize: '24px' }}>{provider} 平台详细分析</h2>
                  <p style={{ margin: '4px 0 0 0', color: '#4338ca' }}>基于 {pResults.length} 条回复</p>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                 <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>品牌提及率</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{pMentionRate}</div>
                 </div>
                 <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>首位推荐率</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                        {pResults.length > 0 ? ((pRankDist['1'] / pResults.length) * 100).toFixed(1) + '%' : '0%'}
                    </div>
                 </div>
                 <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>主要竞品</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827', marginTop: '4px' }}>
                        {pSortedCompetitors.slice(0, 3).map(c => c.name).join(', ') || '无'}
                    </div>
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Competitor Table */}
                  <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
                       <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>竞品排名分布</h3>
                       <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                           <thead>
                               <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                                   <th style={{ padding: '8px' }}>竞品</th>
                                   <th style={{ padding: '8px' }}>频次</th>
                                   <th style={{ padding: '8px' }}>最佳排名</th>
                               </tr>
                           </thead>
                           <tbody>
                               {pSortedCompetitors.map((c, i) => (
                                   <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                       <td style={{ padding: '8px' }}>{c.name}</td>
                                       <td style={{ padding: '8px' }}>{c.count}</td>
                                       <td style={{ padding: '8px' }}>#{c.bestRank}</td>
                                   </tr>
                               ))}
                               {pSortedCompetitors.length === 0 && (
                                   <tr><td colSpan="3" style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>无竞品数据</td></tr>
                               )}
                           </tbody>
                       </table>
                  </div>

                  {/* Source Stats */}
                  <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
                       <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>核心信源域名</h3>
                       <DomainAnalysisTable items={pSourceDomainStats.slice(0, 10)} emptyText="无数据" />
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', paddingBottom: '40px' }}>
      
      {/* Header - Hide in Print Mode */}
      {!isPrintMode && (
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/')} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>
                <ArrowLeft size={20} color="#374151" />
            </button>
            <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                    GEO 诊断报告
                    <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginLeft: '12px' }}>
                        {input.brand}
                    </span>
                </h1>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                    任务ID: {id} • 生成时间: {new Date(report.createdAt).toLocaleString()}
                </div>
            </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
             <button style={btnStyle}>
                <Share2 size={16} /> 分享
             </button>
             <button style={btnStyle}>
                <Download size={16} /> 导出
             </button>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Filters - Hide in Print Mode */}
        {!isPrintMode && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
             <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                 <div style={{ flex: 1, minWidth: '200px' }}>
                     <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>查询词 (Query)</label>
                     <select 
                        value={selectedQuery} 
                        onChange={(e) => setSelectedQuery(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                     >
                         <option value="">全部 ({queries.length})</option>
                         {queries.map((q, i) => (
                             <option key={i} value={q.query}>{q.query}</option>
                         ))}
                     </select>
                 </div>
                 <div style={{ flex: 1, minWidth: '200px' }}>
                     <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>AI 平台 (Model)</label>
                     <select 
                        value={selectedProvider || ''} 
                        onChange={(e) => setSelectedProvider(e.target.value || null)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                     >
                         <option value="">全部 ({providers.length})</option>
                         {providers.map((p, i) => (
                             <option key={i} value={p}>{p}</option>
                         ))}
                     </select>
                 </div>
             </div>
        </div>
        )}

        {/* 1. Score Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <StatCard 
                title="品牌提及率 (Mentions)" 
                value={mentionRate} 
                subText={`在 ${filteredResults.length} 条回复中提及 ${totalMentions} 次`}
                color="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                icon={<Target size={18} color="white" />}
            />
            <StatCard 
                title="首位推荐率 (Rank #1)" 
                value={filteredResults.length > 0 ? ((rankDist['1'] / filteredResults.length) * 100).toFixed(1) + '%' : '0%'} 
                subText={`获得第一名推荐 ${rankDist['1']} 次`}
                color="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                icon={<TrendingUp size={18} color="white" />}
            />
            <StatCard 
                title="前三推荐率 (Top 3)" 
                value={filteredResults.length > 0 ? (((rankDist['1'] + rankDist['2'] + rankDist['3']) / filteredResults.length) * 100).toFixed(1) + '%' : '0%'} 
                subText={`进入前三名推荐 ${rankDist['1'] + rankDist['2'] + rankDist['3']} 次`}
                color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                icon={<Users size={18} color="white" />}
            />
            <StatCard 
                title="已分析回复数" 
                value={filteredResults.length} 
                subText={`总计 ${results.length} 条回复`}
                color="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
                icon={<FileJson size={18} color="white" />}
            />
        </div>

        {/* 2. Rank Distribution Chart & Competitor Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* 2.1 Rank Distribution */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
               <SectionHeader title="2. 品牌排名分布" subtitle="AI 回复中品牌出现的排名位置分布" />
               <div style={{ height: '300px', marginTop: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                     <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '12px', textAlign: 'left' }}>
                           <th style={{ padding: '8px' }}>平台</th>
                           <th style={{ padding: '8px', textAlign: 'center' }}>Rank 1</th>
                           <th style={{ padding: '8px', textAlign: 'center' }}>Rank 2</th>
                           <th style={{ padding: '8px', textAlign: 'center' }}>Rank 3</th>
                           <th style={{ padding: '8px', textAlign: 'center' }}>4+</th>
                           <th style={{ padding: '8px', textAlign: 'center' }}>未排名</th>
                        </tr>
                     </thead>
                     <tbody>
                        {providers.map(provider => {
                            // Calculate stats per provider
                            const pResults = filteredResults.filter(r => r.provider === provider);
                            const pRanks = { '1': 0, '2': 0, '3': 0, '4+': 0, 'unranked': 0 };
                            pResults.forEach(r => {
                                if (r.brandRank) {
                                    if (r.brandRank === 1) pRanks['1']++;
                                    else if (r.brandRank === 2) pRanks['2']++;
                                    else if (r.brandRank === 3) pRanks['3']++;
                                    else pRanks['4+']++;
                                } else if (r.mentionCount > 0) {
                                    pRanks['unranked']++;
                                }
                            });
                            
                            return { provider, ranks: pRanks };
                        }).map((p, i) => (
                           <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '14px' }}>
                              <td style={{ padding: '12px', fontWeight: '500' }}>{p.provider}</td>
                              <td style={{ padding: '12px', textAlign: 'center', background: p.ranks[1] > 0 ? '#ecfdf5' : 'transparent', color: p.ranks[1] > 0 ? '#059669' : 'inherit' }}>{p.ranks[1] || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center', background: p.ranks[2] > 0 ? '#f0f9ff' : 'transparent' }}>{p.ranks[2] || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center', background: p.ranks[3] > 0 ? '#fefce8' : 'transparent' }}>{p.ranks[3] || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>{p.ranks['4+'] || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>{p.ranks['unranked'] || '-'}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
                  * "未排名" 指品牌在回复中被提及，但未出现在明确的有序列表（如 1. 2. 3.）中。
               </div>
            </div>

            {/* 3. Competitor Analysis */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <SectionHeader 
                    title="3. 竞品与排名分析" 
                    subtitle={`基于 ${filteredResults.length}/${results.length} 条有效回复的分析结果`} 
                  />
               </div>
               <div style={{ marginTop: '0px' }}>
                  {sortedCompetitors.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                       <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                             <th style={{ padding: '8px', textAlign: 'left' }}>竞品/实体名称</th>
                             <th style={{ padding: '8px', textAlign: 'center' }}>出现频次</th>
                             <th style={{ padding: '8px', textAlign: 'center' }}>最佳排名</th>
                          </tr>
                       </thead>
                       <tbody>
                          {sortedCompetitors.map((c, i) => (
                             <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px', fontWeight: '500' }}>{c.name}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{c.count}</td>
                                <td style={{ padding: '8px', textAlign: 'center', color: c.bestRank <= 3 ? '#10b981' : '#6b7280' }}>#{c.bestRank}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: '#f9fafb', borderRadius: '8px' }}>
                       {filteredResults.length === 0 ? (
                         "当前筛选条件下无回复数据"
                       ) : (
                         "模型在当前回复中未提及任何其他品牌"
                       )}
                    </div>
                  )}
               </div>
            </div>
        </div>

        {/* Detailed List */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
           <SectionHeader title="详细回复列表" subtitle="所有模型的原始回复内容" />
           <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                 <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                       <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#4b5563', width: '200px' }}>Query / 平台</th>
                       <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>回复详情</th>
                    </tr>
                 </thead>
                 <tbody>
                    {filteredResults.map((r, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                             <div style={{ fontWeight: '500', marginBottom: '4px' }}>{String(r.query)}</div>
                             <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#eff6ff', color: '#2563eb', fontSize: '12px' }}>
                                {String(r.provider)}
                             </span>
                          </td>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                             <div style={{ 
                                whiteSpace: 'pre-wrap', 
                                color: '#374151', 
                                fontSize: '13px', 
                                lineHeight: '1.6',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                background: '#f9fafb',
                                padding: '12px',
                                borderRadius: '8px'
                             }}>
                                {r.responseText || <span style={{ color: '#9ca3af' }}>(无回复)</span>}
                                {r.sources && r.sources.length > 0 && (
                                    <div style={{ marginTop: '12px', display: 'flex' }}>
                                        {isPrintMode ? (
                                            <div style={{ width: '100%', background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>引用来源 ({r.sources.length}):</div>
                                                {r.sources.map((s, idx) => (
                                                    <div key={idx} style={{ fontSize: '11px', color: '#1e3a8a', marginBottom: '4px', display: 'flex', gap: '4px' }}>
                                                        <span style={{ minWidth: '20px' }}>[{idx + 1}]</span>
                                                        <a href={s.url} target="_blank" style={{ color: '#2563eb', textDecoration: 'none', wordBreak: 'break-all' }}>
                                                            {s.title || s.url || '未知链接'}
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleShowSources(r.sources)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    background: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '6px',
                                                    color: '#2563eb',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#dbeafe'}
                                                onMouseOut={(e) => e.currentTarget.style.background = '#eff6ff'}
                                            >
                                                <BookOpen size={14} />
                                                {r.sources.length} 篇内容
                                            </button>
                                        )}
                                    </div>
                                )}
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* 4. URL Analysis Control Group */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', marginTop: '24px' }}>
           <SectionHeader title="4. 引用与搜索来源统计" subtitle="整合展示所有回复中涉及的搜索结果与引用来源" />
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left Module: Source Domain Analysis */}
              <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>信源域名分析</h4>
                  <DomainAnalysisTable items={sourceDomainStats} emptyText="无域名数据" />
              </div>
              
              {/* Right Module: Source Content Analysis */}
              <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>信源内容分析</h4>
                  <ContentAnalysisTable items={sourceContentStats} emptyText="无内容数据" />
              </div>
           </div>
        </div>

        <SourceSidePanel 
            isOpen={showSourcePanel} 
            onClose={() => setShowSourcePanel(false)} 
            sources={currentSources} 
        />

        {/* Print Mode: Detailed Provider Analysis */}
        {isPrintMode && (
            <div style={{ marginTop: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px', color: '#6b7280', fontSize: '14px' }}>
                    --- 以下为各维度详细分析报告 ---
                </div>
                
                {/* 1. Query Analysis */}
                {queries.map((q, i) => renderQueryAnalysis(q))}

                {/* 2. Provider Analysis */}
                {providers.map(p => renderProviderAnalysis(p))}
            </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  background: 'white',
  color: '#374151',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: '500'
};

function StatCard({ title, value, color, icon, subText }) {
   return (
      <div style={{ background: color, borderRadius: '12px', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '140px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>{title}</span>
            <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {icon}
            </div>
         </div>
         <div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>{subText}</div>
         </div>
      </div>
   );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{title}</h3>
      {subtitle && <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>{subtitle}</p>}
    </div>
  );
}

function UrlList({ items, emptyText }) {
    const [expanded, setExpanded] = useState({});

    const toggleExpand = (domain) => {
        setExpanded(prev => ({
            ...prev,
            [domain]: !prev[domain]
        }));
    };

    if (!items || items.length === 0) {
        return <div style={{ color: '#9ca3af', fontSize: '14px' }}>{emptyText}</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                <div>域名</div>
                <div>媒体名称</div>
                <div style={{ textAlign: 'right' }}>引用占比</div>
            </div>
            
            {/* Scrollable List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {items.map((item, idx) => {
                    const isExpanded = expanded[item.domain];
                    return (
                        <div key={idx} style={{ borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            {/* Main Row */}
                            <div 
                                onClick={() => toggleExpand(item.domain)}
                                style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '2fr 2fr 1fr', 
                                    padding: '12px', 
                                    fontSize: '14px', 
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    background: isExpanded ? '#f3f4f6' : 'white',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                    {isExpanded ? <ChevronDown size={14} color="#6b7280" /> : <ChevronRight size={14} color="#6b7280" />}
                                    <span style={{ color: '#111827', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.domain}>
                                        {item.domain}
                                    </span>
                                </div>
                                <div style={{ color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.mediaName}>
                                    {item.mediaName}
                                </div>
                                <div style={{ textAlign: 'right', color: '#6b7280' }}>
                                    {item.percentage}
                                </div>
                            </div>
                            
                            {/* Expanded Children */}
                            {isExpanded && (
                                <div style={{ background: '#f9fafb', padding: '8px 12px 8px 34px', borderTop: '1px solid #f3f4f6' }}>
                                    {item.articles.map((article, aIdx) => (
                                        <div key={aIdx} style={{ padding: '6px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#9ca3af', fontSize: '10px' }}>•</span>
                                            <a href={article.url} target="_blank" rel="noopener noreferrer" 
                                               style={{ color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                                               title={article.title}>
                                                {article.title}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function processContentList(items) {
    if (!items || !Array.isArray(items)) return [];
    const total = items.length;
    if (total === 0) return [];

    const contentMap = new Map();

    items.forEach(item => {
        const url = item.url;
        const title = item.title || '无标题';
        
        // Key by URL if available, otherwise title
        // Fix: If URL is a generic placeholder (e.g. Wenxin), rely on title for uniqueness to avoid merging different articles
        const isPlaceholderUrl = !url || url === 'URL Hidden (Click to Open)' || url === 'N/A';
        const key = isPlaceholderUrl ? (title + (item.domain ? `_${item.domain}` : '')) : url;
        
        if (!contentMap.has(key)) {
            // Extract domain: Prefer explicit domain/source field, then URL parsing
            let domain = item.domain || item['信源域名'] || item.source;
            
            if (!domain && url) {
                try {
                    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
                    domain = u.hostname.replace(/^www\./, '');
                } catch (e) {}
            }
            
            if (!domain) domain = '未知域名';
            
            contentMap.set(key, {
                title,
                url,
                domain,
                count: 0
            });
        }
        contentMap.get(key).count++;
    });

    return Array.from(contentMap.values())
        .map(item => ({
            ...item,
            percentage: ((item.count / total) * 100).toFixed(2) + '%'
        }))
        .sort((a, b) => b.count - a.count);
}

function DomainAnalysisTable({ items, emptyText }) {
    if (!items || items.length === 0) {
        return <div style={{ color: '#9ca3af', fontSize: '14px' }}>{emptyText}</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                <div>域名</div>
                <div style={{ textAlign: 'right' }}>引用占比</div>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {items.map((item, idx) => (
                    <div key={idx} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '3fr 1fr', 
                        padding: '12px', 
                        fontSize: '14px', 
                        alignItems: 'center',
                        borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: 'white'
                    }}>
                        <div style={{ color: '#111827', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.domain}>
                            {item.domain}
                        </div>
                        <div style={{ textAlign: 'right', color: '#6b7280' }}>
                            {item.percentage}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ContentAnalysisTable({ items, emptyText }) {
    if (!items || items.length === 0) {
        return <div style={{ color: '#9ca3af', fontSize: '14px' }}>{emptyText}</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1fr', padding: '12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                <div>文章标题</div>
                <div>域名</div>
                <div style={{ textAlign: 'right' }}>引用占比</div>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {items.map((item, idx) => (
                    <div key={idx} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '3fr 1.5fr 1fr', 
                        padding: '12px', 
                        fontSize: '14px', 
                        alignItems: 'center',
                        borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: 'white'
                    }}>
                        <div style={{ overflow: 'hidden' }}>
                            <div 
                               style={{ color: '#111827', fontWeight: '500', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                               title={item.title}>
                                {item.title}
                            </div>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }} title={item.domain}>
                            {item.domain}
                        </div>
                        <div style={{ textAlign: 'right', color: '#6b7280' }}>
                            {item.percentage}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function processUrlList(items) {
    if (!items || !Array.isArray(items)) return [];
    
    const total = items.length;
    if (total === 0) return [];

    const domainMap = new Map();

    items.forEach(item => {
        let url = item.url;
        let domain = item.domain || item['信源域名']; // Priority 1: Explicit domain
        
        let mediaNameCandidate = item.source || item.title || '';

        // Priority 2: URL parsing if domain not yet found
        if (!domain) {
            try {
                if (url && typeof url === 'string' && !url.includes('Qwen Reference')) {
                    const urlToParse = url.startsWith('http') ? url : `https://${url}`;
                    const urlObj = new URL(urlToParse);
                    domain = urlObj.hostname;
                }
            } catch (e) {}
        }

        // Priority 3: Source name if it looks like a domain or if no domain found yet
        if (!domain && mediaNameCandidate && mediaNameCandidate !== 'Qwen Reference') {
            if (mediaNameCandidate.includes('.') && !mediaNameCandidate.includes(' ')) {
                domain = mediaNameCandidate;
            }
        }
        
        // Priority 4: Source/Media Name as Domain (User Request: "second item of formatted result")
        // If we still don't have a domain, use the source name itself as the domain grouping key
        if (!domain && item.source) {
             domain = item.source;
        }

        if (!domain) domain = (url && typeof url === 'string' && url !== 'Qwen Reference') ? url : '未知域名';
        domain = domain.replace(/^www\./, '');

        if (!domainMap.has(domain)) {
            domainMap.set(domain, { count: 0, mediaNames: new Map(), articles: [] });
        }
        
        const entry = domainMap.get(domain);
        entry.count++;
        
        // Add article info
        entry.articles.push({
            title: item.title || url,
            url: url
        });

        if (mediaNameCandidate && mediaNameCandidate !== 'Qwen Reference') {
            entry.mediaNames.set(mediaNameCandidate, (entry.mediaNames.get(mediaNameCandidate) || 0) + 1);
        }
    });

    const result = Array.from(domainMap.entries()).map(([domain, data]) => {
        let bestMediaName = '-'; 
        if (data.mediaNames.size > 0) {
            const sortedNames = Array.from(data.mediaNames.entries()).sort((a, b) => b[1] - a[1]);
            bestMediaName = sortedNames[0][0];
        } else {
            bestMediaName = domain.split('.')[0]; 
            if (bestMediaName === domain.split('.')[0]) bestMediaName = domain; 
        }
        
        return {
            domain: domain,
            mediaName: bestMediaName,
            count: data.count,
            percentage: ((data.count / total) * 100).toFixed(2) + '%',
            articles: data.articles
        };
    });
    
    return result.sort((a, b) => b.count - a.count);
}

function SourceSidePanel({ isOpen, onClose, sources }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            background: 'white',
            boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
            
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f9fafb'
            }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>引用来源</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>共 {sources.length} 篇内容</p>
                </div>
                <button 
                    onClick={onClose}
                    style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <X size={20} />
                </button>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {sources.map((source, index) => (
                    <div key={index} style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '20px', 
                                height: '20px', 
                                background: '#3b82f6', 
                                color: 'white', 
                                borderRadius: '50%', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                flexShrink: 0
                            }}>
                                {index + 1}
                            </span>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', lineHeight: '1.4' }}>
                                {source.title || source.domain || '未知标题'}
                            </div>
                        </div>
                        
                        {source.source && (
                             <div style={{ marginLeft: '28px', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                 来源: {source.source}
                             </div>
                        )}

                        {source.url && (
                            <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                    marginLeft: '28px',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px', 
                                    color: '#2563eb', 
                                    fontSize: '12px', 
                                    textDecoration: 'none',
                                    wordBreak: 'break-all'
                                }}
                            >
                                <ExternalLink size={12} />
                                {source.url}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
