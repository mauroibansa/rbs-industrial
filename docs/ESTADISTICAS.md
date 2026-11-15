# Estadísticas de RBS

Panel privado: https://rbsindustrial.goatcounter.com/ · cuenta: mauro@agenciamammut.com.
Correo verificado; interfaz en español y zona horaria Europe/Madrid. El gráfico de
visitas totales excluye eventos. La lista de páginas muestra hasta 25 entradas.

## Qué se mide

- Visitas a la portada. GoatCounter agrupa repeticiones según sus sesiones.
- `clic-llamar-*`, `clic-whatsapp-*`, `clic-email-*` y `clic-maps-*`.
- Zonas: `cabecera`, `portada`, `contacto`, `barra-movil` y `pie`.
- `retorno-formulario`: vuelta tras un envío válido realizado desde la misma
  pestaña en los últimos 30 minutos. La marca se consume una vez. No prueba que
  el correo haya llegado; esa entrega se comprueba en el buzón.

Los clics no acreditan llamadas realizadas, mensajes enviados ni ventas.
El total de filas de «Páginas» puede incluir eventos: consultar el gráfico de
totales, que tiene activado «Excluir eventos», para las visitas.

## Implementación y privacidad

`assets/analytics.js` se carga antes de que se muestren los enlaces. Usa el
endpoint estable `/count` documentado por GoatCounter y `sendBeacon`, con píxel
como alternativa. No espera un script externo ni retrasa la navegación.

Documentación: https://www.goatcounter.com/help/pixel.

No transmite los campos del formulario ni la URL completa de procedencia.
Solo envía la ruta, eventos de nombre fijo, origen del referente y etiquetas de
campaña que cumplan el formato permitido. Se admiten `utm_campaign`,
`utm_source` y `utm_medium` con letras, números, guiones, puntos y guiones bajos,
hasta 80 caracteres. No usar datos personales como etiquetas.

La marca funcional del formulario vive en `sessionStorage`; no identifica al
visitante. No se almacenan identificadores analíticos en el navegador.
Bloqueadores y restricciones de red pueden impedir la medición: es orientativa.

## Excluir visitas propias

Abrir https://www.rbsindustrial.com/?estadisticas=excluir una vez en cada
navegador/dispositivo de administración. La preferencia se guarda localmente.
Para volver a contar: https://www.rbsindustrial.com/?estadisticas=incluir.
Si el navegador impide almacenar preferencias, la exclusión no persiste.

## Campañas y contactos por canal

- Google Maps: `https://www.rbsindustrial.com/?utm_source=google-maps&utm_medium=organic&utm_campaign=google-maps-rbs`.
- LinkedIn: `https://www.rbsindustrial.com/?utm_source=linkedin&utm_medium=social&utm_campaign=linkedin-rbs`.

El perfil y el botón de LinkedIn usan el segundo enlace. El primero se ha guardado
desde la cuenta propietaria de la ficha de Google el 16 de noviembre de 2026;
Google lo mostró pendiente de revisión tras guardarlo.

Los parámetros se conservan en los clics y en el enlace de retorno de FormSubmit.
Para consultar contactos por canal, abrir el evento correspondiente en GoatCounter
y revisar sus referentes: `google-maps` o `linkedin`. Los eventos llevan el canal
explícitamente en su referente; los parámetros de campaña identifican las visitas.
El correo incluye el campo «Origen web» (Google Maps o LinkedIn). El mensaje
preparado de WhatsApp añade «Enlace de Google Maps» o «Enlace de LinkedIn»;
el visitante puede editarlo antes de enviarlo. No se atribuyen llamadas reales:
solo se registran los clics en el teléfono.

## Comprobación

Ejecutar `node --test tests/analytics.test.cjs`.

Las pruebas reales anteriores a publicación usan una vista local de la web y
`?prueba_estadisticas=rbs-16nov-a`. Solo se activa ese modo en `localhost` o
`127.0.0.1`. Las visitas aparecen bajo `/pruebas/` y los eventos empiezan por
`prueba-`; no interpretarlos como tráfico de clientes. El servidor local de QA
intercepta enlaces y simula el retorno del formulario sin realizar llamadas,
abrir conversaciones ni enviar correos a RBS. Los eventos sí se envían al panel
real, donde se verifica su recepción antes de publicar.

Las pruebas cubren captura inmediata, clases de contacto, rechazo de URLs de
confirmación falsas, consumo único y caducidad de la marca, campos no válidos,
minimización de los datos, exclusión propia, modo local, alternativa a beacon,
almacenamiento bloqueado y pestañas ocultas.
