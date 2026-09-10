import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getDortoirActive, setDortoirActive } from '../services/parametres';
// 🔄 OFFLINE-FIRST : le hook réseau démarre l'écoute système de la connexion
// pour toute l'app. Au retour du wifi, il déclenche la synchronisation de
// TOUTES les files (XP, streak, progression, défis, signalements).
// Avant, personne ne montait ce hook : la sync ne se déclenchait jamais.
import { useNetworkStatus } from '../utils/networkListener';
import { initAppCheck } from '../services/appCheck';
import { signalerCrash } from '../services/crashLog';

// 🚨 ERROR BOUNDARY GLOBAL (expo-router) : plus aucun écran ne peut faire
// planter toute l'app. Le crash est journalisé localement + envoyé au retour
// du wifi, et l'élève voit un écran doux avec bouton Réessayer.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  signalerCrash(error);

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <Text style={{ fontSize: 50, marginBottom: 12 }}>🛠️</Text>
      <Text style={{ color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
        Oups, un petit bug !
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 25 }}>
        Ce n'est pas ta faute. Tes XP et ta progression sont en sécurité. Réessaie, ou redémarre l'application.
      </Text>
      <TouchableOpacity
        onPress={retry}
        style={{ backgroundColor: '#FBBF24', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 12 }}
      >
        <Text style={{ color: '#0F172A', fontWeight: 'bold', fontSize: 15 }}>🔄 Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Layout() {
  const [pret, setPret] = useState(false);
  const [dortoir, setDortoir] = useState(false);
  useNetworkStatus();

  // 🛡️ App Check : protège Firebase des abus (une seule fois pour l'app).
  useEffect(() => {
    initAppCheck();
  }, []);

  // Accessibilité : la taille de police est appliquée PAR ÉCRAN via les styles
  // (voir parametres.tsx : petit/normal/grand). 🛡️ ANTI MONKEY-PATCH : l'ancien
  // code remplaçait Text.render globalement — irréversible, appliqué 2× à
  // chaque navigation, cassant les snapshots/tests et les tailles explicites.
  // On ne touche plus jamais au composant Text ici.
  useEffect(() => {
    setPret(true);
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
