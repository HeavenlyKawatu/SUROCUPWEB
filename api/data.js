// Vercel Serverless Function: /api/data
//   GET  -> baca data turnamen (publik)
//   POST -> cek PIN admin (dipakai saat login)
//   PUT  -> simpan data turnamen (wajib header x-admin-pin)
// Env yang dibutuhkan: DATABASE_URL (otomatis dari integrasi Neon) dan ADMIN_PIN.
import { neon } from "@neondatabase/serverless";
import { timingSafeEqual } from "node:crypto";

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// Tabel dibuat otomatis saat pertama kali dipanggil.
let ready = null;
const ensure = () =>
  (ready ||= (async () => {
    await sql`create table if not exists suro_state (
      id         text primary key,
      data       jsonb not null,
      updated_at timestamptz not null default now()
    )`;
  })().catch((e) => { ready = null; throw e; }));

function authed(req) {
  const given = Buffer.from(String(req.headers["x-admin-pin"] || ""));
  const real = Buffer.from(String(process.env.ADMIN_PIN || ""));
  return real.length > 0 && given.length === real.length && timingSafeEqual(given, real);
}

function valid(d) {
  return (
    d && typeof d === "object" &&
    Array.isArray(d.teams) && Array.isArray(d.matches) &&
    JSON.stringify(d).length < 1_000_000
  );
}

export default async function handler(req, res) {
  try {
    await ensure();

    if (req.method === "GET") {
      const rows = await sql`select data, updated_at from suro_state where id = 'main'`;
      // Cache singkat di CDN Vercel supaya database tidak dihantam banyak penonton.
      res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");
      return res.status(200).json(
        rows[0] ? { data: rows[0].data, updatedAt: rows[0].updated_at } : { data: null, updatedAt: null }
      );
    }

    res.setHeader("Cache-Control", "no-store");
    if (!authed(req)) return res.status(401).json({ error: "PIN salah" });

    if (req.method === "POST") return res.status(200).json({ ok: true });

    if (req.method === "PUT") {
      const d = req.body;
      if (!valid(d)) return res.status(400).json({ error: "Data tidak valid" });
      const rows = await sql`
        insert into suro_state (id, data, updated_at)
        values ('main', ${JSON.stringify(d)}::jsonb, now())
        on conflict (id) do update set data = excluded.data, updated_at = now()
        returning updated_at`;
      return res.status(200).json({ updatedAt: rows[0].updated_at });
    }

    res.setHeader("Allow", "GET, POST, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Kesalahan server" });
  }
}
