// GROUPES D'ENTRAIDE : mini-forum local par matière, 100% élève (amélioration 20)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { genererIdUnique, parseObjetJSON, parseTableauJSON } from '../utils/correctifsAudit';

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
  try {
    const brut = await AsyncStorage.getItem(`${CLE}:${matiere}`);
    const tableau = parseTableauJSON(brut);
    return tableau.filter((m): m is MessageGroupe =>
      !!m && typeof m === 'object' && typeof (m as MessageGroupe).id === 'string' && typeof (m as MessageGroupe).texte === 'string'
    ) as MessageGroupe[];
  } catch {
    return [];
  }
}

export async function envoyerMessage(matiere: string, auteur: string, texte: string): Promise<{ ok: boolean; raison?: string }> {
  const verif = messageAutorise(texte);
  if (!verif.ok) return verif;
  const msgs = await getMessages(matiere);
  msgs.push({
    id: genererIdUnique('msg'),
    auteur: auteur || 'Anonyme',
    matiere,
    texte: texte.trim(),
    horodatage: Date.now(),
  });
  // Garde les 200 derniers messages par groupe (poids local minimal)
  await AsyncStorage.setItem(`${CLE}:${matiere}`, JSON.stringify(msgs.slice(-200)));
  return { ok: true };
}

// 💙 RÉACTIONS (amélioration 10) : un cœur par message, togglable par l'élève.
const CLE_REACTIONS = '@lex/reactionsGroupes';

/** Toggle le cœur de l'élève local sur un message. Retourne le nouveau total. */
export async function reagirMessage(matiere: string, idMessage: string): Promise<number> {
  try {
    const brut = await AsyncStorage.getItem(`${CLE_REACTIONS}:${matiere}`);
    const etat = parseObjetJSON<Record<string, { n: number; moi: boolean }>>(brut, {});
    const e = etat[idMessage] || { n: 0, moi: false };
    e.moi = !e.moi;
    e.n = Math.max(0, e.n + (e.moi ? 1 : -1));
    if (e.n === 0 && !e.moi) delete etat[idMessage]; else etat[idMessage] = e;
    await AsyncStorage.setItem(`${CLE_REACTIONS}:${matiere}`, JSON.stringify(etat));
    return e.n;
  } catch {
    return 0;
  }
}

export async function getReactions(matiere: string): Promise<Record<string, { n: number; moi: boolean }>> {
  try {
    const brut = await AsyncStorage.getItem(`${CLE_REACTIONS}:${matiere}`);
    return parseObjetJSON<Record<string, { n: number; moi: boolean }>>(brut, {});
  } catch {
    return {};
  }
}