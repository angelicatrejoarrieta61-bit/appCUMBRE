/**
 * /lib/whatsapp.js — Cliente mínimo de envío para WhatsApp Cloud API
 * Graph API v23.0. Sin dependencias: usa fetch nativo de Node 18+.
 */

const GRAPH_VERSION = "v23.0";

function apiUrl() {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_ID}/messages`;
}

async function post(payload) {
  const res = await fetch(apiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[whatsapp] API error:", JSON.stringify(data));
    throw new Error(data?.error?.message || "WhatsApp API error");
  }
  return data;
}

/** Texto simple. Solo funciona dentro de la ventana de 24h de servicio. */
export function sendText(to, body) {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body, preview_url: true },
  });
}

/** Plantilla aprobada (requerida para iniciar conversación fuera de la ventana de 24h). */
export function sendTemplate(to, templateName, langCode = "es_MX", components = []) {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: langCode },
      ...(components.length ? { components } : {}),
    },
  });
}

/** Lista interactiva (máx. 10 filas). rows = [{ id, title, description }] */
export function sendList(to, bodyText, buttonLabel, rows) {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [{ title: "Coincidencias", rows: rows.slice(0, 10) }],
      },
    },
  });
}

/** Botones interactivos (máx. 3). buttons = [{ id, title }] */
export function sendButtons(to, bodyText, buttons) {
  return post({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}
