// 68 — EXPORT DE SAUVEGARDE FIRESTORE
// Usage : node scripts/exporterFirestore.js
// Écrit un backup JSON horodaté de TOUTES les collections dans backups/.

const fs = require('fs');
const path = require('path');

(async () => {
  const { initializeApp } = await import('firebase/app');
  const { getFirestore, collection, getDocs } = await import('firebase/firestore');

  const app = initializeApp({
    apiKey: 'AIzaSyC3y581S0nHqYfIX4TjvumGKLgpDj1G1dg',
    projectId: 'lex-academy-10eef',
  });
  const db = getFirestore(app);

  const dossier = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const collections = ['cours', 'exercices', 'utilisateurs', 'defi_jour', 'devoirs', 'devoir_reponses', 'signalements', 'progression', 'admins', 'annales'];
  const rapport = {};

  for (const nom of collections) {
    try {
      const snap = await getDocs(collection(db, nom));
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      if (docs.length > 0) {
        const fichier = path.join(dossier, `${horodatage}_${nom}.json`);
        fs.writeFileSync(fichier, JSON.stringify(docs));
        rapport[nom] = docs.length;
      } else {
        rapport[nom] = 0;
      }
    } catch (e) {
      rapport[nom] = `erreur: ${String(e).slice(0, 50)}`;
    }
  }

  fs.writeFileSync(
    path.join(dossier, `${horodatage}_RAPPORT.json`),
    JSON.stringify({ date: horodatage, collections: rapport }, null, 2)
  );
  console.log('=== SAUVEGARDE TERMINÉE ===');
  for (const [nom, nb] of Object.entries(rapport)) {
    console.log(`  ${nom} : ${nb} document(s)`);
  }
  process.exit(0);
})();
