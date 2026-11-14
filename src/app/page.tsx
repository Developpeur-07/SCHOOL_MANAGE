import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  GraduationCap,
  LayoutGrid,
  LineChart,
  Quote,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { messages } from '@/shared/config/messages';
import { hasPublicSiteUrl } from '@/shared/config/site';
import { HeroShowcase } from '@/modules/public-home/ui/hero-showcase';
import { ProfilesSection } from '@/modules/public-home/ui/profiles-section';
import { PublicNav } from '@/modules/public-home/ui/public-nav';
import { SupportPanel } from '@/modules/public-home/ui/support-panel';

export const metadata: Metadata = {
  title: messages.public.hero.title,
  description: messages.public.hero.subtitle,
  // L'URL canonique n'est annoncée que si l'adresse publique du site est
  // connue : hors production, `localhost` ne doit pas être présenté comme
  // l'adresse de référence du site.
  alternates: hasPublicSiteUrl() ? { canonical: '/' } : undefined,
  openGraph: {
    title: messages.public.hero.title,
    description: messages.public.hero.subtitle,
    type: 'website',
    locale: 'fr_FR',
    url: hasPublicSiteUrl() ? '/' : undefined,
  },
};

const ICONES_BENEFICES = [FileText, ShieldCheck, Sparkles, WifiOff] as const;
const ICONES_USAGES = [LayoutGrid, LineChart, GraduationCap] as const;

/**
 * Accueil public de la plateforme.
 *
 * La page est entièrement publique et ne requiert aucune donnée Supabase :
 * elle reste servie depuis le cache du service worker, y compris hors ligne.
 * Les seules parties interactives sont l'aperçu animé, la navigation mobile
 * et le panneau de support.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <PublicNav />

      <main id="contenu" className="flex-1">
        {/* Hero */}
        <section aria-labelledby="hero-titre" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-teal-50 to-transparent"
          />
          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-20">
            <div>
              <p className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold tracking-wide text-teal-800 uppercase">
                {messages.public.badge}
              </p>

              <h1
                id="hero-titre"
                className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
              >
                {messages.public.hero.title}
              </h1>

              <p className="mt-4 max-w-xl text-lg text-slate-600">
                {messages.public.hero.subtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/connexion"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 font-bold text-white shadow-sm hover:bg-teal-800"
                >
                  {messages.public.hero.primaryCta}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  href="#usages"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {messages.public.hero.secondaryCta}
                </a>
              </div>

              <p className="mt-3 text-sm text-slate-500">{messages.public.hero.primaryCtaHint}</p>

              <ul className="mt-8 space-y-2.5">
                {messages.public.hero.reassurance.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-teal-700" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full">
              <HeroShowcase />
            </div>
          </div>
        </section>

        {/* Bénéfices */}
        <section
          id="avantages"
          aria-labelledby="avantages-titre"
          className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20"
        >
          <div className="max-w-2xl">
            <h2
              id="avantages-titre"
              className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
            >
              {messages.public.benefits.title}
            </h2>
            <p className="mt-3 text-slate-600">{messages.public.benefits.intro}</p>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {messages.public.benefits.items.map((benefice, index) => {
              const Icone = ICONES_BENEFICES[index] ?? Sparkles;
              return (
                <li
                  key={benefice.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <span className="inline-flex rounded-xl bg-teal-50 p-2.5 text-teal-800">
                    <Icone aria-hidden="true" className="size-5" />
                  </span>
                  <p className="mt-4 text-lg font-extrabold text-slate-950">{benefice.title}</p>
                  <p className="mt-2 text-slate-600">{benefice.body}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Usages */}
        <section
          id="usages"
          aria-labelledby="usages-titre"
          className="scroll-mt-24 border-y border-slate-200 bg-white"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <div className="max-w-2xl">
              <h2
                id="usages-titre"
                className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
              >
                {messages.public.usages.title}
              </h2>
              <p className="mt-3 text-slate-600">{messages.public.usages.intro}</p>
            </div>

            <ul className="mt-8 grid gap-4 lg:grid-cols-3">
              {messages.public.usages.items.map((usage, index) => {
                const Icone = ICONES_USAGES[index] ?? LayoutGrid;
                return (
                  <li
                    key={usage.title}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
                  >
                    <span className="inline-flex rounded-xl bg-white p-2.5 text-teal-800 shadow-sm">
                      <Icone aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-4 text-lg font-extrabold text-slate-950">{usage.title}</p>
                    <p className="mt-2 text-slate-600">{usage.body}</p>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 flex items-start gap-2.5 text-sm text-slate-500">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{messages.public.usages.note}</span>
            </p>
          </div>
        </section>

        {/* Profils et appareils */}
        <ProfilesSection />

        {/* Témoignage */}
        <section
          id="temoignage"
          aria-labelledby="temoignage-titre"
          className="scroll-mt-24 border-y border-slate-200 bg-white"
        >
          <div className="mx-auto w-full max-w-3xl px-4 py-14 text-center sm:px-6 lg:py-20">
            <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold tracking-wide text-teal-800 uppercase">
              {messages.public.testimonial.eyebrow}
            </span>

            <Quote aria-hidden="true" className="mx-auto mt-6 size-8 text-teal-200" />

            <h2
              id="temoignage-titre"
              className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
            >
              {messages.public.testimonial.title}
            </h2>

            <blockquote className="mt-5">
              <p className="text-lg leading-relaxed text-slate-700 sm:text-xl">
                {messages.public.testimonial.quote}
              </p>
            </blockquote>

            <p className="mt-5 text-sm font-bold text-slate-950">
              {messages.public.testimonial.author}
            </p>
            <p className="mt-1 text-xs text-slate-500">{messages.public.testimonial.context}</p>
          </div>
        </section>

        {/* Support */}
        <SupportPanel />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-extrabold tracking-tight text-slate-950">
              {messages.app.name}
            </p>
            <p className="mt-1 text-sm text-slate-600">{messages.app.tagline}</p>
            <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <WifiOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span>{messages.public.footer.offlineNote}</span>
            </p>
          </div>

          <nav aria-label={messages.public.footer.navigation}>
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
              {messages.public.footer.navigation}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              <li>
                <Link
                  href="/connexion"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 hover:text-teal-800"
                >
                  {messages.public.nav.login}
                </Link>
              </li>
              <li>
                <Link
                  href="/hors-ligne"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 hover:text-teal-800"
                >
                  {messages.public.footer.offlineLink}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-slate-200">
          <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-slate-500 sm:px-6">
            {messages.public.footer.legal}
          </p>
        </div>
      </footer>
    </div>
  );
}
