import {validAddress} from './coingecko.ts';
type Resource={id?:string;type?:string;attributes?:Record<string,unknown>;relationships?:Record<string,{data?:{id?:string}}>};
export type Market={pair:string;name:string;symbol:string;dex:string;price:number|null;liquidity:number|null;volume:number|null};
const number=(v:unknown)=>typeof v==='number'||typeof v==='string'&&v.trim()!==''?Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null:null;
export function selectTokenMarket(body:{data?:Resource[];included?:Resource[]},token:string):Market|null{
 if(!Array.isArray(body.data))throw new Error('Unexpected CoinGecko response.');
 const included=new Map((Array.isArray(body.included)?body.included:[]).map(r=>[r.id,r]));
 const matches=body.data.flatMap(p=>{
  const a=p.attributes;if(!a||!validAddress(a.address))return [];
  const base=p.relationships?.base_token?.data?.id,quote=p.relationships?.quote_token?.data?.id;
  const id='solana_'+token,side=base===id?'base':quote===id?'quote':null;
  if(!side)return [];
  const meta=included.get(id)?.attributes;
  if(meta?.address!==undefined&&meta.address!==token)return [];
  const dexId=p.relationships?.dex?.data?.id;
  const dex=included.get(dexId)?.attributes?.name||dexId||'DEX';
  return [{pair:a.address,name:String(meta?.name||'Token').slice(0,100),symbol:String(meta?.symbol||'').slice(0,30),dex:String(dex).slice(0,60),price:number(a[side+'_token_price_usd']),liquidity:number(a.reserve_in_usd),volume:number((a.volume_usd as Record<string,unknown>|undefined)?.h24)}];
 });
 return matches.sort((a,b)=>(b.liquidity??-1)-(a.liquidity??-1))[0]??null;
}
export async function fetchTokenMarket(token:string,key:string,fetcher:typeof fetch=fetch){
 if(!validAddress(token))throw new Error('Invalid Solana token address.');
 const url=new URL('https://pro-api.coingecko.com/api/v3/onchain/networks/solana/tokens/'+encodeURIComponent(token)+'/pools');
 url.searchParams.set('include','base_token,quote_token,dex');url.searchParams.set('page','1');
 const response=await fetcher(url,{headers:{'x-cg-pro-api-key':key,accept:'application/json'},signal:AbortSignal.timeout(12000),redirect:'manual'});
 if(!response.ok)throw new Error(response.status===429?'CoinGecko’s rate limit was reached. Please retry shortly.':'CoinGecko market data is unavailable. Please retry later.');
 return {fetchedAt:new Date().toISOString(),provider:'CoinGecko API',market:selectTokenMarket(await response.json(),token)};
}
