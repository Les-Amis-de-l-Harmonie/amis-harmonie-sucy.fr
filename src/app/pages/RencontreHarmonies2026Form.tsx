"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, CircleAlert, Loader2, Minus, PartyPopper, Plus } from "lucide-react";
import { formatSuccessMessage, isEventClosed } from "@/lib/free-events";
import type { FreeEventConfig } from "@/lib/free-events";
import { cn } from "@/lib/utils";
import { nbspPunctuation, tidy } from "./RencontreHarmonies2026Typo";

type FieldKey = "lastName" | "firstName" | "email" | "partySize" | "interests" | "source";
type FieldErrors = Partial<Record<FieldKey, string>>;
type Status = "idle" | "submitting" | "success";

interface ReservationResponse {
  success?: boolean;
  partySize?: number;
  error?: string;
  fields?: FieldErrors;
}

const NETWORK_ERROR = "Connexion impossible. Vérifiez votre réseau et réessayez.";
const GENERIC_ERROR =
  "Une erreur est survenue. Réessayez dans un instant ou appelez le 07 83 51 17 41.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Le formulaire est rendu par le serveur ; la clôture n'est testée qu'après l'hydratation
 *  (la page est mise en cache 24 h). */
const subscribeNone = () => () => {};

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

const inputClass =
  "block h-12 w-full scroll-mt-28 rounded-lg border-2 border-[#8a5a3c] bg-white px-3.5 text-base text-[#2b0b12] placeholder:text-[#6b4a3a] focus:outline-none focus-visible:border-[#7c0e37] focus-visible:ring-4 focus-visible:ring-[#7c0e37]/25 aria-[invalid=true]:border-[#b00020] aria-[invalid=true]:bg-[#fff5f5]";

