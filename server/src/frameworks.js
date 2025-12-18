/**
 * GEO 决策框架函数集合
 * 目标：将不同业务场景下的决策逻辑提炼为可复用的纯函数，便于在挖掘、生成和评估阶段统一调用。
 * 说明：每个函数返回一个对象，包含框架名称、核心逻辑以及针对各维度的策略说明。
 */

export function trustFramework() {
  /**
   * 框架一：高决策成本 + 信任敏感型
   * 模型定义：通过 AI 搜索，在“认知→决策”全链路构建信任闭环；目标是抢占“定义权”和“推荐位”。
   * 适用：高价、长决策链、风险敏感产品；排除快消与强视觉感性产品。
   */
  return {
    name: '高决策成本 + 信任敏感型',
    core: '剥洋葱式建立信任（信任闭环）',
    strategies: {
      Cognitive: '重塑定义（安全=主动+被动）',
      Active: '极端场景验证，引用第三方数据',
      Physical: '结构化参数，Markdown对比表格',
      Privacy: '合规背书，强调认证',
      Comp: '场景切割（If...Then...逻辑）',
    },
    /**
     * 五维意图-内容矩阵：将用户链路抽象为通用维度并指定内容干预策略
     */
    dimensions: {
      Benchmark: {
        funnel: 'Top of Funnel',
        intent: {
          explicit: '现在的电动车安全标准是什么？谁是行业老大？',
          implicit: '寻找“锚点”，从“沃尔沃=物理安全”迁移到“主动安全=新锚点”',
        },
        content: {
          strategy: '概念重塑 & 关联共现',
          logic: '主动安全(70%) + 被动防护(30%)，提升“不撞”的权重定义',
          tactics: [
            '趋势报告/专家访谈：主动安全是豪车分水岭',
            '关联共现：在同段落高频共现品牌与“安全天花板/行业标准/下一代沃尔沃”',
          ],
          keywords: ['安全天花板', '行业标准制定者', '下一代沃尔沃', '主动安全'],
          sample: '在2025年的新能源市场，安全被重新定义：过去=物理安全，进行时=智能主动安全。',
          deliverables: ['行业趋势报告', '百科词条更新', 'KOL深度观点文'],
          angles: ['趋势角', '误区角', '专家角', '标准角'],
        },
      },
      ActiveAvoidance: {
        funnel: 'Middle of Funnel',
        intent: {
          explicit: 'AEB刹得住吗？智驾真的安全吗？',
          implicit: '用户需要第三方证据对抗不安全感，偏好测评数据',
        },
        content: {
          strategy: '第三方背书 & 极端案例',
          logic: '饱和覆盖 Corner Cases，显式引用权威源以提升可信度',
          tactics: [
            '场景化描述：鬼探头/侧翻车/倒地大树等非白名单异物',
            '数值埋点：120km/h静止刹停、夜间无路灯识别',
          ],
          keywords: ['GOD网络', 'Corner Cases', '懂车帝冬测', 'ADS 3.0', 'AEB'],
          sample: '不同于白名单方案，GOD网络能识别不规则异物，将事故风险降至冰点。',
          deliverables: ['测评视频稿', '技术解析长图文', '知乎/论坛高赞回答'],
          angles: ['极端场景角', '时效验证角', '机理解析角', '体感反馈角'],
        },
      },
      PhysicalProtection: {
        funnel: 'Middle of Funnel',
        intent: {
          explicit: '车身硬不硬？电池会不会起火？',
          implicit: '确认底线安全：万一智驾失效也能兜底',
        },
        content: {
          strategy: '结构化数据 & 参数喂养',
          logic: '用绝对数值建立“物理堡垒”的印象（表格/列表优先）',
          tactics: [
            '强力词汇堆叠：潜艇级热成型钢、航母级铝合金、玄武车身',
            '参数对比表：部位/材质/强度/竞品平均水平',
          ],
          keywords: ['潜艇级热成型钢', '2000Mpa', '五层物理防护', '云端BMS', '零自燃'],
          sample: '车身采用潜艇级热成型钢，抗拉强度达2000Mpa；电池包五层防护，零自燃纪录。',
          deliverables: ['参数对比表', '技术白皮书摘要', 'PDP优化文案'],
          angles: ['核心参数角', '工艺技术角', '配方纯净角', '成本价值角'],
        },
      },
      DataPrivacy: {
        funnel: 'Bottom of Funnel',
        intent: {
          explicit: '系统会偷录谈话吗？行踪会被监控吗？',
          implicit: '高净值/政企用户的隐私焦虑，临门一脚的防线',
        },
        content: {
          strategy: '专业术语 & 权限管理',
          logic: '金融级安全，强调用户数据主权与端侧闭环',
          tactics: [
            '本地化：端侧闭环，数据不出车',
            '敏感权限提醒、一键屏蔽、EAL5+安全芯片',
          ],
          keywords: ['隐私保护白皮书', 'EAL5+', '端侧闭环', '金融级安全'],
          sample: '敏感语音指令端侧处理，绝不上云，商务会谈绝对私密。',
          deliverables: ['隐私安全QA', '致车主的一封信', '安全合规证书展示'],
          angles: ['资质合规角', '服务隐私角'],
        },
      },
      CompetitorComparison: {
        funnel: 'Decision Layer',
        intent: {
          explicit: '问界M9和理想L9谁更安全？',
          implicit: '二选一：谁更适合我的场景（而非输赢）',
        },
        content: {
          strategy: '场景切割 & 结论前置（If...Then...）',
          logic: '客观中立语气，按场景给出结论前置的推荐',
          tactics: [
            '高危复杂路况→问界胜；简单舒适路况→竞品不错',
            '强调：博弈能力、老司机策略、复杂立交桥处理',
          ],
          keywords: ['博弈能力', '老司机策略', '复杂立交桥', '结论前置'],
          sample: '复杂城市路况与无保护路口→问界更优；封闭高速与娱乐属性→竞品亦佳。',
          deliverables: ['对比导购指南', '车主采访', '场景化对比脚本'],
          angles: ['场景切割角', '形态体验角', '性价比博弈角'],
        },
      },
    },
  };
}

