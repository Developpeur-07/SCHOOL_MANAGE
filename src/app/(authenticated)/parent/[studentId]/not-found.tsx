import Link from 'next/link';
import { messages } from '@/shared/config/messages';

/**
 * Page « introuvable » du segment enfant.
 *
 * Elle est rendue à l'intérieur de la coquille parent (en-tête, sélecteur
 * d'enfant, navigation) : elle ne doit donc pas redéclarer de zone `main`,
 * déjà fournie par le shell applicatif.
 *
 * Elle sert lorsqu'un enfant demandé n'est rattaché au compte : le contrôle
 * est fait dans la couche enfant, qui renvoie une page « introuvable » afin
 * de ne pas révéler l'existence d'un élève non lié.
 */
export default function ChildNotFound() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{messages.parent.childNotFoundTitle}</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{messages.parent.childNotFoundBody}</p>
      <Link
        href="/parent"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900"
      >
        {messages.parent.childNotFoundAction}
      </Link>
    </section>
  );
}
