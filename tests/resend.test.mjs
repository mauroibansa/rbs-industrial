import test from 'node:test';
import assert from 'node:assert/strict';
import {handle,validate} from '../server/resend/worker.mjs';
const valid={id:'faac39c2-4eb9-4afb-b6c6-9b12de49422f',name:'PRUEBA RBS',phone:'+34 697 212 456',machine:'Camión',message:'Consulta de prueba',privacy:true,source:'Google Maps'};
function req(body=valid,origin='https://www.rbsindustrial.com') {return new Request('https://endpoint.test/consulta',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.4'},body:JSON.stringify(body)});}
function env(allowed=true) {return {RESEND_API_KEY:'test-only',CONTACT_RATE_LIMITER:{limit:async()=>({success:allowed})}};}
test('rechaza orígenes ajenos y configuración incompleta sin enviar',async()=>{
 let called=false;const send=async()=>{called=true;};
 assert.equal((await handle(req(valid,'https://otro.test'),env(),send)).status,403);
 assert.equal((await handle(req(),{},send)).status,503);assert.equal(called,false);
});
test('solo envía al buzón fijo y minimiza los datos',async()=>{
 let sent;const r=await handle(req({...valid,to:'intruso@example.com',secret:'privado'}),env(),async(u,o)=>{sent={u,...o};return Response.json({id:'email-test'});});
 assert.equal(r.status,200);const payload=JSON.parse(sent.body);
 assert.deepEqual(payload.to,['info@rbsindustrial.com']);assert.match(payload.from,/@envios\.rbsindustrial\.com>/);
 assert.match(payload.text,/Google Maps/);assert.doesNotMatch(sent.body,/intruso|privado|192\.0\.2\.4|test-only/);
 assert.equal(payload.html,undefined);assert.equal(sent.headers['Idempotency-Key'],'rbs-contact-'+valid.id);
 assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://www.rbsindustrial.com');
});
test('rechaza campos inválidos y entradas de tamaño excesivo',async()=>{
 for (const b of [{...valid,phone:'hola'},{...valid,privacy:false},{...valid,id:'bad'},{...valid,machine:'inventada'},{...valid,message:'x'.repeat(3001)}]) assert.equal(validate(b),null);
 const r=await handle(req({...valid,message:'x'.repeat(13000)}),env(),()=>assert.fail('no envío'));assert.equal(r.status,400);
});
test('limita intentos antes de contactar con Resend',async()=>assert.equal((await handle(req(),env(false),()=>assert.fail('no envío'))).status,429));
test('honeypot no entrega correo',async()=>assert.equal((await handle(req({...valid,website:'spam'}),env(),()=>assert.fail('no envío'))).status,200));
test('errores o respuestas incompletas del proveedor nunca indican éxito',async()=>{
 for(const send of [async()=>new Response('secreto',{status:401}),async()=>Response.json({}),async()=>{throw new Error('secreto');}]) {
  const r=await handle(req(),env(),send);assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/secreto/);
 }
});
test('preflight admite únicamente POST con JSON y no envía correo',async()=>{
 const r=await handle(new Request('https://endpoint.test/consulta',{method:'OPTIONS',headers:{Origin:'https://www.rbsindustrial.com'}}),env(),()=>assert.fail('no envío'));
 assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Methods'),'POST');
});
