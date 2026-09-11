import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { genererParcours, prochaineAction, couleurNiveau, emojiNiveau, type ParcoursPersonnalise } from '../services/parcoursPersonnalise';
import { getLangue } from '../services/parametres';

const CHAPITRES = [
  { id: 'math-algebre', titre: 'Algebre', matiere: 'Mathematiques' },
  { id: 'math-analyse', titre: 'Analyse', matiere: 'Mathematiques' },
  { id: 'math-geometrie', titre: 'Geometrie', matiere: 'Mathematiques' },
  { id: 'math-proba', titre: 'Probabilites', matiere: 'Mathematiques' },
  { id: 'pc-meca', titre: 'Mecanique', matiere: 'Physique-Chimie' },
  { id: 'pc-elec', titre: 'Electricite', matiere: 'Physique-Chimie' },
  { id: 'pc-chimie', titre: 'Chimie organique', matiere: 'Physique-Chimie' },
  { id: 'svt-cell', titre: 'La cellule', matiere: 'SVT' },
  { id: 'svt-gene', titre: 'Genetique', matiere: 'SVT' },
  { id: 'svt-eco', titre: 'Ecologie', matiere: 'SVT' },
];

export default function Parcours() {
  const router = useRouter();
  const [parcours, setParcours] = useState<ParcoursPersonnalise | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [langue, setLangue] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    (async () => {
      try {
        setLangue(await getLangue());
        setParcours(await genererParcours(CHAPITRES));
        const { action: a } = await prochaineAction(CHAPITRES);
        setAction(a);
      } catch { /* ignore */ } finally { setChargement(false); }
    })();
  }, []);

  const t = (fr: string, en: string) => (langue === 'fr' ? fr : en);

  if (chargement || !parcours) {
    return (
      <View style={[styles.container, styles.centre]}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.chargement}>{t('Generation de ton parcours...', 'Building your path...')}</Text>
      </View>
    );
  }

  const pctTermine = parcours.resume.totalChapitres === 0
    ? 0
    : Math.round((parcours.resume.maitrises / parcours.resume.totalChapitres) * 100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.subject}>{t('PARCOURS PERSONNALISE', 'PERSONALIZED PATH')}</Text>
        <Text style={styles.title}>{t('Mon parcours', 'My path')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {action && (
          <View style={styles.carteAction}>
            <Text style={styles.actionLabel}>{t('PROCHAINE ETAPE', 'NEXT STEP')}</Text>
            <Text style={styles.actionTexte}>{action}</Text>
          </View>
        )}

        <View style={styles.carteResume}>
          <Text style={styles.resumeTitre}>
            {t('Progression globale', 'Overall progress')} — {pctTermine}%
          </Text>
          <View style={styles.barreFond}>
            <View style={[styles.barre, { width: `${pctTermine}%` }]} />
          </View>
          <Text style={styles.resumeDetail}>
            {parcours.resume.faibles} faibles / {parcours.resume.moyens} moyens / {parcours.resume.maitrises} maitrises / {parcours.resume.nonCommences} a decouvrir
          </Text>
          <Text style={styles.conseil}>{parcours.conseil}</Text>
        </View>

        {parcours.etapes.map((etape, index) => (
          <View key={etape.chapitreId} style={styles.carte}>
            <View style={styles.carteHaut}>
              <Text style={styles.rang}>#{index + 1}</Text>
              <View style={styles.carteInfo}>
                <Text style={styles.carteTitre} numberOfLines={1}>
                  {emojiNiveau(etape.niveau)} {etape.titre}
                </Text>
                <Text style={styles.carteMatiere}>{etape.matiere} - {etape.tauxMaitrise}%</Text>
              </View>
              <View style={[styles.pastille, { backgroundColor: couleurNiveau(etape.niveau) }]}>
                <Text style={styles.pastilleTexte}>
                  {etape.statut === 'termine' ? 'OK' : etape.statut === 'en_cours' ? '..' : 'O'}
                </Text>
              </View>
            </View>
            <View style={styles.barreFond}>
              <View style={[styles.barreEtape, { width: `${etape.tauxMaitrise}%`, backgroundColor: couleurNiveau(etape.niveau) }]} />
            </View>
            <Text style={styles.reco}>
              {t('Niveau recommande :', 'Recommended level:')} {etape.difficulteRecommandee}/3
            </Text>
            <TouchableOpacity
              style={styles.bouton}
              onPress={() => router.push('/exercices' as never)}
            >
              <Text style={styles.boutonTexte}>{t('Se entrainer', 'Practice')}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centre: { justifyContent: 'center', alignItems: 'center' },
  chargement: { color: '#94A3B8', fontSize: 15 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  carteAction: { backgroundColor: '#78350F', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#FBBF24' },
  actionLabel: { color: '#FBBF24', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 6 },
  actionTexte: { color: '#FEF3C7', fontSize: 14, lineHeight: 20 },
  carteResume: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  resumeTitre: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  barreFond: { height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden' },
  barre: { height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  barreEtape: { height: 8, borderRadius: 4 },
  resumeDetail: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
  conseil: { color: '#FBBF24', fontSize: 13, fontStyle: 'italic', marginTop: 10, lineHeight: 19 },
  carte: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  carteHaut: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rang: { color: '#FBBF24', fontSize: 16, fontWeight: 'bold', marginRight: 10 },
  carteInfo: { flex: 1, marginRight: 10 },
  carteTitre: { color: '#F8FAFC', fontSize: 14, fontWeight: 'bold', textTransform: 'capitalize' },
  carteMatiere: { color: '#64748B', fontSize: 12, marginTop: 2 },
  pastille: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  pastilleTexte: { color: '#0F172A', fontSize: 12, fontWeight: 'bold' },
  reco: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
  bouton: { backgroundColor: '#FBBF24', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  boutonTexte: { color: '#0F172A', fontSize: 14, fontWeight: 'bold' },
});