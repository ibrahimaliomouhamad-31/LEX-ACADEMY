import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { liguePourXp } from '../services/motivation';
import { lireXpTotal } from '../services/xpLocal';
import { NIVEAUX_FILTRAGE, libelleNiveau } from '../services/authFirebase';
import { estInvite, getCurrentUserId } from '../services/userStorage';
import {
  chargerClassement,
  lireMonProfilPublic,
  maPosition,
  publierMonProfilPublic,
  type EleveClassement,
  type Position,
  type SourceClassement,
} from '../services/classementPublic';
import { rapporterErreur } from '../utils/logger';

export default function Classement() {
  const router = useRouter();
  const [eleves, setEleves] = useState<EleveClassement[]>([]);
  const [loading, setLoading] = useState(true);
  const [monXp, setMonXp] = useState(0);
  const [pseudo, setPseudo] = useState('Toi');
  const [uid, setUid] = useState<string | null>(null);
  // null = niveau pas encore déterminé (évite une double requête au montage).
  const [niveauSelection, setNiveauSelection] = useState<string | null>(null);
  const [source, setSource] = useState<SourceClassement>('vide');
  const [position, setPosition] = useState<Position | null>(null);

  // 📍 Repli local : XP, pseudo et niveau de l'élève courant (visibles hors-ligne)
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const [xp, nom, niveau, filtreMemorise, invite] = await Promise.all([
          lireXpTotal(),
          AsyncStorage.getItem('lex_user_nom'),
          AsyncStorage.getItem('lex_user_niveau'),
          AsyncStorage.getItem('@lex/filtre_niveau'),
          estInvite(),
        ]);
        const identifiant = invite ? null : await getCurrentUserId();
        if (!actif) return;
        setMonXp(xp || 0);
        setPseudo(nom || 'Toi');
        setUid(identifiant);
        // Priorité au niveau du compte : l'élève voit d'abord SA classe.
        setNiveauSelection(niveau || filtreMemorise || '');
      } catch (erreur) {
        rapporterErreur('app/classement.tsx', erreur);
        if (actif) setNiveauSelection('');
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  const fetchClassement = useCallback(
    async (niveau: string) => {
      setLoading(true);
      try {
        //  Republie d'abord MA fiche publique : sans la Cloud Function
        // (plan Spark), c'est l'app qui alimente `classement_public`.
        await publierMonProfilPublic();
        const resultat = await chargerClassement(niveau);
        setEleves(resultat.eleves);
        setSource(resultat.source);
        // Rang réel : XP publié si disponible (élève connecté), sinon XP local.
        const profilPublic = await lireMonProfilPublic(uid);
        const xpReference = profilPublic?.xp ?? monXp;
        setPosition(await maPosition(niveau, xpReference));
      } catch (erreur) {
        rapporterErreur('Erreur classement : ', erreur);
      } finally {
        setLoading(false);
      }
    },
    [monXp, uid]
  );

  useEffect(() => {
    if (niveauSelection === null) return;
    fetchClassement(niveauSelection);
  }, [niveauSelection, fetchClassement]);

  // Persistance du filtre niveau choisi par l'élève
  useEffect(() => {
    if (niveauSelection === null) return;
    AsyncStorage.setItem('@lex/filtre_niveau', niveauSelection || '').catch((e) =>
      rapporterErreur('app/classement.tsx', e)
    );
  }, [niveauSelection]);

  /** Repère SA ligne : par UID si connu, sinon par nom (mode invité/hors-ligne). */
  const estMaCarte = (eleve: EleveClassement): boolean => {
    if (uid && eleve.uid) return eleve.uid === uid;
    return Boolean(pseudo) && eleve.nom === pseudo;
  };

  if (loading || niveauSelection === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={styles.loadingText}>Calcul du classement du LEX...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour au menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 CLASSEMENT DU LEX</Text>
        {/* 🎯 Où en est l'élève, sans avoir à scroller 50 lignes */}
        {position && niveauSelection ? (
          <Text style={styles.position}>
            🎓 {position.position}
            {position.position === 1 ? 'er' : 'e'} sur {position.total} élève
            {position.total > 1 ? 's' : ''} en {libelleNiveau(niveauSelection)}
          </Text>
        ) : null}
      </View>

      {/* 🔍 Filtre par niveau scolaire */}
      <View style={styles.filtreContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtreScroll}>
          <TouchableOpacity
            style={[styles.filtreBtn, !niveauSelection && styles.filtreBtnActif]}
            onPress={() => setNiveauSelection('')}
          >
            <Text style={[styles.filtreText, !niveauSelection && styles.filtreTextActif]}>🌍 General</Text>
          </TouchableOpacity>
          {NIVEAUX_FILTRAGE.map((n) => (
            <TouchableOpacity
              key={n.valeur}
              style={[styles.filtreBtn, niveauSelection === n.valeur && styles.filtreBtnActif]}
              onPress={() => setNiveauSelection(n.valeur)}
            >
              <Text style={[styles.filtreText, niveauSelection === n.valeur && styles.filtreTextActif]}>{n.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 📶 Classement resservi depuis le cache : l'élève garde au moins le
            dernier top connu quand le réseau tombe (cas fréquent au Niger). */}
        {source === 'cache' && (
          <View style={styles.banniereHorsLigne}>
            <Text style={styles.banniereTexte}>
              📶 Hors-ligne : voici le dernier classement connu.
            </Text>
          </View>
        )}
        {/* 📍 Repli 100% hors-ligne : ta carte locale (XP + ligue) quand le
            classement du LEX n'est pas joignable (cas principal au Niger). */}
        {eleves.length === 0 && (
          <View style={[styles.rankCard, { borderLeftColor: '#10B981' }]}>
            <Text style={styles.rankNumber}>—</Text>
            <View style={styles.info}>
              <Text style={styles.rankAvatar}>🎓</Text>
              <Text style={styles.name}>{pseudo}</Text>
              <Text style={styles.class}>Classement du LEX indisponible hors-ligne 📶</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.xp}>{monXp} XP</Text>
              <Text style={styles.ligue}>{liguePourXp(monXp).emoji} {liguePourXp(monXp).nom}</Text>
            </View>
          </View>
        )}
        {eleves.map((eleve, index) => (
          <View
            key={eleve.uid || index}
            style={[styles.rankCard, estMaCarte(eleve) && styles.rankCardMoi]}
          >
            <Text style={styles.rankNumber}>{index + 1}</Text>
            <View style={styles.info}>
              <Text style={styles.rankAvatar}>{eleve.avatar || '🎓'}</Text>
              {/* 🟢 Repère visuel : l'élève retrouve instantanément sa ligne */}
              <Text style={styles.name}>
                {eleve.nom}
                {estMaCarte(eleve) ? ' 🟢 (c’est toi !)' : ''}
              </Text>
              <Text style={styles.class}>{eleve.classe}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {/* 🏅 Ligue affichée (Bronze → Légende) */}
              <Text style={styles.ligue}>{liguePourXp(Number(eleve.xp) || 0).emoji} {liguePourXp(Number(eleve.xp) || 0).nom}</Text>
              <Text style={styles.xp}>{eleve.xp} XP</Text>
              {eleve.xp_semaine ? (
                <Text style={styles.xpSemaine}>📅 {eleve.xp_semaine} cette semaine</Text>
              ) : null}
            </View>
          </View>
        ))}
        <View style={{height: 30}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingText: { color: '#FBBF24', marginTop: 15, fontSize: 16, textAlign: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  position: { color: '#34D399', fontSize: 13, textAlign: 'center', marginTop: 8 },
  banniereHorsLigne: {
    backgroundColor: '#78350F',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  banniereTexte: { color: '#FDE68A', fontSize: 13, textAlign: 'center' },
  scrollView: { paddingHorizontal: 20 },
  rankCard: { 
    flexDirection: 'row', 
    backgroundColor: '#1E293B', 
    borderRadius: 12, 
    padding: 20, 
    marginBottom: 15, 
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#FBBF24'
  },
  rankCardMoi: { borderLeftColor: '#10B981', borderWidth: 1, borderColor: '#10B981' },
  rankNumber: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold', marginRight: 20, width: 30 },
  info: { flex: 1 },
  rankAvatar: { fontSize: 30, marginBottom: 5 },
  name: { color: '#F8FAFC', fontSize: 18, fontWeight: 'bold' },
  class: { color: '#94A3B8', fontSize: 14 },
  xp: { color: '#34D399', fontSize: 16, fontWeight: 'bold' },
  ligue: { color: '#8B5CF6', fontSize: 11, fontWeight: 'bold' },
    xpSemaine: { color: '#64748B', fontSize: 10, marginTop: 2 },
  filtreContainer: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#0F172A' },
  filtreScroll: { flexDirection: 'row' },
  filtreBtn: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#334155' },
  filtreBtnActif: { backgroundColor: '#10B981' },
  filtreText: { color: '#94A3B8', fontSize: 14 },
  filtreTextActif: { color: '#0F172A', fontWeight: 'bold' },
});