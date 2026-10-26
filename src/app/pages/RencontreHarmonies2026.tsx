import { ArrowRight, ExternalLink, Mail, Music, Navigation, Phone, Ticket } from "lucide-react";
import type { ReactNode } from "react";
import { ScrollReveal } from "@/app/components/ScrollReveal";
import { SITE_NAME, SITE_URL } from "@/app/seo";
import { RENCONTRE_HARMONIES_2026 } from "@/lib/free-events";
import { cn } from "@/lib/utils";
import { StickyReserveBar } from "./RencontreHarmonies2026Client";
import { tidy } from "./RencontreHarmonies2026Typo";
import { RencontreHarmonies2026Form } from "./RencontreHarmonies2026Form";

/* -------------------------------------------------------------------------- */
/*  Direction visuelle : l'affiche du concert                                  */
/*  Orange papier, bandeaux inclinés rouge → bordeaux, texte blanc italique.   */
/*  Couleurs fixes (identiques en mode clair et sombre) : c'est une affiche.   */
/* -------------------------------------------------------------------------- */

const ASSETS = "/images/rencontre-harmonies-2026";
const HERO_CTA_ID = "rencontre-hero-cta";
const FORM_ID = "reserver";

const event = RENCONTRE_HARMONIES_2026;

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${event.venue.name}, ${event.venue.streetAddress}, ${event.venue.postalCode} ${event.venue.city}`
)}`;

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: event.title,
  description: event.intro,
  startDate: event.startsAt,
  endDate: "2026-11-14T18:00:00+01:00",
  doorTime: "2026-11-14T14:30:00+01:00",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  isAccessibleForFree: true,
  inLanguage: "fr",
  image: [`${SITE_URL}${ASSETS}/og.jpg`],
  location: {
    "@type": "Place",
    name: event.venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: event.venue.streetAddress,
      postalCode: event.venue.postalCode,
      addressLocality: event.venue.city,
      addressCountry: "FR",
    },
  },
  performer: event.form.interests
    .filter((option) => option.code !== "curiosite")
    .map((option) => ({ "@type": "MusicGroup", name: option.label })),
  organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  offers: {
    "@type": "Offer",
    price: 0,
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}${event.path}`,
  },
};

/* -------------------------------------------------------------------------- */
/*  Styles                                                                     */
/* -------------------------------------------------------------------------- */

/** Même gouttière et même largeur maximale que le header : les bords gauches s'alignent. */
const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[88rem]";

/** Dégradé des bandeaux : rouge → bordeaux. Blanc dessus : contraste ≥ 4,6:1. */
const bandGradient = "bg-gradient-to-r from-[#d93a1c] to-[#7c0e37]";

const headingFont = "font-[family-name:var(--font-heading)]";

/** Entrée orchestrée du hero. */
const enter = "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards";

/**
 * Diaporama du hero. La première photo reste toujours en dessous, visible dès le rendu serveur
 * (c'est le LCP) ; les trois autres se superposent à tour de rôle (voir `hero-carousel-slide`
 * dans styles.css). Le décalage entre deux photos doit rester égal à `HERO_SLIDE_STEP`, qui
 * correspond au cycle de 25,2 s de l'animation (4 × 6 s + 1,2 s de fondu).
 */
const HERO_SLIDE_STEP = 6;
const HERO_SLIDES = [
  { name: "orchestre-plein-air", height: 675, position: "object-[70%_50%]" },
  // Cadrage à gauche : garde le chef d'orchestre en dehors de la découpe en biais (desktop).
  { name: "orchestre-salle", height: 600, position: "object-[0%_50%]" },
  { name: "orchestre-scene", height: 777, position: "object-[50%_50%]" },
  { name: "orchestre-saxophones", height: 981, position: "object-[50%_35%]" },
] as const;

/** Grain de papier : bruit SVG en data URI (img-src data: autorisé par la CSP). */
const PAPER_GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .55 0 0 0 0 .25 0 0 0 0 .05 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** Bord de papier déchiré, généré une fois (déterministe, donc identique serveur/client). */
function tornPath(seed: number, base: number, amplitude: number): string {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const parts = [`M0 40 L0 ${base}`];
  let x = 0;
  while (x < 1200) {
    x = Math.min(1200, x + 7 + rand() * 20);
    parts.push(`L${x.toFixed(0)} ${(base - amplitude / 2 + rand() * amplitude).toFixed(0)}`);
  }
  parts.push("L1200 40 Z");
  return parts.join(" ");
}

const TORN_BACK = tornPath(7, 14, 16);
const TORN_FRONT = tornPath(31, 22, 14);

function TornEdge({ fill, rim }: { fill: string; rim: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full sm:h-10"
    >
      <path d={TORN_BACK} fill={rim} />
      <path d={TORN_FRONT} fill={fill} />
    </svg>
  );
}

function PaperBackground() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[#f5921e] bg-[radial-gradient(ellipse_at_85%_0%,#ffb84d_0,transparent_55%),radial-gradient(ellipse_at_0%_100%,#e46f17_0,transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60 mix-blend-multiply"
        style={{ backgroundImage: PAPER_GRAIN }}
      />
    </>
  );
}

function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="mb-7">
      <h2
        id={id}
        className="text-3xl leading-none font-bold tracking-tight text-[#7c0e37] uppercase italic sm:text-4xl"
      >
        {children}
      </h2>
      <span
        aria-hidden="true"
        className="mt-3 block h-1.5 w-24 -skew-x-12 bg-gradient-to-r from-[#d93a1c] to-[#f5921e]"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export function RencontreHarmonies2026() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="relative isolate overflow-hidden text-[#2b0b12]">
        <PaperBackground />

        <div
          className={cn(
            container,
            "grid pb-16 sm:pb-20 lg:grid-cols-2 lg:items-stretch lg:gap-x-12 lg:py-14 xl:gap-x-16"
          )}
        >
          {/* Photo + « CONCERT » : en tête sur mobile, à droite sur desktop */}
          <div
            className={cn(
              enter,
              "relative order-first -mx-4 flex flex-col [container-type:inline-size] sm:-mx-6 lg:order-last lg:mx-0 lg:justify-center"
            )}
            style={{ animationDelay: "0ms" }}
          >
            {/* Diaporama sans commande : fondu enchaîné en CSS pur (voir styles.css).
                Un seul message pour les lecteurs d'écran, les images sont décoratives. */}
            <div
              role="img"
              aria-label="Photos de concerts d'orchestres d'harmonie : musiciens en plein air, en salle, sur scène de nuit et ensemble de saxophones"
              className="hero-carousel relative aspect-[3/2] overflow-hidden bg-[#b82a1b] [clip-path:polygon(0_0,100%_0,100%_88%,0_100%)] sm:aspect-[2/1] lg:aspect-[3/2] lg:[clip-path:polygon(13%_0,100%_0,100%_100%,0_100%)]"
            >
              {HERO_SLIDES.map((slide, index) => (
                <img
                  key={slide.name}
                  src={`${ASSETS}/${slide.name}-640.webp`}
                  srcSet={`${ASSETS}/${slide.name}-640.webp 640w, ${ASSETS}/${slide.name}-1200.webp 1200w`}
                  sizes="(min-width: 1024px) 580px, 100vw"
                  alt=""
                  width={1200}
                  height={slide.height}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                  className={cn(
                    "absolute inset-0 size-full object-cover",
                    slide.position,
                    index > 0 && "hero-carousel-slide"
                  )}
                  style={index > 0 ? { animationDelay: `${index * HERO_SLIDE_STEP}s` } : undefined}
                />
              ))}
              {/* Voile chaud orange → magenta, comme sur l'affiche */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-br from-[#b82a1b]/55 via-[#a81c55]/35 to-[#f5921e]/35"
              />
            </div>
            <p
              aria-hidden="true"
              className={cn(
                headingFont,
                "relative z-10 -mt-[0.5em] text-center text-[min(18.5cqw,6.5rem)] leading-[0.95] font-bold tracking-[-0.03em] whitespace-nowrap text-white uppercase italic [-webkit-text-stroke:0.03em_white] [text-shadow:0_0.05em_0_rgba(124,14,55,0.4),0_0.12em_0.3em_rgba(43,11,18,0.35)] lg:pl-[8%]"
              )}
            >
              Concert
            </p>
          </div>

          <div className="relative z-10 pt-2 lg:flex lg:flex-col lg:justify-center lg:pt-0">
            <h1
              className={cn(
                enter,
                bandGradient,
                "-ml-5 w-fit max-w-[calc(100%+1.25rem)] py-3.5 pr-12 pl-9 text-[2.15rem] leading-[1.02] font-bold tracking-tight text-white uppercase italic shadow-lg [clip-path:polygon(1.1rem_0,100%_0,calc(100%-1.1rem)_100%,0_100%)] sm:-ml-7 sm:pl-11 sm:text-5xl lg:ml-0 lg:text-[3.2rem] xl:text-6xl"
              )}
              style={{ animationDelay: "120ms" }}
            >
              {event.title}
            </h1>

            <p
              className={cn(
                enter,
                headingFont,
                "mt-2 -mr-5 ml-4 bg-gradient-to-r from-[#7c0e37] to-[#c8301a] py-3 pr-7 pl-8 text-[0.9rem] leading-snug font-bold tracking-wide text-white uppercase italic [clip-path:polygon(1.1rem_0,100%_0,100%_100%,0_100%)] sm:-mr-7 sm:text-xl lg:mr-0 lg:w-fit lg:max-w-full lg:pr-12 lg:text-base xl:text-xl lg:[clip-path:polygon(1.1rem_0,100%_0,calc(100%-1.1rem)_100%,0_100%)]"
              )}
              style={{ animationDelay: "220ms" }}
            >
              <span className="block text-balance">{tidy(event.dateLabel, 3)}</span>
              <span className="sr-only"> · </span>
              <span className="block text-[0.85em] text-balance">{tidy(event.placeLabel)}</span>
            </p>

            {/* Centré dans la colonne ; la rotation se fait autour du centre de la pastille. */}
            <div className="mt-6 flex justify-center">
              <p
                className={cn(
                  enter,
                  "inline-flex max-w-full -rotate-2 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm leading-tight font-extrabold tracking-wide text-[#c2410c] uppercase shadow-[0_5px_0_rgba(124,14,55,0.45)] sm:text-base"
                )}
                style={{ animationDelay: "320ms" }}
              >
                <Ticket className="size-5 shrink-0" aria-hidden="true" />
                {event.admissionLabel}
              </p>
            </div>

            <p
              className={cn(
                enter,
                "mt-6 max-w-xl text-lg leading-relaxed font-medium text-[#2b0b12] md:max-w-2xl lg:max-w-xl"
              )}
              style={{ animationDelay: "420ms" }}
            >
              {tidy(event.intro)}
            </p>

            <div
              className={cn(enter, "mt-8 flex justify-center")}
              style={{ animationDelay: "520ms" }}
            >
              <a
                id={HERO_CTA_ID}
                href={`#${FORM_ID}`}
                className="group mr-[7px] inline-block -skew-x-12 rounded-md bg-gradient-to-r from-[#d93a1c] to-[#7c0e37] shadow-[6px_6px_0_#2b0b12] transition-all duration-200 hover:translate-x-px hover:translate-y-px hover:shadow-[4px_4px_0_#2b0b12] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#2b0b12]"
              >
                <span
                  className={cn(
                    headingFont,
                    "inline-flex min-h-14 skew-x-12 items-center gap-3 px-8 py-3 text-2xl font-bold tracking-wide text-white uppercase italic"
                  )}
                >
                  Je réserve
                  <ArrowRight
                    className="size-6 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </div>
          </div>
        </div>

        <TornEdge fill="#fff1dc" rim="#ffd49a" />
      </section>

      {/* ───────────────────────────── Programme & infos ───────────────────────────── */}
      <section className="bg-[#fff1dc] pt-8 pb-16 text-[#2b0b12] md:pt-12 md:pb-24">
        <div className={cn(container, "grid gap-12 lg:grid-cols-12 lg:gap-x-14")}>
          <div className="flex flex-col lg:col-span-7">
            <SectionTitle id="programme">Programme</SectionTitle>
            <ol aria-labelledby="programme" className="flex flex-1 flex-col gap-2.5">
              {event.program.map((item) => (
                <li key={item.time} className="flex flex-1">
                  <div className="flex w-full items-stretch shadow-[0_6px_16px_-10px_rgba(124,14,55,0.5)]">
                    <span
                      className={cn(
                        headingFont,
                        bandGradient,
                        "flex w-[5.25rem] shrink-0 items-center justify-center py-3 pr-3 text-xl font-bold text-white italic [clip-path:polygon(0_0,100%_0,calc(100%-0.8rem)_100%,0_100%)] sm:w-28 sm:text-2xl"
                      )}
                    >
                      {item.time}
                    </span>
                    <span className="flex flex-1 items-center bg-white/75 py-3 pr-3 pl-3 text-sm leading-snug font-bold tracking-wide text-[#2b0b12] uppercase sm:pl-4 sm:text-base">
                      <span>{tidy(item.label)}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col lg:col-span-5">
            <SectionTitle id="infos">Infos pratiques</SectionTitle>
            <dl
              aria-labelledby="infos"
              className="divide-y divide-[#f0cfa6] flex-1 rounded-2xl bg-white p-5 shadow-[0_14px_34px_-16px_rgba(124,14,55,0.45)] ring-1 ring-[#f0cfa6] sm:p-6"
            >
              <div className="pb-4">
                <dt className="text-xs font-bold tracking-[0.16em] text-[#7c0e37] uppercase">
                  Adresse
                </dt>
                <dd className="mt-1.5 leading-relaxed">
                  <address className="not-italic">
                    <span className="font-bold">{event.venue.name}</span>
                    <br />
                    {event.venue.streetAddress}
                    <br />
                    {event.venue.postalCode} {event.venue.city}
                  </address>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center gap-2 font-semibold text-[#7c0e37] underline underline-offset-4 hover:text-[#d93a1c]"
                  >
                    <Navigation className="size-4" aria-hidden="true" />
                    Itinéraire
                    <ExternalLink className="size-3.5 opacity-70" aria-hidden="true" />
                    <span className="sr-only">(s'ouvre dans un nouvel onglet)</span>
                  </a>
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-xs font-bold tracking-[0.16em] text-[#7c0e37] uppercase">
                  Stationnement
                </dt>
                <dd className="mt-1.5 leading-relaxed first-letter:uppercase">
                  {tidy(event.parking)}
                </dd>
              </div>
              <div className="py-4">
                <dt className="text-xs font-bold tracking-[0.16em] text-[#7c0e37] uppercase">
                  Réservation
                </dt>
                <dd className="mt-1.5 leading-relaxed first-letter:uppercase">
                  {tidy(event.reservationInfo)}
                </dd>
              </div>
              <div className="pt-4">
                <dt className="text-xs font-bold tracking-[0.16em] text-[#7c0e37] uppercase">
                  Renseignements
                </dt>
                <dd className="mt-1.5 flex flex-col items-start">
                  <a
                    href={event.contact.phoneHref}
                    className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#7c0e37] underline underline-offset-4 hover:text-[#d93a1c]"
                  >
                    <Phone className="size-4 shrink-0" aria-hidden="true" />
                    {event.contact.phone}
                  </a>
                  <a
                    href={`mailto:${event.contact.email}`}
                    className="inline-flex min-h-11 items-center gap-2 text-[0.95rem] font-semibold [overflow-wrap:anywhere] text-[#7c0e37] sm:text-base underline underline-offset-4 hover:text-[#d93a1c]"
                  >
                    <Mail className="size-4 shrink-0" aria-hidden="true" />
                    {event.contact.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Vous jouez d'un instrument ? ───────────────────────────── */}
      <div className="bg-[linear-gradient(to_bottom,#fff1dc_50%,#f5921e_50%)]">
        <section
          aria-labelledby="rejoindre"
          className="relative isolate overflow-hidden bg-gradient-to-br from-[#b82a1b] via-[#8f1740] to-[#5e0b2c] py-20 text-white [clip-path:polygon(0_2.5rem,100%_0,100%_calc(100%-2.5rem),0_100%)] sm:py-24 sm:[clip-path:polygon(0_4rem,100%_0,100%_calc(100%-4rem),0_100%)]"
        >
          <Music
            className="absolute -right-6 bottom-2 -z-10 size-56 -rotate-12 text-white/10 sm:size-72"
            aria-hidden="true"
          />
          <div className={container}>
            <ScrollReveal>
              <h2
                id="rejoindre"
                className="max-w-3xl text-3xl leading-[1.05] font-bold tracking-tight text-balance uppercase italic sm:text-5xl"
              >
                {event.joinTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white sm:text-xl">
                {tidy(event.joinText)}
              </p>
            </ScrollReveal>
          </div>
        </section>
      </div>

      {/* ───────────────────────────── Réservation ───────────────────────────── */}
      <section
        id={FORM_ID}
        aria-labelledby="reserver-titre"
        className="relative isolate scroll-mt-20 overflow-hidden pb-16 text-[#2b0b12] md:pb-24"
      >
        <PaperBackground />

        {/* Bandeau de photos des orchestres, découpé en diagonales comme sur l'affiche */}
        <picture>
          <source
            media="(min-width: 768px)"
            srcSet={`${ASSETS}/bandeau-1200.webp`}
            type="image/webp"
          />
          <img
            src={`${ASSETS}/bandeau-700.webp`}
            alt=""
            width={1200}
            height={123}
            loading="lazy"
            decoding="async"
            className="mx-auto block h-24 w-full max-w-[1500px] object-cover sm:h-28 md:h-auto"
          />
        </picture>

        <div className={cn(container, "max-w-3xl pt-10 md:pt-12 2xl:max-w-3xl")}>
          {/* Bandeau centré sur la carte du formulaire : padding symétrique, découpe symétrique. */}
          <div className="flex justify-center">
            <h2
              id="reserver-titre"
              className={cn(
                bandGradient,
                "max-w-full px-8 py-3 text-center text-[1.4rem] leading-tight font-bold tracking-tight text-white uppercase italic shadow-lg [clip-path:polygon(1.1rem_0,100%_0,calc(100%-1.1rem)_100%,0_100%)] min-[390px]:px-10 min-[390px]:text-2xl sm:px-12 sm:text-4xl"
              )}
            >
              Réserver vos places
            </h2>
          </div>

          <div className="mt-8 rounded-2xl bg-white p-5 shadow-[8px_8px_0_rgba(124,14,55,0.9)] sm:p-8">
            <RencontreHarmonies2026Form event={event} />
          </div>
        </div>
      </section>

      <StickyReserveBar event={event} heroTargetId={HERO_CTA_ID} formTargetId={FORM_ID} />
    </>
  );
}
