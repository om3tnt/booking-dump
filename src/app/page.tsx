"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  name: string;
  phone: string;
  date: string; // DD/MM/AAAA
  time: string; // HH:mm
  address: string;
  payment: string;
  notes: string;
};

function normalizeUsPhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const first = digits.slice(4, 7);
    const last = digits.slice(7, 11);
    return `+1 (${area}) ${first}-${last}`;
  }

  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const first = digits.slice(3, 6);
    const last = digits.slice(6, 10);
    return `+1 (${area}) ${first}-${last}`;
  }

  return input.trim();
}

function normalizeDateInput(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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

function normalizeChicagoAreaAddress(input: string) {
  const value = input.trim();
  if (!value) return "";

  const lower = value.toLowerCase();

  const hasIllinoisHint =
    lower.includes("illinois") ||
    lower.includes(", il") ||
    lower.endsWith(" il") ||
    lower.includes("chicago") ||
    lower.includes("elgin") ||
    lower.includes("aurora") ||
    lower.includes("naperville") ||
    lower.includes("joliet") ||
    lower.includes("evanston") ||
    lower.includes("waukegan") ||
    lower.includes("schaumburg") ||
    lower.includes("skokie") ||
    lower.includes("des plaines") ||
    lower.includes("oak park") ||
    lower.includes("arlington heights");

  if (hasIllinoisHint) return value;
  return `${value}, Illinois`;
}

function buildMapsUrl(address: string) {
  const q = encodeURIComponent(address.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function extractPhone(text: string) {
  const match = text.match(
    /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/
  );
  return match ? normalizeUsPhone(match[0]) : "";
}

function extractDate(text: string) {
  const numericMatch = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/);
  if (numericMatch) {
    const normalized = numericMatch[0].replace(/-/g, "/");
    const parts = normalized.split("/");
    const dd = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const yyyy = parts[2];

    const result = `${dd}/${mm}/${yyyy}`;
    return isValidDdMmYyyy(result) ? result : "";
  }

  const months: Record<string, string> = {
    enero: "01",
    febrero: "02",
    marzo: "03",
    abril: "04",
    mayo: "05",
    junio: "06",
    julio: "07",
    agosto: "08",
    septiembre: "09",
    setiembre: "09",
    octubre: "10",
    noviembre: "11",
    diciembre: "12",
  };

  const lower = text.toLowerCase();
  const textMatch = lower.match(
    /\b(\d{1,2})\s*(?:de)?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s*(?:de)?\s*(\d{4})\b/
  );

  if (!textMatch) return "";

  const dd = textMatch[1].padStart(2, "0");
  const mm = months[textMatch[2]];
  const yyyy = textMatch[3];

  const result = `${dd}/${mm}/${yyyy}`;
  return isValidDdMmYyyy(result) ? result : "";
}

function extractTime(text: string) {
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();

  const rangeMatch = lower.match(
    /\b(?:de\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*a\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/
  );

  if (rangeMatch) {
    let startHour = Number(rangeMatch[1]);
    const startMinute = Number(rangeMatch[2] ?? "0");
    const startSuffix = rangeMatch[3] || rangeMatch[6];

    if (startSuffix === "pm" && startHour < 12) startHour += 12;
    if (startSuffix === "am" && startHour === 12) startHour = 0;

    return `${String(startHour).padStart(2, "0")}:${String(
      startMinute
    ).padStart(2, "0")}`;
  }

  const ampmMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2] ?? "0");
    const suffix = ampmMatch[3];

    if (suffix === "pm" && hours < 12) hours += 12;
    if (suffix === "am" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  const twentyFourMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFourMatch) {
    return `${String(Number(twentyFourMatch[1])).padStart(2, "0")}:${twentyFourMatch[2]}`;
  }

  return "";
}

function lineLooksLikePayment(line: string) {
  const lower = line.toLowerCase();
  return (
    /\d/.test(line) &&
    (lower.includes("pago") ||
      lower.includes("total") ||
      lower.includes("anticipo") ||
      lower.includes("resta") ||
      lower.includes("saldo") ||
      lower.includes("a cuenta") ||
      lower.includes("$"))
  );
}

function lineLooksLikeAddress(line: string) {
  const lower = line.toLowerCase();

  if (extractDate(line) || extractTime(line)) return false;

  return (
    lower.includes("chicago") ||
    lower.includes("elgin") ||
    lower.includes("aurora") ||
    lower.includes("naperville") ||
    lower.includes("joliet") ||
    lower.includes("evanston") ||
    lower.includes("waukegan") ||
    lower.includes("illinois") ||
    lower.includes(", il") ||
    /\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|place|pl|drive|dr|lane|ln|court|ct)\b/.test(
      lower
    ) ||
    /\b\d+\s+[a-z0-9]+\s+[a-z0-9]+\b/.test(lower) ||
    /\b\d+\s+[nsew]\b/.test(lower)
  );
}

