import {positions,type History,type Position} from './analysis.ts';
import {validAddress} from './coingecko.ts';
export type ReviewedPosition=Position&{spent:number;received:number;pnl:number|null;eligible:boolean;reason:string};
export type WalletReview={wallet:string;positions:ReviewedPosition[];coverage:Omit<History,'trades'>;closedCount:number;excludedCount:number;spent:number|null;received:number|null;pnl:number|null;returnPct:number|null;wins:number|null;losses:number|null;best:ReviewedPosition|null;worst:ReviewedPosition|null;error?:string};
export type ReviewReport={mode:'demo'|'live';from:string;to:string;createdAt:string;wallets:WalletReview[]};
export function reviewWallet(wallet:string,history:History):WalletReview{
 const safe=history.complete&&history.skipped===0;
 const rows=[...positions(history.trades).values()].map(p=>{
  const spent=p.trades.filter(t=>t.side==='buy').reduce((s,t)=>s+t.usd,0),received=p.trades.filter(t=>t.side==='sell').reduce((s,t)=>s+t.usd,0);
  const eligible=safe&&p.status==='closed'&&p.returnPct!==null;
  const reasons={closed:'Observed buys and sells reconcile.',open:'No closed exit in the returned swaps.',partial:'Only part of the observed position was sold.',unknown:'Missing cost basis or uncertain fill ordering.',multiple:'Multiple round trips; narrow the dates to isolate one.'};
  return {...p,returnPct:eligible?p.returnPct:null,spent,received,pnl:eligible?received-spent:null,eligible,reason:safe?reasons[p.status]:'Incomplete or unusable history; results withheld.'};
 });
 const closed=rows.filter(p=>p.eligible),spent=closed.reduce((s,p)=>s+p.spent,0),received=closed.reduce((s,p)=>s+p.received,0);
 const sorted=[...closed].sort((a,b)=>b.pnl!-a.pnl!);
 return {wallet,positions:rows,coverage:{complete:history.complete,skipped:history.skipped,pages:history.pages},closedCount:closed.length,excludedCount:rows.length-closed.length,spent:closed.length?spent:null,received:closed.length?received:null,pnl:closed.length?received-spent:null,returnPct:closed.length&&spent>0?(received/spent-1)*100:null,wins:closed.length?closed.filter(p=>p.pnl!>0).length:null,losses:closed.length?closed.filter(p=>p.pnl!<0).length:null,best:sorted[0]||null,worst:sorted.at(-1)||null};
}
export function validateReviewRequest(body:unknown,now=Date.now()){
 if(!body||typeof body!=='object')throw new Error('Enter one to five public Solana wallets and UTC dates.');
 const b=body as Record<string,unknown>;
 if(!Array.isArray(b.wallets)||b.wallets.length<1||b.wallets.length>5||!b.wallets.every(validAddress))throw new Error('Enter one to five valid public Solana addresses, one per line.');
 if(new Set(b.wallets).size!==b.wallets.length)throw new Error('Each wallet must be different. Remove duplicate addresses.');
 const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!validDate(b.from)||!validDate(b.to))throw new Error('Choose valid UTC start and end dates.');
 const start=Date.parse(b.from),end=Date.parse(b.to)+86400000-1000;
 if(end<start||end-start>=90*86400000||start>now||Date.parse(b.to)>now)throw new Error('Choose an ordered date range up to 90 days, ending no later than today.');
 return {wallets:b.wallets as string[],from:b.from,to:b.to,start,end:Math.min(end,now)};
}
export function demoReview():ReviewReport{
 const at=(minute:number)=>Date.parse('2026-09-24T10:00:00Z')+minute*60000;
 const make=(label:string,amount:number,buy:number,sell:number,time:number,w:string)=>[{id:w+label+'b',token:'demo-'+label,label,side:'buy' as const,quantity:amount,usd:amount*buy,time:at(time),tx:'synthetic'},{id:w+label+'s',token:'demo-'+label,label,side:'sell' as const,quantity:amount,usd:amount*sell,time:at(time+30),tx:'synthetic'}];
 const h=(trades:History['trades']):History=>({trades,complete:true,skipped:0,pages:1});
 const a=[...make('ORBIT',10,12,12.4,0,'a'),...make('VEIL',50,2,1.84,50,'a'),{id:'apb',token:'demo-PULSE',label:'PULSE',side:'buy' as const,quantity:20,usd:102,time:at(100),tx:'synthetic'},{id:'aps',token:'demo-PULSE',label:'PULSE',side:'sell' as const,quantity:8,usd:44,time:at(120),tx:'synthetic'}];
 const b=[...make('ORBIT',100,10,13,2,'b'),...make('VEIL',100,2,2.4,70,'b')];
 const c=[...make('ORBIT',40,12,11,60,'c'),...make('DRIFT',10,20,21.6,130,'c')];
 return {mode:'demo',from:'2026-09-24',to:'2026-09-24',createdAt:new Date().toISOString(),wallets:[reviewWallet('Example wallet A',h(a)),reviewWallet('Example wallet B',h(b)),reviewWallet('Example wallet C',h(c))]};
}
