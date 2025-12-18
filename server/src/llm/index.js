import OpenAI from 'openai';
import { PROVIDERS } from './providers.js';
import { startLog, endLog } from '../monitor.js';

const ark = new OpenAI({ apiKey: process.env.ARK_API_KEY || process.env.DOUBAO_API_KEY || '', baseURL: 'https://ark.cn-beijing.volces.com/api/v3' });

async function callWenxin(accessToken, model, system, prompt) {
  const url = 'https://qianfan.baidubce.com/v2/chat/completions';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
  const appid = process.env.BAIDU_APP_ID;
  if (appid) headers['appid'] = appid;
  const payload = {
    model: model || 'ERNIE-Bot',
    messages: [ { role: 'system', content: system || '' }, { role: 'user', content: prompt } ],
    web_search: { enable: true, enable_citation: true, enable_trace: true },
  };
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (j?.error?.code === 'invalid_iam_token') throw new Error('invalid_iam_token');
  return j.result || j.choices?.[0]?.message?.content || '';
}

export async function callWenxinDetailed(accessToken, model, system, prompt) {
  const url = 'https://qianfan.baidubce.com/v2/chat/completions';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
  const appid = process.env.BAIDU_APP_ID;
  if (appid) headers['appid'] = appid;
  const payload = {
    model: model || 'ERNIE-Bot',
    messages: [ { role: 'system', content: system || '' }, { role: 'user', content: prompt } ],
    web_search: { enable: true, enable_citation: true, enable_trace: true }
  };
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!r.ok) {
    let msg = '';
    try { msg = await r.text(); } catch {}
    throw new Error(`[HTTP ${r.status}] ${msg}`.trim());
  }
  const j = await r.json().catch(() => ({}));
  if (j?.error?.code === 'invalid_iam_token') throw new Error('invalid_iam_token');
  const answer = j.result || j.choices?.[0]?.message?.content || '';
  const sources = [];
  try {
    const cits = j.search_info?.citations || j.citations || j.search_info?.evidences || j.references;
    if (Array.isArray(cits)) {
      cits.forEach((c) => {
        const uri = c.url || c.uri || c.link || c.source_url;
        const title = c.title || c.source || c.name || '';
        if (uri && uri.startsWith('http')) sources.push({ title, uri });
      });
    }
  } catch {}
  return { answer, sources };
}

export async function callQwenDeepResearchDetailed(apiKey, messages) {
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, Accept: 'text/event-stream' };
  const body = { model: 'qwen-deep-research', messages, stream: true, result_format: 'message', incremental_output: true };
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) {
    let msg = '';
    try { msg = await r.text(); } catch {}
    throw new Error(`[HTTP ${r.status}] ${msg}`.trim());
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let answer = '';
  const sources = [];
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      const s = String(line || '').trim();
      let jsonText = '';
      if (s.startsWith('data:')) {
        jsonText = s.slice(5).trim();
      } else if (s.startsWith('{') || s.startsWith('[')) {
        jsonText = s;
      } else {
        continue;
      }
      if (!jsonText || jsonText === 'DONE') continue;
      let obj;
      try { obj = JSON.parse(jsonText); } catch { continue; }
      const msg = obj?.output?.message || {};
      const content = String(msg.content || '');
      if (content) answer += content;
      const refs = obj?.output?.message?.extra?.deep_research?.references;
      if (Array.isArray(refs)) {
        refs.forEach((ref) => {
          const uri = ref.url || ref.uri || '';
          const title = ref.title || '';
          if (uri && uri.startsWith('http')) sources.push({ title, uri });
        });
      }
    }
  }
  return { answer, sources };
}

async function callOpenAICompat(endpoint, apiKey, model, system, prompt) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
  const body = { model, messages: [ { role: 'system', content: String(system || '') }, { role: 'user', content: String(prompt || '') } ], stream: false };
  const r = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) { try { return `[HTTP ${r.status}] ` + (await r.text()); } catch { return ''; } }
  const j = await r.json().catch(() => ({}));
  return j.choices?.[0]?.message?.content || j.output?.text || j.result || j.error?.message || '';
}

