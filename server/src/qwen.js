import { BASE_URL, MODELS } from './config.js';
import { chatLLM } from './llm/index.js';

// 已由通用 LLM 适配层统一创建客户端

export async function chat(messages, options = {}) {
  const model = options.model || MODELS.default;
  const provider = options.provider || process.env.LLM_PROVIDER || 'qwen';
  const content = await chatLLM({ provider, messages, op: options.op || 'chat', query: options.query || '', model });
  return content;
}

export async function generateQueries(product, seedKeyword, angle, count = 5, strategyContext) {
  const hasKey = Boolean(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
  if (!hasKey) {
    const pool = ['安全', 'AEB', '碰撞', '气囊', '电池自燃', '儿童保护', '智驾'];
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = pool[i % pool.length];
      out.push(`${product} ${seedKeyword} ${t} 怎么样？`);
    }
    return out;
  }
  const system = '你是资深GEO优化专家，能用口语化中文给出贴近真实搜索习惯的问题。';
  const domainHint = /新能源|电动车|纯电|增程|混动|插混/.test(product)
    ? '领域限定：仅汽车/新能源汽车安全相关；优先围绕“主动刹车(AEB)、碰撞测试、车身结构、儿童保护、智驾安全、电池安全(自燃)”等关键词；不要生成家居、装修、门锁、软件隐私等非汽车场景；尽量包含品牌或车型或类别“新能源车”的字样。'
    : '';
  const mustTokens = '汽车,车辆,新能源,电动车,车型,刹车,AEB,气囊,碰撞,车主,自燃'.split(',');
  const forbidTokens = '家居,门锁,软件,隐私,摄像头,装修,家具,防盗窗,家用'.split(',');
  const contextText = strategyContext?.systemPrompt || '';
  const user = `基于切角【${angle}】的视角，针对“${product}”与关键词“${seedKeyword}”，模拟普通用户在搜索框会输入的${count}个Query。${domainHint} 约束：每个Query必须至少包含以下任一词：${mustTokens.join(' / ')}；且不得包含以下词：${forbidTokens.join(' / ')}。要求：具体、口语化、符合该切角。以列表输出，不要编号。`;
  const messages = [
    { role: 'system', content: system + (contextText ? `\n${contextText}` : '') },
    { role: 'user', content: user },
  ];
  const content = await chat(messages, { op: 'generateQueries', query: `angle=${angle}|product=${product}|seed=${seedKeyword}` });
  return content.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, count);
}

