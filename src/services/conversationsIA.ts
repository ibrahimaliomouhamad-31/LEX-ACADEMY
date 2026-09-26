// 💬 CONVERSATIONS LEX.AI — persistance locale par utilisateur.
// Plusieurs chats sauvegardés (style Claude) : reprise, renommage,
// suppression. Stockage `lexai_conversations_v1` via userStorage.
import { getUserItem, setUserItem } from './userStorage';

export interface MessageIA {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationIA {
  id: string;
  titre: string;
  creeLe: number;
  majLe: number;
  resumeContexte: string;
  messages: MessageIA[];
}

export const SEUIL_COMPACTAGE = 16;
const NOM_STOCKAGE = 'lexai_conversations_v1';
const MAX_CONVERSATIONS = 30;
const MAX_MESSAGES = 60;

export function genererId(): string {
  return `conv_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

export function titreAuto(messages: MessageIA[]): string {
  const premier = messages.find((m) => m.role === 'user' && m.content.trim() !== '');
  if (!premier) return 'Nouvelle discussion';
  const brut = premier.content.trim().replace(/\s+/g, ' ');
  return brut.length > 42 ? `${brut.slice(0, 42)}…` : brut;
}

export function assainir(messages: MessageIA[]): MessageIA[] {
  return messages
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    .slice(-MAX_MESSAGES);
}

export async function listerConversations(): Promise<ConversationIA[]> {
  try {
    const brut = await getUserItem(NOM_STOCKAGE);
    if (!brut) return [];
    const liste = JSON.parse(brut) as ConversationIA[];
    if (!Array.isArray(liste)) return [];
    return liste
      .filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
      .sort((a, b) => (b.majLe || 0) - (a.majLe || 0))
      .slice(0, MAX_CONVERSATIONS);
  } catch {
    return [];
  }
}

async function ecrireTout(liste: ConversationIA[]): Promise<void> {
  await setUserItem(NOM_STOCKAGE, JSON.stringify(liste.slice(0, MAX_CONVERSATIONS)));
}

export function creerConversation(): ConversationIA {
  const maintenant = Date.now();
  return { id: genererId(), titre: 'Nouvelle discussion', creeLe: maintenant, majLe: maintenant, resumeContexte: '', messages: [] };
}

export async function sauvegarderConversation(conv: ConversationIA): Promise<ConversationIA[]> {
  const nettoyee: ConversationIA = {
    ...conv,
    titre: conv.titre?.trim() || titreAuto(conv.messages),
    majLe: Date.now(),
    messages: assainir(conv.messages),
  };
  const liste = await listerConversations();
  const idx = liste.findIndex((c) => c.id === nettoyee.id);
  const suivante = idx >= 0 ? liste.map((c) => (c.id === nettoyee.id ? nettoyee : c)) : [nettoyee, ...liste];
  suivante.sort((a, b) => b.majLe - a.majLe);
  await ecrireTout(suivante.slice(0, MAX_CONVERSATIONS));
  return suivante;
}

export async function supprimerConversation(id: string): Promise<ConversationIA[]> {
  const liste = (await listerConversations()).filter((c) => c.id !== id);
  await ecrireTout(liste);
  return liste;
}

export function renommerConversation(liste: ConversationIA[], id: string, titre: string): ConversationIA[] {
  const propre = titre.trim().slice(0, 60) || 'Discussion';
  return liste.map((c) => (c.id === id ? { ...c, titre: propre, majLe: Date.now() } : c));
}

/**
 * Persiste la liste COMPLÈTE (renommage, réordonnancement). Nécessaire car la
 * sauvegarde auto de l'écran LEX.AI ne suit que la conversation ACTIVE : sans
 * cet appel, un renommage d'un ancien chat serait perdu au redémarrage.
 */
export async function enregistrerConversations(liste: ConversationIA[]): Promise<ConversationIA[]> {
  const triee = [...liste].sort((a, b) => (b.majLe || 0) - (a.majLe || 0)).slice(0, MAX_CONVERSATIONS);
  await ecrireTout(triee);
  return triee;
}

export function doitCompacter(conv: ConversationIA): boolean {
  return assainir(conv.messages).length > SEUIL_COMPACTAGE;
}

export function compacterContexte(conv: ConversationIA): { conv: ConversationIA; archives: number } {
  const msgs = assainir(conv.messages);
  if (msgs.length <= SEUIL_COMPACTAGE) return { conv, archives: 0 };
  const aArchiver = msgs.slice(0, 8);
  const restants = msgs.slice(8);
  const questions = aArchiver
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim().replace(/\s+/g, ' ').slice(0, 160));
  const cles: string[] = [];
  for (const m of aArchiver.filter((m) => m.role === 'assistant')) {
    const phrases = m.content.replace(/\s+/g, ' ').split(/(?<=[.!?:])\s+/).filter((p) => p.length >= 24 && p.length <= 280);
    for (const p of phrases.slice(0, 2)) {
      if (cles.length < 6) cles.push(p.trim());
    }
  }
  const ajout = [
    questions.length > 0 ? `Questions traitees : ${questions.slice(0, 4).join(' | ')}.` : '',
    cles.length > 0 ? `Points cles : ${cles.join(' ')}` : '',
  ].filter(Boolean).join('\n');
  const resume = [conv.resumeContexte, ajout].filter(Boolean).join('\n').slice(-1500);
  return { conv: { ...conv, resumeContexte: resume, messages: restants, majLe: Date.now() }, archives: aArchiver.length };
}