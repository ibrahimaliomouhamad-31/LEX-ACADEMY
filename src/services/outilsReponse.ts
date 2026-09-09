// Outils partagés de vérification de réponse (utilisés par exercices.tsx et entrainement_infini.tsx)

// Normalise une chaîne : minuscules, sans accents, espaces simples, virgule décimale -> point
export function normaliser(texte: string): string {
  return texte
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.')
    .replace(/π/g, 'pi');
}

// Convertit en nombre si possible ("3", "2.5", "3/2", "-1/4"...)
export function versNombre(texte: string): number | null {
  const t = normaliser(texte).replace(/\s/g, '');
  const fraction = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const d = parseFloat(fraction[2]);
    if (d !== 0) return parseFloat(fraction[1]) / d;
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  return null;
}

// Compare la réponse de l'élève aux bonnes réponses possibles (séparées par "|")
// ✅ TOLÉRANT MATHS (#7) : accepte "x=6" et "6=x", "y = 2x+1" et "2x+1 = y",
// espaces/accents/virgules insensibles, fractions et décimales équivalentes.
export function estJuste(reponseEleve: string, bonnesReponses: string): boolean {
  const variantes = bonnesReponses.split('|').map((v) => v.trim()).filter((v) => v.length > 0);
  const normaleEleve = normaliser(reponseEleve);
  const nombreEleve = versNombre(reponseEleve);
  return variantes.some((v) => {
    if (normaliser(v) === normaleEleve) return true;
    // Équation : compare les deux membres dans les deux ordres ("x=6" ≡ "6=x").
    if (comparerEquation(reponseEleve, v)) return true;
    const nombreV = versNombre(v);
    if (nombreEleve !== null && nombreV !== null) {
      return Math.abs(nombreEleve - nombreV) < 0.001;
    }
    return false;
  });
}

/** Compare deux équations en ignorant l'ordre des membres et la mise en forme. */
export function comparerEquation(a: string, b: string): boolean {
  const membresA = a.split('=').map((m) => normaliser(m).replace(/\s/g, ''));
  const membresB = b.split('=').map((m) => normaliser(m).replace(/\s/g, ''));
  if (membresA.length !== 2 || membresB.length !== 2) return false;
  const direct = membresA[0] === membresB[0] && membresA[1] === membresB[1];
  const inverse = membresA[0] === membresB[1] && membresA[1] === membresB[0];
  if (direct || inverse) return true;
  // Comparaison numérique membre à membre (ex : "x = 1/2" ≡ "x = 0.5").
  const numA = membresA.map(versNombre);
  const numB = membresB.map(versNombre);
  const numeriqueDirect =
    numA[0] !== null && numB[0] !== null && numA[1] !== null && numB[1] !== null &&
    Math.abs(numA[0] - numB[0]) < 0.001 && Math.abs(numA[1] - numB[1]) < 0.001;
  const numeriqueInverse =
    numA[0] !== null && numB[1] !== null && numA[1] !== null && numB[0] !== null &&
    Math.abs(numA[0] - numB[1]) < 0.001 && Math.abs(numA[1] - numB[0]) < 0.001;
  return numeriqueDirect || numeriqueInverse;
}

/**
 * 🧠 DIAGNOSTIC D'ERREUR (#9 feedback ciblé + #6 lacunes) : au lieu d'un simple
 * "Faux", retourne un message pédagogique + le concept à revoir.
 * 100% local, sans réseau, sans argent.
 */
export function classifierErreur(reponseEleve: string, bonnesReponses: string): { type: string; conseil: string; conceptARevoir: string } {
  const rep = normaliser(reponseEleve);
  const variantes = bonnesReponses.split('|').map((v) => v.trim()).filter(Boolean);
  const premiere = variantes[0] || '';
  const bonne = normaliser(premiere);
  if (!rep) return { type: 'vide', conseil: 'Écris au moins une tentative : même fausse, elle aide ton cerveau à apprendre.', conceptARevoir: premiere.slice(0, 60) };
  const nbE = versNombre(reponseEleve);
  const nbB = versNombre(premiere);
  if (nbE !== null && nbB !== null && Math.abs(Math.abs(nbE) - Math.abs(nbB)) < 0.001 && Math.sign(nbE) !== Math.sign(nbB)) {
    return { type: 'signe', conseil: "👉 Le signe est faux ! Vérifie les règles des signes (− × − = +).", conceptARevoir: 'Règles des signes' };
  }
  if (nbE !== null && nbB !== null && Math.abs(nbE - nbB) < Math.max(1, Math.abs(nbB) * 0.15)) {
    return { type: 'calcul', conseil: "👉 Tu es tout près ! Refais le calcul pas à pas, ligne par ligne.", conceptARevoir: premiere.slice(0, 60) };
  }
  if (/\d/.test(bonne) && !/\d/.test(rep)) {
    return { type: 'unite', conseil: "👉 Il manque un nombre ou une unité dans ta réponse. Relis l'énoncé.", conceptARevoir: premiere.slice(0, 60) };
  }
  if (reponseEleve.includes('=') && premiere.includes('=') && !comparerEquation(reponseEleve, premiere)) {
    return { type: 'equation', conseil: "👉 Vérifie chaque membre de l'équation séparément, puis l'ordre des opérations.", conceptARevoir: premiere.slice(0, 60) };
  }
  return { type: 'notion', conseil: "👉 Reprends le cours lié à cette notion, puis retente une variante sœur en révision.", conceptARevoir: premiere.slice(0, 60) };
}
