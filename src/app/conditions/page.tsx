import type { Metadata } from 'next';
import { LegalPageView } from '@/modules/legal/ui/legal-page-view';
import { TERMS_OF_SERVICE } from '@/modules/legal/domain/legal-content';
import { canonicalPath } from '@/shared/config/site';
import { OPEN_GRAPH_IMAGE } from '@/shared/metadata';

export const metadata: Metadata = {
  title: TERMS_OF_SERVICE.title,
  description: TERMS_OF_SERVICE.description,
  // Le canonique n'est annoncé que si l'adresse publique du site est connue :
  // hors production, `localhost` ne doit pas être présenté comme l'adresse
  // de référence du site.
  alternates: canonicalPath('/conditions'),
  openGraph: {
    title: TERMS_OF_SERVICE.title,
    description: TERMS_OF_SERVICE.description,
    type: 'article',
    locale: 'fr_FR',
    images: [OPEN_GRAPH_IMAGE],
  },
};

export default function TermsPage() {
  return <LegalPageView page={TERMS_OF_SERVICE} id="conditions" />;
}
