// MODÉRATION DE FICHES PARTAGÉES (amélioration 19) — anti-spam automatique
export interface VerdictModeration {
  ok: boolean;
  raison?: string;
  score: number; // 0 = clean, plus haut = suspect
}

const MOTS_Bannis = ['triche', 'examen fuir', 'arnaque', 'argent', 'payer', 'whatsapp:'];

/** Modération automatique locale avant publication d'une fiche. */
export function modererFiche(texte: string): VerdictModeration {
  const t = (texte || '').trim();
  let score = 0;
  if (t.length < 20) return { ok: false, raison: 'Fiche trop courte (min 20 caractères)', score: 100 };
  if (t.length > 5000) return { ok: false, raison: 'Fiche trop longue (max 5000)', score: 100 };
  const bas = t.toLowerCase();
  for (const m of MOTS_Bannis) {
    if (bas.includes(m)) score += 60;
  }
  if (/(https?:\/\/|www\.)/i.test(t)) score += 50;
  if (/(.)\1{8,}/.test(t)) score += 30;
  const majuscules = t.replace(/[^A-ZÀ-Ÿ]/g, '').length / Math.max(1, t.length);
  if (majuscules > 0.5) score += 30;
  if (score >= 50) return { ok: false, raison: 'Fiche bloquée par la modération automatique', score };
  return { ok: true, score };
}