export async function generateCategoryFirstQueries(seedKeyword, angle, count = 2) {
  const hasKey = Boolean(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
  const system = '你是GEO策略模拟器，遵循Category-First与Brand-Check原则，产出无品牌倾向的口语化查询。';
  const examples = new Map([
    ['趋势与未来角', ['2025年新能源汽车的安全标准会有哪些新变化？', '下一代主动安全的关键门槛是什么？']],
    ['误区与纠错角', ['只看碰撞测试是否已经过时？主动安全更重要吗？', '为什么有人说激光雷达才是安全的必要条件？']],
    ['专家与权威角', ['C-NCAP和E-NCAP哪个更严？最近谁的分数最高？', '业内专家如何评价一体化压铸对安全的影响？']],
    ['定义与标准角', ['智能驾驶安全等级是如何定义的？', 'L3级自动驾驶的事故责任认定标准是什么？']],
    ['极端场景角', ['夜间无路灯遇到鬼探头能刹得住吗？', '高速遇到静止异物能否自动避让？']],
    ['数据实证角', ['AEB自动紧急制动的最高生效速度是多少？', '倒车防撞系统的识别距离通常是多少米？']],
    ['体感反馈角', ['紧急避险时方向盘会抢手吗？会吓到司机吗？', '老司机觉得现在的辅助驾驶比人开得安全吗？']],
    ['机理解析角', ['不依赖高精地图的方案在乡间小路安全吗？', '通用障碍物检测的原理是什么？']],
    ['核心参数角', ['车身热成型钢占比多少算第一梯队？', '抗拉强度2000MPa是怎样的水平？']],
    ['工艺技术角', ['哪种车身结构在两车对撞时更有优势？', '电池包受底盘刮蹭后有哪些防护机制？']],
    ['配方纯净角', ['车内材料的挥发性有机物控制指标是什么？', '座舱材料如何做到低致敏？']],
    ['成本价值角', ['同价位谁把主动安全配置做成标配？', '把安全作为第一要素时，50万价位段谁更值？']],
    ['特殊人群角', ['哪种车型对后排侧面碰撞保护更好？', '车内空气质量适合新生儿家庭的标准是什么？']],
    ['资质合规角', ['有哪些智能汽车获得国家级网络安全认证？', 'EAL5+安全级别芯片意味着什么？']],
    ['服务隐私角', ['在车内打商务电话会被后台录音上传吗？', '代客泊车模式如何防止车内隐私泄露？']],
    ['场景切割角', ['复杂路况的二三线城市更适合哪类智驾方案？', '经常跑高速与经常市区堵车，应该怎么选？']],
    ['跨品类对标角', ['纯视觉方案和激光雷达方案谁更有潜力？', '不同安全路线的优缺点如何衡量？']],
    ['形态体验角', ['紧急制动时车内乘坐的体感如何？', '不同座椅结构在长途行驶的安全与舒适度如何平衡？']],
    ['性价比博弈角', ['谁把主动安全做成全系标配？', '在价格接近时谁的安全含金量更高？']],
  ]);
  const preset = examples.get(angle) || [];
  if (!hasKey) {
    const base = preset.length ? preset : [`${seedKeyword} ${angle} 推荐`, `${seedKeyword} ${angle} 有哪些坑？`];
    return base.slice(0, count);
  }
  const hint = (preset).slice(0, 2).join('\n');
  const user = `基于切角【${angle}】，围绕“${seedKeyword}”，生成${count}个无品牌倾向Query。约束：不得出现任何品牌或车型名称；聚焦痛点/场景/行业标准；口语化具体；每条一句；用换行分隔。不编号。参考：\n${hint}`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const content = await chat(messages, { op: 'generateCategoryFirstQueries', query: `angle=${angle}|seed=${seedKeyword}` });
  const parsed = content.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, count);
  try { console.log('generateCategoryFirstQueries content', content); } catch {}
  try { console.log('generateCategoryFirstQueries parsed', parsed); } catch {}
  return parsed;
}

