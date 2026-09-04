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
export function estJuste(reponseEleve: string, bonnesReponses: string): boolean {
  const variantes = bonnesReponses.split('|').map((v) => v.trim()).filter((v) => v.length > 0);
  const normaleEleve = normaliser(reponseEleve);
  const nombreEleve = versNombre(reponseEleve);
  return variantes.some((v) => {
    if (normaliser(v) === normaleEleve) return true;
    const nombreV = versNombre(v);
    if (nombreEleve !== null && nombreV !== null) {
      return Math.abs(nombreEleve - nombreV) < 0.001;
    }
    return false;
  });
}