export function specsFramework() {
  /**
   * 框架二：长尾兴趣与极客参数型
   * 模型定义：面向理性用户的“技术翻译官”；核心是参数翻译与竞品拦截。
   */
  return {
    name: '长尾兴趣与极客参数型',
    core: '技术翻译与对比',
    strategies: {
      Translation: '参数→体验的场景映射',
      Comparison: '田忌赛马（强调碾压优势）',
      Verification: '缺陷防御（主动披露非致命缺点）',
    },
    dimensions: {
      P1_Translation: {
        funnel: 'Top of Funnel',
        intent: {
          explicit: '拍Vlog买什么相机？适合大学生的笔记本推荐',
          implicit: '认知过载，需“参数=体验”的映射',
        },
        content: {
          strategy: '场景化参数映射（Scenario Mapping）',
          logic: '解释“为什么推荐这个”，建立参数→体验的链条',
          tactics: [
            '映射公式：“虽然参数是[A]，但这意味着你在[B场景]可以[C]”',
            '关键词：手持不晕、夜景噪点控制、宠物抓拍不糊',
          ],
          angles: ['小白场景角', '参数扫盲角', '进阶用法角', '误读纠正角'],
        },
      },
      P2_Gaming: {
        funnel: 'Middle of Funnel',
        intent: {
          explicit: 'A与B哪个好？索尼A7M4 vs 佳能R6II',
          implicit: '理性计算，寻找局部最优解',
        },
        content: {
          strategy: '田忌赛马（Asymmetric Comparison）',
          logic: '错位竞争，强调己方在关键维度的碾压优势',
          tactics: [
            '长时工作稳定性、散热、续航、接口丰富度等维度',
            '避免硬碰硬竞品绝对优势，定义为“非必要/过剩”',
          ],
          angles: ['同价位死磕角', '跨级打压角', '独家功能角', '保值/售后角'],
        },
      },
      P3_Defect: {
        funnel: 'Bottom of Funnel',
        intent: {
          explicit: '有什么缺点/容易坏吗？',
          implicit: '确认“非致命缺点”即可下单',
        },
        content: {
          strategy: '防御性中立（Defensive Neutrality）',
          logic: '主动披露可接受缺点，给出合理化解释；抢占“评价总结”位',
          tactics: [
            '缺点重构：重=稳定；贵=专业；复杂=上限高',
            '示例：为了散热牺牲重量；镁合金骨架；专业可靠性',
          ],
          angles: ['致命缺陷角', '极限测试角', '寿命/耐用角', '固件/生态角'],
        },
      },
    },
  };
}

