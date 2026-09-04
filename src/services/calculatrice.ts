// CALCULATRICE SCIENTIFIQUE — évaluateur d'expressions sans eval() (Hermes-compatible).
// Supporte : + - × ÷ ^ √ ( ) sin cos tan ln log exp π e, priorités correctes.

type Jeton = { type: 'nb'; v: number } | { type: 'op'; v: string } | { type: 'fn'; v: string } | { type: 'par'; v: '(' | ')' };

function tokeniser(s: string): Jeton[] {
  const remplace = s
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
    .replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/,/g, '.');
  const jetons: Jeton[] = [];
  let i = 0;
  while (i < remplace.length) {
    const c = remplace[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let n = '';
      while (i < remplace.length && /[0-9.]/.test(remplace[i])) n += remplace[i++];
      jetons.push({ type: 'nb', v: parseFloat(n) });
      continue;
    }
    if (/[a-z]/i.test(c)) {
      let mot = '';
      while (i < remplace.length && /[a-z]/i.test(remplace[i])) mot += remplace[i++].toLowerCase();
      if (mot === 'pi') jetons.push({ type: 'nb', v: Math.PI });
      else if (mot === 'e') jetons.push({ type: 'nb', v: Math.E });
      else if (['sin', 'cos', 'tan', 'ln', 'log', 'sqrt', 'exp'].includes(mot)) jetons.push({ type: 'fn', v: mot });
      else throw new Error(`Inconnu : ${mot}`);
      continue;
    }
    if (c === '(' || c === ')') { jetons.push({ type: 'par', v: c }); i++; continue; }
    if ('+-*/^%'.includes(c)) { jetons.push({ type: 'op', v: c }); i++; continue; }
    throw new Error(`Caractère invalide : ${c}`);
  }
  return jetons;
}

class Analyse {
  private i = 0;
  constructor(private jetons: Jeton[]) {}

  private peek(): Jeton | undefined { return this.jetons[this.i]; }
  private next(): Jeton | undefined { return this.jetons[this.i++]; }

  // expression := terme (('+'|'-') terme)*
  expression(): number {
    let gauche = this.terme();
    while (this.peek()?.type === 'op' && ((this.peek() as { v: string }).v === '+' || (this.peek() as { v: string }).v === '-')) {
      const op = (this.next() as { v: string }).v;
      const droit = this.terme();
      gauche = op === '+' ? gauche + droit : gauche - droit;
    }
    return gauche;
  }

  // terme := unaire (('*'|'/'|'%') unaire)*
  private terme(): number {
    let gauche = this.unaire();
    while (this.peek()?.type === 'op' && ((this.peek() as { v: string }).v === '*' || (this.peek() as { v: string }).v === '/' || (this.peek() as { v: string }).v === '%')) {
      const op = (this.next() as { v: string }).v;
      const droit = this.unaire();
      if (op === '*') gauche *= droit;
      else if (op === '/') gauche /= droit;
      else gauche %= droit;
    }
    return gauche;
  }

  // unaire := '-' unaire | puissance  (le moins unaire s'applique APRÈS ^ : -3^2 = -9)
  private unaire(): number {
    if (this.peek()?.type === 'op' && (this.peek() as { v: string }).v === '-') {
      this.next();
      return -this.unaire();
    }
    if (this.peek()?.type === 'op' && (this.peek() as { v: string }).v === '+') {
      this.next();
      return this.unaire();
    }
    return this.puissance();
  }

  // puissance := principal ('^' unaire)?
  private puissance(): number {
    const base = this.principal();
    if (this.peek()?.type === 'op' && (this.peek() as { v: string }).v === '^') {
      this.next();
      return Math.pow(base, this.unaire());
    }
    return base;
  }

  // principal := nombre | fonction '(' expr ')' | '(' expr ')'
  private principal(): number {
    const j = this.next();
    if (!j) throw new Error('Expression incomplète');
    if (j.type === 'nb') return j.v;
    if (j.type === 'fn') {
      const arg = this.unaire();
      switch (j.v) {
        case 'sin': return Math.sin(arg);
        case 'cos': return Math.cos(arg);
        case 'tan': return Math.tan(arg);
        case 'ln': return Math.log(arg);
        case 'log': return Math.log10(arg);
        case 'sqrt': return Math.sqrt(arg);
        case 'exp': return Math.exp(arg);
        default: throw new Error('Fonction inconnue');
      }
    }
    if (j.type === 'par' && j.v === '(') {
      const v = this.expression();
      const fermant = this.next();
      if (!fermant || fermant.type !== 'par' || fermant.v !== ')') throw new Error('Parenthèse manquante');
      return v;
    }
    throw new Error('Syntaxe invalide');
  }
}

export function evaluer(expression: string): number {
  const jetons = tokeniser(expression);
  if (jetons.length === 0) throw new Error('Vide');
  const resultat = new Analyse(jetons).expression();
  if (!Number.isFinite(resultat)) throw new Error('Résultat non défini');
  return resultat;
}

export function formater(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(8)));
}