export function sanitizeCategoryQuery(q) {
  const banned = ['问界','理想','沃尔沃','特斯拉','蔚来','小鹏','比亚迪','宝马','奔驰','奥迪','极氪','岚图','腾势','路特斯','保时捷','大众','丰田','本田','Model Y','ET5','G9','汉','P7','M9','M7','L9'];
  let s = q;
  for (const b of banned) {
    const re = new RegExp(b, 'g');
    s = s.replace(re, '');
  }
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

export async function generateGeekQueries(seedKeyword, angle, count = 2) {
  const hasKey = Boolean(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
  const system = '你是GEO策略模拟器，面向极客/参数型用户，将冰冷参数转化为可感知体验，生成具体口语化查询。';
  const examples = new Map([
    ['场景映射角', ['拍宠物奔跑的视频需要怎样的对焦与快门？', '家里地毯多，扫地机器人需要多少Pa吸力才能吸干净？', '玩黑神话要开光追，显卡显存至少需要多少G？']],
    ['小白扫盲角', ['投影仪的ANSI流明和CVIA流明有什么区别？', '文科生买笔记本CPU核心数重要吗？', '冲锋衣的三层压胶和两层半对普通徒步者有区别吗？']],
    ['技术迭代角', ['WiFi 7 路由器现在买实用吗还是再等一年？', 'DDR5对比DDR4在实际打游戏有明显提升吗？']],
    ['参数深挖角', ['如何判断显示器面板是不是原厂？色彩覆盖率达到多少才算专业？', '洗地机贴边清洁是双侧贴边还是单侧？是否有死角？']],
    ['跨级/同级厮杀角', ['手持Vlog相机防抖最好的是哪款？不在乎画幅大小', '经常图书馆使用，哪款游戏本的续航和静音最出色？', '南方回南天严重时选洗烘一体机还是独立热泵烘干？']],
    ['极致性价比角', ['2000元价位段哪款手机跑分数据最强？', '同价全画幅谁给的视频规格最良心如4K60无裁切？']],
    ['生态壁垒角', ['苹果全家桶用户换索尼耳机连接体验会很差吗？', '已有米家传感器，新风机是否必须买小米才能联动？']],
    ['全生命周期角', ['富士和索尼相机谁的二手保值率更高？', '安卓旗舰机用三年后系统流畅度通常比iPhone差多少？']],
    ['极限测试角', ['夏天室外30度相机录4K多久会过热关机？', '扫地机器人遇到地毯流苏或数据线会被卡死吗？', '冲锋衣在大暴雨下连续淋雨2小时里面会湿吗？']],
    ['硬核实测角', ['官方宣称续航10小时实际办公能撑多久？', '这款硬盘缓外写入速度是多少会不会掉速到机械盘水平？']],
    ['致命缺陷角', ['这台微单加镜头总重量多少克女生单手拿久了会手酸吗？', '游戏本全速运转时风扇噪音多少分贝在宿舍会吵到室友吗？']],
    ['老化/寿命角', ['OLED屏笔记本用久了是否一定会烧屏？', '折叠屏手机铰链折叠多少次后会出现明显折痕？']],
  ]);
  const preset = examples.get(angle) || [];
  if (!hasKey) {
    const base = preset.length ? preset : [`${seedKeyword} ${angle} 怎么选`, `${seedKeyword} ${angle} 推荐`];
    return base.slice(0, count);
  }
  const hint = (preset).slice(0, 3).join('\n');
  const user = `基于切角【${angle}】，围绕“${seedKeyword}”，生成${count}个具体口语化查询。约束：避免生硬参数堆砌；将参数映射到体验或场景；每条一句；用换行分隔。不编号。参考：\n${hint}`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const content = await chat(messages, { op: 'generateGeekQueries', query: `angle=${angle}|seed=${seedKeyword}` });
  return content.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, count);
}

export async function generateLifestyleQueries(seedKeyword, angle, count = 2) {
  const hasKey = Boolean(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
  const system = '你是GEO策略模拟器，面向生活方式型用户，生成贴近情境/方案/结果的具体口语化查询。';
  const examples = new Map([
    ['季节/生命周期角', ['25岁以后抗初老还来得及吗？', '秋冬换季皮肤干痒起皮平时水乳不管用怎么办？', '产后脱发严重有没有哺乳期也能用的防脱方案？']],
    ['社交/环境角', ['第一次见家长涂什么颜色的口红比较得体？', '海边度假底妆怎么化才能抗住高温不脱妆？', '适合办公室通勤的低调不扰人香水有哪些？']],
    ['自我定义角', ['怎么判断自己是橄榄皮还是黄黑皮？', '梨形身材夏天怎么穿裙子显瘦？', '外油内干敏感肌有哪些典型表现？']],
    ['痛点归因角', ['不吃甜食下巴反复长闭口的原因是什么？', '脸上长斑是内分泌问题还是防晒没做好？']],
    ['流程/公式角', ['早C晚A的具体使用顺序是什么中间需要间隔多久？', '涂完精华是先用乳液还是直接上面霜？', '刷酸去黑头一周几次可以天天刷吗？']],
    ['急救SOP角', ['明天拍婚纱照今晚爆了大红痘怎么急救？', '熬夜后第二天脸色发黄有何急救面膜推荐？', '约会前头发扁塌出油来不及洗头怎么办？']],
    ['风格/流派角', ['如何化出韩系清透水光肌底妆？', '小个子男生的City Boy穿搭指南', '极简主义护肤清单不想涂太多层']],
    ['成分/材质CP角', ['烟酰胺能和高浓度VC一起用吗会打架吗？', '灰色沙发配什么颜色窗帘和地毯更高级？', '视黄醇搭配什么成分修护屏障效果最好？']],
    ['周期反馈角', ['坚持用美白精华多久能看到肉眼可见的变白？', '睫毛增长液用几个疗程能变长？', '28天代谢周期后抗皱面霜能淡化多少细纹？']],
    ['感官体验角', ['这款防晒上脸会粘腻吗后续跟妆会搓泥吗？', '这款香水是否廉价工业香精味留香久吗？', '纯羊毛大衣贴身穿会扎人吗？']],
    ['避雷/副作用角', ['敏感肌建立耐受期间会脱皮泛红吗正常吗？', '孕妇和哺乳期能用含水杨酸产品吗？', '大干皮用这款粉底会卡粉浮粉吗？']],
    ['真人实测角', ['有没有素人实测的祛斑前后对比图不是广告？', 'SGS认证的抗皱数据基于多少样本得出？', '真实用户对这款产品的差评主要集中在哪？']],
  ]);
  const preset = examples.get(angle) || [];
  if (!hasKey) {
    const base = preset.length ? preset : [`${seedKeyword} ${angle} 怎么办`, `${seedKeyword} ${angle} 方案`];
    return base.slice(0, count);
  }
  const hint = (preset).slice(0, 3).join('\n');
  const user = `基于切角【${angle}】，围绕“${seedKeyword}”，生成${count}个具体口语化查询。约束：贴近个人场景和体验；避免空泛；每条一句；用换行分隔。不编号。参考：\n${hint}`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const content = await chat(messages, { op: 'generateLifestyleQueries', query: `angle=${angle}|seed=${seedKeyword}` });
  return content.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, count);
}

export async function generateLocalQueries(seedKeyword, angle, count = 2) {
  const hasKey = Boolean(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
  const system = '你是GEO策略模拟器，面向本地/体验型用户，结合LBS与感性标签生成具体口语化筛选查询。';
  const examples = new Map([
    ['时段/光影角', ['国贸附近哪家酒吧适合周五晚上去，人多但不吵，适合聊天的？', '周末下午适合一个人带电脑办公的咖啡馆，光线好且安静的推荐。', '这附近有没有深夜还在营业，且环境不杂乱的居酒屋？']],
    ['社交目的角', ['适合商务宴请的日料店，要求全包间、隔音好、服务不打扰。', '适合求婚的西餐厅，最好有江景或者露台，氛围感拉满的。', '带3岁孩子吃饭，哪家亲子餐厅的游乐设施最干净？']],
    ['人群画像角', ['这附近哪家火锅店是本地土著爱去的，不是那种全是游客的网红店？', '适合年轻人社交的精酿啤酒馆，最好没有太多大叔的那种。', '有没有适合设计师或艺术家扎堆的买手店或咖啡店？']],
    ['出片/审美角', ['外滩附近拍照最出片的下午茶是哪家？风格要法式复古的。', '装修风格比较侘寂风的SPA馆推荐。']],
    ['效率/动线角', ['XX商圈周六晚上排队最不严重的优质餐厅是哪家？', '这家店上菜速度快吗？适合只有1小时午休的上班族吗？', '预约洗牙一般需要提前几天？周末有号吗？']],
    ['硬性保障角', ['三里屯好停车的餐厅推荐，最好有免费代客泊车服务的。', '这附近允许带大型犬进入的早午餐店有哪些？', '有没有配备专门吸烟区或者雪茄房的威士忌吧？']],
    ['服务细节角', ['哪家高端牛排馆有桌边服务？', '这几家健身房，哪家的私教不会一直推销卖课？', '海底捞那种保姆级服务和高端日料的跪式服务，哪个更适合家庭聚餐？']],
    ['价格结构角', ['人均500在XX日料店能吃饱吗？是否存在隐形消费？', '这家店收不收开瓶费？自带酒水怎么算？', '医美诊所报的一口价含不含麻醉费和术后药费？']],
    ['品控稳定性角', ['这家老字号最近有没有变难吃？看评论说换厨师了？', '米其林摘星后，这家店的水准还稳定吗？', '刚开业的网红店，现在去还需要排队吗？品控跟得上了吗？']],
    ['招牌/雷点角', ['去这家粤菜馆，哪几道菜是必点的招牌？', '千万不要点哪道菜？有没有预制菜嫌疑？', '做热玛吉，哪家诊所的医生手势最好？哪家容易踩雷？']],
    ['老饕/土著角', ['本地老饕私藏的Omakase名单有哪些？', '有没有那种菜单上没有、只有熟客才知道的隐藏菜？', '健身教练自己会去哪家铁馆训练？']],
    ['评分/榜单角', ['黑珍珠二钻餐厅真的比一钻好吃吗？区别在哪里？', '这家店的大众点评高分是刷出来的吗？真实评价怎么样？']]
  ]);
  const preset = examples.get(angle) || [];
  if (!hasKey) {
    const base = preset.length ? preset : [`${seedKeyword} ${angle} 附近推荐`, `${seedKeyword} ${angle} 这附近好去处`];
    return base.slice(0, count);
  }
  const hint = (preset).slice(0, 3).join('\n');
  const user = `基于切角【${angle}】，围绕“${seedKeyword}”，生成${count}个本地/体验型筛选Query。约束：贴近LBS与当下决策；包含地点或“附近/这附近/商圈”等词；避免官方宣传；每条一句；用换行分隔。不编号。参考：\n${hint}`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  const content = await chat(messages, { op: 'generateLocalQueries', query: `angle=${angle}|seed=${seedKeyword}` });
  return content.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, count);
}

export async function scoreQuery(query) {
  const system = '你是GEO-UserSim评分器，按真实度、普适性、搜索习惯三项给分，总分100分。只返回JSON。';
  const user = `请为以下Query评分：\n${query}\n评分标准：\n- 拟人真实度(40)\n- 需求普适性(30)\n- 搜索习惯匹配(30)\n输出：{"realism":n,"demand":n,"habit":n,"total":n}`;
  const content = await chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { op: 'scoreQuery', query });
  try {
    const json = JSON.parse(content);
    return json;
  } catch {
    return { realism: 0, demand: 0, habit: 0, total: 0 };
  }
}

