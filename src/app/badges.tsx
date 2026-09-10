import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUserItem } from '../services/userStorage';
import { BADGES_MATIERE, getBadgesMatieresObtenus, reussitesParMatiere } from '../services/badgesMatiere';
import { bloquerSiExamen } from '../services/parametres';
import { CITATIONS, citationAleatoire } from '../services/citations';

interface BadgeSecret {
  id: string; titre: string; emoji: string; description: string;
  condition: string; debloque: boolean; rarete: 'commun' | 'rare' | 'epique' | 'legendaire';
}

const BADGES_SECRETS: BadgeSecret[] = [
  { id: 'premier_pas', titre: 'Premier Pas', emoji: '👣', description: 'Résoudre ton premier exercice', condition: '1 exercice résolu', debloque: false, rarete: 'commun' },
  { id: 'serie_5', titre: 'En Feu', emoji: '🔥', description: '5 bonnes réponses consécutives', condition: 'Série de 5', debloque: false, rarete: 'commun' },
  { id: 'serie_10', titre: 'Inarrêtable', emoji: '⚡', description: '10 bonnes réponses consécutives', condition: 'Série de 10', debloque: false, rarete: 'rare' },
  { id: 'matinal', titre: 'Lève-tôt', emoji: '🌅', description: 'Réviser avant 7h du matin', condition: 'Exercice avant 7h', debloque: false, rarete: 'rare' },
  { id: 'nocturne', titre: 'Veilleur', emoji: '🌙', description: 'Réviser après 22h', condition: 'Exercice après 22h', debloque: false, rarete: 'rare' },
  { id: 'cent_exos', titre: 'Centurion', emoji: '💯', description: 'Résoudre 100 exercices', condition: '100 exercices', debloque: false, rarete: 'epique' },
  { id: 'bac_blanc_15', titre: 'Aspiring BAC', emoji: '🎯', description: 'Avoir 15/20 à un BAC blanc', condition: 'BAC blanc >= 15', debloque: false, rarete: 'epique' },
  { id: 'zero_erreur', titre: 'Perfection', emoji: '💎', description: '20 exercices sans erreur', condition: '20/20', debloque: false, rarete: 'legendaire' },
  { id: 'tessaoua_champion', titre: 'Champion de Tessaoua', emoji: '🏆', description: 'Top 1 du classement', condition: 'Rang #1', debloque: false, rarete: 'legendaire' },
  { id: 'semaine_complete', titre: 'Assidu', emoji: '📅', description: 'Réviser 7 jours de suite', condition: 'Streak de 7', debloque: false, rarete: 'epique' },
];

