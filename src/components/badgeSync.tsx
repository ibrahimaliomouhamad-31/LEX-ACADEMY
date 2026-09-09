/**
 * ☁️ BADGE D'ÉTAT DE SYNCHRONISATION — la confiance visuelle
 *
 * L'élève doit TOUJOURS savoir où en est sa sauvegarde :
 *  ☁️ Tout est synchronisé
 *  ⏳ N éléments en attente (partiront au retour du wifi)
 *  📴 Hors-ligne — rien n'est perdu
 * Les XP non synchronisés sont affichés aussi (transparence totale).
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { syncQueue } from '../services/syncQueue';
import { lireXpNonSync } from '../services/xpLocal';
import { useNetworkStatus } from '../utils/networkListener';

export default function BadgeSync() {
  const { isOnline } = useNetworkStatus();
  const [pending, setPending] = useState(0);
  const [xpNonSync, setXpNonSync] = useState(0);

  useEffect(() => {
    let monte = true;

    const relire = async () => {
      try {
        const stats = await syncQueue.getStats();
        if (!monte) return;
        setPending(stats.pending);
        setXpNonSync(await lireXpNonSync());
      } catch {
        // ignore
      }
    };

    relire();
    const interval = setInterval(relire, 15000);
    return () => {
      monte = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  const enAttente = pending > 0 || xpNonSync > 0;

  const emoji = !isOnline ? '📴' : enAttente ? '⏳' : '☁️';
  const couleur = !isOnline ? '#94A3B8' : enAttente ? '#F59E0B' : '#10B981';
  const texte = !isOnline
    ? 'Hors-ligne — rien n\'est perdu'
    : enAttente
    ? `${pending + (xpNonSync > 0 ? 1 : 0)} élément(s) à synchroniser`
    : 'Progression sauvegardée';

  return (
    <View style={[styles.badge, { borderColor: couleur + '66', backgroundColor: couleur + '14' }]}>
      <Text style={[styles.texte, { color: couleur }]}>
        {emoji} {texte}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
  },
  texte: { fontSize: 11, fontWeight: '600' },
});