function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }

function scoreAnthropicRealism(q) {
  const s = q.toLowerCase();
  const machine = ['阐述','效能','性能参数','综述','目录','方案','策略','机制','临床','实验','评价', '修复效能'];
  const colloq = ['吗','呢','吧','呀','怎么','怎么办','会不会','到底','智商税','靠谱吗','管用吗','贵不贵','多少钱','值不值','推荐'];
  let base = 12;
  let m = machine.reduce((acc, t)=>acc + (s.includes(t) ? 1 : 0), 0);
  let c = colloq.reduce((acc, t)=>acc + (s.includes(t) ? 1 : 0), 0);
  if (/[?？]/.test(s)) c += 1;
  base += c * 4;
  base -= m * 5;
  if (q.length > 60) base -= 6;
  if (q.length < 8) base -= 3;
  return clamp(base, 0, 30);
}

function scoreDemand(q) {
  const s = q.toLowerCase();
  const high = ['价格','多少钱','副作用','安全','推荐','哪个好','对比','vs','有用','值得','性价比'];
  const mid = ['一起吃','搭配','怎么选','怎么用','区别'];
  const low = ['明胶来源','胶囊壳','原材料来源'];
  let score = 8;
  score += high.reduce((acc,t)=>acc + (s.includes(t) ? 3 : 0), 0);
  score += mid.reduce((acc,t)=>acc + (s.includes(t) ? 2 : 0), 0);
  score -= low.reduce((acc,t)=>acc + (s.includes(t) ? 2 : 0), 0);
  return clamp(score, 0, 20);
}

