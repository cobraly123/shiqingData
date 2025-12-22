import { describe, it, expect } from 'vitest';
import { ResponseAnalyzer } from './ResponseAnalyzer';

describe('ResponseAnalyzer', () => {
  const config = {
    targetBrand: 'MyBrand',
    competitors: [
      { name: 'CompetitorA', keywords: ['CompetitorA', 'CompA'], category: 'Test' }
    ],
    options: { contextWindow: 10, includeOriginal: false }
  };
  const analyzer = new ResponseAnalyzer(config);

  it('should detect brand mentions correctly', () => {
    const response = 'Here is a text mentioning MyBrand and MyBrand again.';
    const result = analyzer.analyze({ response, provider: 'test', query: 'test' });
    
    expect(result.brandAnalysis.totalMentions).toBe(2);
    expect(result.brandAnalysis.mentions).toHaveLength(2);
  });

  it('should extract rankings correctly', () => {
    const response = `
      Here is the list:
      1. CompetitorA
      2. MyBrand
      3. OtherBrand
    `;
    const result = analyzer.analyze({ response, provider: 'test', query: 'test' });
    
    expect(result.brandAnalysis.ranking.bestRank).toBe(2);
    expect(result.competitorAnalysis.detected[0].name).toBe('CompetitorA');
    expect(result.competitorAnalysis.detected[0].ranking.bestRank).toBe(1);
  });

  it('should perform heuristic discovery for unknown competitors', () => {
    const response = `
      Top brands:
      1. MyBrand
      2. UnknownBrand
    `;
    const result = analyzer.analyze({ response, provider: 'test', query: 'test' });
    
    const unknown = result.competitorAnalysis.detected.find(c => c.name === 'UnknownBrand');
    expect(unknown).toBeDefined();
    expect(unknown.ranking.bestRank).toBe(2);
    expect(unknown.isHeuristic).toBe(true);
  });

  // --- New Complex Format Tests ---

  it('should extract competitors and ranks from Markdown Tables', () => {
    const text = `
    Here is the ranking:
    | Rank | Brand | Score |
    |---|---|---|
    | 1 | CompetitorA | 9.5 |
    | 2 | MyBrand | 9.0 |
    | 3 | NewComp | 8.5 |
    `;
    const result = analyzer.analyze({ response: text });
    
    // Check CompetitorA (Known)
    const known = result.competitorAnalysis.detected.find(c => c.name === 'CompetitorA');
    expect(known).toBeDefined();
    expect(known.ranking.bestRank).toBe(1);

    // Check NewComp (Heuristic)
    const newComp = result.competitorAnalysis.detected.find(c => c.name === 'NewComp');
    expect(newComp).toBeDefined();
    expect(newComp.ranking.bestRank).toBe(3);
    expect(newComp.isHeuristic).toBe(true);
  });

  it('should extract competitors from Bold Headers (numbered)', () => {
    const text = `
    Top companies:
    **1. CompetitorA**
    Description...
    **2. MyBrand**
    Description...
    **3. BoldComp**
    Description...
    `;
    const result = analyzer.analyze({ response: text });
    
    const boldComp = result.competitorAnalysis.detected.find(c => c.name === 'BoldComp');
    expect(boldComp).toBeDefined();
    expect(boldComp.ranking.bestRank).toBe(3);
  });

  it('should extract competitors from Bold Headers (unnumbered, implicit rank)', () => {
    const text = `
    Top companies:

    **CompetitorA**
    Leader in market.

    **MyBrand**
    Challenger.

    **ImplicitComp**
    New entrant.
    `;
    const result = analyzer.analyze({ response: text });
    
    const implicitComp = result.competitorAnalysis.detected.find(c => c.name === 'ImplicitComp');
    expect(implicitComp).toBeDefined();
    // Rank 3 because: CompetitorA (1), MyBrand (2), ImplicitComp (3)
    expect(implicitComp.ranking.bestRank).toBe(3);
  });

  it('should handle "Brand: Description" format', () => {
    const text = `
    1. CompetitorA: The best.
    2. MyBrand: Good.
    3. ColonComp: Okay.
    `;
    const result = analyzer.analyze({ response: text });
    
    const colonComp = result.competitorAnalysis.detected.find(c => c.name === 'ColonComp');
    expect(colonComp).toBeDefined();
    expect(colonComp.name).toBe('ColonComp'); // Should strip colon
  });

  // --- DeepSeek / Chinese Format Tests ---

  it('should handle comma-separated entities (e.g. A、B和C)', () => {
    const text = '目前市场上小米、华为和Amazfit是表现突出的品牌。';
    const result = analyzer.analyze({ response: text });
    
    // Xiaomi (Heuristic)
    const xiaomi = result.competitorAnalysis.detected.find(c => c.name === '小米');
    expect(xiaomi).toBeDefined();
    expect(xiaomi.ranking.bestRank).toBe(1); // Implicit 1

    // Huawei (Heuristic)
    const huawei = result.competitorAnalysis.detected.find(c => c.name === '华为');
    expect(huawei).toBeDefined();
    expect(huawei.ranking.bestRank).toBe(2); // Implicit 2

    // Amazfit (Heuristic)
    const amazfit = result.competitorAnalysis.detected.find(c => c.name === 'Amazfit');
    expect(amazfit).toBeDefined();
    expect(amazfit.ranking.bestRank).toBe(3); // Implicit 3
  });

  it('should filter out pronouns and noise words', () => {
    const text = '它们在功能、市场表现上各有千秋。我们认为...';
    const result = analyzer.analyze({ response: text });
    
    const pronouns = ['它们', '我们', '功能', '市场表现'];
    pronouns.forEach(p => {
        const found = result.competitorAnalysis.detected.find(c => c.name === p);
        expect(found).toBeUndefined();
    });
  });

  it('should handle "BrandNameDescription" mashed text lines', () => {
    const text = `
    小米高性价比，适合学生。
    华为拥有强大的生态。
    Amazfit主打户外运动。
    `;
    const result = analyzer.analyze({ response: text });
    
    const xiaomi = result.competitorAnalysis.detected.find(c => c.name === '小米');
    expect(xiaomi).toBeDefined();
    
    const huawei = result.competitorAnalysis.detected.find(c => c.name === '华为');
    expect(huawei).toBeDefined();

    const amazfit = result.competitorAnalysis.detected.find(c => c.name === 'Amazfit');
    expect(amazfit).toBeDefined();
  });
});
