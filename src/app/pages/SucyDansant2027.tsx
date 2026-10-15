import {
  ArrowRight,
  CalendarDays,
  Clock,
  DoorOpen,
  ExternalLink,
  Mail,
  MapPin,
  Mic,
  Music,
  Navigation,
  Ticket,
  Users,
  Wine,
} from "lucide-react";
import type { ReactNode } from "react";
import { ScrollReveal } from "@/app/components/ScrollReveal";
import { SITE_NAME, SITE_URL } from "@/app/seo";
import { cn } from "@/lib/utils";
import { StickyBookingBar, SucyDansant2027Video } from "./SucyDansant2027Client";

/* -------------------------------------------------------------------------- */
/*  Données de l'événement — source unique pour le rendu ET le JSON-LD         */
/* -------------------------------------------------------------------------- */

const ASSETS = "/images/sucy-dansant-2027";

const EVENT = {
  name: "Sucy Dansant 2027",
  subtitle: "Thé dansant concert",
  tagline: "Nouvelle version avec animateur",
  dateLabel: "Dimanche 31 janvier 2027",
  dateShort: "Dim. 31 janvier · 14h",
  startDate: "2027-01-31T14:00:00+01:00",
  endDate: "2027-01-31T18:00:00+01:00",
  doorTime: "2027-01-31T13:30:00+01:00",
  startLabel: "14h",
  endLabel: "18h",
  doorLabel: "13h30",
  description:
    "Thé dansant concert avec l'Harmonie Municipale de Sucy-en-Brie (40 musiciens) et ProviDanse, couple de danseurs professionnels, animateurs et DJ. Danses en ligne, bachata, kuduro, madison, salsa, rock, pop, disco, tango, country. Pause gourmande offerte.",
  venue: {
    name: "Espace Jean-Marie Poirier",
    street: "1 esplanade du 18 Juin 1940",
    postalCode: "94370",
    city: "Sucy-en-Brie",
  },
  bookingUrl:
    "https://www.helloasso.com/associations/les-amis-de-l-harmonie/evenements/the-dansant-2027-sucy-en-brie",
  contactEmail: "contact@amis-harmonie-sucy.fr",
  images: [`${SITE_URL}${ASSETS}/og.jpg`, `${SITE_URL}${ASSETS}/hero-1600.webp`],
  performers: ["Harmonie Municipale de Sucy-en-Brie", "ProviDanse"],
  dances: [
    "Danses en ligne",
    "Bachata",
    "Kuduro",
    "Madison",
    "Salsa",
    "Rock",
    "Pop",
    "Disco",
    "Tango",
    "Country",
  ],
  prices: [
    {
      label: "Tarif classique",
      detail: null,
      amount: 25,
    },
    {
      label: "Adhérent Les Amis de l'Harmonie",
      detail: "Adhésion 2026-2027",
      amount: 15,
      link: { href: "/adhesion", label: "Adhérer" },
    },
    {
      label: "Danseur en club",
      detail: "Un justificatif pourra vous être demandé",
      amount: 20,
    },
    {
      label: "Adhérent d'une association partenaire",
      detail:
        "Club Montaleau, Confrérie des Coteaux, SLA, Kifékoi? · Un justificatif pourra vous être demandé",
      amount: 20,
    },
    {
      label: "Enfant",
      detail: "Moins de 18 ans",
      amount: 10,
    },
  ],
} as const;

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${EVENT.venue.name}, ${EVENT.venue.street}, ${EVENT.venue.postalCode} ${EVENT.venue.city}`
)}`;

const PRICE_VALUES = EVENT.prices.map((p) => p.amount);

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: EVENT.name,
  description: EVENT.description,
  startDate: EVENT.startDate,
  endDate: EVENT.endDate,
  doorTime: EVENT.doorTime,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  inLanguage: "fr",
  image: EVENT.images,
  location: {
    "@type": "Place",
    name: EVENT.venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: EVENT.venue.street,
      postalCode: EVENT.venue.postalCode,
      addressLocality: EVENT.venue.city,
      addressCountry: "FR",
    },
  },
  performer: EVENT.performers.map((name) => ({
    "@type": name === "ProviDanse" ? "PerformingGroup" : "MusicGroup",
    name,
  })),
  organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  offers: {
    "@type": "AggregateOffer",
    lowPrice: Math.min(...PRICE_VALUES),
    highPrice: Math.max(...PRICE_VALUES),
    priceCurrency: "EUR",
    offerCount: EVENT.prices.length,
    url: EVENT.bookingUrl,
    availability: "https://schema.org/InStock",
  },
};

