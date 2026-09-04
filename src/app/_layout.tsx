import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import React from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getDortoirActive, getTaillePolice, multiplicateurPolice, setDortoirActive } from '../services/parametres';

export default function Layout() {
  const [pret, setPret] = useState(false);
  const [dortoir, setDortoir] = useState(false);

  // Accessibilité : multiplie la taille de police de tous les Texte de l'app
  // selon le réglage choisi dans ⚙️ Paramètres.
  useEffect(() => {
    (async () => {
      const taille = await getTaillePolice();
      const mult = multiplicateurPolice(taille);
      if (mult !== 1) {
        const TextOrigin = (Text as unknown as { render?: (...args: unknown[]) => unknown }).render;
        if (TextOrigin) {
          (Text as unknown as { render: (...args: unknown[]) => unknown }).render = function (
            this: unknown,
            ...args: unknown[]
          ) {
            const origine = TextOrigin.apply(this, args) as React.ReactElement<{ style?: unknown }>;
            const styleAplat = StyleSheet.flatten(origine.props?.style || undefined) as
              | { fontSize?: number }
              | undefined;
            const base = styleAplat?.fontSize || 14;
            return React.cloneElement(origine, {
              style: [origine.props?.style, { fontSize: base * mult }],
            });
          };
        }
      }
      setPret(true);
    })();
  }, []);

  // Mode dortoir : re-vérifie le réglage quand l'app revient au premier plan
  // ou toutes les 5 s (pour refléter le changement fait dans les Paramètres).
  useEffect(() => {
    const relire = () => getDortoirActive().then(setDortoir).catch(() => undefined);
    relire();
    const abonnement = AppState.addEventListener('change', relire);
    const interval = setInterval(relire, 5000);
    return () => {
      abonnement.remove();
      clearInterval(interval);
    };
  }, []);

  if (!pret) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="classes" />
        <Stack.Screen name="matieres" />
        <Stack.Screen name="chapitres" />
        <Stack.Screen name="cours" />
        <Stack.Screen name="liste_exercices" />
        <Stack.Screen name="exercices" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="classement" />
        <Stack.Screen name="profil" />
        <Stack.Screen name="avatars" />
        <Stack.Screen name="lexai" />
        <Stack.Screen name="classes_exos" />
        <Stack.Screen name="matieres_exos" />
        <Stack.Screen name="chapitres_exos" />
        <Stack.Screen name="infini" />
      </Stack>
      {dortoir && (
        <View style={{ flex: 1 }}>
          <View pointerEvents="none" style={styles.overlayDortoir} />
          <TouchableOpacity
            style={styles.badgeDortoirBtn}
            onPress={() => { setDortoirActive(false); setDortoir(false); }}
          >
            <Text style={styles.badgeDortoir}>🌙 Quitter le mode dortoir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayDortoir: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(120, 53, 15, 0.28)' },
  badgeDortoirBtn: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(2, 6, 23, 0.8)', borderWidth: 1, borderColor: 'rgba(253, 230, 138, 0.4)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  badgeDortoir: { color: 'rgba(253, 230, 138, 0.9)', fontSize: 11 },
});
