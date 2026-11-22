/**
 * Connexion partagée aux tests de bout en bout.
 *
 * Le formulaire est protégé contre les soumissions automatisées : une
 * connexion déclenchée moins d'une seconde et demie après l'ouverture du
 * formulaire est refusée. Un test qui simule un usage humain doit donc
 * respecter ce délai, exactement comme le ferait une personne.
 */

/** Délai minimal de saisie appliqué par la protection anti-spam. */
export const DELAI_MINIMAL_SAISIE_MS = 1300;

/**
 * Remplit le formulaire de connexion et attend la redirection.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{email: string, password: string}} identifiants
 */
export async function connecter(page, identifiants) {
  await page.goto('/connexion', { waitUntil: 'networkidle' });

  // Le délai minimal de saisie : un formulaire soumis instantanément est
  // refusé par la protection anti-spam.
  await page.waitForTimeout(DELAI_MINIMAL_SAISIE_MS);

  await page.getByLabel('Adresse e-mail').fill(identifiants.email);
  await page.getByLabel('Mot de passe').fill(identifiants.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
}
