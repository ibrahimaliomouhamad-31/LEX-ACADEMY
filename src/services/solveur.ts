// 58 — SOLVEUR PAS-À-PAS : résout équations du 1er et 2nd degré en expliquant
// CHAQUE étape. L'élève voit la méthode, pas seulement le résultat.

export interface EtapeSolveur {
  texte: string;
}

function lireNombre(brut: string | undefined, defautSiVide: number): number {
  if (brut === undefined || brut === '') return defautSiVide;
  if (brut === '+') return 1;
  if (brut === '-') return -1;
  return parseFloat(brut);
}

// Analyse un membre "ax + b" (le x peut être absent → a = 0)
function membre(m: string): { a: number; b: number } | null {
  const net = m.replace(/−/g, '-').replace(/²/g, '^2');
  const r = net.match(/^(?:(-?[\d.]*)(x))?([+-]?[\d.]*)?$/);
  if (!r || r[0] !== net) return null;
  const a = r[2] === 'x' ? lireNombre(r[1], 1) : 0;
  const b = lireNombre(r[3], 0);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return { a, b };
}

export function resoudrePasAPas(saisie: string): { etapes: EtapeSolveur[]; reponse: string } | { erreur: string } {
  const texte = saisie.replace(/\s+/g, '').replace(/−/g, '-').replace(/²/g, '^2').replace(/,/g, '.');
  // 🛡️ INJECTION CARACTÈRES : avant, « 2x+3=7;alert() » ou lettres parasites
  // passaient le split puis échouaient en messages confus. On valide le jeu de
  // caractères autorisés d'abord → erreur claire et immédiate.
  if (!/^[0-9xX+\-*/.^=()]*$/.test(texte) || texte === '') return { erreur: 'Caractères non reconnus. Exemples : 2x+3=7, x-5=2x, x^2-5x+6=0' };
  const parties = texte.split('=');
  if (parties.length !== 2 || !parties[0] || !parties[1]) return { erreur: "Écris une équation avec un seul signe = (ex : 2x+3=7)" };

  try {
    // ---- Second degré : ax^2 + bx + c = 0 ----
    const sq = parties[0].match(/^(-?[\d.]*)x\^2(?:([+-][\d.]*)x)?([+-][\d.]*)?$/);
    if (sq && (parties[1] === '0' || parseFloat(parties[1]) === 0)) {
      const a = lireNombre(sq[1], 1);
      const b = lireNombre(sq[2], 0);
      const c = lireNombre(sq[3], 0);
      if (a === 0) return { erreur: 'Si a = 0, ce n\'est plus du second degré — écris-la sous la forme bx + c = 0' };
      const delta = b * b - 4 * a * c;
      const etapes: EtapeSolveur[] = [
        { texte: `Équation du second degré : ${a}x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)} = 0` },
        { texte: `Étape 1 — Identifie les coefficients : a = ${a}, b = ${b}, c = ${c}` },
        { texte: `Étape 2 — Discriminant : Δ = b² − 4ac = ${b}² − 4×${a}×${c} = ${delta}` },
      ];
      if (delta < 0) {
        etapes.push({ texte: 'Étape 3 — Δ < 0 : pas de solution réelle. S = ∅' });
        return { etapes, reponse: 'aucune solution (Δ < 0)' };
      }
      if (delta === 0) {
        const x0 = -b / (2 * a);
        etapes.push({ texte: `Étape 3 — Δ = 0 : une racine double x₀ = −b/2a = ${-b}/${2 * a} = ${Number(x0.toFixed(4))}` });
        return { etapes, reponse: String(Number(x0.toFixed(4))) };
      }
      const r = Math.sqrt(delta);
      const x1 = (-b - r) / (2 * a);
      const x2 = (-b + r) / (2 * a);
      etapes.push({ texte: `Étape 3 — Δ > 0 : √Δ = √${delta} = ${Number(r.toFixed(4))}` });
      etapes.push({ texte: `Étape 4 — x₁ = (−b − √Δ)/2a = (${-b} − ${Number(r.toFixed(4))})/${2 * a} = ${Number(x1.toFixed(4))}` });
      etapes.push({ texte: `Étape 5 — x₂ = (−b + √Δ)/2a = (${-b} + ${Number(r.toFixed(4))})/${2 * a} = ${Number(x2.toFixed(4))}` });
      return { etapes, reponse: `x₁ = ${Number(x1.toFixed(4))} et x₂ = ${Number(x2.toFixed(4))}` };
    }

    // ---- Premier degré : ax + b = cx + d ----
    const g = membre(parties[0]);
    const d = membre(parties[1]);
    if (!g || !d) return { erreur: "Format non reconnu. Exemples : 2x+3=7, x-5=2x, x^2-5x+6=0" };
    const a = g.a - d.a;
    const b = g.b - d.b;
    if (a === 0) {
      if (b === 0) return { etapes: [{ texte: 'Les x s\'annulent et les constantes aussi : tout nombre est solution !' }], reponse: 'infinité de solutions' };
      return { etapes: [{ texte: `Les x s'annulent : il reste ${b} = 0, ce qui est faux. Aucune solution.` }], reponse: 'aucune solution' };
    }
    const x = -b / a;
    return {
      etapes: [
        { texte: `Équation de départ : ${saisie.trim()}` },
        { texte: `Étape 1 — Regroupe les x à gauche et les constantes à droite : ${a}x = ${-b}` },
        { texte: `Étape 2 — Divise les deux membres par ${a} : x = ${-b} / ${a}` },
        { texte: `Étape 3 — Résultat : x = ${Number(x.toFixed(4))}` },
        { texte: `Étape 4 — Vérifie en remplaçant x par ${Number(x.toFixed(4))} dans l'équation de départ ✓` },
      ],
      reponse: String(Number(x.toFixed(4))),
    };
  } catch {
    return { erreur: 'Impossible de lire cette équation. Vérifie la syntaxe.' };
  }
}