function parseQuickInput(raw: string): Partial<FormState> {
  const lines = raw.split("\n").map(cleanLine).filter(Boolean);

  const fullText = lines.join("\n");

  const phone = extractPhone(fullText);
  const date = extractDate(fullText);
  const time = extractTime(fullText);

  let name = "";
  let address = "";
  let payment = "";
  const notesLines: string[] = [];

  for (const line of lines) {
    const lineHasPhone = !!extractPhone(line);
    const lineHasDate = !!extractDate(line);
    const lineHasTime = !!extractTime(line);
    const isPayment = lineLooksLikePayment(line);
    const isAddress = lineLooksLikeAddress(line);

    if (!name) {
      const looksLikeName =
        !lineHasPhone &&
        !lineHasDate &&
        !lineHasTime &&
        !isPayment &&
        !isAddress &&
        /^[A-Za-zÀ-ÿ' -]{3,}$/.test(line);

      if (looksLikeName) {
        name = line;
        continue;
      }
    }

    if (!address && isAddress) {
      address = normalizeChicagoAreaAddress(line);
      continue;
    }

    if (!payment && isPayment) {
      payment = line;
      continue;
    }

    if (
      line !== name &&
      line !== address &&
      line !== payment &&
      !lineHasDate &&
      !lineHasTime &&
      !lineHasPhone
    ) {
      notesLines.push(line);
    }
  }

  if (!name && lines.length > 0) {
    const first = lines[0];
    if (
      !extractPhone(first) &&
      !extractDate(first) &&
      !extractTime(first) &&
      !lineLooksLikePayment(first) &&
      !lineLooksLikeAddress(first)
    ) {
      name = first;
    }
  }

  return {
    name,
    phone,
    date,
    time,
    address,
    payment,
    notes: notesLines.join(", "),
  };
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

  const [quickInput, setQuickInput] = useState("");

  useEffect(() => {
    setForm({
      name: "",
      phone: "",
      date: "",
      time: "",
      address: "",
      payment: "",
      notes: "",
    });
    setQuickInput("");
  }, []);

  const normalizedPhone = useMemo(
    () => normalizeUsPhone(form.phone),
    [form.phone]
  );

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
    if (normalizedPhone.trim())
      lines.push(`📱 Teléfono: ${normalizedPhone.trim()}`);
    if (dt) lines.push(`🕒 Fecha y hora: ${dt}`);
    if (normalizedAddress.trim())
      lines.push(`📍 Dirección: ${normalizedAddress.trim()}`);
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

  function handleQuickParse() {
    const parsed = parseQuickInput(quickInput);

    setForm((prev) => ({
      ...prev,
      name: parsed.name ?? prev.name,
      phone: parsed.phone ?? prev.phone,
      date: parsed.date ?? prev.date,
      time: parsed.time ?? prev.time,
      address: parsed.address ?? prev.address,
      payment: parsed.payment ?? prev.payment,
      notes: parsed.notes ?? prev.notes,
    }));
  }

  function handleClearAll() {
    setQuickInput("");
    setForm({
      name: "",
      phone: "",
      date: "",
      time: "",
      address: "",
      payment: "",
      notes: "",
    });
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
        <header className="space-y-3 lg:col-span-2">
          <div>
            <h1 className="text-2xl font-semibold">Registro de Evento</h1>
            <p className="text-sm text-gray-600">
              Captura los datos del evento y genera una confirmación lista para
              enviar por WhatsApp o SMS.
            </p>
          </div>

          <a
            href="/api/auth/google"
            className="inline-flex h-10 items-center rounded-md border px-3 text-sm"
          >
            Conectar con Google Calendar
          </a>
        </header>

        <section className="rounded-xl border p-4 lg:col-span-2">
          <h2 className="text-lg font-medium">Modo rápido</h2>
          <p className="mt-1 text-sm text-gray-600">
            Pega el mensaje o los datos en texto libre. La app intentará detectar
            nombre, teléfono, fecha, hora, dirección, pago y notas.
          </p>

          <div className="mt-4 grid gap-3">
            <textarea
              name="booking-quick-random"
              autoComplete="new-password"
              className="min-h-32 w-full rounded-md border px-3 py-2"
              placeholder={`Ejemplo:
Juan Perez
3125551234
12/03/2026 3:30pm
Elgin IL
1500 total, 500 a cuenta
solo mariachi, no cumbias`}
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-md bg-black px-3 text-sm text-white"
                type="button"
                onClick={handleQuickParse}
              >
                Parsear texto
              </button>

              <button
                className="h-10 rounded-md border px-3 text-sm"
                type="button"
                onClick={handleClearAll}
              >
                Limpiar todo
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-medium">Datos del Evento</h2>
          <p className="mt-1 text-sm text-gray-600">
            Campos mínimos: nombre, teléfono, fecha, hora, dirección y pago.
          </p>

          <form autoComplete="off">
            <Field label="Nombre">
              <input
                name="booking-name-random"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border px-3"
                placeholder="Nombre del cliente"
                value={form.name}
                onChange={(e) =>
                  setForm((s) => ({ ...s, name: e.target.value }))
                }
              />
            </Field>

            <Field label="Teléfono (USA)">
              <input
                name="booking-phone-random"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border px-3"
                placeholder="Número de teléfono en formato USA"
                value={form.phone}
                onChange={(e) =>
                  setForm((s) => ({ ...s, phone: e.target.value }))
                }
                onBlur={() =>
                  setForm((s) => ({
                    ...s,
                    phone: normalizeUsPhone(s.phone),
                  }))
                }
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha (DD/MM/AAAA)">
                <input
                  name="booking-date-random"
                  autoComplete="new-password"
                  className="h-10 w-full rounded-md border px-3"
                  placeholder="DD/MM/AAAA"
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
                  name="booking-time-random"
                  autoComplete="new-password"
                  className="h-10 w-full rounded-md border px-3"
                  type="time"
                  value={form.time}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, time: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Dirección (Chicago / Illinois)">
              <input
                name="booking-address-random"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border px-3"
                placeholder="Ciudad, suburbio o dirección del evento"
                value={form.address}
                onChange={(e) =>
                  setForm((s) => ({ ...s, address: e.target.value }))
                }
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
                name="booking-payment-random"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border px-3"
                placeholder="Total acordado, anticipo o saldo pendiente"
                value={form.payment}
                onChange={(e) =>
                  setForm((s) => ({ ...s, payment: e.target.value }))
                }
              />
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                name="booking-notes-random"
                autoComplete="new-password"
                className="min-h-24 w-full rounded-md border px-3 py-2"
                placeholder="Tipo de evento, color de traje, canciones solicitadas, horario de llegada, observaciones"
                value={form.notes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </Field>

            <button
              className="mt-4 h-10 rounded-md bg-black text-white disabled:opacity-50"
              type="button"
              disabled={!canGenerate}
              onClick={goToConfirm}
            >
              Generar confirmación
            </button>

            {!canGenerate && (
              <p className="mt-2 text-xs text-gray-600">
                Completa los campos mínimos con fecha válida DD/MM/AAAA para
                habilitar el botón.
              </p>
            )}
          </form>
        </section>

        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-medium">
            Vista previa de confirmación
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Revisa el mensaje antes de continuar.
          </p>

          <pre className="mt-4 whitespace-pre-wrap rounded-md border bg-black/5 p-3 text-sm">
            {preview ||
              "Completa los datos del evento para generar la confirmación."}
          </pre>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-3 grid gap-1">
      <span className="text-sm">{label}</span>
      {children}
    </label>
  );
}