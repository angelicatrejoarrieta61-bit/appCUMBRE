# Bot Cumbre 2026 · WhatsApp Cloud API + Vercel + Google Sheets

Bot de consulta de vuelos para convencion. El invitado escribe su nombre
y recibe su itinerario. Sin Typebot, sin plataformas de pago: solo la
Cloud API oficial de Meta (gratis) y Vercel (gratis).

## Estructura

```
api/webhook.js      Endpoint del webhook (verificacion + mensajes)
lib/whatsapp.js     Envio de mensajes (texto, listas, botones, plantillas)
lib/sheets.js       Lectura en vivo del Google Sheet + busqueda por nombre
package.json        Unica dependencia: googleapis
.env.example        Plantilla de variables de entorno
demo-bot-cumbre.html  Simulador para demo al cliente (opcional, ponlo en /public)
```

## Paso 1 · App en Meta (10 min)

1. developers.facebook.com > My Apps > Create App > tipo **Business**.
2. Agrega el producto **WhatsApp** a la app.
3. En **WhatsApp > API Setup** copia:
   - **Phone Number ID** (numero de prueba incluido gratis)
   - **Token temporal** (dura 24h, suficiente para probar hoy)
4. En "To" agrega tu celular como destinatario de prueba (acepta el
   codigo que te llega por WhatsApp). Puedes agregar hasta 5 numeros:
   agrega tambien el del cliente para la demo real.

## Paso 2 · Google Sheets (10 min)

1. console.cloud.google.com > nuevo proyecto > habilita **Google Sheets API**.
2. IAM & Admin > Service Accounts > crea uno > Keys > Add Key > JSON.
3. Del JSON: `client_email` -> GOOGLE_SA_EMAIL, `private_key` -> GOOGLE_SA_KEY.
4. En el Sheet de pasajeros: **Compartir** con el email del service
   account (solo Lector).
5. La pestana debe llamarse **Pasajeros**, fila 1 encabezados, datos
   desde fila 2, columnas A-J:

   | A NOMBRE | B AEROLINEA | C VUELO_IDA | D FECHA_IDA | E HORA_IDA | F RUTA | G VUELO_REGRESO | H FECHA_REGRESO | I HORA_REGRESO | J NOTAS |

## Paso 3 · Deploy en Vercel (5 min)

1. Sube esta carpeta a un repo de GitHub e importalo en Vercel
   (o `vercel deploy` con el CLI).
2. Settings > Environment Variables: agrega todas las del .env.example.
3. Redeploy para que las variables apliquen.
4. Tu webhook queda en: `https://TU-PROYECTO.vercel.app/api/webhook`

## Paso 4 · Conectar el webhook (2 min)

En Meta > tu app > WhatsApp > **Configuration**:

1. Callback URL: `https://TU-PROYECTO.vercel.app/api/webhook`
2. Verify token: el mismo valor de WHATSAPP_VERIFY_TOKEN
3. **Verify and save** (verifica al instante si las env vars estan bien)
4. En **Webhook fields** suscribete a `messages`  <- SIN ESTO NO LLEGA NADA

## Paso 5 · Probar

Desde tu celular (registrado como destinatario de prueba) escribe
"Hola" al numero de prueba. El bot responde el menu. Prueba:
- Opcion 1 y un nombre real del Sheet -> itinerario
- Nombre repetido -> lista interactiva de homonimos
- Nombre inexistente -> mensaje de no encontrado + staff

## Paso 6 · Produccion (antes del evento)

1. **Token permanente**: Business Manager > System Users > crear >
   Generate Token con permisos `whatsapp_business_messaging` y
   `whatsapp_business_management`, sin expiracion. Reemplaza
   WHATSAPP_TOKEN en Vercel.
2. **Numero dedicado**: en la WABA agrega el numero real del evento
   (nunca lo actives en la app normal de WhatsApp), verifica por SMS
   y actualiza WHATSAPP_PHONE_ID.
3. **Verificacion del negocio** en Business Manager: no es obligatoria
   para responder mensajes entrantes, pero da nombre visible y mas
   confianza. Los invitados inician la conversacion, asi que el limite
   de 250 conversaciones/dia de cuentas no verificadas NO aplica aqui.
4. QR / link para gafetes e invitaciones:
   `https://wa.me/52XXXXXXXXXX?text=Hola`

## Costos reales

- Vercel: $0 (plan hobby sobra para 700 invitados)
- Cloud API: $0 en conversaciones de servicio (las inicia el invitado);
  las primeras 1,000 al mes son gratis
- Google Sheets API: $0
- Typebot: $0 porque ya no existe en esta arquitectura
