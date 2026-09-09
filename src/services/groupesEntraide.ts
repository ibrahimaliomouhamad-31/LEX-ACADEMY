// GROUPES D'ENTRAIDE : mini-forum local par matière, 100% élève (amélioration 20)
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MessageGroupe {
  id: string;
  auteur: string;
  matiere: string;
  texte: string;
  horodatage: number;
}

export interface Groupe {
  matiere: string;
  emoji: string;
  membres: number;
}

export const GROUPES_DISPONIBLES: Groupe[] = [
  { matiere: 'Mathématiques', emoji: '📐', membres: 0 },
  { matiere: 'Physique-Chimie', emoji: '⚗️', membres: 0 },
  { matiere: 'SVT', emoji: '🧬', membres: 0 },
  { matiere: 'Anglais', emoji: '🇬🇧', membres: 0 },
  { matiere: 'Philosophie', emoji: '🦉', membres: 0 },
];

const CLE = '@lex/messagesGroupes';

/** Modération automatique : bloque spam, majuscules abusives, mots interdits, liens. */
export function messageAutorise(texte: string): { ok: boolean; raison?: string } {
  const t = (texte || '').trim();
  if (t.length < 2) return { ok: false, raison: 'Message trop court' };
  if (t.length > 500) return { ok: false, raison: 'Message trop long (max 500)' };
  if (/(https?:\/\/|www\.)/i.test(t)) return { ok: false, raison: 'Les liens sont interdits' };
  const sansEspaces = t.replace(/\s/g, '');
  if (sansEspaces.length >= 8 && sansEspaces === sansEspaces.toUpperCase() && /[A-ZÀ-Ÿ]/.test(sansEspaces)) {
    return { ok: false, raison: 'Évite les MAJUSCULES abusives' };
  }
  if (/(.)\1{6,}/.test(t)) return { ok: false, raison: 'Trop de répétitions (spam ?)' };
  const interdits = ['idiot', 'bête', 'stupide', 'connard'];
  const bas = t.toLowerCase();
  if (interdits.some((m) => bas.includes(m))) return { ok: false, raison: 'Reste respectueux 💙' };
  return { ok: true };
}

export async function getMessages(matiere: string): Promise<MessageGroupe[]> {
  const brut = await AsyncStorage.getItem(`${CLE}:${matiere}`);
  return brut ? (JSON.parse(brut) as MessageGroupe[]) : [];
}

export async function envoyerMessage(matiere: string, auteur: string, texte: string): Promise<{ ok: boolean; raison?: string }> {
  const verif = messageAutorise(texte);
  if (!verif.ok) return verif;
  const msgs = await getMessages(matiere);
  msgs.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    auteur: auteur || 'Anonyme',
    matiere,
    texte: texte.trim(),
    horodatage: Date.now(),
  });
  // Garde les 200 derniers messages par groupe (poids local minimal)
  await AsyncStorage.setItem(`${CLE}:${matiere}`, JSON.stringify(msgs.slice(-200)));
  return { ok: true };
}