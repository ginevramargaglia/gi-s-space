import {authenticate,login,body,sameOrigin,response,failure,clearCookies,settings} from '../lib/shared.mjs';
export async function handler(event){try{
 settings();
 if(event.httpMethod==='GET'){const s=await authenticate(event);return response(200,{user:{id:s.user.id,email:s.user.email}},s.cookies);}
 if(event.httpMethod!=='POST')return response(405,{error:'Method not allowed.'});sameOrigin(event);const input=body(event,10000);
 if(input.action==='logout')return response(200,{ok:true},clearCookies());
 if(typeof input.email!=='string'||typeof input.password!=='string'||input.email.length>320||input.password.length>1000)return response(400,{error:'Email and password required.'});
 const s=await login(input.email,input.password);return response(200,{user:{id:s.user.id,email:s.user.email}},s.cookies);
}catch(e){return failure(e);}}
