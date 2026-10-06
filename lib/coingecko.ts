import type {History,Trade} from "./analysis.ts";
export function validAddress(v:unknown):v is string{
 if(typeof v!=="string"||!(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).test(v))return false;
 const alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
 let n=0n;for(const c of v)n=n*58n+BigInt(alphabet.indexOf(c));
 let bytes=0;while(n>0){bytes++;n>>=8n;}return bytes+(v.match(/^1*/)?.[0].length||0)===32;
}
export function validateRequest(body:unknown,now=Date.now()){
 if(!body||typeof body!=="object")throw new Error("Enter two public Solana addresses and a date range.");
 const b=body as Record<string,unknown>;
 if(!validAddress(b.leader)||!validAddress(b.follower))throw new Error("Enter two valid Solana public addresses (32-byte base58).");
 if(b.leader===b.follower)throw new Error("Choose two different wallets to compare.");
 const date=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!date(b.from)||!date(b.to))throw new Error("Choose a valid start and end date.");
 const from=b.from as string,to=b.to as string,start=Date.parse(from),end=Date.parse(to)+86400000-1000;
 if(end<start||end-start>=30*86400000)throw new Error("Choose an ordered date range of no more than 30 days.");
 if(start>now||Date.parse(to)>now)throw new Error("The date range cannot be in the future.");
 return {leader:b.leader,follower:b.follower,from,to,start,end:Math.min(end,now)};
}
type Raw={id?:unknown;attributes?:Record<string,unknown>};
export function normalizeTrade(raw:Raw):Trade|null{
 const a=raw?.attributes;if(!a||typeof raw.id!=="string"||(a.kind!=="buy"&&a.kind!=="sell"))return null;
 const buy=a.kind==="buy",token=a[buy?"to_token_address":"from_token_address"],quantity=Number(a[buy?"to_token_amount":"from_token_amount"]),usd=Number(a.volume_in_usd),time=Date.parse(String(a.block_timestamp));
 if(typeof token!=="string"||!validAddress(token)||typeof a.tx_hash!=="string"||!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(a.tx_hash)||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(usd)||usd<=0||!Number.isFinite(time))return null;
 return{id:raw.id,token,side:a.kind,quantity,usd,time,tx:a.tx_hash};
}
export async function fetchHistory(address:string,from:number,to:number,key:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<History>{
 const trades:Trade[]=[],seen=new Set<string>();let cursor:string|null=null,skipped=0;
 for(let page=1;page<=5;page++){
  const url=new URL("https://pro-api.coingecko.com/api/v3/onchain/networks/solana/wallets/"+encodeURIComponent(address)+"/trades");
  url.searchParams.set("from",String(Math.floor(from/1000)));url.searchParams.set("to",String(Math.floor(to/1000)));url.searchParams.set("per_page","300");if(cursor)url.searchParams.set("cursor",cursor);
  const response=await fetcher(url,{headers:{"x-cg-pro-api-key":key,accept:"application/json"},signal,cache:"no-store"});
  if(!response.ok){if(response.status===429)throw new Error("CoinGecko’s rate limit was reached. Please wait and try again.");
   if(response.status===401||response.status===403)throw new Error("The server’s CoinGecko key cannot access wallet trade data. Check the key and API plan.");
   throw new Error("CoinGecko could not return these wallet trades. Please try again later.");}
  const body=await response.json() as {data?:Raw[];meta?:{next_cursor?:unknown}};
  if(!Array.isArray(body.data)||body.data.length>300||!body.meta||!(body.meta.next_cursor===null||typeof body.meta.next_cursor==="string"))throw new Error("CoinGecko returned an unexpected response. No comparison was produced.");
  for(const raw of body.data){if(typeof raw.id==="string"&&seen.has(raw.id))continue;if(typeof raw.id==="string")seen.add(raw.id);const t=normalizeTrade(raw);if(t&&t.time>=from&&t.time<=to)trades.push(t);else skipped++;}
  const next=body.meta.next_cursor as string|null;if(next===null)return{trades,complete:true,skipped,pages:page};if(next===cursor)return{trades,complete:false,skipped,pages:page};cursor=next;
 }
 return{trades,complete:false,skipped,pages:5};
}
