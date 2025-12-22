import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { geoService } from '../api/geoService';
import { ResponseAnalyzer } from '../utils/ResponseAnalyzer';
import { MonitoringSelector } from '../components/business/MonitoringSelector';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Download, RefreshCw, Edit, Share2, HelpCircle, Target, TrendingUp, Users, FileJson } from 'lucide-react';

export function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering State
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState(null);

  // AI Analysis State
  // Removed client-side AI analysis state as it is now handled by the backend
  
  useEffect(() => {
    if (!id) return;
    loadReport();
  }, [id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      console.log('Fetching report:', id);
      const data = await geoService.getReportView(id);
      console.log('Report data received:', data);
      setReport(data);
      
      if (data) {
        // Initialize default selections
        // Default to "All" (null) for comprehensive view
        // if (data.queries && data.queries.length > 0) {
        //   setSelectedQuery(data.queries[0].query);
        // }
        // if (data.providers && data.providers.length > 0) {
        //   setSelectedProvider(data.providers[0]);
        // }
      }
    } catch (e) {
      console.error('Error fetching report:', e);
      setError('加载报告失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

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
             mentionCount,
             brandRank,
             foundCompetitors: detectedCompetitors.map(c => ({
                 name: c.name,
                 rank: c.ranking.bestRank
             })),
             analysisResult: {
                 brandAnalysis: {
                     totalMentions: mentionCount,
                     ranking: { bestRank: brandRank }
                 },
                 competitorAnalysis: {
                     detected: detectedCompetitors
                 }
             }
         };
    }
    
    // If no backend analysis, return empty analysis result
    // effectively removing the client-side fallback
    return {
      ...r,
      responseText, // Store extracted text
      mentionCount: 0,
      brandRank: null,
      foundCompetitors: [],
      analysisResult: {
          brandAnalysis: {
              totalMentions: 0,
              ranking: { bestRank: null }
          },
          competitorAnalysis: {
              detected: []
          }
      }
    };
  });

  // 2. Apply Filters for View
  const processedResults = allAnalyzedResults.filter(r => {
      if (selectedProvider && r.provider !== selectedProvider) return false;
      if (selectedQuery && r.query !== selectedQuery) return false;
      return true;
  });

  let totalMentions = 0;
  let totalRankSum = 0;
  let rankCount = 0;
  const competitorCounts = {}; // { name: { count: 0, ranks: [] } }

  // 3. Aggregate based on FILTERED results (View Scope)
  let analyzedCount = 0;
  processedResults.forEach(r => {
    if (r.isAnalyzed) analyzedCount++;
    // Update Aggregates
    if (r.mentionCount > 0) totalMentions++;
    if (r.brandRank !== null) {
      totalRankSum += r.brandRank;
      rankCount++;
    }

    // Aggregate Competitors
    r.analysisResult.competitorAnalysis.detected.forEach(c => {
      if (!competitorCounts[c.name]) {
        competitorCounts[c.name] = { count: 0, ranks: [] };
      }
      // Use mention count (frequency)
      competitorCounts[c.name].count += c.mentions;
      // Track all rank positions found
      if (c.ranking.positions.length > 0) {
          competitorCounts[c.name].ranks.push(...c.ranking.positions);
      }
    });
  });

  const queryStats = activeQueries.map(q => {
    const qText = q.query || '';
    const relatedResults = processedResults.filter(r => r.query === qText);
    const validResponses = relatedResults.filter(r => r.responseText && r.responseText.trim().length > 0).length;
    return {
      query: qText,
      asked: selectedProvider ? 1 : providers.length,
      replied: validResponses
    };
  });

  const avgRank = rankCount > 0 ? (totalRankSum / rankCount).toFixed(1) : '-';
  const firstRankCount = processedResults.filter(r => r.brandRank === 1).length;
  const sortedCompetitors = Object.entries(competitorCounts)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgRank: data.ranks.length > 0 ? (data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length).toFixed(1) : '-'
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 competitors

  // Chart & Table Data
  const activeProviders = selectedProvider ? [selectedProvider] : providers;
  const providerStats = activeProviders.map(p => {
    // If we have selectedProvider, processedResults already filtered to it.
    // If we somehow have no selection (shouldn't happen with new logic), we use full list.
    // To be safe, filter from processedResults.
    const pResults = processedResults.filter(r => r.provider === p);
    const mentions = pResults.filter(r => r.mentionCount > 0).length;
    
    // Rank breakdown
    const ranks = { 1: 0, 2: 0, 3: 0, '4+': 0, 'unranked': 0 };
    pResults.forEach(r => {
        if (r.brandRank) {
            if (r.brandRank === 1) ranks[1]++;
            else if (r.brandRank === 2) ranks[2]++;
            else if (r.brandRank === 3) ranks[3]++;
            else ranks['4+']++;
        } else if (r.mentionCount > 0) {
            ranks['unranked']++;
        }
    });

    return {
      name: p,
      mentions: mentions,
      total: pResults.length,
      rate: pResults.length ? (mentions / pResults.length * 100).toFixed(0) + '%' : '0%',
      ranks
    };
  });

  const exportToCSV = () => {
    if (!report || !report.results) return;
    
    // Enhanced Headers for better clarity and coverage
    const headers = [
        'Query', 
        'Provider', 
        'Response', 
        'Analysis Status', 
        'Target Brand Rank', 
        'Mentions Count', 
        'Total Brands Found', 
        'Extracted Brands List (Name#Rank)'
    ];

    const csvContent = [
      headers.join(','),
      ...processedResults.map(r => {
        const isAnalyzed = r.isAnalyzed ? 'Yes' : 'No';
        const brandRank = r.brandRank || '-';
        const mentionCount = r.mentionCount || 0;
        const totalBrands = r.foundCompetitors ? r.foundCompetitors.length : 0;
        
        // Format: "BrandA(#1); BrandB(#2)"
        const brandsList = r.foundCompetitors 
            ? r.foundCompetitors.map(c => `${c.name}(#${c.rank})`).join('; ')
            : '';
            
        const safeQuery = `"${(r.query || '').replace(/"/g, '""')}"`;
        // Ensure response text handles quotes correctly for CSV
        const safeResponse = `"${(r.responseText || '').replace(/"/g, '""')}"`;
        const safeBrandsList = `"${brandsList.replace(/"/g, '""')}"`;

        return `${safeQuery},${r.provider},${safeResponse},${isAnalyzed},${brandRank},${mentionCount},${totalBrands},${safeBrandsList}`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${brandName}_Report_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAnalysis = () => {
    if (!report) return;
    const analysisData = {
        meta: {
            brand: brandName,
            reportId: id,
            generatedAt: new Date().toISOString(),
            version: "1.0.0",
            system: "Tianwen Deep Analysis System"
        },
        summary: {
            totalQueries: queries.length,
            totalMentions: totalMentions,
            averageRank: avgRank,
            topCompetitors: sortedCompetitors.map(c => ({
                name: c.name,
                count: c.count,
                avgRank: c.avgRank
            }))
        },
        details: processedResults.map(r => ({
            query: r.query,
            provider: r.provider,
            ...r.analysisResult
        }))
    };

    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${brandName}_DeepAnalysis_${id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', padding: '20px' }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <ArrowLeft size={20} color="#374151" />
             </button>
             <div>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{brandName} 智能舆情报告</h1>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                   任务ID: {id} · 生成时间: {new Date().toLocaleDateString()}
                </div>
             </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={exportAnalysis} style={{ ...btnStyle, background: 'white', color: '#374151', border: '1px solid #d1d5db' }}><FileJson size={14} /> 导出分析报告(JSON)</button>
             <button onClick={exportToCSV} style={{ ...btnStyle, background: '#2563eb', color: 'white', border: 'none' }}><Download size={14} /> 导出详细数据</button>
          </div>
        </div>

        {/* Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
           <StatCard 
             title="总提问数" 
             value={activeQueries.length} 
             color="#6366f1" 
             icon={<HelpCircle size={20} color="white" />} 
             subText={`累计获得 ${processedResults.length} 次回复`}
           />
           <StatCard 
             title="模型覆盖" 
             value={selectedProvider ? 1 : totalMentions} // If filtering by provider, coverage is 1 (or 0). Or keep as Mentions? Label says "Brand Mentions" below. This card is "Model Coverage".
             // Actually, "Model Coverage" usually means how many models mentioned it? 
             // Original logic: totalMentions (which was actually total mention count in text? No, wait.)
             // Line 110: if (mentionCount > 0) totalMentions++; -> This counts responses with mentions.
             // If we filter, this number updates correctly.
             // But the title is "Model Coverage". If I filter to 1 provider, and it mentions, value is 1. Correct.
             color="#10b981" 
             icon={<Target size={20} color="white" />} 
             subText={`有效提及回复数`}
           />
           <StatCard 
             title="品牌提及" 
             value={avgRank} 
             color="#f59e0b" 
             icon={<TrendingUp size={20} color="white" />} 
             subText="品牌平均排名"
           />
           <StatCard 
             title="首位提及" 
             value={firstRankCount} 
             color="#8b5cf6" 
             icon={<Users size={20} color="white" />} 
             subText="位列第一次数"
           />
        </div>

        {/* Monitoring Selector */}
        <MonitoringSelector 
            providers={providers}
            selectedProvider={selectedProvider}
            onSelectProvider={setSelectedProvider}
            brandName={brandName}
            coreKeywords={input?.seedKeyword || input?.keywords || input?.coreWord || '未指定'}
            queries={queries}
            selectedQuery={selectedQuery}
            onSelectQuery={setSelectedQuery}
        />

        {/* 1. Question Analysis */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
           <SectionHeader title="1. 提问与回复概览" subtitle="针对每个问题，各大模型的回复情况统计" />
           <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                 <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                       <th style={{ padding: '12px', textAlign: 'left', width: '60%' }}>问题 (Query)</th>
                       <th style={{ padding: '12px', textAlign: 'center' }}>询问次数</th>
                       <th style={{ padding: '12px', textAlign: 'center' }}>有效回复</th>
                       <th style={{ padding: '12px', textAlign: 'center' }}>状态</th>
                    </tr>
                 </thead>
                 <tbody>
                    {queryStats.map((q, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px' }}>{q.query}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{q.asked}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>{q.replied}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                             {q.replied === q.asked ? 
                                <span style={{ color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: '999px', fontSize: '12px' }}>完成</span> : 
                                <span style={{ color: '#f59e0b', background: '#fffbeb', padding: '2px 8px', borderRadius: '999px', fontSize: '12px' }}>部分完成</span>
                             }
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* 2. Brand Position Analysis */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
               <SectionHeader title="2. 品牌录出分析" subtitle="品牌出现的次数及排名情况" />
               <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                     <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                           <th style={{ padding: '12px', textAlign: 'left' }}>平台 (Model)</th>
                           <th style={{ padding: '12px', textAlign: 'center' }}>总回复数</th>
                           <th style={{ padding: '12px', textAlign: 'center' }}>提及次数 (占比)</th>
                           <th style={{ padding: '12px', textAlign: 'center', color: '#ef4444' }}>Top 1</th>
                           <th style={{ padding: '12px', textAlign: 'center', color: '#f97316' }}>Top 2</th>
                           <th style={{ padding: '12px', textAlign: 'center', color: '#eab308' }}>Top 3</th>
                           <th style={{ padding: '12px', textAlign: 'center', color: '#3b82f6' }}>4位及以后</th>
                           <th style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>未排名</th>
                        </tr>
                     </thead>
                     <tbody>
                        {providerStats.map((p, i) => (
                           <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '12px', fontWeight: '500' }}>{p.name}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>{p.total}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                 <span style={{ fontWeight: 'bold' }}>{p.mentions}</span> 
                                 <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '4px' }}>({p.rate})</span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', background: p.ranks[1] > 0 ? '#fef2f2' : 'transparent' }}>{p.ranks[1] || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center', background: p.ranks[2] > 0 ? '#fff7ed' : 'transparent' }}>{p.ranks[2] || '-'}</td>
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
                    subtitle={`基于 ${analyzedCount}/${processedResults.length} 条有效回复的分析结果`} 
                  />
               </div>
               <div style={{ marginTop: '0px' }}>
                  {sortedCompetitors.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                       <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                             <th style={{ padding: '8px', textAlign: 'left' }}>竞品/实体名称</th>
                             <th style={{ padding: '8px', textAlign: 'center' }}>出现频次</th>
                             <th style={{ padding: '8px', textAlign: 'center' }}>平均排名</th>
                          </tr>
                       </thead>
                       <tbody>
                          {sortedCompetitors.map((c, i) => (
                             <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px', fontWeight: '500' }}>{c.name}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{c.count}</td>
                                <td style={{ padding: '8px', textAlign: 'center', color: c.avgRank <= 3 ? '#10b981' : '#6b7280' }}>#{c.avgRank}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', background: '#f9fafb', borderRadius: '8px' }}>
                       {analyzedCount === 0 ? (
                         processedResults.length === 0 ? "当前筛选条件下无回复数据" : "正在等待后台生成智能分析数据，请稍后刷新..."
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
                       <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#4b5563', width: '100px' }}>分析</th>
                       <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#4b5563' }}>回复详情</th>
                    </tr>
                 </thead>
                 <tbody>
                    {processedResults.map((r, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                             <div style={{ fontWeight: '500', marginBottom: '4px' }}>{String(r.query)}</div>
                             <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#eff6ff', color: '#2563eb', fontSize: '12px' }}>
                                {String(r.provider)}
                             </span>
                          </td>
                          <td style={{ padding: '12px', verticalAlign: 'top' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div>
                                   <span style={{ color: '#6b7280', fontSize: '12px' }}>排名: </span>
                                   {r.brandRank ? 
                                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>#{r.brandRank}</span> : 
                                      (r.mentionCount > 0 ? <span style={{ color: '#6b7280' }}>提及</span> : <span style={{ color: '#d1d5db' }}>-</span>)
                                   }
                                </div>
                                {r.foundCompetitors && r.foundCompetitors.length > 0 && (
                                   <div>
                                      <span style={{ color: '#6b7280', fontSize: '12px' }}>竞品: </span>
                                      <div style={{ fontSize: '12px' }}>
                                         {r.foundCompetitors.map((c, idx) => (
                                            <span key={idx} style={{ display: 'inline-block', background: '#f3f4f6', padding: '1px 4px', borderRadius: '4px', margin: '1px' }}>
                                               {String(c.name)} <span style={{ opacity: 0.7 }}>#{c.rank}</span>
                                            </span>
                                         ))}
                                      </div>
                                   </div>
                                )}
                             </div>
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
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

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
