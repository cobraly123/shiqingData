
import { ResponseAnalyzer } from './web/src/utils/ResponseAnalyzer.js';

const config = {
    targetBrand: 'MyBrand',
    competitors: [
        { name: 'CompetitorA', keywords: ['CompetitorA', 'CompA'], category: 'Test' }
    ],
    options: { contextWindow: 10, includeOriginal: false }
};
const analyzer = new ResponseAnalyzer(config);

const text = '目前市场上小米、华为和Amazfit是表现突出的品牌。';
const result = analyzer.analyze({ response: text });

console.log('Text:', text);
console.log('Detected competitors:', JSON.stringify(result.competitorAnalysis.detected, null, 2));

// Debug specific regex
const enumRegex = /([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,15}?)[、]([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,15}?)(?=[、]|和|以及|\s|[。，；])/g;
let match;
while ((match = enumRegex.exec(text)) !== null) {
    console.log('Match:', match);
    console.log('Index:', match.index);
    console.log('Group 1:', match[1]);
    console.log('Group 2:', match[2]);
    
    let lastIndex = match.index + match[0].length;
    let remainder = text.slice(lastIndex);
    console.log('Remainder:', remainder);
    
    const finalMatch = /^(?:\s*(?:和|以及|&)\s*)([\u4e00-\u9fa5a-zA-Z0-9（）()]{2,15}?)(?=[。，；\s]|是|为|等|$)/.exec(remainder);
    console.log('Final match:', finalMatch);
}