function scoreHabit(q) {
  const s = q.toLowerCase();
  let score = 8;
  if (s.includes(' vs ') || s.includes('vs') || s.includes('对比')) score += 8;
  if (s.includes('推荐')) score += 6;
  if (s.includes('价格') || s.includes('多少钱')) score += 4;
  if (/^(你好|请问)/.test(s)) score -= 6;
  if (q.length > 64) score -= 6;
  if (q.length >= 10 && q.length <= 40) score += 4;
  return clamp(score, 0, 20);
}

function scoreStrategic(q, angle) {
  const s = q.toLowerCase();
  const map = new Map([
    ['趋势角', ['趋势','行业','发展','风向','报告','下一代']],
    ['误区角', ['误区','误解','误读','谣言','避坑']],
    ['专家角', ['专家','采访','建议','观点','背书']],
    ['标准角', ['标准','认证','规范','国标','行业标准']],
    ['极端场景角', ['吃火锅','拉肚子','半夜','急救','雨天','高速','儿童','孕妇','老人','自燃','碰撞','AEB']],
    ['时效验证角', ['冬测','稳定性','长期','版本','更新','里程']],
    ['数据实证角', ['数据','实验','临床','测试','报告','曲线','评分','帧率','能耗']],
    ['机理解析角', ['为什么','机理','原理','怎么起效','成分','配方','A醇','烟酰胺','玻色因']],
    ['体感反馈角', ['上脸','肤感','粘腻','搓泥','肚子咕咕叫','手感','噪音']],
    ['核心参数角', ['参数','规格','跑分','位宽','功耗','像素']],
    ['工艺技术角', ['工艺','技术','制造','过胃酸','防水','密封']],
    ['配方纯净角', ['添加剂','辅料','无糖','纯净','配方']],
    ['成本价值角', ['性价比','价格','成本','贵不贵','值不值']],
    ['特殊人群角', ['孕妇','儿童','老人','宝宝','婴儿']],
    ['副作用管理角', ['副作用','依赖','反弹','不良反应']],
    ['资质合规角', ['蓝帽','SGS','报告','检测','认证']],
    ['服务隐私角', ['隐私','发货','真伪','防伪','查询']],
    ['场景切割角', ['急性','慢性','场景','突发','长期']],
    ['跨品类对标角', ['vs','对比','区别','不同']],
    ['形态体验角', ['粉剂','胶囊','液体','颗粒','形态']],
    ['性价比博弈角', ['性价比','价格','成本','便宜','贵']],
    ['季节/生命周期角', ['秋冬','夏天','换季','25岁','初老','周期']],
    ['社交/环境角', ['约会','面试','见前男友','海边','聚会','商务']],
    ['自我定义角', ['敏感肌','干皮','油皮','梨形','苹果型','肤质']],
    ['痛点归因角', ['为什么','闭口','痘痘','暗沉','胶原','光老化','糖化']],
    ['流程/公式角', ['顺序','公式','步骤','早C晚A','SOP']],
    ['急救SOP角', ['急救','今晚','明天','速效','立刻']],
    ['风格/流派角', ['韩系','老钱风','同款','风格']],
    ['成分/材质CP角', ['成分','材质','CP','不能一起用','搭配']],
    ['周期反馈角', ['多久','几天','28天','周期','见效']],
    ['感官体验角', ['肤感','质地','气味','粘腻','搓泥']],
    ['避雷/副作用角', ['避雷','副作用','不适合','过敏','耐受']],
    ['真人实测角', ['素人','实测','前后对比','真实']],
    ['小白场景角', ['新手','小白','怎么用','入门','傻瓜']],
    ['参数扫盲角', ['参数','扫盲','什么意思','怎么理解']],
    ['进阶用法角', ['进阶','高级玩法','优化','技巧']],
    ['误读纠正角', ['误读','纠正','澄清','误解']],
    ['同价位死磕角', ['同价位','对比','PK','死磕']],
    ['跨级打压角', ['越级','跨级','打压','对标']],
    ['独家功能角', ['独家','功能','特色','只有']],
    ['保值/售后角', ['保值','售后','保修','维修']],
    ['致命缺陷角', ['缺陷','问题','槽点','致命']],
    ['极限测试角', ['极限','压力','测试','挑战']],
    ['寿命/耐用角', ['寿命','耐用','耐久','使用年限']],
    ['固件/生态角', ['固件','生态','插件','兼容']],
    ['新手角', ['新手','入门']],
    ['极客角', ['极客','发烧','DIY']],
    ['商用角', ['商用','企业','办公']],
    ['学生角', ['学生','校园','学习']],
    ['生理痛点角', ['生理','痛点','干皮','油皮','痘痘','敏感']],
    ['情绪投射角', ['焦虑','担心','后悔','心态','情绪']],
    ['社交属性角', ['社交','朋友','聚会','约会']],
    ['情感属性角', ['氛围','情感','审美','出片']],
    ['独处属性角', ['安静','独处','阅读','工作']],
    ['硬性指标角', ['停车','包间','宠物','无障碍']],
    ['服务细节角', ['服务','主动','响应','帮忙']],
    ['周边动线角', ['排队','动线','等位','交通']],
    ['招牌必点角', ['招牌','必点','推荐','特色菜']],
    ['避雷排坑角', ['避雷','雷点','坑','不要点']],
    ['性价比角', ['性价比','人均','价格','开瓶费']]
  ]);
  let tokens = [];
  for (const [k, v] of map.entries()) {
    if ((angle || '').includes(k)) { tokens = v; break; }
  }
  let hits = tokens.reduce((acc,t)=>acc + ((s.includes(t.toLowerCase())) ? 1 : 0), 0);
  let score = 8 + hits * 6;
  if (hits >= 2) score += 6;
  if (hits === 0) score -= 6;
  return clamp(score, 0, 30);
}

