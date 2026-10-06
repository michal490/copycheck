import { env } from "cloudflare:workers";
export async function GET(){return Response.json({configured:Boolean(env.COINGECKO_API_KEY)},{headers:{"Cache-Control":"no-store"}});}

