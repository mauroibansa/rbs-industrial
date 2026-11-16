const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync('assets/contact-resend.js','utf8');
function setup(send){
 const listeners={},fields={'Nombre o empresa':'PRUEBA','Teléfono':'697212456','Avería':'Prueba','Privacidad':'Aceptada','Origen web':'LinkedIn'},button={innerHTML:'Enviar',disabled:true,before(){}},error={setAttribute(){}};
 let n=0,redirect='',removed=false;
 const form={querySelector:(s)=>s==='[data-form-fallback]'?null:button,setAttribute(){},getAttribute:()=> 'https://rbs-contacto.mauro-f09.workers.dev/consulta',addEventListener:(n,f)=>listeners[n]=f};
 const context={document:{querySelector:()=>form,createElement:()=>error},window:{fetch:true,crypto:true,AbortController, setTimeout,clearTimeout},crypto:{randomUUID:()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`},FormData:class{get(n){return fields[n]??null}},fetch:send,AbortController,URL,location:{assign:u=>redirect=u},sessionStorage:{removeItem:()=>removed=true},Error,TypeError};
 vm.runInNewContext(code,context);
 const submit=()=>listeners.submit({defaultPrevented:false,preventDefault(){}});
 return{submit,listeners,error,button,fields,get redirect(){return redirect},get removed(){return removed}};
}
test('confirma únicamente éxito del servidor y conserva atribución sin cookies',async()=>{
 let sent;const ui=setup(async(u,o)=>{sent={u,...o};return{ok:true,json:async()=>({ok:true})}});
 await ui.submit();assert.equal(JSON.parse(sent.body).source,'LinkedIn');assert.equal(sent.credentials,'omit');assert.match(ui.redirect,/enviado=1/);
});
test('fallo ambiguo permite reintentar con la misma referencia y sin éxito falso',async()=>{
 const ids=[];const ui=setup(async(u,o)=>{ids.push(JSON.parse(o.body).id);throw new TypeError('network')});
 await ui.submit();await ui.submit();assert.equal(ids[0],ids[1]);assert.equal(ui.redirect,'');assert.equal(ui.error.hidden,false);assert.equal(ui.button.disabled,false);assert.equal(ui.removed,true);
 ui.listeners.input();await ui.submit();assert.notEqual(ids[1],ids[2]);
});
test('un segundo envío ya cancelado no genera otra llamada',async()=>{
 let calls=0;const ui=setup(async()=>{calls++;return{ok:false,json:async()=>({ok:false,error:'Espera'})}});
 await ui.listeners.submit({defaultPrevented:true});assert.equal(calls,0);
 await ui.submit();assert.equal(calls,1);assert.equal(ui.redirect,'');assert.equal(ui.error.textContent,'Espera');
});

test('una respuesta HTML o JSON inválido muestra una alternativa comprensible sin detalles técnicos',async()=>{
 const ui=setup(async()=>({ok:false,json:async()=>{throw new SyntaxError('Unexpected token < in JSON')}}));
 await ui.submit();assert.equal(ui.redirect,'');assert.equal(ui.button.disabled,false);assert.match(ui.error.textContent,/contacta por teléfono o WhatsApp/);assert.doesNotMatch(ui.error.textContent,/Unexpected|JSON|token/);
});
