/**
 * Génération des images de marque.
 *
 * Le favicon et l'image d'aperçu des réseaux sociaux sont produits à partir
 * du logo existant, afin de rester cohérents avec l'interface. Le favicon
 * est multi-tailles et l'image d'aperçu respecte le format attendu par les
 * plateformes sociales (1200 × 630).
 *
 * Usage : `node scripts/generate-brand-assets.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dossierPublic = path.join(racine, 'public');
const dossierApp = path.join(racine, 'src', 'app');

/** Teal de la marque, aligné sur `bg-teal-700` de l'interface. */
const TEAL = '#0f766e';
const TEAL_FONCE = '#134e4a';
const BLANC = '#ffffff';

/**
 * Assemble un fichier ICO à partir de tailles PNG.
 *
 * Le format ICO accepte une image PNG encodée telle quelle depuis Windows
 * Vista : inutile de réencoder, et le résultat reste net à toutes les
 * tailles.
 */
function assembleIco(images) {
  const TAILLE_ENTETE = 6;
  const TAILLE_ENTREE = 16;

  const entetes = Buffer.alloc(TAILLE_ENTETE + images.length * TAILLE_ENTREE);
  entetes.writeUInt16LE(0, 0); // reservado
  entetes.writeUInt16LE(1, 2); // tipo 1 : icône
  entetes.writeUInt16LE(images.length, 4);

  let decalage = TAILLE_ENTETE + images.length * TAILLE_ENTREE;
  images.forEach((image, index) => {
    const base = TAILLE_ENTETE + index * TAILLE_ENTREE;
    entetes.writeUInt8(image.taille === 256 ? 0 : image.taille, base);
    entetes.writeUInt8(image.taille === 256 ? 0 : image.taille, base + 1);
    entetes.writeUInt8(0, base + 2); // couleurs de palette
    entetes.writeUInt8(0, base + 3); // reservado
    entetes.writeUInt16LE(1, base + 4); // plans de couleur
    entetes.writeUInt16LE(32, base + 6); // bits par pixel
    entetes.writeUInt32LE(image.donnees.length, base + 8);
    entetes.writeUInt32LE(decalage, base + 12);
    decalage += image.donnees.length;
  });

  return Buffer.concat([entetes, ...images.map((image) => image.donnees)]);
}

/** Dessine le logo de la marque : une toque de graduation. */
function dessinLogo({ taille, fond }) {
  const centre = taille / 2;
  const largeur = taille * 0.56;

  return `
    <rect width="${taille}" height="${taille}" rx="${taille * 0.22}" fill="${fond}"/>
    <g fill="${BLANC}">
      <path d="M ${centre} ${taille * 0.24}
               L ${centre + largeur / 2} ${taille * 0.38}
               L ${centre} ${taille * 0.52}
               L ${centre - largeur / 2} ${taille * 0.38} Z"/>
      <path d="M ${centre - largeur * 0.26} ${taille * 0.44}
               L ${centre - largeur * 0.26} ${taille * 0.64}
               Q ${centre} ${taille * 0.76} ${centre + largeur * 0.26} ${taille * 0.64}
               L ${centre + largeur * 0.26} ${taille * 0.44}
               L ${centre} ${taille * 0.55} Z" opacity="0.92"/>
      <circle cx="${centre + largeur * 0.42}" cy="${taille * 0.5}" r="${taille * 0.055}"/>
    </g>`;
}

/** Image d'aperçu pour les réseaux sociaux. */
function dessinApercu() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="fond" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${TEAL}"/>
          <stop offset="100%" stop-color="${TEAL_FONCE}"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#fond)"/>
      <circle cx="1080" cy="90" r="220" fill="${BLANC}" opacity="0.05"/>
      <circle cx="120" cy="560" r="180" fill="${BLANC}" opacity="0.05"/>
      <g transform="translate(96, 96) scale(0.92)">
        <rect width="132" height="132" rx="30" fill="${BLANC}" opacity="0.16"/>
        <g transform="translate(0, 4)">
          <path d="M 66 32 L 100 46 L 66 60 L 32 46 Z" fill="${BLANC}"/>
          <path d="M 46 52 L 46 76 Q 66 88 86 76 L 86 52 L 66 63 Z" fill="${BLANC}" opacity="0.9"/>
          <circle cx="97" cy="52" r="6" fill="${BLANC}"/>
        </g>
      </g>
      <text x="96" y="360" font-family="DejaVu Sans, sans-serif" font-size="66" font-weight="bold" fill="${BLANC}">SCHOOL_MANAGE</text>
      <text x="96" y="424" font-family="DejaVu Sans, sans-serif" font-size="34" fill="${BLANC}" opacity="0.95">L’école vous informe, simplement.</text>
      <text x="96" y="486" font-family="DejaVu Sans, sans-serif" font-size="27" fill="${BLANC}" opacity="0.82">Notes, assiduité, frais et annonces réunis</text>
      <text x="96" y="526" font-family="DejaVu Sans, sans-serif" font-size="27" fill="${BLANC}" opacity="0.82">pour les familles et les personnels de l’école.</text>
      <rect x="96" y="562" width="330" height="6" rx="3" fill="${BLANC}" opacity="0.45"/>
    </svg>`;
}

await mkdir(dossierPublic, { recursive: true });
await mkdir(dossierApp, { recursive: true });

// Favicon multi-tailles, placé à la racine de l'application : c'est
// l'emplacement que Next.js convertit automatiquement en lien `icon`.
const tailles = [16, 32, 48];
const images = [];
for (const taille of tailles) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">${dessinLogo({ taille, fond: TEAL })}</svg>`;
  const donnees = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  images.push({ taille, donnees });
}

const ico = assembleIco(images);
await writeFile(path.join(dossierApp, 'favicon.ico'), ico);
console.log(`favicon.ico : ${ico.length} octets (${tailles.join(', ')} px)`);

// Image d'aperçu des réseaux sociaux.
const apercu = await sharp(Buffer.from(dessinApercu()))
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(path.join(dossierPublic, 'og-image.png'), apercu);
console.log(`og-image.png : ${apercu.length} octets (1200x630)`);

// L'icône de la plateforme est reprise pour l'aperçu social sur les
// plateformes mobiles, à une taille plus légère.
const icone = await sharp(path.join(dossierPublic, 'icons', 'icon-512.png'))
  .resize(512, 512, { fit: 'inside' })
  .png({ compressionLevel: 9 })
  .toBuffer();
console.log(`icon-512.png recompresse : ${icone.length} octets`);
