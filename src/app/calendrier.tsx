import { useRouter } from 'expo-router';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 46 — CALENDRIER SCOLAIRE DU NIGER (année scolaire type) :
// les dates exactes varient selon les circulaires officielles ; ajustables
// directement dans cette liste.

interface EvenementScolaire {
  mois: number; // 1-12
  jour: number;
  titre: string;
  emoji: string;
  conseil: string;
}

const EVENEMENTS: EvenementScolaire[] = [
  { mois: 10, jour: 1, titre: 'Rentrée scolaire', emoji: '🎒', conseil: 'Nouvelle année : fixe tes objectifs dans l\'app dès maintenant !' },
  { mois: 11, jour: 15, titre: 'Compositions 1er trimestre', emoji: '📝', conseil: 'Priorité BAC blanc + révisions espacées chaque jour.' },
  { mois: 12, jour: 20, titre: 'Vacances de Noël', emoji: '🎄', conseil: 'Repose-toi... mais garde 10 min/jour de révisions pour la série 🔥 !' },
  { mois: 1, jour: 5, titre: 'Reprise des cours', emoji: '📚', conseil: 'Reprends le planning hebdo là où tu l\'avais laissé.' },
  { mois: 3, jour: 10, titre: 'Compositions 2e trimestre', emoji: '📝', conseil: 'Attaque tes chapitres rouges 📊 Ma maîtrise en priorité.' },
  { mois: 4, jour: 5, titre: 'Vacances de Pâques', emoji: '🐣', conseil: 'Une semaine idéale pour un BAC blanc complet + flashcards.' },
  { mois: 5, jour: 2, titre: 'Reprise (3e trimestre)', emoji: '⏳', conseil: 'Le sprint final : olympiades + annales en conditions réelles.' },
  { mois: 6, jour: 1, titre: 'BAC / examens', emoji: '🎓', conseil: 'Dernières révisions : formulaire + pièges du BAC + respirations.' },
  { mois: 7, jour: 10, titre: 'Fin de l\'année scolaire', emoji: '☀️', conseil: 'Bilan de l\'année dans 📈 Statistiques. Fierté garantie !' },
];

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function evenementsTries(): EvenementScolaire[] {
  const maintenant = new Date();
  const annee = maintenant.getMonth() >= 8 ? maintenant.getFullYear() : maintenant.getFullYear() - 1; // année scolaire commence en septembre/octobre
  return EVENEMENTS.map((e) => ({ ...e, date: new Date(annee, e.mois - 1, e.jour) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime()) as EvenementScolaire[];
}

export default function Calendrier() {
  const router = useRouter();
  const maintenant = new Date();

  // Prochain événement à venir
  const evenements = evenementsTries();
  const prochain = EVENEMENTS.find((e) => e.mois > maintenant.getMonth() + 1 || (e.mois === maintenant.getMonth() + 1 && e.jour >= maintenant.getDate()))
    || EVENEMENTS[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>ANNÉE SCOLAIRE AU NIGER</Text>
        <Text style={styles.title}>📆 Calendrier scolaire</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.carteProchain}>
          <Text style={styles.prochainLabel}>⏭️ PROCHAIN RENDEZ-VOUS</Text>
          <Text style={styles.prochainTitre}>{prochain.emoji} {prochain.titre}</Text>
          <Text style={styles.prochainDate}>le {prochain.jour} {MOIS[prochain.mois - 1]}</Text>
          <Text style={styles.prochainConseil}>💡 {prochain.conseil}</Text>
        </View>

        <Text style={styles.section}>Toute l'année scolaire</Text>
        {evenements.map((e, i) => {
          const passe = e.mois < maintenant.getMonth() + 1 || (e.mois === maintenant.getMonth() + 1 && e.jour < maintenant.getDate());
          return (
            <View key={i} style={[styles.evenement, passe && styles.evenementPasse]}>
              <Text style={styles.evtEmoji}>{passe ? '✅' : e.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.evtTitre}>{e.titre}</Text>
                <Text style={styles.evtDate}>{e.jour} {MOIS[e.mois - 1]}</Text>
                {!passe && <Text style={styles.evtConseil}>{e.conseil}</Text>}
              </View>
            </View>
          );
        })}
        <Text style={styles.note}>Les dates exactes (compositions, vacances) sont fixées par circulaires : elles peuvent varier d'une année à l'autre.</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  carteProchain: { backgroundColor: '#16233B', borderRadius: 14, padding: 20, marginBottom: 20, borderWidth: 1.5, borderColor: '#0EA5E9' },
  prochainLabel: { color: '#38BDF8', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  prochainTitre: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold' },
  prochainDate: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  prochainConseil: { color: '#CBD5E1', fontSize: 13, lineHeight: 19, marginTop: 10 },
  section: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  evenement: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 12, padding: 15, marginBottom: 8 },
  evenementPasse: { opacity: 0.5 },
  evtEmoji: { fontSize: 24, marginRight: 14 },
  evtTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold' },
  evtDate: { color: '#FBBF24', fontSize: 12, marginTop: 2 },
  evtConseil: { color: '#64748B', fontSize: 11, marginTop: 4, lineHeight: 16 },
  note: { color: '#475569', fontSize: 11, fontStyle: 'italic', marginTop: 8, lineHeight: 16 },
});