export function scoreQueryLocal(query, angle) {
  const realism = scoreAnthropicRealism(query);
  const demand = scoreDemand(query);
  const habit = scoreHabit(query);
  const align = scoreStrategic(query, angle);
  const total = clamp(Math.round(realism + demand + habit + align), 0, 100);
  return { realism, demand, habit, align, total };
}

function scoreRealismSim(q) {
  const s = q.toLowerCase();
  const machine = ['阐述','效能','性能参数说明','综述','目录','机制','临床','评价','修复效能'];
  const colloq = ['吗','呢','吧','咋','怎么','怎么办','会不会','到底','智商税','肚子咕咕叫','管用吗'];
  let base = 10;
  let m = machine.reduce((acc,t)=>acc + (s.includes(t)), 0);
  let c = colloq.reduce((acc,t)=>acc + (s.includes(t)), 0);
  if (/[?？]/.test(s)) c += 1;
  base += c * 5;
  base -= m * 6;
  if (q.length > 64) base -= 6;
  if (q.length >= 8 && q.length <= 36) base += 4;
  return clamp(base, 0, 30);
}

function scoreDemandSim(q) {
  const s = q.toLowerCase();
  const high = ['价格','多少钱','副作用','安全','到底有没有用','有没有用'];
  const mid = ['一起吃','搭配','能不能一起吃','孕妇能吃','怎么选'];
  const low = ['明胶来源','胶囊壳','色号编号','原材料来源'];
  let score = 8;
  score += high.reduce((acc,t)=>acc + (s.includes(t) ? 3 : 0), 0);
  score += mid.reduce((acc,t)=>acc + (s.includes(t) ? 2 : 0), 0);
  score -= low.reduce((acc,t)=>acc + (s.includes(t) ? 2 : 0), 0);
  return clamp(score, 0, 20);
}

