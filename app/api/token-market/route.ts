import {validAddress} from '@/lib/coingecko';
export async function GET(request:Request){
 const token=new URL(request.url).searchParams.get('token');
 if(!validAddress(token))return Response.json({error:'Invalid Solana token address.'},{status:400});
 try{
  const response=await fetch('https://api.dexscreener.com/token-pairs/v1/solana/'+encodeURIComponent(token),{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Unavailable');
  const data=await response.json();
  if(!Array.isArray(data))throw new Error('Unexpected response');
  // Price USD describes the base token. Never substitute a same-symbol token
  // or report a quote token's pool price as this token's price.
  const pairs=data.filter(p=>p?.chainId==='solana'&&p.baseToken?.address===token&&validAddress(p.pairAddress));
  const n=(v:unknown)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
  pairs.sort((a,b)=>(n(b.liquidity?.usd)??-1)-(n(a.liquidity?.usd)??-1));
  const p=pairs[0];
  return Response.json({fetchedAt:new Date().toISOString(),market:p?{pair:p.pairAddress,name:String(p.baseToken.name||'Token').slice(0,100),symbol:String(p.baseToken.symbol||'').slice(0,30),dex:String(p.dexId||'DEX').slice(0,40),price:n(p.priceUsd),liquidity:n(p.liquidity?.usd),volume:n(p.volume?.h24)}:null},{headers:{'Cache-Control':'public, max-age=30'}});
 }catch{return Response.json({error:'DEX Screener market data is unavailable. You can still open the token on DEX Screener.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