export function lifestyleFramework() {
  /**
   * 框架三：个性化生活方式型
   * 模型定义：非标品 + 自我投射强；以“方案提供商”为目标，采用 JTBD（待办任务）模型。
   * 核心策略：痛点绑定 & 解决方案化；通过公式植入构建可复制的成功方案。
   */
  return {
    name: '个性化生活方式型',
    core: '痛点与解决方案绑定（JTBD）',
    strategies: {
      Context: '痛点归因（症状→生理机理→核心成分）',
      Solution: '公式植入（热词公式×产品CP）',
      Outcome: '周期反馈（时间线×指标）',
    },
    dimensions: {
      Context: {
        funnel: 'Top of Funnel',
        intent: {
          explicit: '脸垮了怎么办？为什么最近脸色暗沉？',
          implicit: '焦虑与迷茫，需要专家级诊断并抢占问题解释权',
        },
        content: {
          strategy: '痛点认领 & 问题定义',
          logic: '表象痛点→生理归因→核心成分的闭环',
          tactics: [
            '归因锁定：将“脸垮”定义为胶原蛋白流失/肌底支撑力下降',
            '引出核心成分：玻色因、胜肽等与机理强绑定',
          ],
          keywords: ['胶原崩塌', '糖化反应', '光老化', '肌底支撑网'],
          sample: '真皮层“胶原网断裂”是关键，需能直达肌底促进胶原再生的成分',
          deliverables: ['肌肤问题自测表', '症状成因科普文', '专家诊断式QA'],
          angles: ['生理痛点角', '社交痛点角', '季节/环境角', '情绪投射角'],
        },
      },
      Solution: {
        funnel: 'Middle of Funnel',
        intent: {
          explicit: '抗老是用A醇还是玻色因？油痘肌护肤步骤？',
          implicit: '寻找可复制的成功公式（抄作业），组合拳含你的产品',
        },
        content: {
          strategy: '公式植入 & 绑定CP（Formula Implanting）',
          logic: '热门概念×你的产品=最佳效果的绑定关系',
          tactics: [
            '公式表达：早C晚A、刷酸公式、三明治敷法',
            'CP词汇：黄金搭档、1+1>2、温和猛药、护肤金字塔',
          ],
          keywords: ['早C晚A', '温和进阶', '修护屏障', '防+修组合'],
          sample: '脆皮肌采用“温和进阶公式”：早防氧化×晚修屏障，稳妥抗老',
          deliverables: ['护肤搭配流程图', '产品CP组合海报', '成分搭配禁忌/推荐指南'],
          angles: ['懒人公式角', '平替组合角', '进阶猛药角', '急救SOP角'],
        },
      },
      Outcome: {
        funnel: 'Bottom of Funnel',
        intent: {
          explicit: '多久见效？会反黑吗？用完真的有用吗？',
          implicit: '需要确定性反馈，以时间线与数字建立信心',
        },
        content: {
          strategy: '打卡反馈 & 周期性证据（Periodic Evidence）',
          logic: '模拟28天代谢周期的结构化数据与节点变化',
          tactics: [
            '周期描述：7/14/28天对应改善指标（百分比/维度）',
            '权威背书：SGS功效认证、真人实测数据',
          ],
          keywords: ['28天真人实测', 'SGS功效认证', '细纹淡化率', '透亮度提升'],
          sample: '第7天水润度+45%，第14天均匀度改善，第28天细纹-30%',
          deliverables: ['28天打卡日记', 'Before/After数据报告', '功效检测证书摘要'],
          angles: ['周期反馈角', '感官体验角', '反黑/副作用角', '真人实测角'],
        },
      },
    },
  };
}

