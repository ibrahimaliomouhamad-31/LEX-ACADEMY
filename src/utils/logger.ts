/**
 * 🔇 LOGGER — remplace les console.* sauvages en production.
 * En dev : transmet à console. En prod : silencieux sauf erreurs
 * redirigées vers crashLog quand disponible.
 * Signature flexible (...args) pour migration mécanique depuis console.*.
 */
function versCrashLog(contexte: string, erreur: unknown): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { enregistrerCrash } = require('../services/crashLog') as {
      enregistrerCrash: (c: string, e: unknown) => void;
    };
    enregistrerCrash(contexte, erreur);
  } catch {
    // dernier recours : ignorer silencieusement
  }
}

export function logDev(...args: unknown[]): void {
  if (__DEV__) {
    console.log(...args);
  }
}

export function avertirDev(...args: unknown[]): void {
  if (__DEV__) {
    console.warn(...args);
  }
}

export function rapporterErreur(...args: unknown[]): void {
  if (__DEV__) {
    console.error(...args);
  } else {
    const [contexte, ...reste] = args;
    versCrashLog(String(contexte ?? 'app'), reste.length === 1 ? reste[0] : reste);
  }
}
