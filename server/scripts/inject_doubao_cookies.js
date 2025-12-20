import { SessionManager } from '../src/automation/core/SessionManager.js';
import fs from 'fs';
import path from 'path';

// The raw cookie string provided by the user
const rawCookies = `hook_slardar_session_id=20251219111533E26403FA5C649B1F4504; i18next=zh; _ga=GA1.1.2098940324.1763682358; s_v_web_id=verify_mi82xy28_RwdhWzBf_VzOc_4ILS_AyMT_mQ3mT4EDpKPm; passport_csrf_token=c297369dd8c57021c4e0b1dce6f4fe3c; passport_csrf_token_default=c297369dd8c57021c4e0b1dce6f4fe3c; n_mh=sQDrXFKqv_wodu2sMgjGxUIcYYwwv2vpXurFNv5Kt4s; session_tlb_tag_bk=sttt%7C11%7CdKyrhrkC_8q_uR3kBAB7af________-4Y81IY_myGYRwbw-U8011d2jW-X3g9UfMqRitYAy1fJ4%3D; is_staff_user=false; flow_ssr_sidebar_expand=1; flow_user_country=CN; _ga_G8EP5CG8VZ=GS2.1.s1766114128$o10$g1$t1766114134$j54$l0$h0; ttwid=1%7CWS_1b6YiAXPzpVQ6aRqpsfq0njP_MK5cPgkXaYxdTW0%7C1766114136%7C2d400d46bad55f3c668350c68b3e7c6ecba3be17f622919de3471c911ea77e31; msToken=zLZYBHO5Vw13z8nvn_26CkMQ3e-spRlzJliXKOPWzuJ2xk6csiEfJ2EfRKgeoz0Ejsdp5aTZt9lwGqEFgrrJoHloPApfTy9ixsyeTKYPTenDLZL4Vc4phqcgdCElyttjl4G5jJXmaSZ9ipI=; tt_scid=60QfH331DYnNcAz-jv75lV3rGo8RrX1Kw4m7I-udT21Vr36VwHjcbFMx0pxpMNdRba82; odin_tt=f874a7bd119f600ca2293c93ea4bca9f9f576875f6972d179a6b664d7c3b4ef5bbeb5c19cff9f20d23ee107479a832049c0f13461b9311e1376c7b65e8bef051; sid_guard=057fe5066fa678e5f233cc7c4b0ee4b5%7C1766114173%7C2592000%7CSun%2C+18-Jan-2026+03%3A16%3A13+GMT; uid_tt=9277133cf2c70678bb6945864896e216; uid_tt_ss=9277133cf2c70678bb6945864896e216; sid_tt=057fe5066fa678e5f233cc7c4b0ee4b5; sessionid=057fe5066fa678e5f233cc7c4b0ee4b5; sessionid_ss=057fe5066fa678e5f233cc7c4b0ee4b5; session_tlb_tag=sttt%7C7%7CBX_lBm-meOXyM8x8Sw7ktf_________RJOPsAZXyekUPkq_zcw3YezwqdUioK9k6fphoHH738zg%3D; sid_ucp_v1=1.0.0-KDJhNWNjOWI2NGJmYWFlNjc4NDhhMzM3MDhlY2QxMTc4MWMzNzA4YWIKIAiM_6Dzqcz9ARD9hpPKBhjCsR4gDDDKzqexBjgHQPQHGgJscSIgMDU3ZmU1MDY2ZmE2NzhlNWYyMzNjYzdjNGIwZWU0YjU; ssid_ucp_v1=1.0.0-KDJhNWNjOWI2NGJmYWFlNjc4NDhhMzM3MDhlY2QxMTc4MWMzNzA4YWIKIAiM_6Dzqcz9ARD9hpPKBhjCsR4gDDDKzqexBjgHQPQHGgJscSIgMDU3ZmU1MDY2ZmE2NzhlNWYyMzNjYzdjNGIwZWU0YjU`;

async function inject() {
    const sessionManager = new SessionManager();
    const modelKey = 'doubao';

    const cookieArray = rawCookies.split('; ').map(pair => {
        const index = pair.indexOf('=');
        if (index === -1) return null;
        
        const name = pair.substring(0, index);
        const value = pair.substring(index + 1);
        
        return {
            name: name.trim(),
            value: value.trim(),
            domain: '.doubao.com', // Doubao cookies are usually on root domain
            path: '/',
            secure: true
        };
    }).filter(c => c !== null);

    // Create session object
    const sessionData = {
        timestamp: new Date().toISOString(),
        cookies: cookieArray,
        origins: [], 
        model: modelKey
    };
    
    const encryptedData = sessionManager.encrypt(JSON.stringify(sessionData));
    
    const filePath = sessionManager.getSessionPath(modelKey);
    fs.writeFileSync(filePath, encryptedData);
    
    console.log(`Successfully injected ${cookieArray.length} cookies for ${modelKey} to ${filePath}.`);
    console.log(`Key cookies injected: ${cookieArray.map(c => c.name).filter(n => ['sessionid', 'uid_tt'].includes(n)).join(', ')}`);
}

inject();
