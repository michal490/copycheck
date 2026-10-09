import {env} from 'cloudflare:workers';
import {validAddress} from '@/lib/coingecko';
import {fetchTokenMarket} from '@/lib/token-market';
export async function GET(request:Request){
 const token=new URL(request.url).searchParams.get('token');
 if(!validAddress(token))return Response.json({error:'Invalid Solana token address.'},{status:400});
 if(!env.COINGECKO_API_KEY)return Response.json({error:'Market data needs the server’s CoinGecko API key.'},{status:503,headers:{'Cache-Control':'no-store'}});
 try{return Response.json(await fetchTokenMarket(token,env.COINGECKO_API_KEY),{headers:{'Cache-Control':'public, max-age=30'}});}
 catch(e){return Response.json({error:e instanceof Error&&e.message.startsWith('CoinGecko')?e.message:'CoinGecko market data is unavailable. Please retry later.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}
