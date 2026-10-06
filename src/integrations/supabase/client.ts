import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const authClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: brokeredPreviewStorage(), persistSession: true, autoRefreshToken: true },
});

type Filter = { op:string; column:string; value:unknown };

class HAQuery implements PromiseLike<any> {
  private action:"select"|"insert"|"update"|"delete"|"upsert" = "select";
  private columns="*";
  private returning=false;
  private filters:Filter[]=[];
  private orderBy:any[]=[];
  private limitValue:number|undefined;
  private offsetValue:number|undefined;
  private singleMode:"single"|"maybeSingle"|undefined;
  private values:any;
  private options:any={};
  private countMode:any;
  private head=false;

  constructor(private table:string){}

  select(columns="*", options?:any){
    this.columns=columns || "*";
    this.returning=true;
    if(options){this.countMode=options.count;this.head=Boolean(options.head);}
    return this;
  }
  insert(values:any, options?:any){this.action="insert";this.values=values;this.options=options||{};return this;}
  update(values:any){this.action="update";this.values=values;return this;}
  delete(){this.action="delete";return this;}
  upsert(values:any, options?:any){this.action="upsert";this.values=values;this.options=options||{};return this;}
  eq(column:string,value:unknown){this.filters.push({op:"eq",column,value});return this;}
  neq(column:string,value:unknown){this.filters.push({op:"neq",column,value});return this;}
  gt(column:string,value:unknown){this.filters.push({op:"gt",column,value});return this;}
  gte(column:string,value:unknown){this.filters.push({op:"gte",column,value});return this;}
  lt(column:string,value:unknown){this.filters.push({op:"lt",column,value});return this;}
  lte(column:string,value:unknown){this.filters.push({op:"lte",column,value});return this;}
  is(column:string,value:unknown){this.filters.push({op:"is",column,value});return this;}
  in(column:string,value:unknown[]){this.filters.push({op:"in",column,value});return this;}
  order(column:string,options?:any){this.orderBy.push({column,ascending:options?.ascending!==false});return this;}
  limit(value:number){this.limitValue=value;return this;}
  range(from:number,to:number){this.offsetValue=from;this.limitValue=to-from+1;return this;}
  single(){this.singleMode="single";return this;}
  maybeSingle(){this.singleMode="maybeSingle";return this;}
  then<TResult1=any,TResult2=never>(onfulfilled?:((value:any)=>TResult1|PromiseLike<TResult1>)|null,onrejected?:((reason:any)=>TResult2|PromiseLike<TResult2>)|null){
    return this.execute().then(onfulfilled||undefined,onrejected||undefined);
  }
  private async execute(){
    try{
      const {data:{session}}=await authClient.auth.getSession();
      if(!session?.access_token) return {data:null,error:{message:"Niet ingelogd"},count:null};
      const response=await fetch("/api/ha-db",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},
        body:JSON.stringify({
          action:this.action,table:this.table,columns:this.columns,returning:this.returning?this.columns:null,
          filters:this.filters,order:this.orderBy,limit:this.limitValue,offset:this.offsetValue,
          singleMode:this.singleMode,values:this.values,onConflict:this.options.onConflict,
          ignoreDuplicates:this.options.ignoreDuplicates,count:this.countMode,head:this.head
        })
      });
      const result=await response.json();
      if(!response.ok) return {data:null,error:{message:result.error||"Database request failed"},count:null};
      return {data:result.data,error:result.error||null,count:result.count??null};
    }catch(error:any){return {data:null,error:{message:error?.message||"Database request failed"},count:null};}
  }
}

const haClient:any = {
  ...authClient,
  from: (table:string)=>new HAQuery(table),
  rpc: (fn:string,args?:Record<string,unknown>)=>{
    const run=async()=>{
      try{
        const {data:{session}}=await authClient.auth.getSession();
        if(!session?.access_token) return {data:null,error:{message:"Niet ingelogd"}};
        const response=await fetch("/api/ha-db",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:"rpc",fn,args})});
        const result=await response.json();
        return response.ok?{data:result.data,error:result.error||null}:{data:null,error:{message:result.error||"RPC failed"}};
      }catch(error:any){return {data:null,error:{message:error?.message||"RPC failed"}};}
    };
    return {then:(resolve:any,reject:any)=>run().then(resolve,reject)};
  },
};

export const supabase = haClient as any;
