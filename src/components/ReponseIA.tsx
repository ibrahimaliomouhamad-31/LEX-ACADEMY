/**
 * 🎨 RÉPONSE IA — rendu markdown riche des réponses de LEX.AI.
 *
 * Objectif : des réponses LISIBLES et motivantes (l'élève est au lycée au
 * Niger, souvent sur un petit écran) :
 *   - titres dorés avec barre de section,
 *   - VRAIS tableaux (en-tête, lignes alternées, défilement horizontal),
 *   - encadrés automatiques 💡/⚠️/✅/🎯 (conseil, piège, validation),
 *   - code et formules en chasse fixe,
 *   - apparition animée (fondu + glissement) via react-native-reanimated.
 *
 * Aucune librairie ajoutée : l'analyse est faite par services/markdownLex.ts.
 */

import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  EMOJIS_ENCADRE,
  analyserMarkdown,
  segmentsInline,
  type Bloc,
  type Segment,
} from '../services/markdownLex';

/** Couleur de bordure / de fond des encadrés automatiques. */
const COULEUR_ENCADRE: Record<string, string> = {
  info: '#38BDF8',
  attention: '#FBBF24',
  succes: '#10B981',
  objectif: '#A78BFA',
};

const COULEUR_FOND_ENCADRE: Record<string, string> = {
  info: '#0C2333',
  attention: '#2A1F08',
  succes: '#08251B',
  objectif: '#1E1633',
};

/** Rendu inline : gras (doré), italique, code et formules (chasse fixe). */
function Inline({ texte, styleBase }: { texte: string; styleBase?: object }) {
  const segments = useMemo(() => segmentsInline(texte), [texte]);
  return (
    <Text style={[styles.texte, styleBase]}>
      {segments.map((segment: Segment, i: number) => {
        const cle = `${segment.type}-${i}`;
        if (segment.type === 'gras') return <Text key={cle} style={styles.gras}>{segment.valeur}</Text>;
        if (segment.type === 'italique') return <Text key={cle} style={styles.italique}>{segment.valeur}</Text>;
        if (segment.type === 'code') return <Text key={cle} style={styles.codeInline}>{segment.valeur}</Text>;
        if (segment.type === 'formule') return <Text key={cle} style={styles.formule}>{segment.valeur}</Text>;
        return <Text key={cle}>{segment.valeur}</Text>;
      })}
    </Text>
  );
}

/** Vrai si la cellule est numérique → alignement à droite (tableau lisible). */
function estNumerique(cellule: string): boolean {
  return /^[-+]?[\d\s.,%°/]+$/.test(cellule.trim()) && /\d/.test(cellule);
}

