/**
 * 📊 CONTEXTE LEX.AI — « combien l'IA peut encore se souvenir ? »
 *
 * L'élève ne peut pas deviner quand sa discussion sature : le proxy refuse
 * au-delà de 30 messages / 32 000 caractères, et la troncature fait alors
 * SILENCIEUSEMENT oublier le début du cours. Ce service mesure ce qui part
 * vraiment au moteur pour alimenter la barre de contexte du chat (et inciter à
 * compacter au bon moment).
 *
 * Estimation de tokens : ~4 caractères par token en français (même ordre de
 * grandeur que les tokenizers réels, volumétrie suffisante pour un repère).
 */

import { LIMITES_PROXY, construireMessages } from './configIA';
import type { MessageIA } from './conversationsIA';

export type NiveauContexte = 'ok' | 'moyen' | 'critique';

export interface MesureContexte {
  /** Messages réellement transmis au proxy (≤ 30). */
  envoyes: number;
  /** Messages actifs dans la discussion (peut dépasser `envoyes`). */
  actifs: number;
  /** Messages déjà ignorés par l'IA (tronqués par les plafonds du proxy). */
  ignores: number;
  /** Poids de la discussion (messages actifs + prompt + résumé), plafond 30 000. */
  caracteres: number;
  maxCaracteres: number;
  /** Estimation du nombre de tokens envoyés (~4 caractères / token). */
  tokens: number;
  maxTokens: number;
  /** Remplissage 0-100 : le plus contraignant des deux plafonds. */
  pourcentage: number;
  niveau: NiveauContexte;
  /** Phrase d'explication pour l'élève (toujours renseignée). */
  conseil: string;
  /** Vrai : les plus anciens messages ne partent déjà plus au moteur. */
  tronque: boolean;
}

/** Question factice : sert uniquement à mesurer l'historique déjà présent. */
const QUESTION_TEMOIN = 'x';

/** 4 caractères ≈ 1 token (repère d'affichage, pas un tokenizer exact). */
export const CARACTERES_PAR_TOKEN = 4;

/** Seuils d'alerte de la barre de contexte (en % du plafond). */
export const SEUIL_CONTEXTE_MOYEN = 60;
export const SEUIL_CONTEXTE_CRITIQUE = 85;

function arrondiTokens(caracteres: number): number {
  return Math.max(1, Math.ceil(caracteres / CARACTERES_PAR_TOKEN));
}

/**
 * Mesure le contexte envoyé au moteur pour `historique` (+ résumé compacté).
 *
 * On mesure le payload RÉEL (via `construireMessages`, la même fonction que
 * l'envoi) : la barre ne peut donc jamais mentir sur ce que voit l'IA.
 */
export function mesurerContexte(historique: MessageIA[], resumeContexte = ''): MesureContexte {
  // 🛡️ Défensif : une discussion corrompue (null, non-tableau) ne doit jamais
  // casser l'écran du chat — on mesure alors un contexte vide.
  const messages: MessageIA[] = Array.isArray(historique) ? historique : [];
  const actifs = messages.length;
  const resume = typeof resumeContexte === 'string' ? resumeContexte.trim() : '';

  // 1) Ce qui PART réellement (même fonction que l'envoi) : sert à savoir
  //    combien de messages sont déjà ignorés par les plafonds du proxy.
  const tout = construireMessages(messages, QUESTION_TEMOIN, resume);
  const payload = tout.slice(0, -1);
  const envoyes = Math.max(0, payload.length - 1 - (resume === '' ? 0 : 1));
  const ignores = Math.max(0, actifs - envoyes);

  // 2) Poids RÉEL de la discussion (ce que l'élève a accumulé) : c'est ce que
  //    montre la barre, AVANT troncature — sinon une discussion saturée
  //    afficherait un contexte « vide » (tout ayant été coupé).
  const nettoyes = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  const caracteres = JSON.stringify([
    { role: 'system', content: 'x'.repeat(450) }, // poids réel du prompt système
    ...(resume === '' ? [] : [{ role: 'system', content: resume }]),
    ...nettoyes,
  ]).length;
  const maxCaracteres = LIMITES_PROXY.total;

  const tauxCaracteres = caracteres / maxCaracteres;
  const tauxMessages = actifs / LIMITES_PROXY.messages;
  const pourcentage = Math.min(100, Math.round(Math.max(tauxCaracteres, tauxMessages) * 100));

  const niveau: NiveauContexte =
    pourcentage >= SEUIL_CONTEXTE_CRITIQUE ? 'critique' : pourcentage >= SEUIL_CONTEXTE_MOYEN ? 'moyen' : 'ok';

  const conseil = ignores > 0
    ? `⚠️ ${ignores} ancien${ignores > 1 ? 's' : ''} message${ignores > 1 ? 's' : ''} ${ignores > 1 ? 'ne partent' : 'ne part'} plus au moteur : compacte pour garder l'essentiel.`
    : niveau === 'critique'
      ? "🗜️ Contexte presque saturé : compacte maintenant, sinon LEX.AI va oublier le début de la discussion."
      : niveau === 'moyen'
        ? "Tu approches de la limite : un compactage conservera tes questions et les points clés."
        : 'Contexte léger : LEX.AI se souvient de toute la discussion.';

  return {
    envoyes,
    actifs,
    ignores,
    caracteres,
    maxCaracteres,
    tokens: arrondiTokens(caracteres),
    maxTokens: arrondiTokens(maxCaracteres),
    pourcentage,
    niveau,
    conseil,
    tronque: ignores > 0,
  };
}
