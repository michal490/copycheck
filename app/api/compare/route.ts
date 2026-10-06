import { env } from "cloudflare:workers";
import {compare} from "@/lib/analysis";
import {validateRequest,fetchHistory} from "@/lib/coingecko";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"This request must come from CopyCheck."},403);
 if(!request.headers.get("content-type")?.startsWith("application/json"))return json({error:"Expected a JSON request."},415);
 if(Number(request.headers.get("content-length"))>4096)return json({error:"Request is too large."},413);
 let parsed;
 try{const text=await request.text();if(text.length>4096)return json({error:"Request is too large."},413);parsed=validateRequest(JSON.parse(text));}catch(e){return json({error:e instanceof SyntaxError?"The request was not valid JSON.":e instanceof Error?e.message:"Invalid request."},400);}
 const key=env.COINGECKO_API_KEY;
 if(!key)return json({error:"Live comparisons need a CoinGecko Pro API key with wallet-trades access. The site owner can add COINGECKO_API_KEY in the site’s server environment settings. The example review works without a key."},503);
 try{
  const signal=AbortSignal.timeout(25000);
  const [leader,follower]=await Promise.all([fetchHistory(parsed.leader,parsed.start,parsed.end,key,signal),fetchHistory(parsed.follower,parsed.start,parsed.end,key,signal)]);
  return json(compare(leader,follower,{mode:"live",from:parsed.from,to:parsed.to,leaderWallet:parsed.leader,followerWallet:parsed.follower}));
 }catch(e){const message=e instanceof Error&&e.message.startsWith("CoinGecko")?e.message:e instanceof Error&&e.message.startsWith("The server")?e.message:"The comparison timed out or the data service was unavailable. Please try a shorter date range.";return json({error:message},502);}
}

