import test from "node:test";
import assert from "node:assert/strict";
import {compare,positions,dollarResults,type Trade,type History} from "../lib/analysis.ts";
import {demoReport} from "../lib/demo.ts";
import {validateRequest,validAddress,normalizeTrade,fetchHistory} from "../lib/coingecko.ts";
const t=(id:string,side:"buy"|"sell",quantity:number,usd:number,time:number,token="A"):Trade=>({id,side,quantity,usd,time,token,tx:id});
const history=(trades:Trade[],complete=true):History=>({trades,complete,skipped:0,pages:1});
const options={mode:"demo" as const,from:"2026-09-24",to:"2026-09-24",leaderWallet:"leader",followerWallet:"follower"};

test("dollar results sum all buys before rounding and retain different position sizes",()=>{
 const l=history([t("a","buy",1,36.64229774918758,1000),t("b","sell",1,36.222596700172225,2000)]);
 const f=history([t("c","buy",3,54.05099306782985,3000),t("d","buy",2,8.027375143255224,4000),t("e","buy",1,5.381115323230664,5000),t("f","sell",6,64.07831060691856,6000)]);
 const d=dollarResults(compare(l,f,options).rows[0])!;
 assert.equal(d.leader.spent.toFixed(2),"36.64");assert.equal(d.leader.received.toFixed(2),"36.22");assert.equal(d.leader.pnl.toFixed(2),"-0.42");
 assert.equal(d.follower.spent.toFixed(2),"67.46");assert.equal(d.follower.received.toFixed(2),"64.08");assert.equal(d.follower.pnl.toFixed(2),"-3.38");
});
test("dollar results are withheld for incomplete, skipped, partial and uncertain comparisons",()=>{
 const complete=history([t("a","buy",2,10,1000),t("b","sell",2,12,2000)]);
 for(const other of [ {...complete,complete:false}, {...complete,skipped:1}, history([t("a","buy",2,10,1000),t("b","sell",1,6,2000)]),history([t("a","buy",2,10,2000000),t("b","sell",2,12,3000000)]) ]){
  assert.equal(dollarResults(compare(complete,other,options).rows[0]),null);
 }
});
test("dollar results handle profit, break-even and deduplicated fills",()=>{
 const buy=t("a","buy",2,10,1000);
 const l=history([buy,buy,t("b","sell",2,12,2000)]),f=history([buy,t("c","sell",2,10,3000)]);
 const d=dollarResults(compare(l,f,options).rows[0])!;
 assert.equal(d.leader.pnl,2);assert.equal(d.leader.spent,10);assert.equal(d.follower.pnl,0);
});
test("demo returns and attribution reconcile, excluding open and missing positions",()=>{
 const r=demoReport();assert.equal(r.comparableCount,2);assert.equal(r.rows.length,4);assert.ok(Math.abs(r.gap!+27.3333333333)<1e-8);
 for(const row of r.rows.filter(r=>r.comparable))assert.ok(Math.abs(row.entryEffect!+row.exitEffect!-row.gap!)<1e-10);
 assert.equal(r.rows[2].follower?.remaining,12);assert.equal(r.rows[2].comparable,false);assert.equal(r.rows[3].comparable,false);
});
test("trade size does not change the price-return comparison",()=>{
 const l=[t("a","buy",1000,10000,1000),t("b","sell",1000,12000,3000)];
 const f=[t("c","buy",1,10,2000),t("d","sell",1,12,4000)];
 assert.equal(compare(history(l),history(f),options).gap,0);
});
test("partial exits never become completed returns",()=>{
 const p=positions([t("a","buy",100,1000,1000),t("b","sell",40,500,2000)]).get("A")!;
 assert.equal(p.status,"partial");assert.equal(p.returnPct,null);assert.equal(p.remaining,60);
});
test("selling prior holdings and multiple cycles are withheld",()=>{
 assert.equal(positions([t("a","sell",1,10,1000)]).get("A")?.status,"unknown");
 assert.equal(positions([t("a","buy",1,10,1000),t("b","sell",1,11,2000),t("c","buy",1,12,3000),t("d","sell",1,13,4000)]).get("A")?.status,"multiple");
});
test("same-second opposing trades have uncertain ordering",()=>{
 assert.equal(positions([t("a","buy",1,10,1000),t("b","sell",1,11,1000)]).get("A")?.status,"unknown");
});
test("incomplete history suppresses comparisons",()=>{
 const h=history([t("a","buy",1,10,1000),t("b","sell",1,11,4000)],false);
 assert.equal(compare(h,h,options).comparableCount,0);assert.equal(compare(h,h,options).gap,null);
});
test("tokens stay case-sensitive, duplicate trade IDs do not double amounts",()=>{
 const buy=t("a","buy",1,10,1000,"AbC");
 const p=positions([buy,buy,t("b","buy",1,10,2000,"abc")]);assert.equal(p.size,2);assert.equal(p.get("AbC")?.bought,1);
});
test("entry before leader or outside matching horizon is not scored",()=>{
 const l=history([t("a","buy",1,10,10000),t("b","sell",1,11,4000000)]);
 const f=history([t("c","buy",1,10,1000),t("d","sell",1,12,4001000)]);
 assert.equal(compare(l,f,options).rows[0].finding,"Uncertain match");
});
test("Solana addresses are decoded to 32 bytes; dates and identical wallets validate",()=>{
 const a="11111111111111111111111111111111",b="So11111111111111111111111111111111111111112";
 assert.ok(validAddress(a));assert.ok(validAddress(b));assert.ok(!validAddress("z".repeat(44)));assert.ok(!validAddress("0".repeat(32)));
 assert.throws(()=>validateRequest({leader:a,follower:a,from:"2026-09-01",to:"2026-09-02"}));
 assert.throws(()=>validateRequest({leader:a,follower:b,from:"2026-06-01",to:"2026-09-24"}));
 assert.throws(()=>validateRequest({leader:a,follower:b,from:"2026-02-30",to:"2026-03-01"}));
 assert.equal(validateRequest({leader:a,follower:b,from:"2026-09-01",to:"2026-09-02"},Date.parse("2026-09-29")).from,"2026-09-01");
});
const raw={id:"one",attributes:{kind:"buy",to_token_address:"So11111111111111111111111111111111111111112",to_token_amount:"2",volume_in_usd:"200",block_timestamp:"2026-09-24T10:00:00Z",tx_hash:"2".repeat(88)}};
test("normalization uses chosen token quantities and USD volume and rejects missing valuations",()=>{
 assert.equal(normalizeTrade(raw)?.usd,200);assert.equal(normalizeTrade({...raw,attributes:{...raw.attributes,volume_in_usd:null}}),null);
});
test("pagination deduplicates overlaps and preserves cursor",async()=>{
 const requested:string[]=[];const responses=[{data:[raw],meta:{next_cursor:"opaque+cursor"}},{data:[raw],meta:{next_cursor:null}}];
 const mock=(async(url:URL|RequestInfo)=>{requested.push(String(url));return Response.json(responses.shift());}) as typeof fetch;
 const result=await fetchHistory("wallet",Date.parse("2026-09-24"),Date.parse("2026-09-25"),"test-key",new AbortController().signal,mock);
 assert.equal(result.trades.length,1);assert.equal(result.complete,true);assert.ok(requested[1].includes("cursor=opaque%2Bcursor"));
});
test("pagination stops at five pages and marks a truncated history",async()=>{
 let count=0;const mock=(async()=>Response.json({data:[],meta:{next_cursor:"cursor"+(++count)}})) as typeof fetch;
 const result=await fetchHistory("wallet",0,1,"test-key",new AbortController().signal,mock);assert.equal(count,5);assert.equal(result.complete,false);
});
test("wallet API date bounds use whole UNIX seconds, including fractional current time",async()=>{
 const from=Date.parse("2026-10-06T00:00:00.000Z"),to=Date.parse("2026-10-06T09:38:12.987Z");
 const mock=(async(input:URL|RequestInfo)=>{
  const url=new URL(String(input));
  assert.equal(url.searchParams.get("from"),"1791244800");
  assert.equal(url.searchParams.get("to"),"1791279492");
  return Response.json({data:[],meta:{next_cursor:null}});
 }) as typeof fetch;
 await fetchHistory("wallet",from,to,"test-key",new AbortController().signal,mock);
});
test("upstream errors are actionable and contain no secrets",async()=>{
 const mock=(async()=>new Response("secret",{status:429})) as typeof fetch;
 await assert.rejects(fetchHistory("wallet",0,1,"hidden-secret",new AbortController().signal,mock),/rate limit/);
});
test('90-day history uses contiguous 30-day windows and retains cross-window trades',async()=>{
 const start=Date.parse('2026-07-12'),end=start+90*86400000-1000,requests:URL[]=[];
 const mock=(async(input:URL|RequestInfo)=>{const url=new URL(String(input));requests.push(url);const i=requests.length;const time=Number(url.searchParams.get('from'))*1000;const attributes=i===1?{...raw.attributes,block_timestamp:new Date(time).toISOString()}:{...raw.attributes,kind:'sell',from_token_address:raw.attributes.to_token_address,from_token_amount:'2',volume_in_usd:'240',block_timestamp:new Date(time).toISOString()};return Response.json({data:i<=2?[{id:'window'+i,attributes}]:[],meta:{next_cursor:null}});}) as typeof fetch;
 const result=await fetchHistory('wallet',start,end,'test',new AbortController().signal,mock);
 assert.equal(requests.length,3);assert.equal(result.complete,true);assert.equal(result.pages,3);assert.equal(result.trades.length,2);
 for(let i=0;i<3;i++){assert.equal(Number(requests[i].searchParams.get('from')),start/1000+i*30*86400);assert.equal(Number(requests[i].searchParams.get('to')),start/1000+(i+1)*30*86400-1);assert.equal(requests[i].searchParams.has('cursor'),false);}
 assert.ok(Math.abs([...positions(result.trades).values()][0].returnPct!-20)<1e-9);
});
