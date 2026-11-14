import Link from 'next/link';
import { messages } from '@/shared/config/messages';

/**
 * Page « introuvable » de l'espace parent.
 *
 * Elle est rendue à l'intérieur de la coquille parent (en-tête, rôle, bouton
 * de déconnexion) : elle ne doit donc pas redéclarer de zone `main`, déjà
 * fournie par le shell applicatif.
 */
export default function ParentNotFound() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{messages.notFound.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{messages.notFound.body}</p>
      <Link
        href="/parent"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
      >
        {messages.parent.childNotFoundAction}
      </Link>
    </section>
  );
}