async function callDoubao(apiKey, model, system, prompt) {
  const isNotFound = (t) => typeof t === 'string' && /InvalidEndpointOrModel\.NotFound|\bNot Found\b/i.test(t);
  const tryV3Messages = async () => {
    const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
    const sys = `${String(system || '')} 用json返回`;
    const usr = String(prompt || '');
    const body = { model: model || 'doubao-seed-1-6-251015', messages: [ { role: 'system', content: sys }, { role: 'user', content: usr } ], reasoning_effort: 'medium', response_format: { type: 'json_object' } };
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!r.ok) { try { return `[HTTP ${r.status}] ` + (await r.text()); } catch { return ''; } }
    const j = await r.json().catch(() => ({}));
    return j.output_text || j.output?.text || j.choices?.[0]?.message?.content || j.result || '';
  };
  const tryV3Input = async () => {
    const url = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
    const sys = `${String(system || '')} 用json返回`;
    const usr = String(prompt || '');
    const body = { model: model || 'doubao-seed-1-6-251015', input: { messages: [ { role: 'system', content: sys }, { role: 'user', content: usr } ] }, response_format: { type: 'json_object' } };
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!r.ok) { try { return `[HTTP ${r.status}] ` + (await r.text()); } catch { return ''; } }
    const j = await r.json().catch(() => ({}));
    return j.output_text || j.output?.text || j.choices?.[0]?.message?.content || j.result || '';
  };
  const tryV1 = async () => {
    const url = 'https://ark.cn-beijing.volces.com/api/v1/chat/completions';
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
    const body = { model: model || 'doubao-seed-1-6-251015', messages: [ { role: 'system', content: String(system || '') }, { role: 'user', content: String(prompt || '') } ], response_format: { type: 'json_object' } };
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!r.ok) { try { return `[HTTP ${r.status}] ` + (await r.text()); } catch { return ''; } }
    const j = await r.json().catch(() => ({}));
    return j.choices?.[0]?.message?.content || j.output?.text || j.result || '';
  };
  let v3 = await tryV3Messages();
  if (v3 && String(v3).trim() && !isNotFound(v3)) return v3;
  v3 = await tryV3Input();
  if (v3 && String(v3).trim() && !isNotFound(v3)) return v3;
  let v1 = await tryV1();
  if (v1 && String(v1).trim() && !isNotFound(v1)) return v1;
  const altModels = ['doubao-seed-1-6-251015'];
  for (const m of altModels) {
    try {
      model = m;
      v3 = await tryV3Messages();
      if (v3 && String(v3).trim() && !isNotFound(v3)) return v3;
      v3 = await tryV3Input();
      if (v3 && String(v3).trim() && !isNotFound(v3)) return v3;
      v1 = await tryV1();
      if (v1 && String(v1).trim() && !isNotFound(v1)) return v1;
    } catch {}
  }
  return v3 || v1 || '';
}

function getProviderConfig(provider) {
  const alias = provider === 'qianwen' ? 'qwen' : provider;
  const p = PROVIDERS[alias] || PROVIDERS.qwen;
  return p;
}

function getClient(provider) {
  const cfg = getProviderConfig(provider);
  if (!cfg.compatible) {
    throw new Error(`Provider ${provider} is not OpenAI-compatible yet`);
  }
  const apiKey = cfg.apiKey();
  const baseURL = cfg.baseURL();
  if (!apiKey) throw new Error(`Missing API key for ${provider}`);
  return { client: new OpenAI({ apiKey, baseURL }), baseURL, model: cfg.model() };
}

