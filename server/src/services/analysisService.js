import { chat } from '../qwen.js';

/**
 * 从文本中提取品牌名称
 * @param {string} text - 需要分析的文本
 * @returns {Promise<string[]>} - 提取到的品牌列表
 */
export async function extractBrandsFromText(text) {
  if (!text || !text.trim()) return [];

  try {
    const messages = [
      { 
        role: 'system', 
        content: `你是一个专业的品牌提取专家。请仔细阅读给定的文本，提取其中提到的所有商业品牌名称（Brand Names）。
要求：
1. 只提取明确的品牌名称（如：华为、小米、Keep、Garmin、荣耀等）。
2. 不要提取通用名词、形容词或产品类别（如：生态、品控、智能手环、运动手表、系统、对比、测评等）。
3. 如果品牌有中文和英文名（如 Keep/Keep），请提取最常用的形式。
4. 去除品牌名称中的修饰语（如“专业运动向稳定”、“综合表现最稳”等）。
5. 返回结果必须是合法的JSON格式：{"brands": ["BrandA", "BrandB", ...]}。
6. 结果中不包含Markdown格式标记，只返回JSON字符串。` 
      },
      { role: 'user', content: text }
    ];

    const content = await chat(messages, {
      provider: 'qwen',
      op: 'analyze_competitors',
      model: process.env.QWEN_MODEL || 'qwen-plus'
    });

    let brands = [];
    try {
       // 尝试提取JSON部分
       const jsonMatch = content.match(/\{[\s\S]*\}/);
       const jsonStr = jsonMatch ? jsonMatch[0] : content;
       const data = JSON.parse(jsonStr);
       
       if (data && Array.isArray(data.brands)) {
         // 清洗和过滤
         brands = data.brands
            .map(b => {
                 if (typeof b !== 'string') return '';
                 // 1. 去除括号及内容 (支持全角/半角)
                 let name = b.replace(/[\(（][^\)）]*[\)）]/g, '');
                 // 处理未闭合的括号 (直接截断)
                 name = name.split(/[\(（]/)[0];
                 // 2. 去除 # 及后面的内容 (防止混入统计数据)
                 name = name.split('#')[0];
                 // 3. 去除前后空格
                 name = name.trim();
                 // 4. 去除尾部的数字统计格式 (例如 " 3" 或 " 3.0")
                 name = name.replace(/\s+\d+(\.\d+)?$/, '');
                 // 5. 再次去除前后空格和特殊符号 (以防正则替换后留下空格)
                 return name.trim().replace(/^[#\d\.\s]+/, '');
             })
            .filter(b => {
                if (!b || b.length < 2) {
                     // 允许纯英文单字母 (极少见，但为了保险)
                     return /^[a-zA-Z]$/.test(b);
                }
                if (b.length > 15) return false; // 品牌名过长

                const noiseWords = [
                    '生态', '品控', '系统', '对比', '测评', '体验', '表现', '性价比', '旗舰', '入门', '专业', '医疗', 
                    '参考', '分析', '推荐', '系列', '版本', '功能', '优势', '劣势', '特点', '价格', '销量', '排名', 
                    '数据', '报告', '市场', '份额', '用户', '评价', '口碑', '服务', '售后', '技术', '创新', '设计', 
                    '外观', '材质', '续航', '充电', '防水', '防尘', '运动', '健康', '监测', '睡眠', '心率', '血氧',
                    '智能手环', '智能手表', '穿戴设备', '横评', '榜单', '排行榜', '代表', '核心', '产品', '品牌', '总评', '总结'
                ];

                // 1. 完全匹配噪声词
                if (noiseWords.includes(b)) return false;

                // 2. 包含强噪声词
                const strongNoise = ['横评', '对比', '测评', '排行榜', '智能手环', '智能手表', '穿戴设备', '代表性', '总评'];
                if (strongNoise.some(n => b.includes(n))) return false;

                // 3. 包含普通噪声词且长度较长 (e.g. "品控上长期可靠")
                if (noiseWords.some(n => b.includes(n)) && b.length > 4) return false;

                return true;
            });
         
         // 去重
         brands = [...new Set(brands)];
       }
    } catch (e) {
      console.warn('Failed to parse LLM response for competitors:', content);
    }

    return brands;
  } catch (error) {
    console.error('Error in extractBrandsFromText:', error);
    return [];
  }
}

/**
 * 分析 Query 回复内容，包含品牌提取、顺序分析和匹配验证
 * @param {string} responseText - Query 回复内容
 * @param {string[]} targetBrands - 用户提供的目标品牌列表
 * @returns {Promise<Object>} - 分析结果
 */
export async function analyzeQueryResponse(responseText, targetBrands = []) {
  const startTime = Date.now();

  // 1. 品牌提取功能 (调用 QWEN API)
  const extractedBrandsList = await extractBrandsFromText(responseText);

  // 2. 品牌顺序分析
  // 记录每个品牌在回复文本中首次出现的位置索引
  const brandPositions = extractedBrandsList.map(brand => {
    const index = responseText.indexOf(brand);
    // 如果直接找不到，尝试查找不区分大小写的情况
    if (index === -1) {
      const lowerText = responseText.toLowerCase();
      const lowerBrand = brand.toLowerCase();
      return { brand, index: lowerText.indexOf(lowerBrand) };
    }
    return { brand, index };
  }).filter(item => item.index !== -1); // 过滤掉未找到的（可能是LLM幻觉或归一化导致差异）

  // 根据出现位置生成品牌出现顺序的排名列表
  brandPositions.sort((a, b) => a.index - b.index);
  const orderedBrands = brandPositions.map(b => b.brand);

  // 计算各品牌之间的出现间隔距离
  const distances = [];
  for (let i = 0; i < brandPositions.length - 1; i++) {
    distances.push({
      from: brandPositions[i].brand,
      to: brandPositions[i + 1].brand,
      distance: brandPositions[i + 1].index - brandPositions[i].index
    });
  }

  // 3. 品牌匹配验证
  const matchResults = targetBrands.map(target => {
    // 检查是否在提取的品牌列表中存在完全匹配
    const exactMatch = extractedBrandsList.includes(target);
    
    // 检查是否存在该品牌的子品牌或相关品牌 (简单包含关系检查)
    // 比如 extracted 中有 "华为手机"，target 是 "华为" -> 匹配
    // 或者 extracted 中有 "华为"，target 是 "华为手机" -> 匹配
    let relatedBrand = null;
    if (!exactMatch) {
      relatedBrand = extractedBrandsList.find(b => 
        b.includes(target) || target.includes(b)
      );
    }

    // 获取位置信息
    // 优先用 exactMatch 的位置，其次用 relatedBrand 的位置
    const matchedBrandName = exactMatch ? target : relatedBrand;
    const positionInfo = brandPositions.find(b => b.brand === matchedBrandName);

    // 计算顺序排名 (1-based)
    const rank = positionInfo ? orderedBrands.indexOf(positionInfo.brand) + 1 : -1;

    return {
      brand: target,
      status: exactMatch ? 'exact_match' : (relatedBrand ? 'related_match' : 'not_found'),
      matchedKeyword: matchedBrandName || null,
      positionIndex: positionInfo ? positionInfo.index : -1,
      rank: rank
    };
  });

  // 对品牌匹配结果进行相关性评分
  // 简单评分逻辑：完全匹配+10，相关匹配+5，排名靠前额外加分
  let totalScore = 0;
  matchResults.forEach(m => {
    if (m.status === 'exact_match') totalScore += 10;
    else if (m.status === 'related_match') totalScore += 5;

    if (m.rank > 0) {
      // 排名奖励：第一名+5，第二名+4... 第五名及以后+1
      totalScore += Math.max(1, 6 - m.rank);
    }
  });

  // 4. 输出要求 - 构造返回数据
  const result = {
    extractedBrands: orderedBrands, // 按出现顺序
    matchResults: matchResults,
    densityAnalysis: {
      brandCount: orderedBrands.length,
      textLength: responseText.length,
      density: responseText.length > 0 ? (orderedBrands.length / responseText.length).toFixed(4) : 0
    },
    scoring: {
      totalScore,
      brandSequenceScore: calculateSequenceScore(orderedBrands, targetBrands) // 额外的顺序权重评分
    },
    distances
  };

  const endTime = Date.now();
  // 记录处理时间 (不包含 API 等待时间的话，这只是计算时间；包含的话会很长)
  // console.log(`AnalyzeQueryResponse total time: ${endTime - startTime}ms`);

  return result;
}

// 辅助函数：计算品牌顺序权重评分
function calculateSequenceScore(orderedBrands, targetBrands) {
  if (orderedBrands.length === 0 || targetBrands.length === 0) return 0;
  
  // 简单的顺序权重：目标品牌在结果中出现得越早，分数越高
  let score = 0;
  targetBrands.forEach(target => {
    const index = orderedBrands.findIndex(b => b.includes(target) || target.includes(b));
    if (index !== -1) {
      // 位置越前分越高，线性衰减
      score += Math.max(0, 100 - index * 10);
    }
  });
  return score;
}

