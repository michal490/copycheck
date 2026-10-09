export type Holding={id:string;quantity:number;cost:number|null};
export type Quote={usd:number;last_updated_at:number};
export function holdingResult(h:Holding,price:number,change=0){
 if(!Number.isFinite(h.quantity)||h.quantity<=0||!Number.isFinite(price)||price<=0||!Number.isFinite(change)||change < -100||change>1000||h.cost!==null&&(!Number.isFinite(h.cost)||h.cost<0))throw new Error('Invalid holding inputs.');
 const value=h.quantity*price,cost=h.cost===null?null:h.quantity*h.cost;
 return {value,cost,pnl:cost===null?null:value-cost,returnPct:cost===null||cost===0?null:(value/cost-1)*100,breakeven:h.cost,recoveryPct:h.cost===null?null:(h.cost/price-1)*100,scenario:value*(1+change/100)};
}
export function validQuote(q:unknown,now=Date.now()):q is Quote{
 if(!q||typeof q!=='object')return false;
 const v=q as Quote;
 return Number.isFinite(v.usd)&&v.usd>0&&Number.isFinite(v.last_updated_at)&&v.last_updated_at*1000<=now+60000&&now-v.last_updated_at*1000<=15*60000;
}
