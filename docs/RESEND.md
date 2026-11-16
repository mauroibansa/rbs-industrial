# Migración del formulario a Resend

Estado a 16/11/2026: dominio verificado, función desplegada y clave de envío limitada guardada como secreto. Recepción real comprobada antes de retirar FormSubmit: referencia adc56d44-238b-43be-8267-b2aa06a2f8f1, Resend entregado y Mail → Entrada de Rbsindustrial, 02:13 (Madrid). Formulario y privacidad publicados (cce5ae1). Segunda prueba desde la web pública recibida en Entrada de Rbsindustrial a las 02:17: referencia 0b724fbc-89ac-424f-8144-7dfca28bf7eb, origen LinkedIn, Resend 01a1e1ee-01e6-784a-8843-40e6a93a4b78 entregado. Confirmación de éxito visible en navegador. FormSubmit retirado; sin ruta temporal de QA publicada. 22 pruebas automatizadas superadas.

- Sitio: GitHub Pages. El servidor de formulario es un Worker independiente.
- Worker: `rbs-contacto`, cuenta Cloudflare de mauro@agenciamammut.com.
- URL: https://rbs-contacto.mauro-f09.workers.dev/consulta
- Resend: equipo mauroibansa; dominio envios.rbsindustrial.com (Irlanda).
- Remitente fijo: consultas@envios.rbsindustrial.com; destino fijo info@rbsindustrial.com.
- La región de envío no cambia el almacenamiento de Resend en EE. UU.
- No activar aperturas/clics, webhooks ni copia de consultas a Mammut.
- Clave Resend limitada a enviar con ese dominio, guardada exclusivamente como secreto `RESEND_API_KEY` del Worker. Nunca en Git, HTML o JavaScript público.
- Binding `CONTACT_RATE_LIMITER`: 3 peticiones/60s por IP y ubicación Cloudflare. Es limitación aproximada, no global estricta. No crear almacenamiento de consultas.
- Desactivar Workers Logs y trazas antes de habilitar tráfico real.

## Procedimiento de publicación y futuras revisiones

1. Completar DNS DKIM y los dos CNAME que indique Resend; verificar dominio. No tocar MX, SPF o DKIM del correo habitual de RBS.
2. Desplegar `server/resend/worker.mjs`; configuración en `server/resend/wrangler.jsonc`.
3. Configurar secreto de envío y binding. `/health` debe devolver `ready:true`.
4. Preparar vista de prueba sin publicar cambiando en la copia de la portada: `data-resend-endpoint="https://rbs-contacto.mauro-f09.workers.dev/consulta"`, cargar `assets/contact-resend.js` al final. Permitir origen local solo en entorno de prueba, nunca en producción.
5. Hacer un envío real de prueba desde una vista servida bajo el dominio permitido de RBS (una ruta temporal de QA); verificar en Resend y en el buzón receptor. Un 200 de la API no acredita recepción.
6. Comprobar también error de red, validación y atribución Maps/LinkedIn. Nunca reenviar automáticamente por FormSubmit tras un error ambiguo: podría duplicar consultas.
7. Solo después: activar la integración y retirar campos específicos de FormSubmit. Integrar el fragmento `server/resend/privacy-section.html` en `legal.html`, ajustando el formulario y su primera capa informativa. Confirmar que la documentación de encargo RBS–Mammut y los contratos de Resend/Cloudflare están conservados y corresponden a la cuenta usada; no afirmar que se ha formalizado un contrato RBS–Mammut si no consta.
8. Publicar, probar recepción final y retirar la ruta de QA.

## Pruebas

`node --test tests/resend.test.mjs tests/contact-resend.test.cjs tests/analytics.test.cjs`

El servidor valida campos, tamaño y teléfono; limita intentos; minimiza el correo; usa destinatario y remitente fijos e idempotencia; no imprime consultas ni respuestas del proveedor. La confirmación del navegador no acredita recepción en el buzón.

Fuentes: https://resend.com/security/gdpr · https://resend.com/legal/dpa · https://resend.com/legal/subprocessors · https://www.cloudflare.com/cloudflare-customer-dpa/

## Pendiente administrativo

El encargo RBS–prestador está preparado con las partes y firmantes completos, sin marca comercial; su firma no se ha acreditado. Resend y Cloudflare revisados. BeOnline factura el alojamiento de RBS al prestador, por lo que se contempla como subencargado: queda acreditar qué anexo está incorporado a ese servicio. El 16/11/2026 se solicitó por correo confirmación y copia aplicable a soporte de BeOnline. Seguimiento programado para el 17/11/2026. La publicación de la política no acredita por sí sola la formalización de los encargos.

## Revisión técnica final del 16 de noviembre de 2026

23 pruebas de servidor, formulario y estadísticas superadas. Se comprobó la versión pública de los ajustes de error del formulario y contraste del botón 404. 27 recursos y rutas verificados; redirecciones de variantes del dominio a HTTPS con www, XML público disponible y ruta inexistente con estado 404. En móvil de 390 px no se detecta desbordamiento horizontal; los campos tienen etiqueta y el servidor rechaza una prueba de teléfono inválido. Las pruebas reales de recepción anteriores permanecen documentadas al inicio.

El usuario confirma que RBS tiene acreditadas las condiciones de servicio oficial Jaltest y miembro de ADR Service; no se ha incorporado copia de dichas acreditaciones al repositorio. El enlace etiquetado de Maps ya es público. Google Search Console sigue mostrando «No se ha podido obtener» para el sitemap; no se ha reenviado. Quedan los seguimientos externos de Google y los documentos de privacidad, incluida la firma.
