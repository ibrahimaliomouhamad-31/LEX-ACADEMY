/**
 * 🧠 CLASSIFICATION DES ERREURS — feedback pédagogique ciblé
 *
 * Avant : une mauvaise réponse déclenchait un encouragement générique.
 * Maintenant : `classifierErreur` compare la réponse de l'élève à la bonne
 * réponse et identifie le TYPE d'erreur (signe oublié, unité manquante,
 * presque juste...) pour donner un message précis, comme un vrai prof.
 * 100% local, aucune dépendance réseau.
 */

/** Les erreurs réseau doivent attendre le wifi, pas abandonner. */
export function estErreurReseau(error: unknown): boolean {
  const msg = String(error ?? '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('unavailable') ||
    msg.includes('failed to fetch') ||
    msg.includes('network request failed') ||
    msg.includes('socket') ||
    msg.includes('timeout') ||
    msg.includes('getdocuments') ||
    msg.includes('transport') ||
    msg.includes('pas de connexion')
  );
}

export type TypeErreur =
  | 'identique'
  | 'signe'
  | 'unite'
  | 'presque'
  | 'inversion'
  | 'faux';

export interface DiagnosticErreur {
  type: TypeErreur;
  message: string; // feedback pédagogique ciblé
}

function chiffresSeuls(texte: string): string {
  return texte.replace(/[^0-9.,-]/g, '').replace(',', '.');
}

/**
 * Compare la réponse élève à la (aux) bonne(s) réponse(s) et qualifie l'erreur.
 * `bonneReponse` peut contenir plusieurs variantes séparées par "|".
 */
export function classifierErreur(reponseEleve: string, bonneReponse: string): DiagnosticErreur {
  const eleve = (reponseEleve || '').trim();
  const variantes = (bonneReponse || '').split('|').map((v) => v.trim()).filter(Boolean);

  if (eleve === '') {
    return { type: 'faux', message: "❌ Réponse vide : relis bien l'énoncé, une partie de la réponse se cache souvent dans la question." };
  }

  // 1) Signe opposé : la réponse numérisée de l'élève = bonne réponse en négatif.
  const eleveNb = chiffresSeuls(eleve);
  for (const bonne of variantes) {
    const bonneNb = chiffresSeuls(bonne);
    const bonneVal = Number(bonneNb);
    const eleveVal = Number(eleveNb);
    if (!Number.isNaN(bonneVal) && !Number.isNaN(eleveVal) && bonneVal !== 0) {
      if (eleveVal === -bonneVal) {
        return {
          type: 'signe',
          message: '⚠️ Le calcul est bon mais le SIGNE est faux ! Relis bien la question : gain ou perte, montée ou descente ?',
        };
      }
    }
  }

  // 2) Unité manquante : la partie numérique est juste mais il manque du texte.
  for (const bonne of variantes) {
    const bonneNb = chiffresSeuls(bonne);
    if (bonneNb !== '' && eleveNb === bonneNb && eleve !== bonne) {
      return {
        type: 'unite',
        message: '💡 La VALEUR est juste ! Vérifie l\'unité ou les mots demandés dans l\'énoncé (km/h, cm, %...).',
      };
    }
  }

  // 3) Presque : 1 caractère d'écart (faute de frappe).
  for (const bonne of variantes) {
    if (bonne.length === eleve.length) {
      let differences = 0;
      for (let i = 0; i < bonne.length; i++) {
        if (bonne[i] !== eleve[i]) differences++;
      }
      if (differences === 1) {
        return {
          type: 'presque',
          message: '👀 Tu y es PRESQUE : une seule lettre/chiffre diffère. Revérifie ta dernière étape !',
        };
      }
    }
  }

  // 4) Inversion de chiffres (ex: 123 vs 132).
  const eleveTrie = eleveNb.split('').sort().join('');
  for (const bonne of variantes) {
    const bonneNb = chiffresSeuls(bonne);
    if (eleveNb.length === bonneNb.length && eleveNb !== bonneNb && eleveTrie === bonneNb.split('').sort().join('') && bonneNb !== '') {
      return {
        type: 'inversion',
        message: '🔄 Les chiffres sont les bons mais pas dans le bon ordre ! Refais le dernier calcul posé.',
      };
    }
  }

  return {
    type: 'faux',
    message: "❌ Pas encore. Respire, reprends l'énoncé étape par étape — c'est comme ça qu'on progresse.",
  };
}