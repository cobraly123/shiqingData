/**
 * ResponseAnalyzer.js
 * 
 * A high-performance analysis system for parsing Large Language Model responses.
 * Meets requirements for <500ms latency, high accuracy, and structured output.
 */

export class ResponseAnalyzer {
  constructor(config) {
    this.targetBrand = config.targetBrand || '';
    this.competitors = config.competitors || []; // Array of { name, keywords, category }
    this.options = config.options || {
      contextWindow: 50,
      includeOriginal: true
    };
  }

  /**
   * Main analysis method
   * @param {Object} responseData - { query, provider, response, timestamp }
   * @returns {Object} Structured analysis result
   */
  analyze(responseData) {
    const text = String(responseData.response || '');
    const timestamp = responseData.timestamp || new Date().toISOString();
    
    // Performance timer start
    const startTime = performance.now();

    // 1. Brand Mention Analysis
    const mentionAnalysis = this.analyzeMentions(text, this.targetBrand);

    // 2. Ranking Analysis (Target Brand)
    const rankingAnalysis = this.analyzeRanking(text, this.targetBrand);

    // 3. Competitor Analysis
    const competitorAnalysis = this.analyzeCompetitors(text);

    // Performance timer end
    const endTime = performance.now();
    const processingTime = (endTime - startTime).toFixed(2) + 'ms';

    return {
      meta: {
        timestamp,
        provider: responseData.provider,
        query: responseData.query,
        processingTime
      },
      brandAnalysis: {
        name: this.targetBrand,
        totalMentions: mentionAnalysis.count,
        mentions: mentionAnalysis.details,
        ranking: rankingAnalysis
      },
      competitorAnalysis: {
        detected: competitorAnalysis
      },
      originalContent: this.options.includeOriginal ? text : null
    };
  }

  /**
   * Analyzes mentions with context
   */
  analyzeMentions(text, brandName) {
    if (!brandName) return { count: 0, details: [] };

    // Escape special regex chars
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegExp(brandName), 'gi');
    
