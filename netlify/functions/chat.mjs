import {authenticate,supabase,body,sameOrigin,response,failure,validSpace} from '../lib/shared.mjs';
import {answer} from '../../assistant.js';
export async function handler(event){try{
 if(event.httpMethod!=='POST')return response(405,{error:'Method not allowed.'});sameOrigin(event);const s=await authenticate(event),input=body(event,12000);
 if(typeof input.message!=='string'||!input.message.trim()||input.message.length>8000)return response(400,{error:'Enter a message of 1–8000 characters.'},s.cookies);
 if(!process.env.ASSISTANT_API_KEY)return response(503,{error:'AI is not configured. Add ASSISTANT_API_KEY in Netlify settings.'},s.cookies);
 const limit=await supabase('/rest/v1/rpc/claim_assistant_request',{method:'POST',body:'{}'},s.token);if(!limit.ok)throw new Error('Rate limit service unavailable');if(!(await limit.json()))return response(429,{error:'Hourly assistant limit reached. Try again next hour.'},s.cookies);
 let context='';if(input.useSaved===true){const r=await supabase('/rest/v1/personal_spaces?select=data&user_id=eq.'+encodeURIComponent(s.user.id),{},s.token);if(!r.ok)throw new Error('Storage unavailable');const rows=await r.json();if(rows[0]?.data&&validSpace(rows[0].data)){const d=rows[0].data;context=JSON.stringify({state:Object.fromEntries(Object.entries(d.state).map(([k,v])=>[k,v.slice(-30)])),running:{...d.running,sessions:d.running.sessions.slice(-30)},meals:d.meals,library:d.library?{goal:d.library.goal,books:d.library.books.slice(-20),notes:d.library.notes.slice(-5).map(n=>({...n,body:n.body.slice(0,2000)}))}:undefined}).slice(0,18000);}}
 const reply=await answer(input.message,process.env,context);return response(200,{reply},s.cookies);
}catch(e){return failure(e);}}
