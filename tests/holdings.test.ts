import test from 'node:test';
import assert from 'node:assert/strict';
import {holdingResult,validQuote} from '../lib/holdings.ts';
test('holdings use entered cost and distinguish percentage recovery from loss',()=>{
 const r=holdingResult({id:'bitcoin',quantity:2,cost:100},50,-50);
 assert.equal(r.value,100);assert.equal(r.pnl,-100);assert.equal(r.returnPct,-50);assert.equal(r.recoveryPct,100);assert.equal(r.scenario,50);
});
test('unknown cost is not zero cost; zero cost does not produce an infinite return',()=>{
 assert.equal(holdingResult({id:'x',quantity:1,cost:null},50).pnl,null);
 assert.equal(holdingResult({id:'x',quantity:1,cost:0},50).returnPct,null);
 assert.throws(()=>holdingResult({id:'x',quantity:-1,cost:2},50));
});
test('prices must be positive, timestamped, recent and not in the future',()=>{
 const now=1800000000000;
 assert.equal(validQuote({usd:5,last_updated_at:now/1000},now),true);
 assert.equal(validQuote({usd:5,last_updated_at:now/1000-901},now),false);
 assert.equal(validQuote({usd:0,last_updated_at:now/1000},now),false);
 assert.equal(validQuote({usd:5,last_updated_at:now/1000+100},now),false);
});