const choiceClass =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 border-[#e6c9a8] bg-[#fff8ee] px-3.5 py-2.5 text-base leading-snug text-[#2b0b12] transition-colors hover:border-[#c98a55] has-[:checked]:border-[#7c0e37] has-[:checked]:bg-[#ffe6c8] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#7c0e37]/25";

const checkboxClass = "size-6 shrink-0 cursor-pointer accent-[#7c0e37]";

const stepperButtonClass =
  "inline-flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-[#8a5a3c] bg-white text-[#2b0b12] transition-colors hover:bg-[#ffe6c8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7c0e37]/25 disabled:cursor-not-allowed disabled:opacity-40";

/* -------------------------------------------------------------------------- */
/*  Petits composants                                                          */
/* -------------------------------------------------------------------------- */

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-[#b00020]">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

function Optional() {
  return <span className="font-normal whitespace-nowrap text-[#6b4a3a]"> (facultatif)</span>;
}

function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: (describedBy: string | undefined) => ReactNode;
  className?: string;
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[0.95rem] font-bold text-[#2b0b12]">
        {label}
        {optional && <Optional />}
      </label>
      {hint && (
        <p id={hintId} className="mb-1.5 text-sm text-[#6b4a3a]">
          {hint}
        </p>
      )}
      {children(describedBy || undefined)}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formulaire                                                                 */
/* -------------------------------------------------------------------------- */

export function RencontreHarmonies2026Form({ event }: { event: FreeEventConfig }) {
  const uid = useId().replace(/:/g, "");
  const idOf = (key: string) => `rh-${uid}-${key}`;

  const closedByClock = useSyncExternalStore(
    subscribeNone,
    () => isEventClosed(event),
    () => false
  );
  const [closedByServer, setClosedByServer] = useState(false);
  const closed = closedByClock || closedByServer;

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [interests, setInterests] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [website, setWebsite] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [confirmedSize, setConfirmedSize] = useState(1);
  const [focusRequest, setFocusRequest] = useState<{ key: FieldKey; n: number } | null>(null);

  const successRef = useRef<HTMLDivElement>(null);
  const submitting = status === "submitting";
  const max = event.form.maxPartySize;

  // Déplace le focus sur le premier champ en erreur, une fois les attributs ARIA à jour.
  useEffect(() => {
    if (!focusRequest) return;
    const targetId =
      focusRequest.key === "interests" ? idOf("interests-0") : idOf(focusRequest.key);
    document.getElementById(targetId)?.focus();
  }, [focusRequest]);

  // Message de succès : focus + défilement pour que le lecteur d'écran l'annonce.
  useEffect(() => {
    if (status !== "success") return;
    successRef.current?.focus();
    successRef.current?.scrollIntoView({ block: "center" });
  }, [status]);

  function parsedSize(): number | null {
    const trimmed = partySize.trim();
    if (!/^\d{1,2}$/.test(trimmed)) return null;
    const n = Number(trimmed);
    return n >= 1 && n <= max ? n : null;
  }

  function validate(): FieldErrors {
    const found: FieldErrors = {};
    if (!lastName.trim()) found.lastName = "Indiquez votre nom.";
    if (!firstName.trim()) found.firstName = "Indiquez votre prénom.";
    if (!EMAIL_PATTERN.test(email.trim())) found.email = "Indiquez une adresse e-mail valide.";
    if (parsedSize() === null)
      found.partySize = `Indiquez un nombre de personnes entre 1 et ${max}.`;
    return found;
  }

  function firstInvalid(found: FieldErrors): FieldKey | null {
    const order: FieldKey[] = [
      "lastName",
      "firstName",
      "email",
      "partySize",
      "interests",
      "source",
    ];
    return order.find((key) => found[key]) ?? null;
  }

  function adjustSize(delta: number) {
    const current = parsedSize() ?? 1;
    const next = Math.min(max, Math.max(1, current + delta));
    setPartySize(String(next));
    setErrors((prev) => ({ ...prev, partySize: undefined }));
  }

  function toggleInterest(code: string) {
    setInterests((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setGlobalError("");
    const found = validate();
    setErrors(found);
    const invalid = firstInvalid(found);
    if (invalid) {
      setFocusRequest({ key: invalid, n: Date.now() });
      return;
    }

    const size = parsedSize() ?? 1;
    setStatus("submitting");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: event.slug,
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          email: email.trim(),
          partySize: size,
          interests,
          source: source || null,
          newsletterOptIn,
          website,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as ReservationResponse;

      if (response.status === 201 && data.success !== false) {
        setConfirmedSize(typeof data.partySize === "number" ? data.partySize : size);
        setStatus("success");
        return;
      }

      setStatus("idle");

      if (response.status === 400 && data.fields && Object.keys(data.fields).length > 0) {
        setErrors(data.fields);
        const invalidKey = firstInvalid(data.fields);
        if (invalidKey) setFocusRequest({ key: invalidKey, n: Date.now() });
        return;
      }

      if (response.status === 410) setClosedByServer(true);
      setGlobalError(data.error || GENERIC_ERROR);
    } catch {
      setStatus("idle");
      setGlobalError(NETWORK_ERROR);
    }
  }

  /* ----------------------------- États alternatifs ---------------------------- */

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border-2 border-[#7c0e37] bg-[#fff8ee] p-6 text-center text-[#2b0b12] outline-none focus-visible:ring-4 focus-visible:ring-[#7c0e37]/25 sm:p-8"
      >
        <span className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#d93a1c] to-[#7c0e37] text-white shadow-lg">
          <PartyPopper className="size-8" aria-hidden="true" />
        </span>
        <p className="text-xl leading-snug font-bold sm:text-2xl">
          {formatSuccessMessage(event, confirmedSize)}
        </p>
      </div>
    );
  }

  if (closed) {
    return (
      <div className="rounded-2xl border-2 border-[#7c0e37] bg-[#fff8ee] p-6 text-center text-[#2b0b12] sm:p-8">
        <p className="text-lg leading-snug font-bold sm:text-xl">{event.closedMessage}</p>
      </div>
    );
  }

  /* --------------------------------- Formulaire -------------------------------- */

  const interestsErrorId = idOf("interests-error");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
      className="relative space-y-5 text-[#2b0b12] [color-scheme:light] md:space-y-6"
    >
      <p className="text-sm text-[#6b4a3a]">
        Tous les champs sont requis, sauf ceux marqués « facultatif ».
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={idOf("lastName")} label="Nom" error={errors.lastName}>
          {(describedBy) => (
            <input
              id={idOf("lastName")}
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={errors.lastName ? true : undefined}
              aria-describedby={describedBy}
              maxLength={80}
              className={inputClass}
            />
          )}
        </Field>
        <Field id={idOf("firstName")} label="Prénom" error={errors.firstName}>
          {(describedBy) => (
            <input
              id={idOf("firstName")}
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              aria-invalid={errors.firstName ? true : undefined}
              aria-describedby={describedBy}
              maxLength={80}
              className={inputClass}
            />
          )}
        </Field>
      </div>

      <Field
        id={idOf("email")}
        label="E-mail"
        hint="Pour recevoir la confirmation de votre réservation."
        error={errors.email}
      >
        {(describedBy) => (
          <input
            id={idOf("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy}
            maxLength={200}
            className={inputClass}
          />
        )}
      </Field>

      <Field
        id={idOf("partySize")}
        label="Nombre de personnes, enfants compris"
        error={errors.partySize}
      >
        {(describedBy) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustSize(-1)}
              disabled={(parsedSize() ?? 1) <= 1}
              aria-label="Une personne de moins"
              className={stepperButtonClass}
            >
              <Minus className="size-5" aria-hidden="true" />
            </button>
            <input
              id={idOf("partySize")}
              name="partySize"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              aria-invalid={errors.partySize ? true : undefined}
              aria-describedby={describedBy}
              maxLength={2}
              className={cn(inputClass, "w-20 text-center font-bold")}
            />
            <button
              type="button"
              onClick={() => adjustSize(1)}
              disabled={(parsedSize() ?? 1) >= max}
              aria-label="Une personne de plus"
              className={stepperButtonClass}
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </Field>

      <fieldset
        className="min-w-0 border-0 p-0"
        aria-describedby={errors.interests ? interestsErrorId : undefined}
      >
        <legend className="mb-2 p-0 text-[0.95rem] font-bold text-[#2b0b12]">
          {event.form.interestsLegend}
          <Optional />
        </legend>
        <div className="grid gap-2.5 md:grid-cols-2">
          {event.form.interests.map((option, index) => (
            <label key={option.code} className={choiceClass}>
              <input
                id={idOf(`interests-${index}`)}
                type="checkbox"
                name="interests"
                value={option.code}
                checked={interests.includes(option.code)}
                onChange={() => toggleInterest(option.code)}
                className={checkboxClass}
              />
              <span className="leading-6">{tidy(option.label)}</span>
            </label>
          ))}
        </div>
        <FieldError id={interestsErrorId} message={errors.interests} />
      </fieldset>

      <Field
        id={idOf("source")}
        label={nbspPunctuation(event.form.sourceLabel)}
        optional
        error={errors.source}
      >
        {(describedBy) => (
          <div className="relative">
            <select
              id={idOf("source")}
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-invalid={errors.source ? true : undefined}
              aria-describedby={describedBy}
              className={cn(inputClass, "appearance-none pr-10")}
            >
              <option value="">Choisir…</option>
              {event.form.sources.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-[#2b0b12]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 7.5 5 5 5-5" />
            </svg>
          </div>
        )}
      </Field>

      <label className={choiceClass}>
        <input
          type="checkbox"
          name="newsletterOptIn"
          checked={newsletterOptIn}
          onChange={(e) => setNewsletterOptIn(e.target.checked)}
          className={checkboxClass}
        />
        <span className="text-[0.95rem] leading-6">{tidy(event.form.newsletterLabel)}</span>
      </label>

      {/* Champ piège : invisible et inaccessible pour les humains et les lecteurs d'écran. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden"
      >
        <label>
          Site web
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div>
        {globalError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border-2 border-[#b00020] bg-[#fff5f5] px-3.5 py-3 text-base font-semibold text-[#8a0019]"
          >
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <span>{globalError}</span>
          </p>
        )}
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="group block w-full -skew-x-12 rounded-md bg-gradient-to-r from-[#d93a1c] to-[#7c0e37] shadow-[5px_5px_0_#2b0b12] transition-all duration-200 hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_#2b0b12] focus:outline-none focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#2b0b12] disabled:cursor-wait disabled:opacity-75 disabled:shadow-[3px_3px_0_#2b0b12]"
        >
          <span className="flex min-h-14 skew-x-12 items-center justify-center gap-2.5 px-6 py-3 font-[family-name:var(--font-heading)] text-xl font-bold tracking-wide text-white uppercase italic">
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                Envoi…
              </>
            ) : (
              <>
                {event.form.submitLabel}
                <ArrowRight
                  className="size-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </>
            )}
          </span>
        </button>
        <p className="mt-4 text-xs leading-relaxed text-[#5a3a2a]">
          {tidy(event.form.privacyNotice)}
        </p>
      </div>
    </form>
  );
}
