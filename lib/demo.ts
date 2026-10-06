import {compare,type Trade,type History} from "./analysis.ts";
const at=(time:string)=>Date.parse("2026-09-24T"+time+"Z");
const fill=(label:string,side:"buy"|"sell",quantity:number,price:number,time:string,id:string):Trade=>({id,token:"demo-"+label,label,side,quantity,usd:quantity*price,time:at(time),tx:"synthetic-"+id});
export function demoReport(){
const leader=[fill("ORBIT","buy",1000,10,"10:00:00","l1"),fill("ORBIT","sell",1000,13,"10:25:00","l2"),fill("VEIL","buy",2000,2,"11:00:00","l3"),fill("VEIL","sell",2000,2.4,"11:30:00","l4"),fill("PULSE","buy",500,5,"12:00:00","l5"),fill("PULSE","sell",500,5.6,"12:20:00","l6"),fill("DRIFT","buy",100,20,"13:00:00","l7"),fill("DRIFT","sell",100,21.6,"13:30:00","l8")];
const follower=[fill("ORBIT","buy",10,12,"10:00:48","f1"),fill("ORBIT","sell",10,12.4,"10:25:29","f2"),fill("VEIL","buy",50,2,"11:00:05","f3"),fill("VEIL","sell",50,1.84,"11:42:00","f4"),fill("PULSE","buy",20,5.1,"12:00:08","f5"),fill("PULSE","sell",8,5.5,"12:20:05","f6")];
const h=(trades:Trade[]):History=>({trades,complete:true,skipped:0,pages:1});
return compare(h(leader),h(follower),{mode:"demo",from:"2026-09-24",to:"2026-09-24",leaderWallet:"Fictional leader",followerWallet:"Fictional follower"});
}

