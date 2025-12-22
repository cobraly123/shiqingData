import React from 'react';
import { ChevronDown, Search, Monitor, Tag, HelpCircle, Layers } from 'lucide-react';

export function MonitoringSelector({
  providers = [],
  selectedProvider,
  onSelectProvider,
  brandName,
  coreKeywords,
  queries = [],
  selectedQuery,
  onSelectQuery
}) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
      
      {/* 1. Model Coverage Display Area */}
      <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
           <Layers size={16} color="#6b7280" />
           <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>模型覆盖 (Model Coverage)</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => onSelectProvider(p)} // Enforce selection, no toggle off
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                border: 'none',
                background: selectedProvider === p ? '#2563eb' : '#f3f4f6',
                color: selectedProvider === p ? 'white' : '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              {/* Placeholder for Logo - In real app, map provider name to logo asset */}
              <span>{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Filter Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* Brand Word */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
            <Monitor size={14} />
            监控词 (Brand)
          </div>
          <div style={{ 
            padding: '10px 12px', 
            background: '#f9fafb', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            fontSize: '14px',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontWeight: '600' }}>{brandName || '-'}</span>
          </div>
        </div>

        {/* Core Keywords */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
            <Tag size={14} />
            问题核心词 (Keywords)
          </div>
          <div style={{ 
            padding: '10px 12px', 
            background: '#f9fafb', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            fontSize: '14px',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {Array.isArray(coreKeywords) ? coreKeywords.join(', ') : (coreKeywords || '全部')}
            </span>
            <ChevronDown size={16} color="#9ca3af" />
          </div>
        </div>

        {/* Query Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
            <HelpCircle size={14} />
            问题 (Query)
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedQuery || ''}
              onChange={(e) => onSelectQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                paddingRight: '32px',
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#111827',
                appearance: 'none',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {queries.length > 1 && <option value="">全部问题 (All Queries)</option>}
              {queries.map((q, i) => (
                <option key={i} value={q.query}>
                  {q.query}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={16} 
              color="#6b7280" 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}
