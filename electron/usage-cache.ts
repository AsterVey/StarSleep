/** Coalesce concurrent scans; explicit refresh bypasses only completed results. */
export class UsageCache<T> {
 private value?:{at:number;data:T};
 private flight?:Promise<T>;
 constructor(private collect:()=>Promise<T>,private clock=()=>Date.now(),private ttl=10000){}
 get busy(){return !!this.flight;}
 clear(){this.value=undefined;}
 read(force:unknown=false):Promise<T>{
  if(typeof force!=='boolean')return Promise.reject(new Error('刷新参数无效'));
  if(this.flight)return this.flight;
  const age=this.value?this.clock()-this.value.at:-1;
  if(!force&&this.value&&age>=0&&age<this.ttl)return Promise.resolve(this.value.data);
  const flight=Promise.resolve().then(this.collect).then(data=>{this.value={at:this.clock(),data};return data;});
  this.flight=flight.finally(()=>{this.flight=undefined;});return this.flight;
 }
}