export async function chatLLM({ provider = process.env.LLM_PROVIDER || 'qwen', messages, op = 'chat', query, model }) {
  // Wenxin 原生分支（非 OpenAI 兼容）
  if (provider === 'wenxin') {
    const cfg = getProviderConfig('wenxin');
    const baseURL = cfg.baseURL();
    const apiKey = cfg.apiKey();
    let usedModel = cfg.model() || 'ERNIE-Bot';
    if (model && /ernie/i.test(model)) usedModel = model;
    const id = startLog({ platform: provider, model: usedModel, operation: op, query: query || '', prompt: JSON.stringify(messages), baseURL });
    try {
      if (!baseURL) throw new Error('Missing WENXIN_BASE_URL');
      if (!apiKey) throw new Error('Missing WENXIN_API_KEY');
      const sys = String((messages || []).find(m => m.role === 'system')?.content || '');
      const usr = String((messages || []).slice().reverse().find(m => m.role === 'user')?.content || '');
      const content = String(await callWenxin(apiKey, usedModel, sys, usr) || '').trim();
      endLog(id, { success: true, response: content || '' });
      return content || '';
    } catch (e) {
      endLog(id, { success: false, error: e });
      throw e;
    }
  }
  if (provider === 'deepseek') {
    const cfg = getProviderConfig('deepseek');
    const baseURL = cfg.baseURL();
    const apiKey = cfg.apiKey();
    const usedModel = model || cfg.model();
    const id = startLog({ platform: provider, model: usedModel, operation: op, query: query || '', prompt: JSON.stringify(messages), baseURL });
    try {
      if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY');
      const sys = String((messages || []).find(m => m.role === 'system')?.content || '');
      const usr = String((messages || []).slice().reverse().find(m => m.role === 'user')?.content || '');
      let content = String(await callOpenAICompat(`${baseURL}/chat/completions`, apiKey, usedModel, sys, usr) || '').trim();
      const isModelErr = (t) => typeof t === 'string' && /Model Not Exist|model not exist|permission denied/i.test(t);
      if (!content || isModelErr(content)) {
        const tries = Array.from(new Set([usedModel, 'deepseek-chat', 'deepseek-reasoner']));
        for (const m of tries) {
          try {
            const t = String(await callOpenAICompat(`${baseURL}/chat/completions`, apiKey, m, sys, usr) || '').trim();
            if (t && !isModelErr(t)) { content = t; break; }
          } catch {}
        }
      }
      endLog(id, { success: true, response: content || '' });
      return content || '';
    } catch (e) {
      endLog(id, { success: false, error: e });
      throw e;
    }
  }
  if (provider === 'kimi') {
    const cfg = getProviderConfig('kimi');
    const baseURL = cfg.baseURL();
    const apiKey = cfg.apiKey();
    const usedModel = model || cfg.model();
    const id = startLog({ platform: provider, model: usedModel, operation: op, query: query || '', prompt: JSON.stringify(messages), baseURL });
    try {
      if (!apiKey) throw new Error('Missing KIMI_API_KEY');
      const sys = String((messages || []).find(m => m.role === 'system')?.content || '');
      const usr = String((messages || []).slice().reverse().find(m => m.role === 'user')?.content || '');
      const content = String(await callOpenAICompat(`${baseURL}/chat/completions`, apiKey, usedModel, sys, usr) || '').trim();
      endLog(id, { success: true, response: content || '' });
      return content || '';
    } catch (e) {
      endLog(id, { success: false, error: e });
      throw e;
    }
  }
  if (provider === 'doubao') {
    const cfg = getProviderConfig('doubao');
    const apiKey = process.env.ARK_API_KEY || cfg.apiKey();
    let usedModel = (model && model.trim()) || (process.env.DOUBAO_ENDPOINT_ID || cfg.model());
    if (usedModel === 'doubao-pro-32k') usedModel = process.env.DOUBAO_ENDPOINT_ID || 'doubao-seed-1-6-251015';
    const id = startLog({ platform: provider, model: usedModel, operation: op, query: query || '', prompt: JSON.stringify(messages), baseURL: 'https://ark.cn-beijing.volces.com' });
    try {
      if (!apiKey) throw new Error('Missing DOUBAO_API_KEY');
      const sys = String((messages || []).find(m => m.role === 'system')?.content || '');
      const usr = String((messages || []).slice().reverse().find(m => m.role === 'user')?.content || '');
      const content = String(await callDoubao(apiKey, usedModel, sys, usr) || '').trim();
      endLog(id, { success: true, response: content || '' });
      return content || '';
    } catch (e) {
      endLog(id, { success: false, error: e });
      throw e;
    }
  }
  // 默认走 OpenAI 兼容分支
  const id = startLog({ platform: provider, model: model || 'unknown', operation: op, query: query || '', prompt: JSON.stringify(messages), baseURL: '' });
  try {
    const { client, baseURL, model: defaultModel } = getClient(provider);
    const usedModel = model || defaultModel;
    const completion = await client.chat.completions.create({ model: usedModel, messages });
    const content = completion.choices?.[0]?.message?.content || '';
    endLog(id, { success: true, response: content });
    return content;
  } catch (e) {
    endLog(id, { success: false, error: e });
    throw e;
  }
}
