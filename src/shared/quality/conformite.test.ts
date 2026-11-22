import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Vérifications statiques de conformité.
 *
 * Ces contrôles portent sur des erreurs qui ne se voient pas à l'écran :
 * un lien vide, une image sans texte alternatif, un appel à l'action
 * dupliqué. Ils sont automatisés pour que la correction ne se perde pas.
 */

const RACINE = path.resolve(import.meta.dirname, '..', '..', '..');

function fichiersSource(dossier: string): string[] {
  const trouves: string[] = [];

  for (const entree of readdirSync(dossier)) {
    if (entree === 'node_modules' || entree.startsWith('.')) continue;
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) {
      trouves.push(...fichiersSource(complet));
      continue;
    }
    if (/\.tsx$/.test(entree)) trouves.push(complet);
  }

  return trouves;
}

const SOURCES = fichiersSource(path.join(RACINE, 'src'));

describe('absence de liens cassés', () => {
  it('ne contient aucun lien vide', () => {
    for (const fichier of SOURCES) {
      const contenu = readFileSync(fichier, 'utf8');
      // Les occurrences dans les commentaires ne sont pas des liens.
      const sansCommentaires = contenu.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(sansCommentaires, fichier).not.toMatch(/href\s*=\s*(["'])\1/);
      expect(sansCommentaires, fichier).not.toMatch(/href\s*=\s*["']#["']/);
    }
  });

  it('ne contient aucune adresse de support inventée', () => {
    for (const fichier of SOURCES) {
      const contenu = readFileSync(fichier, 'utf8');
      const sansCommentaires = contenu.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(sansCommentaires, fichier).not.toMatch(/mailto:/);
      expect(sansCommentaires, fichier).not.toMatch(/tel:/);
    }
  });
});

describe('textes alternatifs des images', () => {
  it('n’utilise aucune balise image sans alternative', () => {
    for (const fichier of SOURCES) {
      const contenu = readFileSync(fichier, 'utf8');
      const images = contenu.match(/<img\b[\s\S]*?\/>/g) ?? [];

      for (const image of images) {
        expect(image, fichier).toMatch(/\balt\s*=/);
      }
    }
  });

  it('n’utilise aucune image de contenu en balise img brute', () => {
    // Les visuels de la plateforme sont des icônes vectorielles masquées aux
    // lecteurs d'écran : aucune balise `img` n'est nécessaire.
    for (const fichier of SOURCES) {
      const contenu = readFileSync(fichier, 'utf8');
      const images = contenu.match(/<img\b/g) ?? [];
      expect(images.length, fichier).toBe(0);
    }
  });
});

describe('appel à l’action unique', () => {
  it('ne marque qu’un seul appel à l’action principal sur l’accueil', () => {
    const accueil = readFileSync(path.join(RACINE, 'src', 'app', 'page.tsx'), 'utf8');
    const marques = accueil.match(/data-cta="principal"/g) ?? [];
    expect(marques.length).toBe(1);
  });

  it('ne répète pas l’accès à la connexion dans le panneau support', () => {
    const support = readFileSync(
      path.join(RACINE, 'src', 'modules', 'public-home', 'ui', 'support-panel.tsx'),
      'utf8',
    );
    expect(support).not.toMatch(/href="\/connexion"/);
  });
});

describe('pages légales', () => {
  it('expose une politique de confidentialité et des conditions', () => {
    expect(statSync(path.join(RACINE, 'src', 'app', 'confidentialite', 'page.tsx')).isFile()).toBe(
      true,
    );
    expect(statSync(path.join(RACINE, 'src', 'app', 'conditions', 'page.tsx')).isFile()).toBe(true);
  });

  it('les rend accessibles depuis le pied de page', () => {
    const accueil = readFileSync(path.join(RACINE, 'src', 'app', 'page.tsx'), 'utf8');
    expect(accueil).toContain('href="/confidentialite"');
    expect(accueil).toContain('href="/conditions"');
  });

  it('n’invente aucun canal de support dans leur contenu', () => {
    const contenu = readFileSync(
      path.join(RACINE, 'src', 'modules', 'legal', 'domain', 'legal-content.ts'),
      'utf8',
    );
    expect(contenu).not.toMatch(/mailto:/);
    expect(contenu).not.toMatch(/@example\.(com|org)/);
    expect(contenu).not.toMatch(/https?:\/\//);
  });
});

describe('métadonnées sociales', () => {
  it('déclare une image d’aperçu et un favicon', () => {
    const layout = readFileSync(path.join(RACINE, 'src', 'app', 'layout.tsx'), 'utf8');
    // L'image d'aperçu est déclarée une seule fois, dans un module partagé :
    // chaque page qui redéfinit ses métadonnées Open Graph la reprend, sinon
    // la fusion champ par champ la ferait disparaître.
    const metadonnees = readFileSync(path.join(RACINE, 'src', 'shared', 'metadata.ts'), 'utf8');
    expect(metadonnees).toContain('/og-image.png');
    expect(layout).toContain('OPEN_GRAPH_IMAGE');
    expect(layout).toContain('/favicon.ico');
    expect(layout).toContain('summary_large_image');
  });

  it('fournit effectivement les fichiers images', () => {
    expect(statSync(path.join(RACINE, 'public', 'og-image.png')).size).toBeGreaterThan(1000);
    expect(statSync(path.join(RACINE, 'src', 'app', 'favicon.ico')).size).toBeGreaterThan(500);
  });
});

describe('plan du site et robots', () => {
  it('déclare un plan du site et des directives', () => {
    expect(statSync(path.join(RACINE, 'src', 'app', 'sitemap.ts')).isFile()).toBe(true);
    expect(statSync(path.join(RACINE, 'src', 'app', 'robots.ts')).isFile()).toBe(true);
  });

  it('n’annonce que des pages publiques', () => {
    const sitemap = readFileSync(path.join(RACINE, 'src', 'app', 'sitemap.ts'), 'utf8');
    for (const interdit of ['/parent', '/ecole', '/enseignant', '/supervision', '/compte']) {
      expect(sitemap, interdit).not.toContain(interdit);
    }
  });
});
