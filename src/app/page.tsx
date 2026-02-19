"use client";

import { useMemo, useState } from "react";

type FormState = {
  name: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  address: string;
  payment: string;
  notes: string;
};

function buildMapsUrl(address: string) {
  const q = encodeURIComponent(address.trim());
  return `https://maps.google.com/?q=${q}`;
}

function formatDateTime(date: string, time: string) {
  if (!date || !time) return "";
  // Keep it simple & predictable (no timezone surprises)
  return `${date} ${time}`;
}

export default function Home() {
  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    date: "",
    time: "",
    address: "",
    payment: "",
    notes: "",
  });

  const [copied, setCopied] = useState(false);

  const mapsUrl = useMemo(() => {
    return form.address.trim() ? buildMapsUrl(form.address) : "";
  }, [form.address]);

  const message = useMemo(() => {
    const dt = formatDateTime(form.date, form.time);

    const lines: string[] = [];
    lines.push("📅 Evento");
    if (form.name.trim()) lines.push(`🎤 Cliente: ${form.name.trim()}`);
    if (form.phone.trim()) lines.push(`📱 Teléfono: ${form.phone.trim()}`);
    if (dt) lines.push(`🕒 Fecha y hora: ${dt}`);
    if (form.address.trim()) lines.push(`📍 Dirección: ${form.address.trim()}`);
    if (mapsUrl) lines.push(`🗺️ Mapa: ${mapsUrl}`);
    if (form.payment.trim()) lines.push(`💵 Pago: ${form.payment.trim()}`);
    if (form.notes.trim()) lines.push(`📝 Notas: ${form.notes.trim()}`);

    return lines.join("\n");
  }, [form, mapsUrl]);

  const canGenerate =
    form.name.trim() &&
    form.phone.trim() &&
    form.date.trim() &&
    form.time.trim() &&
    form.address.trim() &&
    form.payment.trim();

  async function handleCopy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <header className="space-y-2 lg:col-span-2">
          <h1 className="text-2xl font-semibold">Booking Dump</h1>
          <p className="text-sm text-gray-600">
            Captura los datos del evento y genera un mensaje listo para copiar/pegar.
          </p>
        </header>

        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-medium">Event Info</h2>
          <p className="mt-1 text-sm text-gray-600">
            Campos mínimos: nombre, teléfono, fecha, hora, dirección y pago.
          </p>

          <div className="mt-4 grid gap-3">
            <Field label="Nombre">
              <input
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ej. Andrea Pérez"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </Field>

            <Field label="Teléfono">
              <input
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ej. +52 55 1234 5678"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha">
                <input
                  className="h-10 w-full rounded-md border px-3"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
                />
              </Field>

              <Field label="Hora">
                <input
                  className="h-10 w-full rounded-md border px-3"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Dirección">
              <input
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ej. Av. Insurgentes Sur 123, CDMX"
                value={form.address}
                onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              />
            </Field>

            <Field label="Pago">
              <input
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ej. $5,000 MXN (anticipo $2,000)"
                value={form.payment}
                onChange={(e) => setForm((s) => ({ ...s, payment: e.target.value }))}
              />
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                className="min-h-24 w-full rounded-md border px-3 py-2"
                placeholder="Ej. Llegar 30 min antes, dress code, referencias, etc."
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              />
            </Field>

            <button
              className="mt-2 h-10 rounded-md bg-black text-white disabled:opacity-50"
              type="button"
              disabled={!canGenerate}
              onClick={() => {
                // no-op: message is generated live; this is just a CTA for UX
                const el = document.getElementById("output");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Generar confirmación
            </button>

            {!canGenerate && (
              <p className="text-xs text-gray-600">
                Completa los campos mínimos para habilitar el botón.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium" id="output">
                Booking Confirmation
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Copia y pega este texto por WhatsApp o SMS.
              </p>
            </div>

            <button
              className="h-10 shrink-0 rounded-md border px-3 text-sm disabled:opacity-50"
              type="button"
              disabled={!message.trim()}
              onClick={handleCopy}
            >
              {copied ? "✅ Copiado" : "Copiar"}
            </button>
          </div>

          <pre className="mt-4 whitespace-pre-wrap rounded-md border bg-black/5 p-3 text-sm">
{message || "Empieza a llenar el formulario para generar el texto…"}
          </pre>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm">{label}</span>
      {children}
    </label>
  );
}
