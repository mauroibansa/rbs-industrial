/* Enabled only when the verified Resend endpoint is attached to the form. */
(function(){
  'use strict';
  var form=document.querySelector('form.form[data-resend-endpoint]');
  if(!form)return;
  if(!window.fetch||!window.AbortController||!window.crypto||!crypto.randomUUID){
    form.addEventListener('submit',function(event){event.preventDefault();});
    return;
  }
  var endpoint=form.getAttribute('data-resend-endpoint');
  if(!/^https:\/\/rbs-contacto\.mauro-f09\.workers\.dev\/consulta$/.test(endpoint))return;
  var button=form.querySelector('button[type="submit"]'),original=button.innerHTML;
  var error=document.createElement('p');error.className='form-error';error.setAttribute('role','alert');error.hidden=true;button.before(error);
  form.setAttribute('data-resend-ready','true');
  var fallback=form.querySelector('[data-form-fallback]');if(fallback)fallback.hidden=true;
  button.disabled=false;
  var id='';
  form.addEventListener('input',function(){id='';});
  form.addEventListener('change',function(){id='';});
  form.addEventListener('submit',async function(event){
    if(event.defaultPrevented)return;
    event.preventDefault();error.hidden=true;
    var fields=new FormData(form);id=id||crypto.randomUUID();
    var body={id:id,name:fields.get('Nombre o empresa'),phone:fields.get('Teléfono'),machine:fields.get('Tipo de máquina')||'',model:fields.get('Marca y modelo')||'',location:fields.get('Ubicación')||'',message:fields.get('Avería'),source:fields.get('Origen web')||'',website:fields.get('_honey')||'',privacy:fields.get('Privacidad')==='Aceptada'};
    button.disabled=true;button.textContent='Enviando…';
    var timeout=window.setTimeout(function(){controller.abort();},20000),controller=new AbortController();
    try{
      var response=await fetch(endpoint,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
      var result=await response.json();
      if(!response.ok||result.ok!==true)throw new Error(result.error||'No se ha confirmado el envío. Vuelve a intentarlo o llámanos.');
      var next=new URL(fields.get('_next')||'https://www.rbsindustrial.com/?enviado=1#contacto');
      if(next.origin!=='https://www.rbsindustrial.com')throw new Error('Destino no válido.');
      location.assign(next.href);
    }catch(reason){
      try{sessionStorage.removeItem('rbs-formulario-pendiente');}catch(_){}
      error.textContent=(reason instanceof TypeError||reason.name==='AbortError'||reason.name==='SyntaxError')?'No se ha confirmado el envío. Comprueba la conexión o contacta por teléfono o WhatsApp.':reason.message;
      error.hidden=false;button.disabled=false;button.innerHTML=original;
    }finally{window.clearTimeout(timeout);}
  });
})();