function Tableau({ entetes, lignes }: { entetes: string[]; lignes: string[][] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableauCadre}>
      <View>
        <View style={[styles.tableauLigne, styles.tableauEntete]}>
          {entetes.map((cellule, c) => (
            <View key={`h-${c}`} style={[styles.tableauCellule, styles.tableauCelluleEntete]}>
              <Inline texte={cellule} styleBase={styles.tableauTexteEntete} />
            </View>
          ))}
        </View>
        {lignes.map((ligne, r) => (
          <View key={`r-${r}`} style={[styles.tableauLigne, r % 2 === 1 && styles.tableauLigneImpaire]}>
            {ligne.map((cellule, c) => (
              <View key={`c-${r}-${c}`} style={styles.tableauCellule}>
                <Inline
                  texte={cellule}
                  styleBase={estNumerique(cellule) ? styles.tableauTexteNombre : undefined}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function BlocRendu({ bloc }: { bloc: Bloc }) {
  if (bloc.type === 'separateur') return <View style={styles.separateur} />;

  if (bloc.type === 'titre') {
    const styleTitre =
      bloc.niveau === 1 ? styles.titre1 : bloc.niveau === 2 ? styles.titre2 : styles.titre3;
    return (
      <View style={styles.titreLigne}>
        <View style={[styles.titreBarre, bloc.niveau === 1 && styles.titreBarreN1]} />
        <Inline texte={bloc.texte} styleBase={styleTitre} />
      </View>
    );
  }

  if (bloc.type === 'liste') {
    return (
      <View style={styles.liste}>
        {bloc.items.map((item, i) => (
          <View key={i} style={styles.itemListe}>
            <Text style={bloc.ordonnee ? styles.marqueurNumero : styles.marqueur}>
              {bloc.ordonnee ? `${i + 1}.` : '•'}
            </Text>
            <Inline texte={item} styleBase={styles.texteItem} />
          </View>
        ))}
      </View>
    );
  }

  if (bloc.type === 'code') {
    return (
      <View style={styles.blocCode}>
        {bloc.langage !== '' && <Text style={styles.langageCode}>{bloc.langage}</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.texteCode}>{bloc.contenu}</Text>
        </ScrollView>
      </View>
    );
  }

  if (bloc.type === 'citation') {
    return (
      <View style={[styles.encadre, { borderLeftColor: '#FBBF24', backgroundColor: '#1E293B' }]}>
        <Inline texte={bloc.texte} styleBase={styles.texteCitation} />
      </View>
    );
  }

  if (bloc.type === 'tableau') {
    return <Tableau entetes={bloc.entetes} lignes={bloc.lignes} />;
  }

  // Paragraphe : devient un encadré coloré s'il commence par un emoji-clé.
  const emoji = Object.keys(EMOJIS_ENCADRE).find((e) => bloc.texte.startsWith(e));
  if (emoji) {
    const genre = EMOJIS_ENCADRE[emoji];
    return (
      <View
        style={[
          styles.encadre,
          { borderLeftColor: COULEUR_ENCADRE[genre], backgroundColor: COULEUR_FOND_ENCADRE[genre] },
        ]}
      >
        <Inline texte={bloc.texte} />
      </View>
    );
  }
  return <Inline texte={bloc.texte} />;
}

export default function ReponseIA({ texte }: { texte: string }) {
  const blocs = useMemo(() => analyserMarkdown(texte), [texte]);
  const opacite = useSharedValue(0);
  const glissement = useSharedValue(8);

  // Effet d'apparition : la réponse « arrive » au lieu de sauter à l'écran.
  useEffect(() => {
    opacite.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
    glissement.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
  }, [opacite, glissement, texte]);

  const apparition = useAnimatedStyle(() => ({
    opacity: opacite.value,
    transform: [{ translateY: glissement.value }],
  }));

  if (blocs.length === 0) return null;

  return (
    <Animated.View style={apparition}>
      {blocs.map((bloc, i) => (
        <BlocRendu key={i} bloc={bloc} />
      ))}
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  texte: { color: '#E2E8F0', fontSize: 14.5, lineHeight: 22 },
  gras: { color: '#FBBF24', fontWeight: '800' },
  italique: { fontStyle: 'italic', color: '#CBD5E1' },
  codeInline: { fontFamily: 'monospace', color: '#F8FAFC', backgroundColor: '#334155', fontSize: 13 },
  formule: { fontFamily: 'monospace', color: '#A7F3D0', backgroundColor: '#0B2B1F', fontSize: 13.5 },
  titreLigne: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  titreBarre: { width: 3, height: 16, borderRadius: 2, backgroundColor: '#FBBF24', marginRight: 8 },
  titreBarreN1: { height: 20 },
  titre1: { color: '#FBBF24', fontSize: 17, fontWeight: '800', lineHeight: 23 },
  titre2: { color: '#F8FAFC', fontSize: 15.5, fontWeight: '700', lineHeight: 22 },
  titre3: { color: '#CBD5E1', fontSize: 14.5, fontWeight: '700', fontStyle: 'italic', lineHeight: 21 },
  liste: { marginVertical: 6 },
  itemListe: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  marqueur: { color: '#FBBF24', fontSize: 15, fontWeight: '800', marginRight: 8, lineHeight: 22 },
  marqueurNumero: { color: '#FBBF24', fontSize: 13, fontWeight: '800', marginRight: 8, lineHeight: 22, minWidth: 16 },
  texteItem: { flex: 1 },
  encadre: { borderLeftWidth: 3, borderRadius: 10, padding: 10, marginVertical: 6 },
  texteCitation: { fontStyle: 'italic', color: '#E2E8F0' },
  blocCode: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  langageCode: { color: '#64748B', fontSize: 10, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' },
  texteCode: { color: '#93C5FD', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  tableauCadre: { marginVertical: 8 },
  tableauLigne: { flexDirection: 'row', alignItems: 'stretch' },
  tableauLigneImpaire: { backgroundColor: '#111827' },
  tableauEntete: { backgroundColor: '#1E293B', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  tableauCellule: {
    minWidth: 96,
    maxWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: '#1E293B',
  },
  tableauCelluleEntete: { borderColor: '#334155' },
  tableauTexteEntete: { color: '#FBBF24', fontWeight: '800', fontSize: 13 },
  tableauTexteNombre: { textAlign: 'right', fontFamily: 'monospace', color: '#A7F3D0' },
  separateur: { height: 1, backgroundColor: '#1E293B', marginVertical: 10 },
});

