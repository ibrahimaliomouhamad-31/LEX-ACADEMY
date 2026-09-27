/**
 * 📊 BARRE DE CONTEXTE LEX.AI — « ce que l'IA peut encore se rappeler »
 *
 * Repère permanent en haut du chat (comme la barre de contexte d'un assistant
 * de code) : tokens estimés envoyés au moteur / plafond, messages transmis,
 * messages déjà ignorés, et bouton de compactage qui devient prioritaire quand
 * la discussion sature. L'élève voit AINSI quand compacter, sans surprise.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LIMITES_PROXY } from '../services/configIA';
import type { MesureContexte, NiveauContexte } from '../services/contexteIA';

const COULEURS: Record<NiveauContexte, string> = {
  ok: '#10B981',
  moyen: '#FBBF24',
  critique: '#EF4444',
};

const LIBELLES: Record<NiveauContexte, string> = {
  ok: 'Contexte léger',
  moyen: 'Contexte qui se remplit',
  critique: 'Contexte presque plein',
};

/** 7500 → « 7 500 » (séparateur d'espace, sans dépendre d'Intl). */
function espaces(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

interface Props {
  mesure: MesureContexte;
  onCompacter: () => void;
  /** Faux : pas assez de messages pour que le compactage change quoi que ce soit. */
  compactable: boolean;
}

export default function BarreContexte({ mesure, onCompacter, compactable }: Props) {
  const remplissage = useSharedValue(0);

  // Effet : la barre glisse jusqu'à son nouveau niveau à chaque mesure.
  useEffect(() => {
    remplissage.value = withTiming(mesure.pourcentage, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [mesure.pourcentage, remplissage]);

  const styleRemplissage = useAnimatedStyle(() => ({ width: `${remplissage.value}%` }));
  const couleur = COULEURS[mesure.niveau];

  return (
    <View style={styles.barre}>
      <View style={styles.ligne}>
        <Text style={styles.titre}>🧠 Contexte LEX.AI</Text>
        <Text style={[styles.compteur, { color: couleur }]}>
          ≈ {espaces(mesure.tokens)} / {espaces(mesure.maxTokens)} tokens · {mesure.pourcentage}%
        </Text>
      </View>

      <View style={styles.piste}>
        <Animated.View style={[styles.remplissage, { backgroundColor: couleur }, styleRemplissage]} />
      </View>

      <View style={styles.ligne}>
        <Text style={styles.detail}>
          {mesure.envoyes}/{LIMITES_PROXY.messages} messages
          {mesure.tronque ? ` · ⛔ ${mesure.ignores} ignoré${mesure.ignores > 1 ? 's' : ''}` : ''}
        </Text>
        <TouchableOpacity
          onPress={onCompacter}
          disabled={!compactable}
          style={[
            styles.bouton,
            mesure.niveau !== 'ok' && styles.boutonUrgent,
            !compactable && styles.boutonInactif,
          ]}
        >
          <Text style={[styles.boutonTexte, !compactable && styles.boutonTexteInactif]}>
            {compactable ? '🗜️ Compacter le contexte' : '🗜️ Rien à compacter'}
          </Text>
        </TouchableOpacity>
      </View>

      {(mesure.niveau !== 'ok' || mesure.tronque) && (
        <Text style={[styles.conseil, { color: couleur }]}>
          {LIBELLES[mesure.niveau]} — {mesure.conseil}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barre: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0B1120', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titre: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  compteur: { fontSize: 11, fontWeight: '800' },
  piste: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, marginVertical: 6, overflow: 'hidden' },
  remplissage: { height: '100%', borderRadius: 3 },
  detail: { color: '#64748B', fontSize: 11 },
  bouton: { backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  boutonUrgent: { backgroundColor: '#FBBF24' },
  boutonInactif: { backgroundColor: '#111827' },
  boutonTexte: { color: '#0F172A', fontSize: 11, fontWeight: '800' },
  boutonTexteInactif: { color: '#475569' },
  conseil: { fontSize: 11, marginTop: 6, lineHeight: 15 },
});
