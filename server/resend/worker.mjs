const ORIGINS = new Set(['https://www.rbsindustrial.com', 'https://rbsindustrial.com']);
const MAX_BODY = 12000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function reply(origin, status, body) {
  return Response.json(body, { status, headers: {
    'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
  }});
}
async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks = []; let size = 0;
  for (;;) {
    const {done, value} = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw new Error('large'); }
    chunks.push(value);
  }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(all));
}
export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const limits = {name:160, phone:40, machine:30, model:160, location:240, message:3000, source:30, website:200};
  const result = {};
  for (const [field, max] of Object.entries(limits)) {
    const value = data[field] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return null;
    result[field] = value.trim();
  }
  if (result.website) return {spam:true};
  if (!result.name || !result.message || !/^[+\d\s().-]+$/.test(result.phone)) return null;
  const digits = result.phone.replace(/\D/g,'');
  if (digits.length < 7 || digits.length > 15 || data.privacy !== true || !UUID.test(data.id || '')) return null;
  if (!['','Camión','Tractora','Carretilla','Manipuladora','Grúa','Otro'].includes(result.machine)) return null;
  result.source = ['Google Maps','LinkedIn'].includes(result.source) ? result.source : 'Web de RBS';
  result.id = data.id;
  return result;
}
export async function handle(request, env, send = fetch) {
  const url = new URL(request.url), origin = request.headers.get('Origin') || '';
  if (url.pathname === '/health' && request.method === 'GET')
    return Response.json({ready:!!(env.RESEND_API_KEY && env.CONTACT_RATE_LIMITER)}, {headers:{'Cache-Control':'no-store'}});
  if (url.pathname !== '/consulta') return new Response('Not found', {status:404});
  if (!ORIGINS.has(origin)) return new Response('Forbidden', {status:403});
  if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:{
    'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST',
    'Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Access-Control-Max-Age':'600'
  }});
  if (request.method !== 'POST') return reply(origin,405,{ok:false,error:'Método no permitido.'});
  if (!env.RESEND_API_KEY || !env.CONTACT_RATE_LIMITER) return reply(origin,503,{ok:false,error:'El formulario no está disponible. Llámanos o escríbenos por WhatsApp.'});
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||'')) return reply(origin,415,{ok:false,error:'Formato no válido.'});
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return reply(origin,503,{ok:false,error:'No se ha podido validar la solicitud.'});
  const limited = await env.CONTACT_RATE_LIMITER.limit({key:ip});
  if (!limited.success) return reply(origin,429,{ok:false,error:'Has realizado varios intentos. Espera un minuto antes de volver a enviar.'});
  let data;
  try { data = validate(await readBody(request)); }
  catch (_) { return reply(origin,400,{ok:false,error:'La consulta es demasiado larga o tiene un formato incorrecto.'}); }
  if (!data) return reply(origin,400,{ok:false,error:'Revisa tu nombre, teléfono, consulta y la aceptación de privacidad.'});
  if (data.spam) return reply(origin,200,{ok:true});
  const text = [
    'Nueva consulta desde rbsindustrial.com', '',
    'Nombre o empresa: '+data.name, 'Teléfono: '+data.phone,
    'Tipo de máquina: '+(data.machine||'No indicado'), 'Marca y modelo: '+(data.model||'No indicado'),
    'Ubicación de la máquina: '+(data.location||'No indicada'),
    'Origen web: '+data.source, 'Privacidad: aceptada', '', 'Consulta:', data.message,
    '', 'Referencia de envío: '+data.id
  ].join('\n');
  try {
    const response = await send('https://api.resend.com/emails', {
      method:'POST', headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'rbs-contact-'+data.id},
      body:JSON.stringify({from:'Web RBS <consultas@envios.rbsindustrial.com>',to:['info@rbsindustrial.com'],subject:'Nueva consulta desde rbsindustrial.com',text}),
      signal:AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('delivery');
    const result = await response.json();
    if (typeof result.id !== 'string' || !result.id) throw new Error('delivery');
    return reply(origin,200,{ok:true});
  } catch (_) {
    // Never log form data, API credentials or provider responses.
    return reply(origin,502,{ok:false,error:'No se ha confirmado el envío. Vuelve a intentarlo o contacta por teléfono o WhatsApp.'});
  }
}
export default {fetch(request, env) { return handle(request, env); }};
