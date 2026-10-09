import test from 'node:test';
import assert from 'node:assert/strict';
import {selectTokenMarket,fetchTokenMarket} from '../lib/token-market.ts';
const token='So11111111111111111111111111111111111111112',pair='HaQdrXRUoxxk1qLFZJNrSyzWNjn16o1r1np5h6jipump';
const pool=(side='base',reserve:unknown='100')=>({id:'solana_'+pair,attributes:{address:pair,reserve_in_usd:reserve,base_token_price_usd:'10',quote_token_price_usd:'2',volume_usd:{h24:'500'}},relationships:{[side+'_token']:{data:{id:'solana_'+token}},dex:{data:{id:'orca'}}}});
test('market selects exact contract and the correct base or quote price',()=>{
 assert.equal(selectTokenMarket({data:[pool()]},token)?.price,10);
 assert.equal(selectTokenMarket({data:[pool('quote')]},token)?.price,2);
 assert.equal(selectTokenMarket({data:[pool()]},pair),null);
 assert.equal(selectTokenMarket({data:[pool('base','10'),pool('quote','200')]},token)?.price,2);
});
test('missing market values stay unavailable and malformed responses fail',()=>{
 const m=selectTokenMarket({data:[pool('base',null)]},token);assert.equal(m?.liquidity,null);
 assert.equal(selectTokenMarket({data:[]},token),null);assert.throws(()=>selectTokenMarket({},token));
 assert.equal(selectTokenMarket({data:[pool()],included:[{id:'solana_'+token,attributes:{address:pair}}]},token),null);
});
test('market requests only CoinGecko with a server header; redirects and errors do not leak secrets',async()=>{
 const fetcher:typeof fetch=async(input,init)=>{const url=new URL(String(input));assert.equal(url.origin,'https://pro-api.coingecko.com');assert.equal(url.searchParams.get('page'),'1');assert.equal((init?.headers as Record<string,string>)['x-cg-pro-api-key'],'test-secret');assert.equal(init?.redirect,'manual');return Response.json({data:[pool()]});};
 const data=await fetchTokenMarket(token,'test-secret',fetcher);assert.equal(data.provider,'CoinGecko API');assert.ok(!JSON.stringify(data).includes('test-secret'));
 await assert.rejects(fetchTokenMarket(token,'test-secret',async()=>new Response('test-secret',{status:403})),/CoinGecko market data is unavailable/);
 await assert.rejects(fetchTokenMarket('bad','test-secret',fetcher),/Invalid Solana/);
});
