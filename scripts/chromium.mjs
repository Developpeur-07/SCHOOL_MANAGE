import { resolve } from 'node:path';
import chromium, { inflate, setupLambdaEnvironment } from '@sparticuz/chromium';

chromium.setGraphicsMode = false;

export async function getChromiumLaunchOptions() {
  // Le sandbox n’est pas Amazon Linux : le paquet ne charge pas automatiquement
  // ses bibliothèques AL2023, dont libnspr4. Elles restent dans /tmp, hors Git.
  await inflate(resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
  setupLambdaEnvironment('/tmp/al2023/lib');

  return {
    executablePath: await chromium.executablePath(),
    // Le mode single-process est requis sur certaines fonctions Lambda, mais
    // provoque des fermetures intermittentes dans ce sandbox de test.
    args: chromium.args.filter((argument) => argument !== '--single-process'),
    headless: true,
  };
}
