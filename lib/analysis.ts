export type Trade = {id:string;token:string;label?:string;side:"buy"|"sell";quantity:number;usd:number;time:number;tx:string};
export type History = {trades:Trade[];complete:boolean;skipped:number;pages:number};
export type Position = {token:string;label:string;trades:Trade[];bought:number;sold:number;entry:number|null;exit:number|null;firstBuy:number|null;lastSell:number|null;status:"closed"|"open"|"partial"|"unknown"|"multiple";returnPct:number|null;remaining:number};
export type Comparison = {token:string;label:string;leader:Position|null;follower:Position|null;comparable:boolean;finding:string;title:string;explanation:string;entryDelay:number|null;exitDelay:number|null;entryEffect:number|null;exitEffect:number|null;gap:number|null};
export type Report = {mode:"demo"|"live";from:string;to:string;leaderWallet:string;followerWallet:string;rows:Comparison[];leaderAverage:number|null;followerAverage:number|null;gap:number|null;comparableCount:number;coverage:{leader:Omit<History,"trades">;follower:Omit<History,"trades">};createdAt:string};
const sum=(trades:Trade[],key:"quantity"|"usd")=>trades.reduce((v,t)=>v+t[key],0);
export const short=(v:string)=>v.length>14?v.slice(0,5)+"…"+v.slice(-4):v;
export type DollarResult = {spent:number;received:number;pnl:number};
// Only eligible, closed comparisons have a complete observed cost basis.
// Sum unrounded USD fills; format cents only when displaying the result.
export function dollarResults(row:Comparison):{leader:DollarResult;follower:DollarResult}|null{
 if(!row.comparable||row.leader?.status!=="closed"||row.follower?.status!=="closed")return null;
 const totals=(p:Position):DollarResult=>{
  const spent=sum(p.trades.filter(t=>t.side==="buy"),"usd");
  const received=sum(p.trades.filter(t=>t.side==="sell"),"usd");
  return {spent,received,pnl:received-spent};
 };
 const leader=totals(row.leader),follower=totals(row.follower);
 return [leader,follower].every(p=>p.spent>0&&p.received>0&&Object.values(p).every(Number.isFinite))?{leader,follower}:null;
}
export function positions(trades:Trade[]):Map<string,Position>{
 const groups=new Map<string,Trade[]>(); const seen=new Set<string>();
 for(const t of trades){if(seen.has(t.id))continue;seen.add(t.id);if(!Number.isFinite(t.quantity)||t.quantity<=0||!Number.isFinite(t.usd)||t.usd<=0||!Number.isFinite(t.time))continue;groups.set(t.token,[...(groups.get(t.token)||[]),t]);}
 const result=new Map<string,Position>();
 for(const [token,list] of groups){
  const sorted=list.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
  const buys=sorted.filter(t=>t.side==="buy"),sells=sorted.filter(t=>t.side==="sell");
  const bought=sum(buys,"quantity"),sold=sum(sells,"quantity");
  const tolerance=Math.max(bought,sold)*1e-7;
  let inventory=0,cycles=0,unknown=false,active=false;
  // Same-second opposing fills have no reliable order in this response.
  const seconds=new Map<number,Set<string>>();
  for(const t of sorted){const sides=seconds.get(t.time)||new Set<string>();sides.add(t.side);seconds.set(t.time,sides);if(sides.size>1)unknown=true;
   if(t.side==="buy"){if(!active){cycles++;active=true;}inventory+=t.quantity;}
   else {inventory-=t.quantity;if(inventory < -tolerance)unknown=true;if(Math.abs(inventory)<=tolerance){inventory=0;active=false;}}
  }
  const status:Position["status"]=unknown||!buys.length?"unknown":cycles>1?"multiple":Math.abs(bought-sold)<=tolerance?"closed":sold>0?"partial":"open";
  const entry=bought?sum(buys,"usd")/bought:null,exit=sold?sum(sells,"usd")/sold:null;
  result.set(token,{token,label:sorted[0].label||short(token),trades:sorted,bought,sold,entry,exit,firstBuy:buys[0]?.time??null,lastSell:sells.at(-1)?.time??null,status,returnPct:status==="closed"&&entry&&exit?(exit/entry-1)*100:null,remaining:Math.max(0,bought-sold)});
 }
 return result;
}
export function compare(leaderHistory:History,followerHistory:History,options:Pick<Report,"mode"|"from"|"to"|"leaderWallet"|"followerWallet">):Report{
 const leaders=positions(leaderHistory.trades),followers=positions(followerHistory.trades);
 const complete=leaderHistory.complete&&followerHistory.complete&&!leaderHistory.skipped&&!followerHistory.skipped;
 const rows:Comparison[]=[];
 for(const token of new Set([...leaders.keys(),...followers.keys()])){
  const l=leaders.get(token)||null,f=followers.get(token)||null;
  const entryDelay=l?.firstBuy!=null&&f?.firstBuy!=null?(f.firstBuy-l.firstBuy)/1000:null;
  const exitDelay=l?.lastSell!=null&&f?.lastSell!=null?(f.lastSell-l.lastSell)/1000:null;
  const plausible=entryDelay!==null&&entryDelay>=0&&entryDelay<=1800;
  const comparable=complete&&plausible&&l?.returnPct!=null&&f?.returnPct!=null;
  let finding="Needs review",title="This pair needs a closer look.",explanation="A reliable comparison is unavailable for this history.";
  let entryEffect:number|null=null,exitEffect:number|null=null,gap:number|null=null;
  if(!complete){finding="Incomplete history";title="Some history is missing.";explanation="A page limit or unusable record prevents a reliable return comparison. Try a shorter period. Displayed fills are the records available, not a full wallet ledger.";}
  else if(!f){finding="No follower record";title="No matching follower trade was found.";explanation="This token appears only in the leader’s returned swaps. That does not prove your bot skipped or failed a trade; check the dates, transfers and supported trading venues.";}
  else if(!l){finding="Follower only";title="This token appears only in your wallet.";explanation="No leader swap for this token was returned in this period. It may be unrelated to the wallet you followed.";}
  else if(l.status==="unknown"||f.status==="unknown"){finding="Unknown cost basis";title="The trade history cannot establish cost basis.";explanation="Sales exceed observed buys, or opposing fills share a timestamp with uncertain order. Prior holdings, transfers or incomplete tracking may explain this. Returns are withheld.";}
  else if(l.status==="multiple"||f.status==="multiple"){finding="Multiple round trips";title="There is more than one position to match.";explanation="This first version compares one position per token. Narrow the date range to isolate a round trip; combining separate positions could give a misleading result.";}
  else if(!plausible){finding="Uncertain match";title="These entries may not be the same copied trade.";explanation="The follower entered before the leader or more than 30 minutes later. The app cannot establish copy intent, so this pair is excluded from the comparison.";}
  else if(l.status!=="closed"||f.status!=="closed"){finding=f.status==="partial"?"Partly exited":"Position still open";title=f.status==="partial"?"Your observed exit is only partial.":"A closed-trade comparison is not available.";explanation=f.status==="partial"?(f.sold/f.bought*100).toFixed(1)+"% of the quantity bought was sold in the returned swaps. The remainder is unclosed in this history; transfers could change your actual balance. No full-position return is calculated.":"At least one position is still open in the observed swaps. Compare again after both exits, or adjust the period. No current wallet balance is inferred.";}
  else if(comparable&&l.entry&&l.exit&&f.entry&&f.exit){
   entryEffect=(l.exit/f.entry-l.exit/l.entry)*100;
   exitEffect=(f.exit/f.entry-l.exit/f.entry)*100;
   gap=f.returnPct!-l.returnPct!;
   const entryDominant=Math.abs(entryEffect)>Math.abs(exitEffect);
   finding=Math.abs(gap)<0.05?"Similar execution":entryDominant?(entryEffect<0?"Higher entry price":"Better entry price"):(exitEffect<0?"Lower exit price":"Better exit price");
   title=Math.abs(gap)<0.05?"The gross returns were nearly the same.":entryDominant?(entryEffect<0?"The entry price explains most of the gap.":"Your entry price helped the result."):(exitEffect<0?"The exit price explains most of the gap.":"Your exit price helped the result.");
   const entryChange=(f.entry/l.entry-1)*100;
   explanation="Your first buy was "+formatDelay(entryDelay)+" relative to the leader, "+(Math.abs(entryChange)<0.05?"at essentially the same average entry price.":"at a "+Math.abs(entryChange).toFixed(1)+"% "+(entryChange>=0?"higher":"lower")+" average entry price.")+" These are observed differences; timing does not establish their cause.";
  }
  rows.push({token,label:l?.label||f!.label,leader:l,follower:f,comparable,finding,title,explanation,entryDelay,exitDelay,entryEffect,exitEffect,gap});
 }
 const good=rows.filter(r=>r.comparable);
 const leaderAverage=good.length?good.reduce((s,r)=>s+r.leader!.returnPct!,0)/good.length:null;
 const followerAverage=good.length?good.reduce((s,r)=>s+r.follower!.returnPct!,0)/good.length:null;
 const coverage=(h:History)=>({complete:h.complete,skipped:h.skipped,pages:h.pages});
 return {...options,rows,leaderAverage,followerAverage,gap:leaderAverage!==null&&followerAverage!==null?followerAverage-leaderAverage:null,comparableCount:good.length,coverage:{leader:coverage(leaderHistory),follower:coverage(followerHistory)},createdAt:new Date().toISOString()};
}
export function formatDelay(seconds:number|null){if(seconds===null)return "unavailable";if(seconds===0)return "in the same second";const abs=Math.abs(seconds),value=abs<60?abs.toFixed(0)+"s":abs<3600?(abs/60).toFixed(1)+"m":(abs/3600).toFixed(1)+"h";return value+" "+(seconds<0?"earlier":"later");}
export function percent(value:number|null){return value===null?"—":(value>=0?"+":"−")+Math.abs(value).toFixed(1)+"%";}
export function money(value:number|null){return value===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumSignificantDigits:5}).format(value);}
