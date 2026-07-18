/**
 * /api/webhook.js — Bot de convención (WhatsApp Cloud API + Vercel)
 *
 * Flujo:
 *   Invitado saluda        → bot pide nombre completo
 *   Invitado escribe nombre → búsqueda en Google Sheets
 *     1 coincidencia  → ficha de vuelo
 *     2-10            → lista interactiva para elegir
 *     0 o demasiadas  → mensaje de ayuda / contacto de staff
 *
 * Env vars: WHATSAPP_VERIFY_TOKEN, WHATSAPP_TOKEN, WHATSAPP_PHONE_ID,
 *           GOOGLE_SA_EMAIL, GOOGLE_SA_KEY, SHEET_ID, STAFF_PHONE (opcional)
 */

import { sendText, sendList } from "../lib/whatsapp.js";
import { getPassengers, searchByName, formatFlight } from "../lib/sheets.js";

const GREETINGS = ["hola", "hi", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "inicio", "menu"];

export default async function handler(req, res) {
  // ── Verificación del webhook (GET) ────────────────────
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // ── Mensajes entrantes (POST) ─────────────────────────
  if (req.method === "POST") {
    res.status(200).json({ received: true }); // ack inmediato: Meta reintenta sin 200 rápido

    try {
      const value = req.body?.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];
      if (!message) return; // webhooks de estado (delivered/read): ignorar

      const from = message.from;

      // Selección de lista (desambiguación de homónimos)
      if (message.type === "interactive" && message.interactive?.list_reply) {
        const idx = parseInt(message.interactive.list_reply.id.replace("row_", ""), 10);
        const rows = await getPassengers();
        const p = rows.find((r) => r.idx === idx);
        await sendText(from, p ? formatFlight(p) : "No encontré ese registro, intenta de nuevo escribiendo tu nombre.");
        return;
      }

      if (message.type !== "text") {
        await sendText(from, "Por favor escríbeme tu *nombre completo* en texto para buscar tu vuelo. 🙂");
        return;
      }

      const text = message.text.body.trim();
      const lower = text.toLowerCase();

      // Saludo → instrucciones
      if (GREETINGS.some((g) => lower === g || lower.startsWith(g + " "))) {
        await sendText(
          from,
          "¡Hola! 👋 Soy el asistente de vuelos de la convención.\n\nEscríbeme tu *nombre completo* tal como te registraste y te envío tu itinerario."
        );
        return;
      }

      // Búsqueda por nombre
      const rows = await getPassengers();
      const matches = searchByName(rows, text);

      if (matches.length === 1) {
        await sendText(from, formatFlight(matches[0]));
        return;
      }

      if (matches.length >= 2 && matches.length <= 10) {
        await sendList(
          from,
          "Encontré varias personas con ese nombre. ¿Cuál eres tú?",
          "Ver opciones",
          matches.map((p) => ({
            id: `row_${p.idx}`,
            title: p.nombre.slice(0, 24),
            description: `${p.aerolinea} ${p.vueloIda} · ${p.fechaIda}`.slice(0, 72),
          }))
        );
        return;
      }

      if (matches.length > 10) {
        await sendText(from, "Hay muchas coincidencias. Escríbeme tu *nombre y apellidos completos* para afinar la búsqueda.");
        return;
      }

      // Sin resultados
      const staff = process.env.STAFF_PHONE
        ? `\n\nSi crees que es un error, contacta al staff: ${process.env.STAFF_PHONE}`
        : "";
      await sendText(
        from,
        `No encontré "${text}" en la lista de pasajeros. 🔎\nVerifica que esté escrito como te registraste (nombre y apellidos).${staff}`
      );
    } catch (err) {
      console.error("[webhook] error:", err);
    }
    return;
  }

  return res.status(405).send("Method Not Allowed");
}
