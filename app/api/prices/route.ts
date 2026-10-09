import {env} from 'cloudflare:workers';
import {validQuote,type Quote} from '@/lib/holdings';
export async function GET(request:Request){
 const ids=(new URL(request.url).searchParams.get('ids')||'').split(',');
 if(ids.length>10||!ids.length||ids.some(id=>!/^[-a-z0-9]{1,80}$/.test(id)))return Response.json({error:'Choose up to ten CoinGecko coin IDs.'},{status:400});
 const url=new URL((env.COINGECKO_API_KEY?'https://pro-api.coingecko.com':'https://api.coingecko.com')+'/api/v3/simple/price');
 url.searchParams.set('ids',[...new Set(ids)].join(','));url.searchParams.set('vs_currencies','usd');url.searchParams.set('include_last_updated_at','true');
 try{
  const response=await fetch(url,{headers:env.COINGECKO_API_KEY?{'x-cg-pro-api-key':env.COINGECKO_API_KEY}:{},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(response.status===429?'Price requests are busy. Wait a minute before refreshing.':'CoinGecko prices are unavailable. Please try again later.');
  const body=await response.json() as Record<string,unknown>,prices:Record<string,Quote>={};
  for(const id of ids)if(validQuote(body[id]))prices[id]=body[id] as Quote;
  return Response.json({prices,missing:ids.filter(id=>!prices[id])},{headers:{'Cache-Control':'public, max-age=60'}});
 }catch(e){return Response.json({error:e instanceof Error&&e.message.startsWith('Price requests')?e.message:'CoinGecko prices are unavailable. Please try again later.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
