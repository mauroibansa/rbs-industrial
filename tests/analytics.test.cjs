const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/analytics.js'), 'utf8');

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k)};
}
function run({search='', host='www.rbsindustrial.com', session=storage(), local=storage(), beacon=true, visible='visible', blockedStorage=false} = {}) {
  const requests=[], pixels=[], listeners={}, message={hidden:true}, hiddenFields=[];
  const next={value:'https://www.rbsindustrial.com/?enviado=1#contacto'};
  const form={querySelector:()=>next,appendChild:field=>hiddenFields.push(field)};
  const whatsapp={href:'https://wa.me/34697212456?text=Hola'};
  const broken = {getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
  const document = {
    title:'RBS', referrer:'https://example.com/private/path?email=secret@example.com',
    readyState:'loading', visibilityState:visible,
    querySelector:selector=>selector==='.sent'?message:selector==='form.form'?form:null,
    createElement:()=>({}),
    querySelectorAll:()=>[whatsapp],
    addEventListener:(name,fn)=>{listeners[name]=fn},
    removeEventListener:name=>{delete listeners[name]}
  };
  const context = {document,location:{search,hostname:host,pathname:'/'},sessionStorage:blockedStorage?broken:session,
    localStorage:blockedStorage?broken:local, URLSearchParams,URL,Date,Math,
    navigator:{webdriver:false,sendBeacon:url=>{if(beacon)requests.push(new URL(url));return beacon}},
    Image:function(){Object.defineProperty(this,'src',{set:url=>pixels.push(new URL(url))})}};
  vm.runInNewContext(source,context);
  listeners.DOMContentLoaded?.();
  function click(href, zone='portada') {
    const section={id:zone==='portada'?'':zone};
    const anchor={getAttribute:()=>href,closest:sel=>sel==='header'?(zone==='cabecera'?{}:null):sel==='.sticky'?(zone==='barra-movil'?{}:null):sel==='section'?section:null};
    listeners.click?.({button:0,target:{closest:()=>anchor}});
  }
  return {requests,pixels,session,local,listeners,message,document,click,next,hiddenFields,whatsapp};
}

test('captures an immediate contact click without waiting for another script',()=>{
  const x=run();x.click('tel:+34697212456','cabecera');
  assert.deepEqual(x.requests.map(r=>r.searchParams.get('p')),['/','clic-llamar-cabecera']);
});
test('classifies phone, WhatsApp, email and Maps, including the mobile bar',()=>{
  const x=run();
  for(const [href,zone,event] of [
    ['tel:+34697212456','barra-movil','clic-llamar-barra-movil'],
    ['https://wa.me/34697212456','barra-movil','clic-whatsapp-barra-movil'],
    ['mailto:info@rbsindustrial.com','contacto','clic-email-contacto'],
    ['https://www.google.com/maps/place/RBS','contacto','clic-maps-contacto']]) {
    x.click(href,zone);assert.equal(x.requests.at(-1).searchParams.get('p'),event);
  }
  const before=x.requests.length;x.click('https://wa.me.example.com/');assert.equal(x.requests.length,before);
});
test('direct or malformed confirmation URLs never create return events',()=>{
  for(const search of ['?enviado=1','?enviado=10','?foo=enviado=1']){
    const x=run({search});assert.equal(x.requests.length,1);assert.equal(x.message.hidden,true);
  }
});
test('a recent valid submission produces only one return event',()=>{
  const session=storage();const start=run({session});
  start.listeners.submit({target:{matches:()=>true,checkValidity:()=>true}});
  const first=run({session,search:'?enviado=1'});
  assert.equal(first.requests.at(-1).searchParams.get('p'),'retorno-formulario');
  assert.equal(first.message.hidden,false);
  const reloaded=run({session,search:'?enviado=1'});assert.equal(reloaded.requests.length,1);
});
test('expired or invalid submissions cannot produce return events',()=>{
  const expired=storage({'rbs-formulario-pendiente':String(Date.now()-1800001)});
  assert.equal(run({session:expired,search:'?enviado=1'}).requests.length,1);
  const x=run();x.listeners.submit({target:{matches:()=>true,checkValidity:()=>false}});
  assert.equal(x.session.getItem('rbs-formulario-pendiente'),null);
});
test('form contents, arbitrary query strings and referring paths are not transmitted',()=>{
  const x=run({search:'?email=secret@example.com&telefono=697212456&utm_campaign=apertura&utm_source=maps'});
  const u=x.requests[0];assert.equal(u.searchParams.get('r'),'https://example.com');
  assert.equal(u.searchParams.get('q'),'?utm_campaign=apertura&utm_source=maps');
  assert(!u.href.includes('secret'));assert(!u.href.includes('697212456'));assert(!u.href.includes('private'));
});
test('own-browser exclusion persists and can be reversed',()=>{
  const local=storage();assert.equal(run({search:'?estadisticas=excluir',local}).requests.length,0);
  assert.equal(run({local}).requests.length,0);
  assert.equal(run({search:'?estadisticas=incluir',local}).requests.length,1);
});
test('local tests have separate labels; other local visits are ignored',()=>{
  assert.equal(run({host:'127.0.0.1'}).requests.length,0);
  const x=run({host:'127.0.0.1',search:'?prueba_estadisticas=qa-1'});x.click('tel:000');
  assert.equal(x.requests[0].searchParams.get('p'),'/pruebas/qa-1/');
  assert.equal(x.requests[1].searchParams.get('p'),'prueba-qa-1-clic-llamar-portada');
});
test('blocked storage and missing beacon do not break contact tracking',()=>{
  const x=run({blockedStorage:true,beacon:false});x.click('tel:000');assert.equal(x.pixels.length,2);
});
test('hidden tabs count once when visible',()=>{
  const x=run({visible:'hidden'});assert.equal(x.requests.length,0);
  x.document.visibilityState='visible';x.listeners.visibilitychange();assert.equal(x.requests.length,1);
  assert.equal(x.listeners.visibilitychange,undefined);
});
test('Maps and LinkedIn labels reach clicks, form emails and the return event',()=>{
  for(const [source,label] of [['google-maps','Google Maps'],['linkedin','LinkedIn']]) {
    const search='?utm_source='+source+'&utm_campaign='+source+'-rbs&utm_medium=organic';
    const session=storage();const x=run({search,session});
    x.click('https://wa.me/34697212456','contacto');
    assert.equal(new URLSearchParams(x.requests.at(-1).searchParams.get('q')).get('utm_source'),source);
    assert.equal(x.requests.at(-1).searchParams.get('r'),source);
    assert.equal(x.hiddenFields.find(f=>f.name==='Origen web').value,label);
    assert.equal(new URL(x.whatsapp.href).searchParams.get('text'),'Hola Enlace de '+label+'.');
    x.listeners.submit({target:{matches:()=>true,checkValidity:()=>true}});
    const returnUrl=new URL(x.next.value);
    assert.equal(returnUrl.origin,'https://www.rbsindustrial.com');
    assert.equal(returnUrl.searchParams.get('utm_source'),source);
    const returned=run({session,search:returnUrl.search});
    assert.equal(returned.requests.at(-1).searchParams.get('p'),'retorno-formulario');
    assert.equal(returned.requests.at(-1).searchParams.get('r'),source);
    assert.equal(new URLSearchParams(returned.requests.at(-1).searchParams.get('q')).get('utm_source'),source);
  }
});
test('arbitrary query data is not propagated into the return URL or email source',()=>{
  const x=run({search:'?email=secret@example.com&utm_source=secret@example.com'});
  assert(!x.next.value.includes('secret'));
  assert.equal(x.hiddenFields.length,0);
});
