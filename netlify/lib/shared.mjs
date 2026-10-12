export function settings(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
 if(!url||!key)throw Object.assign(new Error('Cloud storage is not configured.'),{status:503});
 const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error('HTTPS Supabase URL required.');
 return {url:url.replace(/\/$/,''),key};
}
export function response(status,data,cookies=[]){return {statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},multiValueHeaders:cookies.length?{'Set-Cookie':cookies}:{},body:JSON.stringify(data)};}
export function failure(e){return response(e.status||500,{error:e.status?e.message:'Service unavailable. Please retry.'});}
export function body(event,max=2000000){if(Buffer.byteLength(event.body||'')>max)throw Object.assign(new Error('Request too large.'),{status:413});try{return JSON.parse(event.body||'{}');}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400});}}
export function sameOrigin(event){
 const headers=event.headers||{},origin=headers.origin,host=headers.host;
 if(!origin||new URL(origin).host!==host)throw Object.assign(new Error('Request origin rejected.'),{status:403});
}
function cookies(event){return Object.fromEntries((event.headers?.cookie||'').split(';').map(x=>x.trim().split('=')) .filter(x=>x.length===2));}
function sessionCookies(session){const options='; HttpOnly; Secure; SameSite=Strict; Path=/';return [`gi_access=${session.access_token}${options}; Max-Age=${Math.max(1,Number(session.expires_in)||3600)}`,`gi_refresh=${session.refresh_token}${options}; Max-Age=2592000`];}
export const clearCookies=()=>['gi_access=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0','gi_refresh=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'];
export async function supabase(path,options={},token){const {url,key}=settings();return fetch(url+path,{...options,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});}
export async function login(email,password){const r=await supabase('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});if(!r.ok)throw Object.assign(new Error('Login failed. Check your email and password.'),{status:401});const s=await r.json();return {user:s.user,cookies:sessionCookies(s)};}
export async function authenticate(event){
 const c=cookies(event);let token=c.gi_access,updated=[];
 let r=token?await supabase('/auth/v1/user',{},token):null;
 if(!r?.ok&&c.gi_refresh){const refresh=await supabase('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:c.gi_refresh})});if(refresh.ok){const s=await refresh.json();token=s.access_token;updated=sessionCookies(s);r=await supabase('/auth/v1/user',{},token);}}
 if(!r?.ok)throw Object.assign(new Error('Please sign in.'),{status:401});const user=await r.json();return {user,token,cookies:updated};
}
export function validSpace(data){
 if(!data||typeof data!=='object')return false;
 for(const key of ['tasks','workouts','groceries','expenses','plans']){const list=data.state?.[key];if(!Array.isArray(list)||list.length>5000||!list.every(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&x.title.length<=500&&typeof x.done==='boolean'&&(x.amount===undefined||Number.isFinite(x.amount)&&x.amount>=0)))return false;}
 const l=data.library;if(l!==undefined&&(!l||!Number.isInteger(l.goal)||l.goal<1||l.goal>500||!Array.isArray(l.books)||l.books.length>5000||!l.books.every(b=>b&&typeof b.id==='string'&&typeof b.title==='string'&&b.title.length<=500&&typeof b.author==='string'&&Number.isInteger(b.total)&&b.total>0&&Number.isInteger(b.pages)&&b.pages>=0&&b.pages<=b.total&&['wishlist','reading','finished'].includes(b.status)&&typeof b.finished==='string'&&typeof b.notes==='string'&&b.notes.length<=20000&&Number.isInteger(b.rating)&&b.rating>=0&&b.rating<=5)||!Array.isArray(l.notes)||l.notes.length>1000||!l.notes.every(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&n.title.length<=500&&typeof n.body==='string'&&n.body.length<=50000&&typeof n.date==='string')))return false;
 const custom=data.meals?.customRecipes||[],kitchen=data.meals?.kitchen||[];
 if(!Array.isArray(custom)||custom.length>500||!custom.every(r=>r&&typeof r.id==='string'&&r.id.startsWith('custom:')&&typeof r.name==='string'&&r.name.length<=500&&Number.isFinite(r.minutes)&&r.minutes>=1&&r.minutes<=240&&typeof r.steps==='string'&&r.steps.length<=20000&&Array.isArray(r.ingredients)&&r.ingredients.length>0&&r.ingredients.length<=100&&r.ingredients.every(i=>Array.isArray(i)&&i.length===3&&typeof i[0]==='string'&&Number.isFinite(i[1])&&i[1]>0&&['g','ml','each','slices'].includes(i[2])))||!Array.isArray(kitchen)||kitchen.length>5000||!kitchen.every(s=>s&&typeof s.id==='string'&&typeof s.name==='string'&&(s.amount===null||Number.isFinite(s.amount)&&s.amount>0)&&['g','ml','each','slices'].includes(s.unit)))return false;
 const r=data.running,m=data.meals;
 return r&&['half','marathon'].includes(r.goal)&&Array.isArray(r.sessions)&&r.sessions.length<10000&&r.sessions.every(x=>typeof x.id==='string'&&typeof x.title==='string'&&Number.isFinite(x.km)&&x.km>=0&&Number.isFinite(x.minutes)&&x.minutes>=0&&typeof x.done==='boolean')&&m&&Number.isInteger(m.servings)&&m.servings>=1&&m.servings<=8&&Array.isArray(m.days)&&m.days.length===7&&m.days.every(x=>Array.isArray(x)&&x.length===3&&x.every(id=>typeof id==='string'))&&Array.isArray(m.pantry);
}
