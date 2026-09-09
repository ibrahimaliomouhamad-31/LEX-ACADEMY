/**
 * 🌐 ÉCOUTE RÉSEAU (hook React)
 *
 * 🔄 Avant : ce hook n'était monté NULLE PART dans l'app, et `expo-network`
 * n'était même pas installé → le flag online de la file de sync restait à
 * `true` pour toujours. Désormais il délègue tout au module `utils/reseau`
 * (source unique) et il est monté dans app/_layout.tsx au démarrage.
 */

import { useEffect, useState } from 'react';
import {
  demarrerEcouteReseau,
  estEnLigneSync,
  surChangementConnexion,
  verifierConnexion,
} from './reseau';
import { toutSynchroniser } from '../services/syncOrchestrator';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(estEnLigneSync());

  useEffect(() => {
    let mounted = true;

    demarrerEcouteReseau();
    verifierConnexion().then((online) => {
      if (mounted) setIsOnline(online);
    });

    const desabonnement = surChangementConnexion((online) => {
      if (mounted) setIsOnline(online);
      // 🚀 Au retour du wifi : tout se synchronise (XP, streak, progression,
      // défis, signalements). Tolérant aux pannes, ne throw jamais.
      if (online) {
        toutSynchroniser();
      }
    });

    return () => {
      mounted = false;
      desabonnement();
    };
  }, []);

  return { isOnline };
}
