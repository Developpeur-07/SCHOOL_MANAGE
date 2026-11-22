import Link from 'next/link';
import { messages } from '@/shared/config/messages';
import { LEGAL_VERSION, type LegalPage } from '../domain/legal-content';

interface LegalPageViewProps {
  page: LegalPage;
  /** Ancre de navigation interne, pour le sommaire. */
  id: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Présentation d'une page légale.
 *
 * Le sommaire reprend les sections réelles : chaque entrée pointe vers un
 * identifiant réellement présent dans la page, sinon le lien serait cassé.
 */
export function LegalPageView({ page, id }: LegalPageViewProps) {
  const version = DATE_FORMAT.format(new Date(`${LEGAL_VERSION}T00:00:00Z`));

  return (
    <main id="contenu" className="min-h-dvh bg-slate-50">
      <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <nav aria-label={messages.legal.breadcrumb} className="mb-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-900"
          >
            {messages.legal.backHome}
          </Link>
        </nav>

        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{page.intro}</p>
        </header>

        <nav
          aria-labelledby={`${id}-sommaire`}
          className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 id={`${id}-sommaire`} className="text-sm font-bold tracking-wide text-slate-600 uppercase">
            {messages.legal.summary}
          </h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {page.sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-900"
                >
                  <span aria-hidden="true" className="text-slate-600">
                    {index + 1}.
                  </span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {page.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 pt-10">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-base leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}
            {section.list ? (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-slate-700">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <p>
            {messages.legal.version} : {version}
          </p>
        </footer>
      </article>
    </main>
  );
}