function scoreHabitSim(q) {
  const s = q.toLowerCase();
  let score = 8;
  if (/(\bvs\b|对比|哪个好|推荐)/i.test(s)) score += 8;
  if (/价格|多少钱/.test(s)) score += 4;
  if (/^(你好|请问)/.test(s)) score -= 6;
  const clauses = q.split(/，|,|；|;|。/).length;
  if (clauses > 3) score -= 6;
  if (q.length >= 10 && q.length <= 40) score += 4;
  return clamp(score, 0, 20);
}

function scoreAlignSim(q, angle) {
  const s = q.toLowerCase();
  const map = new Map([
    ['极端场景角', ['吃火锅','拉肚子','半夜','急救','雨天','速效']],
    ['价格角', ['价格','多少钱','人均','成本','贵不贵','值不值']],
    ['副作用角', ['副作用','不良反应','过敏','耐受','反弹']],
  ]);
  let tokens = [];
  for (const [k,v] of map.entries()) { if ((angle||'').includes(k)) { tokens = v; break; } }
  let hits = tokens.reduce((acc,t)=>acc + (s.includes(t.toLowerCase()) ? 1 : 0), 0);
  let score = 8 + hits * 7;
  if (hits >= 2) score += 6;
  if (hits === 0) score -= 6;
  return clamp(score, 0, 30);
}