/* -------------------------------------------------------------------------- */
/*  Styles partagés                                                            */
/* -------------------------------------------------------------------------- */

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-fuchsia-600 px-7 py-3.5 text-lg font-bold text-white shadow-lg shadow-fuchsia-950/30 ring-1 ring-white/20 transition duration-200 hover:-translate-y-0.5 hover:bg-fuchsia-700 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400 active:translate-y-0";

const btnGhostDark =
  "inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-full border border-violet-300 bg-transparent px-5 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-400/40 dark:text-violet-200 dark:hover:bg-violet-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

const accentText = "text-violet-700 dark:text-fuchsia-300";

const card =
  "rounded-2xl border border-violet-100 bg-card p-6 shadow-sm dark:border-border dark:shadow-none";

function SectionHeading({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 max-w-2xl", className)}>
      <p className={cn("mb-3 text-sm font-bold tracking-[0.18em] uppercase", accentText)}>
        {eyebrow}
      </p>
      <h2 className="text-3xl leading-tight font-bold text-foreground sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {children && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {children}
        </p>
      )}
    </div>
  );
}

function BookingLink({
  className,
  children = "Réserver ma place",
  id,
}: {
  className?: string;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <a
      id={id}
      href={EVENT.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? btnPrimary}
    >
      {children}
      <ArrowRight className="size-5" aria-hidden="true" />
      <span className="sr-only"> (s'ouvre sur HelloAsso, dans un nouvel onglet)</span>
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

const HIGHLIGHT_DANCES = [
  { name: "Bachata", note: "ensoleillée" },
  { name: "Kuduro", note: "énergique" },
  { name: "Country", note: "conviviale" },
  { name: "Madison", note: "incontournable" },
];

const OTHER_DANCES = EVENT.dances.filter(
  (d) => !HIGHLIGHT_DANCES.some((h) => h.name === d) && d !== "Danses en ligne"
);

const STATS = [
  { value: "4 h", label: "de danse, de 14h à 18h" },
  { value: "40", label: "musiciens de l'Harmonie, en live" },
  { value: "10", label: "styles de danse au programme" },
  { value: "Offerte", label: "la pause gourmande" },
];

const PERKS = [
  {
    icon: Wine,
    title: "Pause gourmande offerte",
    text: "Pétillant, pâtisserie et fruit : on reprend son souffle, puis on retourne danser.",
  },
  {
    icon: Mic,
    title: "Un animateur sur la piste",
    text: "ProviDanse annonce la danse de chaque morceau et vous guide pas à pas.",
  },
  {
    icon: Users,
    title: "Taxi-danseurs",
    text: "Vous venez seul ? Des taxi-danseurs invitent les personnes présentes à danser.",
  },
  {
    icon: Ticket,
    title: "Tombola culturelle",
    text: "Des places de spectacles à gagner pendant l'après-midi.",
  },
];

export function SucyDansant2027() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#1b0a3f] text-white">
        <div className="relative lg:absolute lg:inset-y-0 lg:right-0 lg:w-[66%]">
          <picture className="contents">
            {/* Desktop : version recadrée sans le bandeau de texte de l'affiche */}
            <source
              media="(min-width: 1024px)"
              srcSet={`${ASSETS}/hero-lg-1000.webp 1000w, ${ASSETS}/hero-lg-1600.webp 1600w`}
              sizes="66vw"
              type="image/webp"
            />
            <img
              src={`${ASSETS}/hero-1600.webp`}
              srcSet={`${ASSETS}/hero-800.webp 800w, ${ASSETS}/hero-1600.webp 1600w`}
              sizes="100vw"
              alt="Un couple de danseurs en plein mouvement devant l'Harmonie Municipale de Sucy-en-Brie en concert"
              width={1600}
              height={1186}
              fetchPriority="high"
              decoding="async"
              className="aspect-[4/3] h-full w-full object-cover object-[30%_15%] sm:aspect-[16/9] lg:aspect-auto lg:object-[50%_40%]"
            />
          </picture>
          {/* Fondu vers le violet : en bas sur mobile, à gauche sur desktop */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#1b0a3f] via-[#1b0a3f]/30 to-transparent lg:bg-gradient-to-r lg:from-[#1b0a3f] lg:via-[#1b0a3f]/25 lg:to-transparent"
          />
        </div>

        <div className={cn(container, "relative -mt-20 pb-12 sm:-mt-28 lg:mt-0 lg:py-28")}>
          <div className="max-w-xl lg:min-h-[480px] lg:flex lg:flex-col lg:justify-center">
            <p className="mb-5 inline-flex w-fit flex-wrap items-center gap-x-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest uppercase backdrop-blur sm:text-sm">
              <span>{EVENT.subtitle}</span>
              <span aria-hidden="true" className="text-fuchsia-300">
                •
              </span>
              <span className="text-fuchsia-200">{EVENT.tagline}</span>
            </p>

            <h1 className="text-[3.6rem] leading-[0.92] font-bold tracking-tight text-white uppercase italic drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] sm:text-7xl lg:text-8xl">
              <span className="block">
                Sucy
                <span
                  aria-hidden="true"
                  className="ml-3 inline-block -rotate-3 rounded-lg bg-fuchsia-600 px-3 py-0.5 align-middle text-2xl tracking-wider shadow-lg sm:text-3xl"
                >
                  2027
                </span>
              </span>
              <span className="block">
                Dansant<span className="sr-only"> 2027</span>
              </span>
            </h1>

            <ul className="mt-7 space-y-2.5 text-base sm:text-lg">
              <li className="flex items-center gap-3">
                <CalendarDays className="size-5 shrink-0 text-fuchsia-300" aria-hidden="true" />
                <span className="font-semibold">{EVENT.dateLabel}</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="size-5 shrink-0 text-fuchsia-300" aria-hidden="true" />
                <span>
                  {EVENT.startLabel} – {EVENT.endLabel}
                  <span className="text-violet-200">
                    {" "}
                    · ouverture des portes à {EVENT.doorLabel}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-1 size-5 shrink-0 text-fuchsia-300" aria-hidden="true" />
                <span>
                  {EVENT.venue.name}
                  <span className="text-violet-200"> · {EVENT.venue.city}</span>
                </span>
              </li>
            </ul>

            <p className="mt-6 max-w-md text-base leading-relaxed text-violet-100">
              Un concert dansant avec l'Harmonie Municipale en live et le couple d'animateurs
              ProviDanse. Musique non-stop, pause gourmande offerte.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BookingLink id="sucy-dansant-hero-cta" />
              <a href="#tarifs" className={btnGhostDark}>
                Voir les tarifs
              </a>
            </div>
            <p className="mt-3 text-sm text-violet-200">
              Billetterie en ligne sur HelloAsso · de 10 € à 25 €
            </p>
          </div>
        </div>

        {/* Bandeau des danses, comme sur l'affiche */}
        <div className="relative border-y border-white/10 bg-gradient-to-r from-fuchsia-700 via-violet-700 to-indigo-800 py-3">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 text-center text-xs font-bold tracking-[0.14em] text-white uppercase sm:gap-x-0 sm:text-sm">
            {EVENT.dances.map((d, i) => (
              <li key={d} className="whitespace-nowrap">
                {i > 0 && (
                  <span aria-hidden="true" className="mx-3 hidden text-fuchsia-300 sm:inline">
                    ✦
                  </span>
                )}
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────────────────────── Le concept ───────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2 lg:gap-16")}>
          <ScrollReveal direction="left">
            <p className={cn("mb-3 text-sm font-bold tracking-[0.18em] uppercase", accentText)}>
              Le thé dansant de l'Harmonie
            </p>
            <h2 className="text-3xl leading-tight font-bold text-foreground sm:text-4xl md:text-5xl">
              Cette année, il fait peau neuve
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                Le thé dansant devient un concert dansant : plus rythmé, plus festif, plus
                entraînant. Sur la piste, un couple d'animateurs professionnels vous guide, et
                l'orchestre joue en live les grands classiques du thé dansant, revisités.
              </p>
              <p className="font-semibold text-foreground">
                Que vous veniez seul, entre amis ou en couple, vous trouverez forcément votre
                rythme&nbsp;!
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {STATS.map((s, i) => (
              <ScrollReveal key={s.label} staggerIndex={i} direction="scale">
                <div className="h-full rounded-2xl border border-violet-100 bg-violet-50 p-5 dark:border-border dark:bg-violet-950/40">
                  <p className="bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text font-[family-name:var(--font-heading)] text-3xl font-bold text-transparent sm:text-5xl dark:from-violet-300 dark:to-fuchsia-300">
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm leading-snug text-muted-foreground">{s.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Sur scène & sur la piste ───────────────────────────── */}
      <section className="bg-violet-50 py-16 md:py-24 dark:bg-violet-950/25">
        <div className={container}>
          <SectionHeading
            eyebrow="Sur scène et sur la piste"
            title="Un orchestre, deux animateurs"
          />

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-6 lg:col-span-5">
              <ScrollReveal direction="left">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-800 to-[#1b0a3f] p-6 text-white shadow-lg sm:p-8">
                  <Music
                    className="absolute -top-4 -right-4 size-32 text-white/10"
                    aria-hidden="true"
                  />
                  <h3 className="relative text-2xl font-bold">L'Harmonie Municipale, en live</h3>
                  <p className="relative mt-3 leading-relaxed text-violet-100">
                    L'orchestre de Sucy-en-Brie et ses 40 musiciens jouent les grands classiques du
                    thé dansant, revisités.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="left" delay={120}>
                <div className={card}>
                  <h3 className="text-2xl font-bold text-foreground">ProviDanse</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    Un couple de danseurs professionnels, animateurs et DJ, spécialistes des danses
                    en ligne. En quelques pas, ils vous embarquent.
                  </p>
                  <ul className="mt-4 space-y-2 text-muted-foreground">
                    {[
                      "Ils annoncent et montrent la danse de chaque morceau",
                      "Animation non-stop : pas de temps mort",
                      "Des démonstrations entre les morceaux",
                    ].map((t) => (
                      <li key={t} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2.5 size-1.5 shrink-0 rounded-full bg-fuchsia-500"
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            </div>

            {/* Photos ProviDanse */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7">
              <ScrollReveal direction="right" className="col-span-2">
                <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
                  <img
                    src={`${ASSETS}/providanse-swing.webp`}
                    alt="Les danseurs de ProviDanse en plein saut sur scène"
                    width={1000}
                    height={667}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/2] w-full object-cover"
                  />
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 transition-transform duration-300 hover:-rotate-1 hover:scale-[1.02]">
                  <img
                    src={`${ASSETS}/providanse-animateur.webp`}
                    alt="L'animateur de ProviDanse au micro"
                    width={800}
                    height={1000}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
              </ScrollReveal>
              <ScrollReveal delay={200}>
                <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5 transition-transform duration-300 hover:rotate-1 hover:scale-[1.02]">
                  <img
                    src={`${ASSETS}/providanse-dj.webp`}
                    alt="L'animateur de ProviDanse aux platines"
                    width={534}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/5] w-full object-cover object-top"
                  />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Danses ───────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className={container}>
          <SectionHeading eyebrow="Au programme" title="Dix styles de danse au programme">
            Bachata, kuduro, madison… et les danses en ligne, spécialité de ProviDanse. Les
            animateurs annoncent chaque danse et la montrent sur la piste.
          </SectionHeading>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {HIGHLIGHT_DANCES.map((d, i) => (
              <ScrollReveal key={d.name} staggerIndex={i}>
                <div className="group relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-600 via-violet-700 to-indigo-900 p-5 text-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6">
                  <p className="font-[family-name:var(--font-heading)] text-2xl font-bold uppercase italic sm:text-3xl">
                    {d.name}
                  </p>
                  <p className="mt-1 text-sm text-white sm:text-base">{d.note}</p>
                  <span
                    aria-hidden="true"
                    className="absolute -right-6 -bottom-6 size-24 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150"
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={150}>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {["Danses en ligne", ...OTHER_DANCES].map((d) => (
                <li
                  key={d}
                  className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-100"
                >
                  {d}
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      {/* ───────────────────────────── Inclus ───────────────────────────── */}
      <section className="bg-violet-50 py-16 md:py-24 dark:bg-violet-950/25">
        <div className={container}>
          <SectionHeading
            eyebrow="Pendant l'après-midi"
            title="Ce qui est prévu, en plus de la danse"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p, i) => (
              <ScrollReveal key={p.title} staggerIndex={i}>
                <div className={cn(card, "h-full")}>
                  <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-violet-700 text-white shadow">
                    <p.icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Tarifs ───────────────────────────── */}
      <section id="tarifs" className="scroll-mt-24 py-16 md:py-24">
        <div className={container}>
          <SectionHeading eyebrow="Tarifs" title="Réservez votre place">
            La billetterie est en ligne, sur HelloAsso. Choisissez le tarif qui vous correspond au
            moment de la réservation.
          </SectionHeading>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <ScrollReveal className="lg:col-span-7">
              <ul className="overflow-hidden rounded-2xl border border-violet-100 bg-card shadow-sm dark:border-border">
                {EVENT.prices.map((p) => (
                  <li
                    key={p.label}
                    className={cn(
                      "flex items-center justify-between gap-4 border-b border-dashed border-violet-200 px-5 py-4 last:border-b-0 sm:px-6 sm:py-5 dark:border-border",
                      "link" in p && "bg-fuchsia-50 dark:bg-fuchsia-500/10"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{p.label}</p>
                      {p.detail && (
                        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                          {p.detail}
                        </p>
                      )}
                      {"link" in p && (
                        <a
                          href={p.link.href}
                          className={cn(
                            "mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline",
                            accentText
                          )}
                        >
                          {p.link.label}
                          <ArrowRight className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                    <p
                      className={cn(
                        "shrink-0 font-[family-name:var(--font-heading)] text-3xl font-bold sm:text-4xl",
                        accentText
                      )}
                    >
                      {p.amount}&nbsp;€
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal delay={120} direction="right" className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-800 via-violet-900 to-[#1b0a3f] p-6 text-white shadow-xl sm:p-8">
                <span
                  aria-hidden="true"
                  className="absolute -top-12 -right-12 size-48 rounded-full bg-fuchsia-500/30 blur-2xl"
                />
                <h3 className="relative text-2xl font-bold">
                  Dimanche 31 janvier, de {EVENT.startLabel} à {EVENT.endLabel}
                </h3>
                <p className="relative mt-3 text-violet-100">
                  Réservation en ligne sur HelloAsso. Une question avant de réserver ? Écrivez-nous.
                </p>
                <div className="relative mt-6 flex flex-col gap-3">
                  <BookingLink className={cn(btnPrimary, "w-full")} />
                  <a
                    href={`mailto:${EVENT.contactEmail}`}
                    className={cn(btnGhostDark, "w-full px-4 text-sm sm:text-base")}
                  >
                    <Mail className="size-4 shrink-0" aria-hidden="true" />
                    {EVENT.contactEmail}
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Infos pratiques ───────────────────────────── */}
      <section className="bg-violet-50 py-16 md:py-24 dark:bg-violet-950/25">
        <div className={container}>
          <SectionHeading eyebrow="Infos pratiques" title="Quand et où" />
          <div className="grid gap-4 md:grid-cols-3">
            <ScrollReveal>
              <div className={cn(card, "h-full")}>
                <CalendarDays className={cn("mb-4 size-7", accentText)} aria-hidden="true" />
                <h3 className="text-lg font-bold text-foreground">{EVENT.dateLabel}</h3>
                <p className="mt-2 text-muted-foreground">
                  De {EVENT.startLabel} à {EVENT.endLabel}.
                </p>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <DoorOpen className="size-4 shrink-0" aria-hidden="true" />
                  Ouverture des portes à {EVENT.doorLabel}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className={cn(card, "h-full")}>
                <MapPin className={cn("mb-4 size-7", accentText)} aria-hidden="true" />
                <h3 className="text-lg font-bold text-foreground">{EVENT.venue.name}</h3>
                <address className="mt-2 text-muted-foreground not-italic">
                  {EVENT.venue.street}
                  <br />
                  {EVENT.venue.postalCode} {EVENT.venue.city}
                </address>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(btnOutline, "mt-4")}
                >
                  <Navigation className="size-4" aria-hidden="true" />
                  Itinéraire
                  <ExternalLink className="size-3.5 opacity-70" aria-hidden="true" />
                  <span className="sr-only">(s'ouvre dans un nouvel onglet)</span>
                </a>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className={cn(card, "h-full")}>
                <Mail className={cn("mb-4 size-7", accentText)} aria-hidden="true" />
                <h3 className="text-lg font-bold text-foreground">Une question ?</h3>
                <p className="mt-2 text-muted-foreground">
                  Écrivez-nous, l'équipe des Amis de l'Harmonie vous répond.
                </p>
                <a
                  href={`mailto:${EVENT.contactEmail}`}
                  className={cn(btnOutline, "mt-4 max-w-full break-all")}
                >
                  {EVENT.contactEmail}
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ───────────────────────────── Édition 2026 ───────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className={cn(container, "grid items-center gap-8 lg:grid-cols-12 lg:gap-12")}>
          <ScrollReveal className="lg:col-span-5">
            <p className={cn("mb-3 text-sm font-bold tracking-[0.18em] uppercase", accentText)}>
              Déjà venu, ou pas encore ?
            </p>
            <h2 className="text-3xl leading-tight font-bold text-foreground sm:text-4xl">
              L'ambiance du Thé Dansant 2026
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              La vidéo de l'édition 2026 vous donne une idée de l'ambiance. Cette année, la formule
              évolue : l'orchestre est rejoint par un couple d'animateurs sur la piste.
            </p>
            <a href="/the-dansant-2026" className={cn(btnOutline, "mt-6")}>
              Revivre le Thé Dansant 2026
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </ScrollReveal>
          <ScrollReveal delay={120} direction="right" className="lg:col-span-7">
            <SucyDansant2027Video id="8s0ZlxZ2RVM" title="Thé Dansant 2026 — vidéo de l'édition" />
          </ScrollReveal>
        </div>
      </section>

      {/* ───────────────────────────── Partenaires ───────────────────────────── */}
      <section className="border-y border-violet-100 bg-violet-50/60 py-14 dark:border-border dark:bg-violet-950/20">
        <div className={container}>
          <ScrollReveal>
            <p className="mb-8 text-center text-sm font-bold tracking-[0.18em] text-muted-foreground uppercase">
              Avec le soutien de la Ville et de nos associations partenaires
            </p>
            <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-5 sm:gap-5">
              {[
                {
                  name: "Ville de Sucy-en-Brie",
                  url: "https://www.ville-sucy.fr/",
                  image: "/images/logo-sucy.webp",
                },
                {
                  name: "Le Club Montaleau",
                  url: "http://www.club-montaleau.fr/",
                  image: "/images/logo-clubmontaleau.webp",
                },
                {
                  name: "Confrérie des Coteaux de Sucy",
                  url: "https://confrerie-sucy.fr/",
                  image: "/images/logo-confrerie.webp",
                },
                {
                  name: "Sucy Loisirs Accueil",
                  url: "https://sla-sucy.fr/",
                  image: "/images/logo-sla.webp",
                },
                {
                  name: "Kifékoi?",
                  url: "https://kifekoisucy.fr/",
                  image: "/images/logo-kifekoi.webp",
                },
              ].map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-24 items-center max-sm:last:col-span-2 max-sm:last:mx-auto max-sm:last:w-1/2 justify-center rounded-xl bg-white p-3 shadow-sm ring-1 ring-violet-100 transition hover:-translate-y-0.5 hover:shadow-md dark:ring-white/10"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    width={160}
                    height={64}
                    loading="lazy"
                    className="max-h-full w-auto max-w-full object-contain"
                  />
                </a>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ───────────────────────────── CTA final ───────────────────────────── */}
      <section
        id="sucy-dansant-final-cta"
        className="relative isolate overflow-hidden bg-[#1b0a3f] py-16 text-white md:py-24"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(192,38,211,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.4),transparent_55%)]"
        />
        <div className={cn(container, "text-center")}>
          <ScrollReveal direction="scale">
            <h2 className="mx-auto max-w-3xl text-4xl leading-[1.05] font-bold uppercase italic sm:text-5xl md:text-6xl">
              Rendez-vous sur la piste le 31 janvier
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-violet-100">
              Dimanche 31 janvier 2027, de {EVENT.startLabel} à {EVENT.endLabel}, à l'
              {EVENT.venue.name}.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <BookingLink />
              <a href="/adhesion" className={btnGhostDark}>
                Adhérer aux Amis de l'Harmonie
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <StickyBookingBar
        bookingUrl={EVENT.bookingUrl}
        dateLabel={EVENT.dateShort}
        heroTargetId="sucy-dansant-hero-cta"
        endTargetId="sucy-dansant-final-cta"
      />
    </>
  );
}
