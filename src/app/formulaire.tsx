import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, chercherFormules, type Formule } from '../services/formulaire';

const CLE_FAVORIS = 'lex_formulaire_favoris';

const FILTRE_FAVORIS = '\u2B50 Favoris';
const FILTRE_TOUTES = 'Toutes';

type ChoixMatiere = 'Toutes' | 'Math\u00E9matiques' | 'Physique-Chimie';

const SEGMENTS: { cle: ChoixMatiere; libelle: string }[] = [
  { cle: 'Toutes', libelle: 'Toutes' },
  { cle: 'Math\u00E9matiques', libelle: '\u{1F4D0} Maths' },
  { cle: 'Physique-Chimie', libelle: '\u2697\uFE0F PC' },
];

interface ProprietesCarte {
  formule: Formule;
  estFavori: boolean;
  estOuverte: boolean;
  onAppuiCarte: (id: string) => void;
  onAppuiEtoile: (id: string) => void;
}

function CarteFormule({
  formule: f,
  estFavori,
  estOuverte,
  onAppuiCarte,
  onAppuiEtoile,
}: ProprietesCarte): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.carte}
      activeOpacity={0.85}
      onPress={() => onAppuiCarte(f.id)}
    >
      <View style={styles.carteHaut}>
        <View style={styles.carteTextes}>
          <Text style={styles.carteTitre}>{f.titre}</Text>
          <Text style={styles.carteCategorie}>
            {f.categorie} {'\u2022'} {f.niveau}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.boutonEtoile}
          onPress={() => onAppuiEtoile(f.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={estFavori ? styles.etoileActive : styles.etoileInactive}>
            {estFavori ? '\u2B50' : '\u2606'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.carteFormule}>{f.formule}</Text>
      {estOuverte ? <Text style={styles.carteExplication}>{f.explication}</Text> : null}
    </TouchableOpacity>
  );
}