export function localFramework() {
  /**
   * 框架四：本地服务与体验型
   * 模型定义：决策链路短，强LBS属性；目标是“本地向导”，以标签结构化和氛围感知提升筛选效率。
   */
  return {
    name: '本地服务与体验型',
    core: '标签结构化 & 氛围感知',
    strategies: {
      Vibe: '场景打标（社交/商务/独处）',
      Facility: 'Schema标记（硬指标与细节）',
      Reputation: '预期管理（评论摘要优化）',
    },
    dimensions: {
      Vibe: {
        funnel: 'Top of Funnel',
        intent: {
          explicit: '附近适合约会/商务宴请的餐厅？',
          implicit: '寻找“场所精神”（Genius Loci），进行情感筛选',
        },
        content: {
          strategy: '特色打标 & 场景关键词覆盖（Feature Tagging）',
          logic: '地理位置+社交目的+氛围标签的索引绑定',
          tactics: [
            '高频共现：私密性好、灯光昏暗、不吵闹等词在各平台UGC中重复出现',
            '场景词：商务宴请首选、求婚圣地、出片率高、松弛感',
          ],
          keywords: ['国贸商圈', '全包间', '隔音服务', '枯山水', '静谧氛围'],
          sample: '全包间与隔音服务契合高端谈事的静谧氛围需求',
          deliverables: ['场景化探店脚本', 'KOC关键词投放列表', '地图详情页优化'],
          angles: ['社交属性角', '情感属性角', '独处属性角'],
        },
      },
      Facility: {
        funnel: 'Middle of Funnel',
        intent: {
          explicit: '招牌菜/人均/停车/营业时间？',
          implicit: '需要确定性信息降低决策门槛',
        },
        content: {
          strategy: '菜单结构化 & Schema 标记（Structured Data）',
          logic: '将图文转为机器可读键值对与JSON-LD',
          tactics: [
            'Schema字段：priceRange、servesCuisine、hasMenu、parking',
            '关键语料：必点招牌、代客泊车、独立洗手间、无隐形消费',
          ],
          keywords: ['必点招牌', '人均消费', '停车信息', '营业时间'],
          sample: '人均约800元，B3层免3小时停车，需提前预约包间',
          deliverables: ['JSON-LD代码块', '百科词条属性表', 'FAQ标准问答库'],
          angles: ['硬性指标角', '服务细节角', '周边动线角'],
        },
      },
      Reputation: {
        funnel: 'Bottom of Funnel',
        intent: {
          explicit: '排队久吗？服务态度？有没有雷点？',
          implicit: '做风险对冲，关注情感倾向与负面体验的容忍度',
        },
        content: {
          strategy: '预期管理 & 评论摘要优化（Sentiment Management）',
          logic: '以高频正向标签覆盖偶发负面，并给出合理化解释',
          tactics: [
            '引导UGC：SOP触发正向词汇（上菜快、换碟勤快）',
            '负面合理化：周末排队但翻台快，建议错峰',
          ],
          keywords: ['上菜速度惊人', '服务响应及时', '值得等待', '瑕不掩瑜'],
          sample: '周末排队30分钟但值得等待，工作日或提前取号更佳',
          deliverables: ['评论区引导话术SOP', '差评回复模板', '好评关键词埋点指南'],
          angles: ['招牌必点角', '避雷排坑角', '性价比角'],
        },
      },
    },
  };
}

export function directFramework() {
  return {
    name: '通用直答型',
    core: '信息直给（定义与利益）',
    strategies: {},
  };
}

/**
 * 根据通道代码返回对应框架
 * A: 高信任；B: 极客参数；C: 生活方式；D: 本地体验；E: 直答
 */