    const details = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - this.options.contextWindow);
      const end = Math.min(text.length, match.index + brandName.length + this.options.contextWindow);
      const context = text.substring(start, end).replace(/\s+/g, ' ').trim(); // Clean newlines

      details.push({
        index: match.index,
        type: 'direct', // Currently only supporting direct keyword match
        context: `...${context}...`
      });
    }

    return {
      count: details.length,
      details
    };
  }

  /**
   * Analyzes list ranking position (e.g., "1. BrandName" or "1、BrandName")
   */
  analyzeRanking(text, name) {
    const listRegex = /^\s*(\d+)[.、\)]\s*(.*)/gm;
    let match;
    const rankings = [];

    while ((match = listRegex.exec(text)) !== null) {
      const rank = parseInt(match[1]);
      const content = match[2];
      
      // Check if line contains brand name
      if (content.toLowerCase().includes(name.toLowerCase())) {
        rankings.push({
          rank,
          content: content.trim()
        });
      }
    }

    return {
      positions: rankings.map(r => r.rank),
      bestRank: rankings.length > 0 ? Math.min(...rankings.map(r => r.rank)) : null,
      rawLines: rankings
    };
  }

  /**
   * Identifies and ranks competitors
   */
  analyzeCompetitors(text) {
    const results = [];
    
    // 1. Check Known Competitors
    this.competitors.forEach(comp => {
      // Check mentions
      const keywords = comp.keywords || [comp.name];
      let mentionCount = 0;
      let firstIndex = Infinity;
      
      keywords.forEach(kw => {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          mentionCount++;
          if (match.index < firstIndex) firstIndex = match.index;
        }
      });

      if (mentionCount > 0) {
        // Check Ranking
        const rankInfo = this.analyzeRanking(text, comp.name); // Simple check using name
        // Refined rank check using keywords if name check fails
        if (rankInfo.positions.length === 0) {
             keywords.forEach(kw => {
                 const kwRank = this.analyzeRanking(text, kw);
                 if (kwRank.positions.length > 0) {
                     rankInfo.positions.push(...kwRank.positions);
                     rankInfo.bestRank = kwRank.bestRank;
                 }
             });
        }
        
        // Add implicit rank info (for later sorting/fallback)
        rankInfo.firstIndex = firstIndex;

        results.push({
          name: comp.name,
          category: comp.category || 'Uncategorized',
          mentions: mentionCount,
          ranking: rankInfo
        });
      }
    });

    // 2. Heuristic Discovery for Unknown Competitors (from numbered lists)
    const listRegex = /^\s*(\d+)[.、\)]\s*(.*)/gm;
    let match;
    while ((match = listRegex.exec(text)) !== null) {
        const rank = parseInt(match[1]);
        const content = match[2];
        this.addHeuristicCandidate(results, content, rank, match.index, text);
    }

    // 3. Heuristic Discovery for Markdown Tables
    // Look for table rows: | Rank | Brand | ... or | Brand | ...
    const tableRegex = /\|(.+)\|/g;
    let tableMatch;
    let rowIndex = 0;
    let isHeader = true;
    while ((tableMatch = tableRegex.exec(text)) !== null) {
        const rowContent = tableMatch[1];
        // Skip separator lines |---|---|
        if (rowContent.includes('---')) {
            isHeader = false; // Next rows are data
            rowIndex = 0;
            continue;
        }
        
        // Simple heuristic: If it's a data row, pick the first or second column as name
        // Refinement: Look for column that is NOT a number
        if (!isHeader) {
            rowIndex++;
            const cols = rowContent.split('|').map(c => c.trim());
            // Strategy: Find first column that looks like a name (not a number, not empty)
            let nameCol = cols.find(c => c.length > 1 && isNaN(parseInt(c)));
            // If explicit rank column exists (number), use it
            let rankCol = cols.find(c => !isNaN(parseInt(c)) && parseInt(c) < 100);
            const rank = rankCol ? parseInt(rankCol) : rowIndex;
            
            if (nameCol) {
                // Clean markdown bold/italics from name
                nameCol = nameCol.replace(/[*_]/g, '');
                this.addHeuristicCandidate(results, nameCol, rank, tableMatch.index, text);
            }
        }
        // If we haven't seen separator yet, assume first row is header, subsequent might be data if no separator comes (rare in MD)
        // But standard MD tables have separator. Let's assume standard for now.
    }

    // 4. Heuristic Discovery for Bold Headers (e.g. **Brand Name**)
    // Matches: **Brand Name** or **1. Brand Name**
    const boldRegex = /(?:^|\n)\s*(?:[-*]\s+)?(?:\d+\.\s*)?(\*\*|__)(.*?)\1/g;
    let boldMatch;
    while ((boldMatch = boldRegex.exec(text)) !== null) {
        let content = boldMatch[2].trim();
        // Check if number is inside bold (e.g. **1. Brand**)
        const internalRankMatch = content.match(/^(\d+)\.\s*(.*)/);
        let rank = null;
        if (internalRankMatch) {
            rank = parseInt(internalRankMatch[1]);
            content = internalRankMatch[2];
        }
        this.addHeuristicCandidate(results, content, rank, boldMatch.index, text);
    }

    // 5. Heuristic Discovery for Chinese Entity Lines (e.g. "Name (Info)")
    // Matches lines starting with 2-15 Chinese chars followed by ( or （
    // or ending with specific suffixes like Center/Hall/Museum
    const entityLineRegex = /^\s*([\u4e00-\u9fa5]{2,20}(?:中心|博览会|馆|展))\s*[（(]/gm;
    let entityMatch;
    while ((entityMatch = entityLineRegex.exec(text)) !== null) {
        const content = entityMatch[1];
        this.addHeuristicCandidate(results, content, null, entityMatch.index, text);
    }

    // 6. Heuristic Discovery for Comma-Separated Entities (e.g. "A、B和C")
    // Use non-greedy match with lookahead for separators
    const enumRegex = /([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,15}?)[、]([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,15}?)(?=[、]|和|以及|\s|[。，；])/g;
    let enumMatch;
    while ((enumMatch = enumRegex.exec(text)) !== null) {
        const candidates = [enumMatch[1], enumMatch[2]];
        
        // Check what follows immediately
        let lastIndex = enumMatch.index + enumMatch[0].length;
        let remainder = text.slice(lastIndex);
        
        // Loop to find more `、D`
        let moreMatch;
        // Strict loop: must start with 、 and lookahead check
        // Regex: ^、(Name)(?=Separator)
        while ((moreMatch = /^[、]([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,15}?)(?=[、]|和|以及|\s|[。，；])/.exec(remainder)) !== null) {
             candidates.push(moreMatch[1]);
             remainder = remainder.slice(moreMatch[0].length);
             lastIndex += moreMatch[0].length;
        }
        
        // Check for final `和E` or `以及E`
        const finalMatch = /^(?:\s*(?:和|以及|&)\s*)([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,15}?)(?=[。，；\s]|是|为|等|$)/.exec(remainder);
        if (finalMatch) {
             let name = finalMatch[1];
             // Strip common sentence particles if they got attached
             const suffixRegex = /[是在有的等]$/;
             if (suffixRegex.test(name)) {
                 name = name.replace(suffixRegex, '');
             }
             if (name.length >= 2) {
                 candidates.push(name);
             }
        }

        candidates.forEach((name, i) => {
             this.addHeuristicCandidate(results, name, null, enumMatch.index + i, text);
        });
    }

    // 7. Heuristic Discovery for "Brand Description" lines (mashed text)
    // Matches: "BrandNameKeyword..." (e.g. "小米高性价比...")
    const descStartWords = ['高性价比', '主打', '户外', '表现', '优势', '劣势', '特点', '拥有', '具备', '采用', '搭载', '支持', '销量', '市场', '排名', '配置', '价格'];
    const descRegex = new RegExp(`^\\s*([\\u4e00-\\u9fa5a-zA-Z0-9（）()]{2,15}?)(?=(${descStartWords.join('|')}))`, 'gm');
    let descMatch;
    while ((descMatch = descRegex.exec(text)) !== null) {
        const name = descMatch[1];
        this.addHeuristicCandidate(results, name, null, descMatch.index, text);
    }

    // 8. Calculate Implicit Ranks for all results (if bestRank is missing)
    // We need to account for Target Brand position to give correct ranks
    
    // Find Target Brand position(s)
    const targetIndices = [];
    const targetRegex = new RegExp(this.targetBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let tMatch;
    while ((tMatch = targetRegex.exec(text)) !== null) {
        targetIndices.push(tMatch.index);
    }
    const firstTargetIndex = targetIndices.length > 0 ? targetIndices[0] : Infinity;

    // Combine competitors and target brand for sorting
    const allEntities = [...results.map(r => ({ ...r, type: 'competitor' }))];
    
    // Only add target brand if we are doing pure implicit ranking (no numbers found anywhere)
    // Or if we want to respect physical order.
    // Let's add a placeholder for Target Brand at its first occurrence
    if (firstTargetIndex !== Infinity) {
        allEntities.push({
            name: this.targetBrand,
            type: 'target',
            ranking: { firstIndex: firstTargetIndex }
        });
    }

    // Sort all by firstIndex
    allEntities.sort((a, b) => {
        const idxA = a.ranking.firstIndex !== undefined ? a.ranking.firstIndex : Infinity;
        const idxB = b.ranking.firstIndex !== undefined ? b.ranking.firstIndex : Infinity;
        return idxA - idxB;
    });

    // Assign rank based on order
    allEntities.forEach((entity, index) => {
        if (entity.type === 'competitor' && !entity.ranking.bestRank) {
            // Rank is index + 1
            entity.ranking.bestRank = index + 1;
            entity.ranking.positions = [index + 1];
            entity.ranking.isImplicit = true;
            
            // Update original result object
            const original = results.find(r => r.name === entity.name);
            if (original) {
                original.ranking.bestRank = index + 1;
                original.ranking.positions = [index + 1];
                original.ranking.isImplicit = true;
            }
        }
    });

    return results;
  }

  /**
   * Helper to add heuristic candidate with validation
   */
  addHeuristicCandidate(results, rawContent, rank, index, fullText) {
      // 1. Extract Name
      let name = null;
      
      // Strategy A: Check for Bold Text inside the content (High Confidence)
      // e.g., "1. **BrandName** is good" -> "BrandName"
      const boldMatch = rawContent.match(/(\*\*|__)(.*?)\1/);
      if (boldMatch) {
          name = boldMatch[2].trim();
      }

      // Strategy B: Fallback to splitting by punctuation
      if (!name) {
          // Supports: : (colon), ：(full-width colon), , (comma), ，(full-width comma), . (dot), 。(full-width dot), - (hyphen), ( (parenthesis), （ (full-width parenthesis)
          // Note: Hyphen must be escaped in character class
          name = rawContent.split(/[:：，,。.\-（(]/)[0].trim();
          name = name.replace(/[*_]/g, ''); // Remove markdown formatting
      }
      
      // Clean common prefixes (iterative)
      const prefixes = ['目前', '市场上', '市面上', '其中', '包括', '例如', '主要', '特别是', '比如', '像是'];
      let modified = true;
      while (modified) {
          modified = false;
          for (const prefix of prefixes) {
              if (name.startsWith(prefix)) {
                  name = name.slice(prefix.length).trim();
                  modified = true;
              }
          }
      }

      // Clean mixed English-Chinese (e.g. "Keep智能手环" -> "Keep")
      // Heuristic: If starts with 2+ English chars followed by Chinese, take the English part
      const mixedMatch = name.match(/^([a-zA-Z0-9]{2,})[\u4e00-\u9fa5]/);
      if (mixedMatch) {
          name = mixedMatch[1];
      }
      
      // 2. Filter Noise
      if (name.length < 2 || name.length > 20) return;
      
      // Starts with pronoun
      if (/^(它们|他们|我们|这些|那些|It|They|We|These|Those)/i.test(name)) return;

      // Exact match noise words
      const noiseWords = [
          'Answer', '回答', '综上', '总结', 'Rank', 'Brand', 'Name', 'Score', 'Rating', 
          'Note', '注意', '提示', '参考资料', '参考文献', 'Sources', 'References',
          '功能', '市场表现', '评测得分', '续航', '外观', '价格', '性价比', '特点', 
          '优势', '劣势', '优点', '缺点', '代表产品', '配置', '生态'
      ];
      if (noiseWords.includes(name)) return;
      
      // Contains match noise patterns (e.g. URLs, Reports)
      const noisePatterns = ['http', 'www.', '.com', '.cn', '.org', '报告', '新闻', '链接', 'Report', 'News', 'Link', '品控'];
      if (noisePatterns.some(p => name.toLowerCase().includes(p.toLowerCase()))) return;

      if (name.toLowerCase().includes(this.targetBrand.toLowerCase())) return;
      
      // 3. Check Known Competitors
      const isKnown = this.competitors.some(c => 
          (c.keywords || [c.name]).some(k => name.toLowerCase().includes(k.toLowerCase()))
      );
      if (isKnown) return;

      // 4. Check/Update Existing Result
      const existing = results.find(r => r.name === name);
      if (existing) {
          existing.mentions++;
          if (rank) {
              existing.ranking.positions.push(rank);
              if (existing.ranking.bestRank === null || rank < existing.ranking.bestRank) {
                  existing.ranking.bestRank = rank;
              }
          }
      } else {
          results.push({
              name: name,
              category: 'Detected',
              mentions: 1,
              ranking: {
                  positions: rank ? [rank] : [],
                  bestRank: rank || null,
                  rawLines: [{ rank, content: rawContent }],
                  firstIndex: index
              },
              isHeuristic: true
          });
      }
  }
}
