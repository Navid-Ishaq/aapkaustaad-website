export function madridToday(now=new Date()){
 const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const v=(k:string)=>p.find(x=>x.type===k)!.value;return `${v('year')}-${v('month')}-${v('day')}`;
}
export function validDate(v:unknown):v is string {
 return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2000-01-01'&&v<='2100-12-31'&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
}
export function addMonths(day:string,months:number){
 const [y,m,d]=day.split('-').map(Number);const date=new Date(Date.UTC(y,m-1+months,1));const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(d,last));return date.toISOString().slice(0,10);
}
