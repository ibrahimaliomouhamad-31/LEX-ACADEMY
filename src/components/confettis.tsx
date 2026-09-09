/**
 * 🎉 CONFETTIS — célébration légère (badges, grosses réussites)
 * Implémentation maison avec react-native-reanimated (déjà installé) :
 * quelques emojis qui tombent et s'estompent. Aucune librairie ajoutée.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const EMOJIS = ['🎉', '⭐', '✨', '🎊', '💫', '🌟'];

interface Flocon {
  emoji: string;
  gauche: number;
  retard: number;
  duree: number;
  taille: number;
}

export default function Confettis({ duree = 2200 }: { duree?: number }) {
  const flocons = useMemo<Flocon[]>(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        emoji: EMOJIS[i % EMOJIS.length],
        gauche: 5 + Math.random() * 90,
        retard: Math.random() * 500,
        duree: 1200 + Math.random() * 900,
        taille: 18 + Math.random() * 14,
      })),
    []
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flocons.map((f, i) => (
        <FloconAnime key={i} flocon={f} dureeTotale={duree} />
      ))}
    </View>
  );
}

function FloconAnime({ flocon, dureeTotale }: { flocon: Flocon; dureeTotale: number }) {
  const y = useSharedValue(-50);
  const opacite = useSharedValue(1);

  useEffect(() => {
    y.value = withDelay(
      flocon.retard,
      withTiming(700, { duration: flocon.duree, easing: Easing.in(Easing.quad) })
    );
    opacite.value = withDelay(
      flocon.retard + flocon.duree * 0.7,
      withTiming(0, { duration: flocon.duree * 0.3 }, () => {
        runOnJS(() => {}); // fin d'anim : le parent démonte après dureeTotale
      })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacite.value,
  }));

  return (
    <Animated.View style={[styles.flocon, { left: `${flocon.gauche}%` }, style]}>
      <Text style={{ fontSize: flocon.taille }}>{flocon.emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flocon: { position: 'absolute', top: -50 },
});