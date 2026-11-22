import type { Metadata } from 'next';
import { LegalPageView } from '@/modules/legal/ui/legal-page-view';
import { PRIVACY_POLICY } from '@/modules/legal/domain/legal-content';
import { canonicalPath } from '@/shared/config/site';
import { OPEN_GRAPH_IMAGE } from '@/shared/metadata';

export const metadata: Metadata = {
  title: PRIVACY_POLICY.title,
  description: PRIVACY_POLICY.description,
  // Le canonique n'est annoncé que si l'adresse publique du site est connue :
  // hors production, `localhost` ne doit pas être présenté comme l'adresse
  // de référence du site.
  alternates: canonicalPath('/confidentialite'),
  openGraph: {
    title: PRIVACY_POLICY.title,
    description: PRIVACY_POLICY.description,
    type: 'article',
    locale: 'fr_FR',
    images: [OPEN_GRAPH_IMAGE],
  },
};

export default function PrivacyPolicyPage() {
  return <LegalPageView page={PRIVACY_POLICY} id="confidentialite" />;
}