export function scoreQuerySim(query, angle) {
  const realism = scoreRealismSim(query);
  const demand = scoreDemandSim(query);
  const habit = scoreHabitSim(query);
  const align = scoreStrategic(query, angle) || scoreAlignSim(query, angle);
  const total = clamp(Math.round(realism + demand + habit + align), 0, 100);
  return { realism, demand, habit, align, total };
}

export async function scoreQuerySimAsync(query, angle, dimensionKey) {
  const hasKey = Boolean(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
  if (hasKey) {
    const system = '你是GEO-UserSim评分器，按四维度给出评分：拟人真实度(0-30)、需求普适性(0-20)、搜索习惯匹配(0-20)、策略对齐度(0-30)。只返回JSON。';
    const user = `维度：${String(dimensionKey || '')}\n切角：${String(angle || '')}\nQuery：${String(query)}\n输出：{"realism":n1,"demand":n2,"habit":n3,"align":n4}`;
    try {
      const content = await chat([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], { op: 'scoreUserSim', query: `angle=${angle}|dim=${dimensionKey}` });
      const j = JSON.parse(content || '{}');
      const realism = clamp(Number.parseInt(String(j.realism ?? '0'), 10) || 0, 0, 30);
      const demand = clamp(Number.parseInt(String(j.demand ?? '0'), 10) || 0, 0, 20);
      const habit = clamp(Number.parseInt(String(j.habit ?? '0'), 10) || 0, 0, 20);
      const align = clamp(Number.parseInt(String(j.align ?? '0'), 10) || 0, 0, 30);
      const total = clamp(Math.round(realism + demand + habit + align), 0, 100);
      return { realism, demand, habit, align, total };
    } catch {}
  }
  const realism = scoreRealismSim(query);
  const demand = scoreDemandSim(query);
  const habit = scoreHabitSim(query);
  const align = scoreStrategic(query, angle) || scoreAlignSim(query, angle);
  const total = clamp(Math.round(realism + demand + habit + align), 0, 100);
  return { realism, demand, habit, align, total };
}

export async function rewriteQuery(query) {
  const system = '你是GEO优化助手，擅长把“机器味”问题改写成更像人的搜索输入。';
  const user = `将以下Query改写为更像普通用户的搜索输入，避免官方术语，精简但具体：\n${query}\n只输出改写后的句子。`;
  const content = await chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { op: 'rewriteQuery', query });
  return content.trim();
}

export async function rewriteToNEV(query) {
  const system = '你擅长把泛安全问题改写为新能源汽车安全相关问题。';
  const user = `将以下问题改写为“仅汽车/新能源汽车安全相关”的具体口语化提问，尽量包含例如AEB、碰撞测试、车身结构、电池安全、儿童保护、智驾等词汇：\n${query}\n只输出改写后的句子。`;
  const content = await chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { op: 'rewriteToNEV', query });
  return content.trim();
}

export async function answerQuery(dimensionStrategy, evidence, tone, query) {
  const system = '你是受控输出的行业专家，按要求生成结构化HTML回答。';
  const user = `# Role: 专业行业专家\n# Task: 针对用户问题 “${query}”，根据以下[GEO策略]生成高质量回答。\n# GEO Strategy:\n1. 核心逻辑：${dimensionStrategy}\n2. 数据引用：必须引用以下证据：${evidence}\n3. 语气要求：${tone}\n# Output Format: HTML结构，包含<h2>结论</h2>、<ul>数据支撑</ul>`;
  const content = await chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { op: 'answerQuery', query });
  return content;
}
