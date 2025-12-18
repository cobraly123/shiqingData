export const MODELS = {
  default: process.env.QWEN_MODEL || 'qwen-plus',
};

export const BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export const DIMENSION_MAP = {
  A: {
    name: '高信任/安全型',
    dimensions: {
      Cognitive: ['趋势与未来角', '误区与纠错角', '专家与权威角', '定义与标准角'],
      Active: ['极端场景角', '数据实证角', '机理解析角', '体感反馈角'],
      Protection: ['核心参数角', '工艺技术角', '配方纯净角', '成本价值角'],
      Risk: ['特殊人群角', '副作用管理角', '资质合规角', '服务隐私角'],
      Comp: ['场景切割角', '跨品类对标角', '形态体验角', '性价比博弈角'],
    },
    targetBatches: 5 * 4,
  },
  B: {
    name: '长尾兴趣与极客参数型',
    dimensions: {
      Translation: ['技术迭代角', '场景映射角', '小白扫盲角', '参数深挖角'],
      Comparison: ['全生命周期角', '跨级/同级厮杀角', '生态壁垒角', '极致性价比角'],
      Verification: ['老化/寿命角', '极限测试角', '致命缺陷角', '硬核实测角'],
    },
    targetBatches: 3 * 4,
  },
  C: {
    name: '个性化生活方式型',
    dimensions: {
      Context: ['季节/生命周期角', '社交/环境角', '自我定义角', '痛点归因角'],
      Solution: ['流程/公式角', '急救SOP角', '风格/流派角', '成分/材质CP角'],
      Outcome: ['周期反馈角', '感官体验角', '避雷/副作用角', '真人实测角'],
    },
    targetBatches: 3 * 4,
  },
  D: {
    name: '本地服务与体验型',
    dimensions: {
      Vibe: ['时段/光影角', '社交目的角', '人群画像角', '出片/审美角'],
      Facility: ['效率/动线角', '硬性保障角', '服务细节角',"价格结构角"],
      Reputation: ['品控稳定性角', '招牌/雷点角', '老饕/土著角',"评分/榜单角"],
    },
    targetBatches: 3 * 4,
  },
  E: {
    name: '通用直答型',
    dimensions: {},
    targetBatches: 1,
  },
};

export const SCORING_WEIGHTS = {
  realism: 0.4,
  demand: 0.3,
  habit: 0.3,
};

export const MIN_SCORE = 75;
export const MIN_ALIGN = 15;
