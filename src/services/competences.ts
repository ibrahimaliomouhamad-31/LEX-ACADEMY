// COMPÉTENCES : auto-évaluation officielle + suggestions de chapitres (amélioration 3)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toutesCompetences, type CompetenceOfficielle } from './programmeOfficiel';

export interface EtatCompetence {
  competence: CompetenceOfficielle;
  niveau: number; // 0-100
  verdict: 'acquis' | 'en cours' | 'à revoir';
}

const CLE = '@lex/evalCompetences';

export async function getEvaluations(): Promise<Record<string, number>> {
  const brut = await AsyncStorage.getItem(CLE);
  return brut ? (JSON.parse(brut) as Record<string, number>) : {};
}

/** L'élève s'auto-évalue (1 à 5) sur une compétence ; converti en % . */
export async function evaluerCompetence(idCompetence: string, note: 1 | 2 | 3 | 4 | 5): Promise<void> {
  const evals = await getEvaluations();
  evals[idCompetence] = Math.round(((note - 1) / 4) * 100);
  await AsyncStorage.setItem(CLE, JSON.stringify(evals));
}

/** Fusionne auto-évaluation + maîtrise des exercices pour un état complet. */
export async function etatsCompetences(filiere: 'C' | 'D', maitriseExercices: Record<string, number>): Promise<EtatCompetence[]> {
  const evals = await getEvaluations();
  return toutesCompetences(filiere).map((c) => {
    const auto = evals[c.id] ?? -1;
    const exo = maitriseExercices[c.id] ?? -1;
    const niveau = auto >= 0 && exo >= 0 ? Math.round((auto + exo) / 2) : auto >= 0 ? auto : exo >= 0 ? exo : 0;
    return {
      competence: c,
      niveau,
      verdict: niveau >= 70 ? 'acquis' : niveau >= 40 ? 'en cours' : 'à revoir',
    };
  });
}

/** Compétences les plus faibles → chapitres conseillés. */
export function chapitresSuggeres(etats: EtatCompetence[], max = 4): EtatCompetence[] {
  return etats.filter((e) => e.verdict === 'à revoir').sort((a, b) => a.niveau - b.niveau).slice(0, max);
}