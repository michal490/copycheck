import {env} from 'cloudflare:workers';
import {fetchHistory} from '@/lib/coingecko';
import {reviewWallet,validateReviewRequest,type ReviewReport,type WalletReview} from '@/lib/review';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'This request must come from CopyCheck.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Expected a JSON request.'},415);
 if(Number(request.headers.get('content-length'))>4096)return json({error:'Request is too large.'},413);
 let parsed;
 try{const text=await request.text();if(text.length>4096)return json({error:'Request is too large.'},413);parsed=validateReviewRequest(JSON.parse(text));}catch(e){return json({error:e instanceof SyntaxError?'The request was not valid JSON.':e instanceof Error?e.message:'Invalid request.'},400);}
 if(!env.COINGECKO_API_KEY)return json({error:'Wallet review needs the server’s CoinGecko key with wallet-trades access. Try the example while live access is unavailable.'},503);
 const key=env.COINGECKO_API_KEY,signal=AbortSignal.timeout(45000);
 // Process sequentially: no more than one upstream page request at a time.
 const wallets:WalletReview[]=[];
 for(const address of parsed.wallets){
  try{wallets.push(reviewWallet(address,await fetchHistory(address,parsed.start,parsed.end,key,signal)));}
  catch(e){const error=e instanceof Error&&/^(CoinGecko|The server)/.test(e.message)?e.message:'Wallet history was unavailable or timed out. Try a shorter period.';wallets.push({...reviewWallet(address,{trades:[],complete:false,skipped:0,pages:0}),error});}
 }
 const result:ReviewReport={mode:'live',from:parsed.from,to:parsed.to,createdAt:new Date().toISOString(),wallets};
 return json(result);
}
