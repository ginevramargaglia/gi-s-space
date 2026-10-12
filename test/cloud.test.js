import test from 'node:test';
import assert from 'node:assert/strict';
import {validSpace,sameOrigin} from '../netlify/lib/shared.mjs';
import {handler as space} from '../netlify/functions/space.mjs';
import {handler as chat} from '../netlify/functions/chat.mjs';
const sample={state:Object.fromEntries(['tasks','workouts','groceries','expenses','plans'].map(k=>[k,[]])),running:{goal:'half',sessions:[]},meals:{servings:1,days:Array.from({length:7},()=>['oats','salad','tofu']),pantry:[]}};
test('cloud schema and origin enforce input boundaries',()=>{assert.ok(validSpace(sample));assert.ok(!validSpace({...sample,meals:{...sample.meals,servings:0}}));assert.throws(()=>sameOrigin({headers:{host:'app.example',origin:'https://evil.example'}}));assert.doesNotThrow(()=>sameOrigin({headers:{host:'app.example',origin:'https://app.example'}}));});
test('cloud API authenticates user, keeps version conflicts and uses user-scoped context',async t=>{
 const original=globalThis.fetch,env={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY,ASSISTANT_API_KEY:process.env.ASSISTANT_API_KEY};Object.assign(process.env,{SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'anon-test',ASSISTANT_API_KEY:'ai-test'});t.after(()=>{globalThis.fetch=original;for(const [k,v]of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
 let conflict=false;const requests=[];globalThis.fetch=async(url,options)=>{requests.push({url,options});if(url.endsWith('/auth/v1/user')){assert.equal(options.headers.Authorization,'Bearer user-token');return new Response(JSON.stringify({id:'user-one',email:'user@example.com'}));}if(url.includes('save_personal_space'))return new Response(JSON.stringify(conflict?[]:[{version:2}]));if(url.includes('claim_assistant_request'))return new Response('true');if(url.includes('/personal_spaces?')){assert.match(url,/user_id=eq.user-one/);return new Response(JSON.stringify([{data:sample,version:1}]));}if(url.includes('api.openai.com'))return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'A useful reply'}]}]}));throw Error('Unexpected destination');};
 const headers={host:'app.example',origin:'https://app.example',cookie:'gi_access=user-token'};
 assert.equal((await space({httpMethod:'GET',headers:{}})).statusCode,401);
 assert.equal((await space({httpMethod:'GET',headers})).statusCode,200);
 const event={httpMethod:'POST',headers,body:JSON.stringify({data:sample,version:1})};assert.equal((await space(event)).statusCode,200);conflict=true;assert.equal((await space(event)).statusCode,409);assert.equal((await space({...event,headers:{...headers,origin:'https://evil.example'}})).statusCode,403);
 const result=await chat({httpMethod:'POST',headers,body:JSON.stringify({message:'What is my plan?',useSaved:true})});assert.equal(result.statusCode,200);assert.match(result.body,/useful reply/);assert.ok(requests.some(r=>r.url.includes('claim_assistant_request')));
});

test('reading and writing are saved with backward compatible records',()=>{const library={goal:12,books:[{id:'book',title:'Example',author:'Author',total:200,pages:50,status:'reading',finished:'',notes:'A quote',rating:0}],notes:[{id:'note',title:'A thought',body:'Hello',date:'2026-10-12'}]};assert.ok(validSpace({...sample,library}));assert.ok(validSpace(sample));assert.ok(!validSpace({...sample,library:{...library,books:[{...library.books[0],pages:250}]}}));assert.ok(!validSpace({...sample,library:{...library,notes:[{...library.notes[0],body:'x'.repeat(50001)}]}}));});