export default function Badges() {
  const router = useRouter();
  // 🛡️ VERROU EXAMEN DIRECT : bloque même en accès direct (deep link).
  useEffect(() => { bloquerSiExamen(router, 'Badges'); }, []);
  const [badges, setBadges] = useState<BadgeSecret[]>(BADGES_SECRETS);
  const [citation, setCitation] = useState(citationAleatoire());
  const [stats, setStats] = useState({ debloques: 0, total: BADGES_SECRETS.length });
  const [badgesMatiere, setBadgesMatiere] = useState<{ id: string; obtenu: boolean; progression: number }[]>([]);

  useEffect(() => {
    chargerBadges();
    chargerBadgesMatiere();
    setCitation(citationAleatoire());
  }, []);

  const chargerBadgesMatiere = async () => {
    try {
      const obtenus = await getBadgesMatieresObtenus();
      const liste = await Promise.all(
        BADGES_MATIERE.map(async (b) => ({
          id: b.id,
          obtenu: obtenus.includes(b.id),
          progression: Math.min(100, Math.round((await reussitesParMatiere(b.matiere)) / b.seuil * 100)),
        })),
      );
      setBadgesMatiere(liste);
    } catch {}
  };

  const chargerBadges = async () => {
    try {
      const data = await getUserItem('lex_badges_debloques');
      if (data) {
        const debloques = JSON.parse(data) as string[];
        const misAJour = BADGES_SECRETS.map(b => ({ ...b, debloque: debloques.includes(b.id) }));
        setBadges(misAJour);
        setStats({ debloques: debloques.length, total: BADGES_SECRETS.length });
      }
    } catch {}
  };

  const couleurRarete = (rarete: string): string => {
    switch (rarete) {
      case 'legendaire': return '#FBBF24';
      case 'epique': return '#8B5CF6';
      case 'rare': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>GAMIFICATION</Text>
        <Text style={styles.title}>Badges & Succes</Text>
      </View>
      <View style={styles.citationBox}>
        <Text style={styles.citationText}>"{citation.texte}"</Text>
        <Text style={styles.citationAuteur}>- {citation.auteur}</Text>
      </View>
      <View style={styles.barreStats}>
        <View style={styles.statBox}>
          <Text style={styles.statValeur}>{stats.debloques}</Text>
          <Text style={styles.statLabel}>Debloques</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValeur, { color: '#FBBF24' }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValeur, { color: '#10B981' }]}>{Math.round((stats.debloques / stats.total) * 100)}%</Text>
          <Text style={styles.statLabel}>Progression</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.sectionTitle}>Badges Secrets</Text>
        {badges.map((badge) => (
          <View key={badge.id} style={[styles.carteBadge, badge.debloque && styles.carteBadgeDebloque]}>
            <View style={styles.badgeHeader}>
              <Text style={[styles.badgeEmoji, !badge.debloque && styles.badgeVerrouille]}>{badge.debloque ? badge.emoji : '🔒'}</Text>
              <View style={styles.badgeInfo}>
                <Text style={[styles.badgeTitre, !badge.debloque && styles.texteVerrouille]}>{badge.titre}</Text>
                <Text style={[styles.badgeDescription, !badge.debloque && styles.texteVerrouille]}>{badge.description}</Text>
              </View>
              <View style={[styles.rareteBadge, { backgroundColor: couleurRarete(badge.rarete) }]}>
                <Text style={styles.rareteText}>{badge.rarete}</Text>
              </View>
            </View>
            {!badge.debloque && (<Text style={styles.conditionText}>Condition: {badge.condition}</Text>)}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Badges par Matiere</Text>
        {BADGES_MATIERE.map((b) => {
          const etat = badgesMatiere.find((e) => e.id === b.id);
          const obtenu = etat?.obtenu ?? false;
          return (
            <View key={b.id} style={[styles.carteBadge, obtenu && styles.carteBadgeDebloque]}>
              <View style={styles.badgeHeader}>
                <Text style={[styles.badgeEmoji, !obtenu && styles.badgeVerrouille]}>{obtenu ? b.emoji : '🔒'}</Text>
                <View style={styles.badgeInfo}>
                  <Text style={[styles.badgeTitre, !obtenu && styles.texteVerrouille]}>{b.titre}</Text>
                  <Text style={[styles.badgeDescription, !obtenu && styles.texteVerrouille]}>{b.condition} · {b.matiere}</Text>
                </View>
              </View>
              <View style={{ height: 6, backgroundColor: '#0B1120', borderRadius: 3, marginTop: 6 }}>
                <View style={{ height: 6, borderRadius: 3, width: `${etat?.progression ?? 0}%`, backgroundColor: obtenu ? '#10B981' : '#FBBF24' }} />
              </View>
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10, backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F9FAFB', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  citationBox: { backgroundColor: '#111827', borderRadius: 14, padding: 20, marginHorizontal: 20, marginBottom: 15, borderWidth: 1, borderColor: '#374151' },
  citationText: { color: '#E5E7EB', fontSize: 15, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  citationAuteur: { color: '#9CA3AF', fontSize: 13, textAlign: 'right' },
  barreStats: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 15 },
  statBox: { flex: 1, backgroundColor: '#111827', borderRadius: 14, padding: 14, marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  statValeur: { color: '#FBBF24', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
  sectionTitle: { color: '#FBBF24', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  carteBadge: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151', opacity: 0.6 },
  carteBadgeDebloque: { opacity: 1, borderColor: '#FBBF24' },
  badgeHeader: { flexDirection: 'row', alignItems: 'center' },
  badgeEmoji: { fontSize: 40, marginRight: 12 },
  badgeVerrouille: { opacity: 0.3 },
  badgeInfo: { flex: 1 },
  badgeTitre: { color: '#F9FAFB', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  badgeDescription: { color: '#9CA3AF', fontSize: 13 },
  texteVerrouille: { color: '#6B7280' },
  rareteBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  rareteText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  conditionText: { color: '#6B7280', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});
