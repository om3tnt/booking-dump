"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  name: string;
  phone: string;
  date: string; // DD/MM/YYYY
  time: string; // HH:mm (24h)
  address: string;
  payment: string;
  notes: string;
};

function normalizeUsPhone(input: string) {
  const digits = input.replace(/\D/g, "");

  // 11 digits starting with 1 => US country code
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const first = digits.slice(4, 7);
    const last = digits.slice(7, 11);
    return `+1 (${area}) ${first}-${last}`;
  }

  // 10 digits => assume US local number
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const first = digits.slice(3, 6);
    const last = digits.slice(6, 10);
    return `+1 (${area}) ${first}-${last}`;
  }

  return input;
}

function normalizeChicagoAreaAddress(input: string) {
  const value = input.trim();
  if (!value) return "";

  const lower = value.toLowerCase();

  const hasIllinoisHint =
    lower.includes("illinois") ||
    lower.includes(" il") ||
    lower.endsWith(", il") ||
    lower.includes("chicago") ||
    lower.includes("aurora") ||
    lower.includes("elgin") ||
    lower.includes("naperville") ||
    lower.includes("joliet") ||
    lower.includes("waukegan") ||
    lower.includes("evanston") ||
    lower.includes("schaumburg") ||
    lower.includes("arlington heights") ||
    lower.includes("cicero") ||
    lower.includes("oak park") ||
    lower.includes("skokie") ||
    lower.includes("des plaines");

  if (hasIllinoisHint) return value;

  // Bias toward Chicagoland/Illinois if user entered only a vague place
  return `${value}, Illinois`;
}

function buildMapsUrl(address: string) {
  const normalized = normalizeChicagoAreaAddress(address);
  const q = encodeURIComponent(normalized);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function isValidDdMmYyyy(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);

  if (month < 1 || month > 12 || day < 1 || year < 1900) return false;

  const dt = new Date(year, month - 1, day);
  return (
    dt.getFullYear() === year &&
    dt.getMonth() === month - 1 &&
    dt.getDate() === day
  );
}

function normalizeDateInput(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatPreviewDateTime(date: string, time: string) {
  if (!date || !time) return "";
  return `${date} ${time}`;
}

export default function Home() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    date: "",
    time: "",
    address: "",
    payment: "",
    notes: "",
  });

  const normalizedPhone = useMemo(() => normalizeUsPhone(form.phone), [form.phone]);
  const normalizedAddress = useMemo(
    () => normalizeChicagoAreaAddress(form.address),
    [form.address]
  );
  const mapsUrl = useMemo(() => {
    return normalizedAddress ? buildMapsUrl(normalizedAddress) : "";
  }, [normalizedAddress]);

  const preview = useMemo(() => {
    const dt = formatPreviewDateTime(form.date, form.time);
    const lines: string[] = [];
    lines.push("📅 Evento");
    if (form.name.trim()) lines.push(`🎤 Cliente: ${form.name.trim()}`);
    if (normalizedPhone.trim()) lines.push(`📱 Teléfono: ${normalizedPhone.trim()}`);
    if (dt) lines.push(`🕒 Fecha y hora: ${dt}`);
    if (normalizedAddress.trim()) lines.push(`📍 Dirección: ${normalizedAddress.trim()}`);
    if (mapsUrl) lines.push(`🗺️ Mapa: ${mapsUrl}`);
    if (form.payment.trim()) lines.push(`💵 Pago: ${form.payment.trim()}`);
    if (form.notes.trim()) lines.push(`📝 Notas: ${form.notes.trim()}`);
    return lines.join("\n");
  }, [form, normalizedPhone, normalizedAddress, mapsUrl]);

  const canGenerate =
    form.name.trim() &&
    normalizedPhone.trim() &&
    isValidDdMmYyyy(form.date.trim()) &&
    form.time.trim() &&
    normalizedAddress.trim() &&
    form.payment.trim();

  function goToConfirm() {
    const params = new URLSearchParams({
      name: form.name,
      phone: normalizedPhone,
      date: form.date,
      time: form.time,
      address: normalizedAddress,
      payment: form.payment,
      notes: form.notes,
    });

    router.push(`/confirm?${params.toString()}`);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <header className="space-y-3 lg:col-span-2">
          <div>
            <h1 className="text-2xl font-semibold">Booking Dump</h1>
            <p className="text-sm text-gray-600">
              Captura los datos del evento y genera un mensaje listo para copiar/pegar.
            </p>
          </div>

          <a
            href="/api/auth/google"
            className="inline-flex h-10 items-center rounded-md border px-3 text-sm"
          >
            Conectar Google Calendar
          </a>
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
                placeholder="Ej. Juan Perez"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </Field>

            <Field label="Teléfono (USA)">
              <input
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ej. 3125551234 o +1 312 555 1234"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                onBlur={() =>
                  setForm((s) => ({ ...s, phone: normalizeUsPhone(s.phone) }))
                }
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha (DD/MM/AAAA)">
                <input
                  className="h-10 w-full rounded-md border px-3"
                  placeholder="12/03/2026"
                  inputMode="numeric"
                  value={form.date}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      date: normalizeDateInput(e.target.value),
                    }))
                  }
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

            <Field label="Dirección (Chicago / Illinois)">
              <input
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ej. Elgin, IL o Chicago"
                value={form.address}
                onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                onBlur={() =>
                  setForm((s) => ({
                    ...s,
                    address: normalizeChicagoAreaAddress(s.address),
                  }))
                }
              />
            </Field>

            <Field label="Pago">
              <input
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ej. 1500 total, 500 a cuenta"
                value={form.payment}
                onChange={(e) => setForm((s) => ({ ...s, payment: e.target.value }))}
              />
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                className="min-h-24 w-full rounded-md border px-3 py-2"
                placeholder="Ej. solo mariachi, no cumbias"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              />
            </Field>

            <button
              className="mt-2 h-10 rounded-md bg-black text-white disabled:opacity-50"
              type="button"
              disabled={!canGenerate}
              onClick={goToConfirm}
            >
              Generar confirmación
            </button>

            {!canGenerate && (
              <p className="text-xs text-gray-600">
                Completa los campos mínimos con fecha válida DD/MM/AAAA para habilitar el botón.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-medium">Booking Confirmation</h2>
          <p className="mt-1 text-sm text-gray-600">
            Copia y pega este texto por WhatsApp o SMS.
          </p>

          <pre className="mt-4 whitespace-pre-wrap rounded-md border bg-black/5 p-3 text-sm">
            {preview || "Empieza a llenar el formulario para generar el texto…"}
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