/**
 * /lib/sheets.js — Lectura en vivo del Google Sheet de pasajeros
 *
 * Estructura esperada de la hoja (pestaña "Pasajeros", fila 1 = encabezados):
 *   A NOMBRE        (nombre completo del invitado)
 *   B AEROLINEA
 *   C VUELO_IDA     (ej. AM 1234)
 *   D FECHA_IDA     (ej. 12 Ago)
 *   E HORA_IDA      (ej. 07:45)
 *   F RUTA          (ej. MEX → CUN)
 *   G VUELO_REGRESO
 *   H FECHA_REGRESO
 *   I HORA_REGRESO
 *   J NOTAS         (opcional: terminal, grupo, hotel, etc.)
 *
 * Variables de entorno:
 *   GOOGLE_SA_EMAIL   → email del service account
 *   GOOGLE_SA_KEY     → private key del JSON (con \n literales)
 *   SHEET_ID          → ID del spreadsheet (el de la URL)
 *
 * Dependencia: npm i googleapis
 */

import { google } from "googleapis";

const TTL_MS = 60_000; // caché de 60s: datos frescos sin golpear la API en cada mensaje
let cache = { rows: null, ts: 0 };

async function fetchRows() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SA_EMAIL,
    key: process.env.GOOGLE_SA_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: "Pasajeros!A2:J",
  });

  return (res.data.values || []).map((r, i) => ({
    idx: i,
    nombre: r[0] || "",
    aerolinea: r[1] || "",
    vueloIda: r[2] || "",
    fechaIda: r[3] || "",
    horaIda: r[4] || "",
    ruta: r[5] || "",
    vueloRegreso: r[6] || "",
    fechaRegreso: r[7] || "",
    horaRegreso: r[8] || "",
    notas: r[9] || "",
  }));
}

export async function getPassengers() {
  const now = Date.now();
  if (cache.rows && now - cache.ts < TTL_MS) return cache.rows;
  cache = { rows: await fetchRows(), ts: now };
  return cache.rows;
}

/** Normaliza para comparar: minúsculas, sin acentos, sin espacios dobles. */
export function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Búsqueda por nombre: todas las palabras que escribió el invitado
 * deben aparecer en el nombre registrado. "juan garcia" encuentra
 * a "Juan Carlos García López" aunque escriba sin acentos.
 */
export function searchByName(rows, query) {
  const tokens = normalize(query).split(" ").filter((t) => t.length > 1);
  if (!tokens.length) return [];
  return rows.filter((p) => {
    const name = normalize(p.nombre);
    return tokens.every((t) => name.includes(t));
  });
}

/** Formatea la ficha de vuelo que recibe el invitado. */
export function formatFlight(p) {
  const lines = [
    `✈️ *Itinerario de ${p.nombre}*`,
    "",
    `*IDA* — ${p.aerolinea} ${p.vueloIda}`,
    `${p.fechaIda} · ${p.horaIda} · ${p.ruta}`,
  ];
  if (p.vueloRegreso) {
    lines.push(
      "",
      `*REGRESO* — ${p.aerolinea} ${p.vueloRegreso}`,
      `${p.fechaRegreso} · ${p.horaRegreso}`
    );
  }
  if (p.notas) lines.push("", `📌 ${p.notas}`);
  lines.push("", "_Llega al aeropuerto 2 horas antes de tu vuelo._");
  return lines.join("\n");
}
