import { QueryEngine } from '../automation/core/QueryEngine.js';
import { config } from '../automation/config/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AutomationService {
  constructor() {
    this.queryEngine = new QueryEngine();
  }

  /**
   * Batch run queries on specified platforms with retry logic and data storage.
   * @param {Array} queries - List of query objects { query: string, angle?: string, ... }
   * @param {Array} platforms - List of platform keys (e.g., ['kimi', 'doubao'])
   * @param {Object} options - Options { retryCount: 3, onProgress: (progress) => {} }
   * @returns {Promise<Array>} - Results
   */
  async batchRun(queries, platforms, options = {}) {
    const retryCount = options.retryCount || 3;
    const onProgress = options.onProgress || (() => {});
    const results = [];
    const timestamp = new Date();
    
    // Ensure output directory exists
    const outputDir = path.resolve(__dirname, '../../reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let completedCount = 0;
    const totalCount = queries.length * platforms.length;

    for (const platform of platforms) {
      const platformResults = [];
      
      for (const qObj of queries) {
        const query = qObj.query;
        let attempt = 0;
        let success = false;
        let result = null;

        while (attempt < retryCount && !success) {
          attempt++;
          console.log(`[Automation] Processing query on ${platform} (Attempt ${attempt}/${retryCount}): ${query.substring(0, 20)}...`);
          
          try {
            result = await this.queryEngine.runQuery(platform, query);
            
            // Quality Control: Verify response integrity
            const responseText = typeof result.response === 'string' ? result.response : (result.response?.text || '');
            console.log(`[DEBUG] AutomationService received response length: ${responseText ? responseText.length : 0}`);
            if (responseText && responseText.length > 0) {
                 console.log(`[DEBUG] AutomationService response last 100 chars: ${responseText.slice(-100)}`);
            }

            if (result.status === 'success' && responseText && responseText.length > 5) {
              success = true;
            } else {
              console.warn(`[Automation] Failed or invalid response on attempt ${attempt} for ${platform}: ${result.error || 'Empty/Short response'}`);
              // If it was a success but invalid content, treat as failure for retry
              if (result.status === 'success') {
                  result.status = 'failed';
                  result.error = 'Response integrity check failed (empty or too short)';
              }
            }
          } catch (error) {
            console.error(`[Automation] Error on attempt ${attempt} for ${platform}:`, error);
            result = {
                model: platform,
                query,
                response: null,
                status: 'failed',
                error: error.message,
                metrics: { timestamp: new Date().toISOString() }
            };
          }
          
          if (!success && attempt < retryCount) {
             // Wait a bit before retry
             await new Promise(r => setTimeout(r, 2000));
          }
        }
        
        // Enrich result with metadata and tags
        const tag = qObj.angle || qObj.dimension || qObj.type || qObj.tag || '';
        const finalResult = {
          ...result,
          originalQuery: query,
          tag: tag,
          platform: platform,
          timestamp: new Date().toISOString(),
          retryCount: attempt
        };
        
        platformResults.push(finalResult);
        results.push(finalResult);
        
        completedCount++;
        onProgress({ 
            completed: completedCount, 
            total: totalCount, 
            lastResult: finalResult 
        });
      }
      
      // Save results for this platform
      await this.saveResults(platformResults, platform, timestamp);
    }
    
    return results;
  }

  /**
   * Helper to format link lists (search results/references) for Excel/CSV
   */
  formatLinkList(items) {
    if (!items || !Array.isArray(items) || items.length === 0) return '';
    return items.map((item, i) => {
      // Support new Chinese keys from standardized extraction
      const title = item['信源文章名'] || item.title || 'No Title';
      const url = item['信源URL'] || item.url || '';
      const domain = item['信源域名'] || item.domain || item.source || '';
      const index = item['序号'] || item.index || (i + 1);

      // Format: [index] [Domain] Title (URL)
      const domainStr = domain ? `[${domain}] ` : '';
      return `[${index}] ${domainStr}${title} (${url})`;
    }).join('\n');
  }

  /**
   * Save results to CSV and Excel
   * @param {Array} results 
   * @param {string} platform 
   * @param {Date} timestamp 
   */
  async saveResults(results, platform, timestamp) {
    if (!results || results.length === 0) return;

    const dateStr = this.formatDate(timestamp);
    const baseFileName = `天问_${dateStr}_${platform}`;
    const outputDir = path.resolve(__dirname, '../../reports');
    
    // Data preparation
    // Fields: Question, Tag, Platform, Model ID, Response, Search Results, References, Timestamp
    const headers = ['问题原文', '问题分类标签', '目标测试平台', '大模型标识', '回复内容', '搜索结果', '引用链接', '时间戳'];
    
    const dataRows = results.map(r => {
        const responseObj = r.response || {};
        const responseText = (typeof responseObj === 'string' ? responseObj : (responseObj.text || JSON.stringify(responseObj)));
        
        const searchResults = this.formatLinkList(responseObj.formattedSearchResults || responseObj.searchResults);
        const references = this.formatLinkList(responseObj.formattedReferences || responseObj.references);

        return [
            r.originalQuery,
            r.tag || '',
            r.platform,
            config.models[r.platform]?.name || r.model || r.platform,
            responseText,
            searchResults,
            references,
            r.metrics?.timestamp || new Date().toISOString()
        ];
    });

    // 1. Save as CSV
    const csvPath = path.join(outputDir, `${baseFileName}.csv`);
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => row.map(cell => {
        if (!cell) return '""';
        return `"${String(cell).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const bom = '\ufeff';
    fs.writeFileSync(csvPath, bom + csvContent, 'utf8');
    console.log(`[Automation] Saved CSV results to ${csvPath}`);

    // 2. Save as Excel
    const excelPath = path.join(outputDir, `${baseFileName}.xlsx`);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    
    // Set column widths
    ws['!cols'] = [
        { wch: 40 }, // Question
        { wch: 15 }, // Tag
        { wch: 15 }, // Platform
        { wch: 20 }, // Model ID
        { wch: 80 }, // Response
        { wch: 50 }, // Search Results
        { wch: 50 }, // References
        { wch: 25 }  // Timestamp
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, excelPath);
    console.log(`[Automation] Saved Excel results to ${excelPath}`);
  }

  /**
   * Export fully analyzed results to Excel (Comprehensive Report)
   * @param {Array} results - Full results array from ReportController state
   * @param {string} reportId - Report ID for filename
   */
  async exportAnalysisToExcel(results, reportId) {
    if (!results || results.length === 0) return;

    const dateStr = this.formatDate(new Date());
    const baseFileName = `天问_体检报告_${reportId}_${dateStr}`;
    const outputDir = path.resolve(__dirname, '../../reports');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Define Headers
    const headers = [
      '大模型平台', 
      '查询时间戳', 
      '原始Query', 
      '完整回复内容', 
      '回复长度', 
      '提取品牌列表', 
      '提及目标品牌', 
      '目标品牌排名(Rank)', 
      '匹配类型', 
      '竞品分析分数', 
      '回复质量评分', 
      '质量维度', 
      '参考链接',
      '搜索结果',
      '引用链接'
    ];

    const dataRows = [];

    results.forEach(r => {
      const responseObj = r.response || {};
      const responseText = (typeof responseObj === 'string' ? responseObj : (responseObj.text || JSON.stringify(responseObj)));
      const analysis = r.analysis || {};
      const matchResults = analysis.matchResults || [];
      const extractedBrands = analysis.extractedBrands || [];
      
      // Extract sources if available (Legacy/BasePage)
      const sources = (typeof responseObj === 'object' && responseObj.sources) ? responseObj.sources : [];
      const sourceLinks = sources.map(s => `[${s.title}] ${s.url}`).join('\n');
      
      // New formatted fields
      const searchResults = this.formatLinkList(responseObj.formattedSearchResults || responseObj.searchResults);
      const references = this.formatLinkList(responseObj.formattedReferences || responseObj.references);
      
      // If there are multiple target brands, we might have multiple match entries.
      // To keep it flat, we can join them or create multiple rows. 
      // User requirement: "Analysis results (mention status, ranking, competitor analysis)".
      // Let's summarize in one row per query for readability, but detailed columns.
      
      const targetMentions = matchResults.map(m => `${m.brand}(${m.status})`).join('; ');
      const targetRanks = matchResults.map(m => `${m.brand}:${m.rank > 0 ? m.rank : '-'}`).join('; ');
      const matchTypes = matchResults.map(m => m.status).join('; ');

      dataRows.push([
        r.provider,
        r.metrics?.timestamp || new Date().toISOString(),
        r.query,
        responseText.slice(0, 32000), // Excel cell limit
        responseText.length,
        extractedBrands.join(', '),
        targetMentions,
        targetRanks,
        matchTypes,
        analysis.scoring?.totalScore || 0,
        analysis.scoring?.qualityScore || 0,
        (analysis.qualityAnalysis?.dimensions || []).join(', '),
        sourceLinks,
        searchResults,
        references
      ]);
    });

    // Save as Excel
    const excelPath = path.join(outputDir, `${baseFileName}.xlsx`);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    
    // Set column widths
    ws['!cols'] = [
        { wch: 15 }, // Platform
        { wch: 25 }, // Timestamp
        { wch: 40 }, // Query
        { wch: 50 }, // Response (truncated vis)
        { wch: 10 }, // Length
        { wch: 30 }, // Extracted Brands
        { wch: 30 }, // Target Mentions
        { wch: 20 }, // Ranks
        { wch: 20 }, // Match Types
        { wch: 15 }, // Score
        { wch: 15 }, // Quality Score
        { wch: 30 }, // Dimensions
        { wch: 40 }, // Source Links (Legacy)
        { wch: 50 }, // Search Results
        { wch: 50 }  // References
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Analysis Report");
    XLSX.writeFile(wb, excelPath);
    console.log(`[Automation] Saved Detailed Analysis Report to ${excelPath}`);
    
    return excelPath;
  }

  formatDate(date) {
    const pad = (n) => (n < 10 ? '0' + n : n);
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;
  }

  /**
   * Check if the response text is valid and complete
   * @param {string} text 
   * @returns {Object} { isValid: boolean, reason: string }
   */
  checkIntegrity(text) {
    if (!text || typeof text !== 'string') {
      return { isValid: false, reason: 'Empty or non-string response' };
    }
    
    const trimmed = text.trim();
    if (trimmed.length < 5) {
      return { isValid: false, reason: 'Response too short (< 5 chars)' };
    }

    // Common error keywords (extend as needed)
    const errorKeywords = [
      '网络错误', 'network error',
      '请求超时', 'request timeout',
      '服务器繁忙', 'server busy',
      '无法回答', 'cannot answer', // Context dependent, but sometimes valid
      'limit reached', 'usage limit'
    ];

    for (const kw of errorKeywords) {
      if (trimmed.toLowerCase().includes(kw)) {
        // Be careful not to filter out valid "I cannot answer this" responses if that's the model's actual answer.
        // For now, treat network/server errors as retryable.
        if (kw.includes('answer')) continue; 
        return { isValid: false, reason: `Contains error keyword: ${kw}` };
      }
    }

    // Check for truncated response (simple heuristic: doesn't end with punctuation)
    // This is tricky because some valid answers might not end with punctuation.
    // Let's just log it or be lenient.
    // const endsWithPunctuation = /[。.!?！？]$/.test(trimmed);
    // if (!endsWithPunctuation && trimmed.length > 50) {
    //    return { isValid: false, reason: 'Possibly truncated (no ending punctuation)' };
    // }

    return { isValid: true };
  }
}

export const automationService = new AutomationService();
