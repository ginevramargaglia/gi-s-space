import {authenticate,supabase,body,sameOrigin,response,failure,validSpace} from '../lib/shared.mjs';
export async function handler(event){try{
 if(!['GET','POST'].includes(event.httpMethod))return response(405,{error:'Method not allowed.'});if(event.httpMethod==='POST')sameOrigin(event);
 const s=await authenticate(event);
 if(event.httpMethod==='GET'){const r=await supabase('/rest/v1/personal_spaces?select=data,version,updated_at&user_id=eq.'+encodeURIComponent(s.user.id),{},s.token);if(!r.ok)throw new Error('Storage read failed');const rows=await r.json();return response(200,rows[0]||{data:null,version:0},s.cookies);}
 const input=body(event);if(!validSpace(input.data)||!Number.isSafeInteger(input.version)||input.version<0)return response(400,{error:'Invalid saved information.'},s.cookies);
 const r=await supabase('/rest/v1/rpc/save_personal_space',{method:'POST',body:JSON.stringify({p_data:input.data,p_version:input.version})},s.token);if(!r.ok)throw new Error('Storage save failed');const rows=await r.json();if(!rows.length)return response(409,{error:'Another device changed your information. Export your edits, then reload to load the latest version.'},s.cookies);return response(200,{version:rows[0].version},s.cookies);
}catch(e){return failure(e);}}
