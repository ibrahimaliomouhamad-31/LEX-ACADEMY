/**
 * 🌐 DÉTECTION RÉSEAU — cœur du mode Offline-First
 *
 * Avant : `syncQueue.isOnline` était initialisé à `true` et personne ne
 * l'appelait jamais (`useNetworkStatus` n'était monté nulle part, et
 * `expo-network` n'était même pas installé). Résultat : la file de sync
 * tentait un flush toutes les 15 s hors-ligne, échouait, et marquait les
 * données en "conflit" après 5 essais → PERTE DE DONNÉES garantie pour un
 * élève sans connexion pendant 4 jours.
 *
 * Maintenant : un module unique, importable partout (services ET écrans),
 * sans React, avec abonnements + persistance du dernier état connu.
 */

import * as Network from 'expo-network';
import { avertirDev, rapporterErreur } from './logger';

type Ecouteur = (enLigne: boolean) => void;

let etatActuel: boolean | null = null; // null = pas encore vérifié
const ecouteurs = new Set<Ecouteur>();
let ecouteReseauDemarree = false;

/** Vérifie la connexion maintenant (et notifie les abonnés si changement). */
export async function verifierConnexion(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    const enLigne = Boolean(state.isConnected && state.isInternetReachable !== false);
    changerEtat(enLigne);
    return enLigne;
  } catch {
    // Impossible de vérifier : on reste prudent mais non bloquant.
    // Le dernier état connu est conservé (défaut : en ligne, car le
    // flush est de toute façon tolérant aux échecs).
    return etatActuel ?? true;
  }
}

/** État connu sans appel système (synchronisé en continu). */
export function estEnLigneSync(): boolean {
  return etatActuel ?? true;
}

/** Version async : vérifie puis répond. */
export async function estEnLigne(): Promise<boolean> {
  if (etatActuel === null) {
    return verifierConnexion();
  }
  return etatActuel;
}

function changerEtat(enLigne: boolean): void {
  const precedent = etatActuel;
  etatActuel = enLigne;
  if (precedent !== enLigne) {
    ecouteurs.forEach((fn) => {
      try {
        fn(enLigne);
      } catch (error) {
        rapporterErreur('[reseau] Erreur dans un écouteur :', error);
      }
    });
  }
}

/** S'abonner aux changements de connexion. Renvoie la fonction de désabonnement. */
export function surChangementConnexion(fn: Ecouteur): () => void {
  ecouteurs.add(fn);
  demarrerEcouteReseau();
  return () => {
    ecouteurs.delete(fn);
  };
}

/** Démarre l'écoute système du réseau (une seule fois pour toute l'app). */
export function demarrerEcouteReseau(): void {
  if (ecouteReseauDemarree) return;
  ecouteReseauDemarree = true;

  verifierConnexion();

  try {
    Network.addNetworkStateListener((state) => {
      const enLigne = Boolean(state.isConnected && state.isInternetReachable !== false);
      changerEtat(enLigne);
    });
  } catch (error) {
    // Certains environnements (web ancien) n'ont pas de listener natif :
    // on retombe sur un sondage léger.
    avertirDev('[reseau] Listener natif indisponible, sondage 30 s :', error);
    setInterval(() => {
      verifierConnexion();
    }, 30000);
  }
}

/**
 * attendreConnexion : promesse résolue dès que le réseau est (re)disponible.
 * Utilisée par l'orchestrateur de synchronisation.
 */
export function attendreConnexion(timeoutMs: number = 0): Promise<boolean> {
  return new Promise((resolve) => {
    let termine = false;
    const finir = (ok: boolean) => {
      if (termine) return;
      termine = true;
      desabonnement();
      if (timeoutMs > 0 && timer !== null) clearTimeout(timer);
      resolve(ok);
    };
    const timer =
      timeoutMs > 0
        ? setTimeout(() => finir(estEnLigneSync()), timeoutMs)
        : null;
    const desabonnement = surChangementConnexion((enLigne) => {
      if (enLigne) finir(true);
    });
    verifierConnexion().then((enLigne) => {
      if (enLigne) finir(true);
    });
  });
}