export default function Formulaire() {
  const router = useRouter();
  const [recherche, setRecherche] = useState('');
  const [matiere, setMatiere] = useState<ChoixMatiere>('Toutes');
  const [categorie, setCategorie] = useState<string>(FILTRE_TOUTES);
  const [favoris, setFavoris] = useState<string[]>([]);
  const [idOuvert, setIdOuvert] = useState<string | null>(null);

  // Chargement des favoris depuis le stockage local
  useEffect(() => {
    let actif = true;
    AsyncStorage.getItem(CLE_FAVORIS)
      .then((brut: string | null) => {
        if (!actif || brut === null) return;
        try {
          const analyse: unknown = JSON.parse(brut);
          if (Array.isArray(analyse)) {
            setFavoris(analyse.filter((element): element is string => typeof element === 'string'));
          }
        } catch {
          // Donn\u00E9es corrompues : on repart d'une liste vide
        }
      })
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);

  const basculerFavori = useCallback(
    (id: string): void => {
      const nouveaux = favoris.includes(id)
        ? favoris.filter((element) => element !== id)
        : [...favoris, id];
      setFavoris(nouveaux);
      void AsyncStorage.setItem(CLE_FAVORIS, JSON.stringify(nouveaux)).catch(() => undefined);
    },
    [favoris],
  );

  const categoriesVisibles = useMemo<string[]>(() => {
    const source =
      matiere === 'Toutes'
        ? CATEGORIES
        : CATEGORIES.filter((groupe) => groupe.matiere === matiere);
    const uniques: string[] = [];
    for (const groupe of source) {
      for (const cat of groupe.categories) {
        if (!uniques.includes(cat)) uniques.push(cat);
      }
    }
    return uniques;
  }, [matiere]);

  const resultats = useMemo<Formule[]>(() => {
    let liste = chercherFormules(recherche);
    if (matiere !== 'Toutes') {
      liste = liste.filter((f) => f.matiere === matiere);
    }
    if (categorie === FILTRE_FAVORIS) {
      liste = liste.filter((f) => favoris.includes(f.id));
    } else if (categorie !== FILTRE_TOUTES) {
      liste = liste.filter((f) => f.categorie === categorie);
    }
    return liste;
  }, [recherche, matiere, categorie, favoris]);

  const choisirMatiere = (choix: ChoixMatiere): void => {
    setMatiere(choix);
    setCategorie(FILTRE_TOUTES);
  };

  const appuiCarte = (id: string): void => {
    setIdOuvert((courant) => (courant === id ? null : id));
  };

  return (
    <View style={styles.conteneur}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* En-t\u00EAte */}
      <View style={styles.entete}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.boutonRetour}>{'\u2039'} Retour</Text>
        </TouchableOpacity>
        <Text style={styles.titre}>{'\u{1F4DA}'} Formulaire</Text>
        <Text style={styles.sousTitre}>Toutes tes formules, même hors-ligne</Text>
      </View>

      {/* Barre de recherche */}
      <TextInput
        style={styles.champRecherche}
        placeholder="Rechercher une formule (ex : Pythagore, \u0394, ln)\u2026"
        placeholderTextColor="#64748B"
        value={recherche}
        onChangeText={setRecherche}
        autoCorrect={false}
        returnKeyType="search"
      />

      {/* Segmented Maths / PC */}
      <View style={styles.segmente}>
        {SEGMENTS.map((segment) => (
          <TouchableOpacity
            key={segment.cle}
            style={[styles.segment, matiere === segment.cle ? styles.segmentActif : null]}
            onPress={() => choisirMatiere(segment.cle)}
          >
            <Text style={[styles.segmentTexte, matiere === segment.cle ? styles.segmentTexteActif : null]}>
              {segment.libelle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chips de cat\u00E9gories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rangeeChips}
        contentContainerStyle={styles.conteneurChips}
      >
        {[FILTRE_FAVORIS, FILTRE_TOUTES, ...categoriesVisibles].map((filtre) => (
          <TouchableOpacity
            key={filtre}
            style={[styles.chip, categorie === filtre ? styles.chipActive : null]}
            onPress={() => setCategorie(filtre === categorie ? FILTRE_TOUTES : filtre)}
          >
            <Text style={[styles.chipTexte, categorie === filtre ? styles.chipTexteActif : null]}>
              {filtre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Compteur */}
      <View style={styles.rangeeBadge}>
        <Text style={styles.badge}>
          {resultats.length} formule{resultats.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* R\u00E9sultats */}
      <ScrollView
        style={styles.liste}
        contentContainerStyle={styles.conteneurListe}
        keyboardShouldPersistTaps="handled"
      >
        {resultats.map((f) => (
          <CarteFormule
            key={f.id}
            formule={f}
            estFavori={favoris.includes(f.id)}
            estOuverte={idOuvert === f.id}
            onAppuiCarte={appuiCarte}
            onAppuiEtoile={basculerFavori}
          />
        ))}
        {resultats.length === 0 ? (
          <View style={styles.vide}>
            <Text style={styles.videTitre}>{'\u{1F50D}'} Aucune formule trouvée</Text>
            <Text style={styles.videTexte}>
              Essaie un autre mot-clé ou sélectionne « Toutes » dans les filtres.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 64,
  },
  entete: {
    marginBottom: 14,
  },
  boutonRetour: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  titre: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
  },
  sousTitre: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  champRecherche: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#F8FAFC',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  segmente: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentActif: {
    backgroundColor: '#3B82F6',
  },
  segmentTexte: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTexteActif: {
    color: '#F8FAFC',
  },
  rangeeChips: {
    flexGrow: 0,
    marginBottom: 10,
  },
  conteneurChips: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: '#FBBF24',
    borderColor: '#FBBF24',
  },
  chipTexte: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTexteActif: {
    color: '#0F172A',
    fontWeight: '700',
  },
  rangeeBadge: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#334155',
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  liste: {
    flex: 1,
  },
  conteneurListe: {
    paddingBottom: 40,
  },
  carte: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 10,
  },
  carteHaut: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  carteTextes: {
    flex: 1,
    paddingRight: 8,
  },
  carteTitre: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  carteCategorie: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  boutonEtoile: {
    padding: 4,
  },
  etoileActive: {
    fontSize: 20,
  },
  etoileInactive: {
    fontSize: 20,
    color: '#64748B',
  },
  carteFormule: {
    color: '#FBBF24',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 10,
    lineHeight: 30,
  },
  carteExplication: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  vide: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  videTitre: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  videTexte: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
});
