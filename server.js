import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {answer} from './assistant.js';
export function validSignature(body, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return false;
  const actual = Buffer.from(signature.slice(7),'hex');
  return timingSafeEqual(actual, createHmac('sha256',secret).update(body).digest());
}
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 65536) throw new Error('Request too large.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export function createServer(config = process.env) {
  const seen = new Map(); let queue = Promise.resolve();
  async function processMessage(message) {
    try {
      const draft = await answer(message.text.body,config);
      const result = await fetch(`https://graph.facebook.com/v23.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.WHATSAPP_ACCESS_TOKEN}`},
        body:JSON.stringify({messaging_product:'whatsapp',to:message.from,type:'text',text:{body:draft.slice(0,4000)}}),signal:AbortSignal.timeout(15000)
      });
      if (!result.ok) throw new Error('WhatsApp delivery failed.');
    } catch { console.error('WhatsApp reply failed; check credentials, quota and service connectivity.'); }
  }
  return http.createServer(async (req,res) => {
    const url = new URL(req.url,'http://localhost');
    const send = (status,data) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    try {
      if (req.method === 'GET' && url.pathname === '/health') return send(200,{ok:true,mode:config.ASSISTANT_API_KEY?'ai':'demo'});
      if (req.method === 'GET' && url.pathname === '/') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"});return res.end(await readFile(new URL('./public/index.html',import.meta.url)));}
      if(req.method==='GET' && ['/styles.css','/library.js','/fonts/Poppins-Light.ttf','/fonts/EBGaramond.ttf'].includes(url.pathname)){res.writeHead(200,{'Content-Type':url.pathname.endsWith('.css')?'text/css':url.pathname.endsWith('.ttf')?'font/ttf':'text/javascript'});return res.end(await readFile(new URL('./public'+url.pathname,import.meta.url)));}
      if (req.method === 'GET' && url.pathname === '/cloud.js') {res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(await readFile(new URL('./public/cloud.js',import.meta.url)));}
      if (req.method === 'GET' && url.pathname === '/running.js') {res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(await readFile(new URL('./public/running.js',import.meta.url)));}
      if (req.method === 'GET' && url.pathname === '/meals.js') {res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(await readFile(new URL('./public/meals.js',import.meta.url)));}
      if (req.method === 'GET' && url.pathname === '/app.js') {res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(await readFile(new URL('./public/app.js',import.meta.url)));}
      if (req.method === 'POST' && url.pathname === '/api/chat') {
        const peer=req.socket.remoteAddress;
        if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)) return send(403,{error:'Local testing only.'});
        if(req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403,{error:'Origin rejected.'});
        const data=JSON.parse((await readBody(req)).toString()); return send(200,{reply:await answer(data.message,config)});
      }
      if (req.method === 'GET' && url.pathname === '/webhook') {
        if(config.WHATSAPP_VERIFY_TOKEN && url.searchParams.get('hub.mode') === 'subscribe' && url.searchParams.get('hub.verify_token') === config.WHATSAPP_VERIFY_TOKEN) {res.writeHead(200,{'Content-Type':'text/plain'});return res.end(url.searchParams.get('hub.challenge') || '');}
        return send(403,{error:'Verification failed.'});
      }
      if (req.method === 'POST' && url.pathname === '/webhook') {
        const body=await readBody(req);
        if(!validSignature(body,req.headers['x-hub-signature-256'],config.WHATSAPP_APP_SECRET)) return send(401,{error:'Invalid signature.'});
        const payload=JSON.parse(body.toString());
        for (const [id,time] of seen) if(Date.now()-time>86400000) seen.delete(id);
        for(const entry of payload.entry || []) for(const change of entry.changes || []) {
          if(change.value?.metadata?.phone_number_id !== config.WHATSAPP_PHONE_NUMBER_ID) continue;
          for(const message of change.value?.messages || []) {
            if(config.WHATSAPP_ENABLED !== 'true' || !config.ASSISTANT_API_KEY || !config.WHATSAPP_ACCESS_TOKEN || !config.WHATSAPP_OWNER_NUMBER || message.from !== config.WHATSAPP_OWNER_NUMBER || message.type !== 'text' || !message.id || seen.has(message.id)) continue;
            seen.set(message.id,Date.now()); queue=queue.then(()=>processMessage(message));
          }
        }
        return send(200,{received:true});
      }
      send(404,{error:'Not found.'});
    } catch {send(400,{error:'Request could not be processed. Check your input and service configuration.'});}
  });
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) createServer().listen(Number(process.env.PORT || 3000),'0.0.0.0',()=>console.log('Assistant started on port '+(process.env.PORT || 3000)));
