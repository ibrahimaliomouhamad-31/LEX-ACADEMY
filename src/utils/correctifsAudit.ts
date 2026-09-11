/**
 * 🛡️ UTILITAIRES SÉCURISÉS — correctifs audit (47 erreurs)
 * Date locale (pas UTC), IDs uniques, Fisher-Yates non biaisé,
 * JSON validé, parseInt à radix explicite.
 */

export function jourLocal(date: Date = new Date()): string {
  const a = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const j = String(date.getDate()).padStart(2, '0');
  return `${a}-${m}-${j}`;
}

let compteurId = 0;
export function genererIdUnique(prefixe = 'id'): string {
  compteurId = (compteurId + 1) % 100000;
  const alea = Math.floor(Math.random() * 36 * 36 * 36).toString(36).padStart(3, '0');
  return `${prefixe}_${Date.now().toString(36)}_${compteurId.toString(36)}${alea}`;
}

export function melangeFisherYates<T>(tableau: T[]): T[] {
  const t = [...tableau];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = t[i] as T;
    t[i] = t[j] as T;
    t[j] = tmp;
  }
  return t;
}

export function parseTableauJSON<T = unknown>(brut: string | null | undefined, defaut: T[] = []): T[] {
  if (!brut) return defaut;
  try {
    const v: unknown = JSON.parse(brut);
    return Array.isArray(v) ? (v as T[]) : defaut;
  } catch {
    return defaut;
  }
}

export function parseObjetJSON<T extends object>(brut: string | null | undefined, defaut: T): T {
  if (!brut) return defaut;
  try {
    const v: unknown = JSON.parse(brut);
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as T) : defaut;
  } catch {
    return defaut;
  }
}

export function tableauDeChaines(brut: string | null | undefined): string[] {
  const t = parseTableauJSON<unknown>(brut, []);
  return t.filter((x): x is string => typeof x === 'string');
}

export function parseEntier(brut: string | null | undefined, defaut = 0): number {
  if (brut == null || brut === '') return defaut;
  const n = parseInt(String(brut), 10);
  return Number.isFinite(n) ? n : defaut;
}
