"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ConfirmClientProps = {
  name?: string;
  phone?: string;
  date?: string;
  time?: string;
  address?: string;
  payment?: string;
  notes?: string;
};

function buildMapsUrl(address: string) {
  const q = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function formatDateTime(date: string, time: string) {
  if (!date || !time) return "";
  return `${date} ${time}`;
}

export default function ConfirmClient({
  name = "",
  phone = "",
  date = "",
  time = "",
  address = "",
  payment = "",
  notes = "",
}: ConfirmClientProps) {
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [calendarLink, setCalendarLink] = useState<string | null>(null);

  const data = useMemo(() => {
    const mapsUrl = address.trim() ? buildMapsUrl(address) : "";
    const dt = formatDateTime(date, time);

    const lines: string[] = [];
    lines.push("📅 Evento");
    if (name.trim()) lines.push(`🎤 Cliente: ${name.trim()}`);
    if (phone.trim()) lines.push(`📱 Teléfono: ${phone.trim()}`);
    if (dt) lines.push(`🕒 Fecha y hora: ${dt}`);
    if (address.trim()) lines.push(`📍 Dirección: ${address.trim()}`);
    if (mapsUrl) lines.push(`🗺️ Mapa: ${mapsUrl}`);
    if (payment.trim()) lines.push(`💵 Pago: ${payment.trim()}`);
    if (notes.trim()) lines.push(`📝 Notas: ${notes.trim()}`);

    return {
      name,
      phone,
      date,
      time,
      address,
      payment,
      notes,
      mapsUrl,
      message: lines.join("\n"),
    };
  }, [name, phone, date, time, address, payment, notes]);

  async function handleCopy() {
    await navigator.clipboard.writeText(data.message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function handleCreateCalendarEvent() {
    try {
      setCreatingEvent(true);
      setCalendarMessage(null);
      setCalendarLink(null);

      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          date: data.date,
          time: data.time,
          address: data.address,
          payment: data.payment,
          notes: data.notes,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "No se pudo crear el evento.");
      }

      setCalendarMessage("✅ Evento creado en Google Calendar");
      setCalendarLink(result.htmlLink ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      setCalendarMessage(`❌ ${message}`);
    } finally {
      setCreatingEvent(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Confirmación del evento</h1>
          <p className="text-sm text-gray-600">
            Revisa, copia o crea el evento en Google Calendar.
          </p>
        </header>

        <section className="rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Salida</p>
              {data.mapsUrl ? (
                <a
                  className="text-sm underline"
                  href={data.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir mapa
                </a>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-md border px-3 text-sm"
                type="button"
                onClick={() => router.push("/")}
              >
                Editar
              </button>

              <button
                className="h-10 rounded-md border px-3 text-sm disabled:opacity-50"
                type="button"
                disabled={!data.message.trim()}
                onClick={handleCopy}
              >
                {copied ? "✅ Copiado" : "Copiar"}
              </button>

              <button
                className="h-10 rounded-md bg-black px-3 text-sm text-white disabled:opacity-50"
                type="button"
                disabled={creatingEvent}
                onClick={handleCreateCalendarEvent}
              >
                {creatingEvent
                  ? "Creando evento..."
                  : "Crear evento en Google Calendar"}
              </button>
            </div>
          </div>

          <pre className="mt-4 whitespace-pre-wrap rounded-md border bg-black/5 p-3 text-sm">
            {data.message || "Faltan datos. Regresa a editar."}
          </pre>

          {calendarMessage ? (
            <div className="mt-4 space-y-2 rounded-md border p-3 text-sm">
              <p>{calendarMessage}</p>
              {calendarLink ? (
                <a
                  className="underline"
                  href={calendarLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir evento en Google Calendar
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}