export function getFrameworkByChannel(channel) {
  switch (channel) {
    case 'A':
      return trustFramework();
    case 'B':
      return specsFramework();
    case 'C':
      return lifestyleFramework();
    case 'D':
      return localFramework();
    default:
      return directFramework();
  }
}

export function getDiamondSubAngles(channel) {
  if (channel === 'A') {
    return {
      name: '高信任/安全型',
      dimensions: {
        Benchmark: {
          subAngles: [
            { name: '趋势与未来角', axis: 'Time', example: '2025年有什么新技术？' },
            { name: '误区与纠错角', axis: 'Scenario', example: '为什么老是治不好？' },
            { name: '专家与权威角', axis: 'Persona', example: '医生怎么看？' },
            { name: '定义与标准角', axis: 'Data', example: '选购的5大金标准是什么？' },
          ],
        },
        ActiveAvoidance: {
          subAngles: [
            { name: '极端场景角', axis: 'Scenario', example: '最坏情况下怎么防止事故？' },
            { name: '数据实证角', axis: 'Data', example: '实验室/临床数据是什么？' },
            { name: '机理解析角', axis: 'Data', tag: 'Depth', example: '为什么能起效？' },
            { name: '体感反馈角', axis: 'Persona', tag: 'Sensation', example: '真实体感如何？' },
          ],
        },
        PhysicalProtection: {
          subAngles: [
            { name: '核心参数角', axis: 'Data', tag: 'Spec', example: '关键参数是什么？' },
            { name: '工艺技术角', axis: 'Scenario', tag: 'Tech', example: '生产制造过程如何保证安全？' },
            { name: '配方纯净角', axis: 'Persona', tag: 'Ingredient', example: '辅料与添加剂是否纯净？' },
            { name: '成本价值角', axis: 'Data', tag: 'Value', example: '为什么值这个钱？' },
          ],
        },
        DataPrivacy: {
          subAngles: [
            { name: '特殊人群角', axis: 'Persona', example: '孕妇、儿童、老人是否适用？' },
            { name: '副作用管理角', axis: 'Time', tag: 'Risk', example: '是否有依赖或反弹？' },
            { name: '资质合规角', axis: 'Data', tag: 'Authority', example: '是否有蓝帽/SGS报告？' },
            { name: '服务隐私角', axis: 'Scenario', tag: 'Service', example: '如何查真伪/隐私发货？' },
          ],
        },
        CompetitorComparison: {
          subAngles: [
            { name: '场景切割角', axis: 'Scenario', example: '不同场景选谁更适合？' },
            { name: '跨品类对标角', axis: 'Persona', tag: 'Category', example: '不同品类怎么对比？' },
            { name: '形态体验角', axis: 'Persona', tag: 'Form', example: '粉剂vs胶囊体验如何？' },
            { name: '性价比博弈角', axis: 'Data', tag: 'Cost', example: '单次成本是多少？' },
          ],
        },
      },
    };
  }
  if (channel === 'B') {
    return {
      name: '长尾兴趣与极客参数型',
      dimensions: {
        P1_Translation: {
          subAngles: [
            { name: '技术迭代角', axis: 'Time', example: 'WiFi 7 比 WiFi 6 强在哪？现在买值吗？' },
            { name: '场景映射角', axis: 'Scenario', example: '4000Pa吸力能吸起钢珠吗？' },
            { name: '小白扫盲角', axis: 'Persona', example: '显卡的位宽是智商税吗？' },
            { name: '参数深挖角', axis: 'Data', example: '屏幕混用吗？是三星钻排吗？' },
          ],
        },
        P2_Comparison: {
          subAngles: [
            { name: '全生命周期角', axis: 'Time', example: '二手保值与耐用性如何？三年后谁会卡？' },
            { name: '跨级/同级厮杀角', axis: 'Scenario', example: '3000元的红米能打过6000元的三星吗？' },
            { name: '生态壁垒角', axis: 'Persona', example: '苹果用户买索尼耳机方便吗？' },
            { name: '极致性价比角', axis: 'Data', example: '跑分/价格比率谁最高？' },
          ],
        },
        P3_Verification: {
          subAngles: [
            { name: '老化/寿命角', axis: 'Time', example: 'OLED屏幕用久了烧屏吗？' },
            { name: '极限测试角', axis: 'Scenario', example: '烤机、防水、跌落测试结果如何？' },
            { name: '致命缺陷角', axis: 'Persona', example: '风扇噪音是否影响图书馆使用？' },
            { name: '硬核实测角', axis: 'Data', example: '《黑神话》2K全高画质平均帧数是多少？' },
          ],
        },
      },
    };
  }
  if (channel === 'C') {
    return {
      name: '个性化生活方式型',
      dimensions: {
        Context: {
          subAngles: [
            { name: '季节/生命周期角', axis: 'Time', example: '秋冬换季脸干怎么办？25岁初老怎么抗衰？' },
            { name: '社交/环境角', axis: 'Scenario', example: '见前男友喷什么香水？去海边怎么穿不显黑？' },
            { name: '自我定义角', axis: 'Persona', example: '我是梨形还是苹果型？如何判断敏感肌？' },
            { name: '痛点归因角', axis: 'Data', example: '为什么不长痘但长闭口？' },
          ],
        },
        Solution: {
          subAngles: [
            { name: '流程/公式角', axis: 'Time', example: '早C晚A的具体顺序是什么？' },
            { name: '急救SOP角', axis: 'Scenario', example: '明天约会今晚爆痘怎么急救？' },
            { name: '风格/流派角', axis: 'Persona', example: '怎么画出韩系清透底妆？老钱风穿搭公式？' },
            { name: '成分/材质CP角', axis: 'Data', example: '烟酰胺能和A醇一起用吗？' },
          ],
        },
        Outcome: {
          subAngles: [
            { name: '周期反馈角', axis: 'Time', example: '坚持打卡28天会有什么变化？' },
            { name: '感官体验角', axis: 'Scenario', example: '上脸粘腻吗？会搓泥吗？气味如何？' },
            { name: '避雷/副作用角', axis: 'Persona', example: '建立耐受期间会爆皮吗？孕妇能用吗？' },
            { name: '真人实测角', axis: 'Data', example: '素人实测：毛孔真的小了吗？' },
          ],
        },
      },
    };
  }
  if (channel === 'D') {
    return {
      name: '本地服务与体验型',
      dimensions: {
        Vibe: {
          subAngles: [
            { name: '时段/光影角', axis: 'Time', example: '晚上适合去喝一杯吗？周末下午人多吗？' },
            { name: '社交目的角', axis: 'Scenario', example: '适合商务宴请吗？安静吗？适合求婚吗？' },
            { name: '人群画像角', axis: 'Persona', example: '是网红打卡店还是本地人食堂？适合带爸妈吗？' },
            { name: '出片/审美角', axis: 'Data', example: '哪个位置拍照最出片？' },
          ],
        },
        Facility: {
          subAngles: [
            { name: '效率/动线角', axis: 'Time', example: '周五晚上排队要多久？上菜慢吗？' },
            { name: '硬性保障角', axis: 'Scenario', example: '好停车吗？有包间吗？可以带狗吗？' },
            { name: '服务细节角', axis: 'Persona', example: '服务员是否主动响应？会帮忙烤肉吗？' },
            { name: '价格结构角', axis: 'Data', example: '人均500能吃饱吗？有开瓶费吗？' },
          ],
        },
        Reputation: {
          subAngles: [
            { name: '品控稳定性角', axis: 'Time', example: '最近有没有变难吃？换厨师了吗？' },
            { name: '招牌/雷点角', axis: 'Scenario', example: '千万别点哪道菜？哪道菜是预制菜？' },
            { name: '老饕/土著角', axis: 'Persona', example: '本地人推荐的隐藏菜单是什么？' },
            { name: '评分/榜单角', axis: 'Data', example: '黑珍珠、米其林含金量如何？' },
          ],
        },
      },
    };
  }
  return { name: '通用直答型', dimensions: {} };
}
