// Normalisation conservatrice : aucune classe de collège, aucune branche devinée.
function classeCanonique(valeur) {
  if (typeof valeur !== 'string') return null;
  const c = valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[\s.°_-]/g, '');
  if (/^(2nde|2de|2e|seconde)$/.test(c)) return '2nde';
  const premiere = /^(?:1ere|1re|premiere)([cd])$/.exec(c);
  if (premiere) return `1ère ${premiere[1].toUpperCase()}`;
  const terminale = /^(?:terminale|term|tle|t)([cd])$/.exec(c);
  if (terminale) return `Terminale ${terminale[1].toUpperCase()}`;
  return null;
}

function niveauPourClasse(classe) {
  const canonique = classeCanonique(classe);
  if (canonique === '2nde') return '2nde';
  if (canonique?.startsWith('1ère')) return '1ere';
  if (canonique?.startsWith('Terminale')) return 'terminale';
  // Les anciens profils sans branche gardent leur niveau, mais doivent être revus.
  const c = typeof classe === 'string'
    ? classe.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';
  if (/^(1ere|1re|premiere)$/.test(c)) return '1ere';
  if (/^(terminale|term|tle)$/.test(c)) return 'terminale';
  return 'inconnu';
}

function profilPublic(donnees) {
  const classe = classeCanonique(donnees.classe) || String(donnees.classe || '');
  const xp = (n) => {
    // 🩹 Des profils réels stockent l'XP en CHAÎNE (« 200 »). Sans coercition,
    // ils étaient publiés à 0 XP et tombaient au fond du classement.
    // Seule une valeur numérique finie est acceptée : ni négatif, ni NaN,
    // ni texte arbitraire (« beaucoup » → 0).
    const valeur = typeof n === 'string' && n.trim() !== '' ? Number(n) : n;
    return typeof valeur === 'number' && Number.isFinite(valeur) ? Math.max(0, Math.round(valeur)) : 0;
  };
  return {
    nom: String(donnees.nom || 'Élève').slice(0, 120),
    classe,
    niveau: niveauPourClasse(classe),
    xp: xp(donnees.xp),
    xp_semaine: xp(donnees.xp_semaine),
    avatar: String(donnees.avatar || '🎓').slice(0, 100),
  };
}

// Relit l'état courant en transaction : événements rejoués/désordonnés sans
// rétablir un ancien score ou recréer un élève supprimé. Erreurs propagées.
async function synchroniserProfil(db, uid, migrer = false) {
  const source = db.collection('utilisateurs').doc(uid);
  const cible = db.collection('classement_public').doc(uid);
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(source);
    if (!snap.exists) {
      transaction.delete(cible);
      return;
    }
    const donnees = snap.data();
    const publicData = profilPublic(donnees);
    if (migrer) {
      const classe = classeCanonique(donnees.classe);
      const correction = {};
      if (classe && classe !== donnees.classe) correction.classe = classe;
      if (publicData.niveau !== 'inconnu' && donnees.niveau !== publicData.niveau) {
        correction.niveau = publicData.niveau;
      }
      if (Object.keys(correction).length) transaction.update(source, correction);
    }
    // ⚠️ Une fiche dont le niveau vaut « inconnu » (classe hors lycée : compte
    // de test, faute de frappe) est INEXPLOITABLE et, surtout, bloquerait la
    // publication côté client : les règles Firestore refusent ce niveau. On
    // retire donc la fiche au lieu d'en publier une invalide — l'élève reste
    // visible dans le classement « General » dès que son client republie.
    if (publicData.niveau === 'inconnu') {
      transaction.delete(cible);
      return;
    }
    // Remplacement complet : retire aussi d'éventuels anciens champs sensibles.
    transaction.set(cible, publicData);
  });
}

/**
 * MIGRATION EN MASSE (idempotente) : parcourt tous les profils par pages et
 * aligne `utilisateurs` + `classement_public` sur le modèle lycée.
 *
 * Pourquoi : les comptes créés AVANT l'introduction du champ `niveau` ont
 * `classe: "1èreC"` (texte libre) et aucun `niveau`. Le filtre du classement
 * interroge `niveau == "1ere"` → ces élèves étaient INVISIBLES.
 *
 * `dryRun` par défaut : on n'écrit rien tant que l'admin n'a pas confirmé.
 * Aucune branche C/D n'est inventée : un ancien « Première » sans branche
 * garde `niveau: "1ere"` et sa classe d'origine.
 */
async function migrerClassementPublic(db, { dryRun = true, tailleLot = 200 } = {}) {
  const rapport = { dryRun, examines: 0, corriges: 0, dejaAlignes: 0, lots: 0 };
  let dernier = null;
  for (;;) {
    let requete = db.collection('utilisateurs').orderBy('__name__').limit(tailleLot);
    if (dernier) requete = requete.startAfter(dernier);
    const page = await requete.get();
    if (page.empty) break;
    rapport.lots += 1;
    for (const document of page.docs) {
      rapport.examines += 1;
      const donnees = document.data() || {};
      const classe = classeCanonique(donnees.classe);
      const niveau = profilPublic(donnees).niveau;
      const aCorriger = (classe !== null && classe !== donnees.classe) || donnees.niveau !== niveau;
      if (!aCorriger) {
        rapport.dejaAlignes += 1;
        continue;
      }
      rapport.corriges += 1;
      if (!dryRun) await synchroniserProfil(db, document.id, true);
    }
    dernier = page.docs[page.docs.length - 1];
  }
  return rapport;
}

module.exports = {
  classeCanonique,
  niveauPourClasse,
  profilPublic,
  synchroniserProfil,
  migrerClassementPublic,
};
