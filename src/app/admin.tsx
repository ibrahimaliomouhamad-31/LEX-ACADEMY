import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { alerte } from '../utils/alerte';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { syncQueue } from '../services/syncQueue';
import { lireXpNonSync } from '../services/xpLocal';
import { derniersCrashs } from '../services/crashLog';
import { estAdminActuel, estSuperAdminActuel, reclamerSuperAdmin } from '../services/rolesPermissions';
import {
  docAdminAPromouvoir,
  estUnUid,
  traceAdmin,
  trouverCandidatsParNom,
  verifierRetraitAdmin,
  type ProfilEleve,
} from '../services/adminUtils';
import { rapporterErreur } from '../utils/logger';
import { jourLocal } from '../utils/correctifsAudit';

// ADMINISTRATION — deux niveaux de droits :
//   • superadmin (toi, Mouhamad Ibrahim Alio) : TOUS les pouvoirs, y compris
//     promouvoir / rétrograder un admin (permissions réservées). Créé via le code
//     superadmin (fonction Cloud `devenirSuperAdmin`, empreinte SHA-256 vérifiée côté serveur).
//   • admin : un élève auquel le superadmin a donné certains pouvoirs (via 🔧 Rôles & pouvoirs).
//     Son rôle d'élève reste inchangé, il gagne juste les permissions déléguées.
//
//   Quiconque n'appartient pas à l'administration voit un message clair quand il
//   ouvre l'écran /admin : « Vous n'appartenez pas à l'administration. »

interface Admin {
  id: string;
  nom: string;
  ajouteLe: string;
  userId?: string;
}

export default function Admin() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [uid, setUid] = useState('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [estAdmin, setEstAdmin] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [nouvelAdmin, setNouvelAdmin] = useState('');

  // Dashboard
  // ⚠️ `id` = identifiant du DOCUMENT. Il était jeté au chargement, ce qui
  // rendait la liste impossible à traiter : sans docId, aucun `deleteDoc`.
  const [signalements, setSignalements] = useState<{ id: string; exoId: string; raison: string; dateISO: string }[]>([]);

  // 🆘 Demandes d'aide (« mot de passe oublié ») : l'élève envoie sa demande
  // depuis l'écran de connexion et le guide lui dit « va voir l'administrateur ».
  // Elle doit donc être VISIBLE dans l'app (avant : console Firestore only).
  const [demandesAide, setDemandesAide] = useState<{ id: string; nom: string; dateISO: string }[]>([]);
  // 🕓 Journal des actions d'administration (promotions / retraits).
  const [journalAdmin, setJournalAdmin] = useState<
    { id: string; action: string; parNom: string; cibleNom: string; le: string }[]
  >([]);
  // Élèves candidats affichés quand un nom saisi est ambigu (homonymes).
  const [candidats, setCandidats] = useState<ProfilEleve[]>([]);

  // 🩺 Santé de la synchronisation (état local de l'appareil)
  const [pendingSync, setPendingSync] = useState(0);
  const [xpNonSync, setXpNonSync] = useState(0);
  const [crashs, setCrashs] = useState<{ message: string; dateISO: string }[]>([]);
  // 🔒 LECTURE REFUSÉE (permission-denied) ≠ LISTE VIDE (pas d'admins).
  // Sans ce drapeau, un non-admin hors-ligne ou refusé par les règles voyait
  // le formulaire « Devenir superadmin (ancien modele) » et pouvait croire qu'un bootstrap
  // était encore possible, alors que la règle serveur le rejetterait.
  const [accesInterdit, setAccesInterdit] = useState(false);

  useEffect(() => {
    (async () => {
      const n = await AsyncStorage.getItem('lex_user_nom');
      const uid = await AsyncStorage.getItem('lex_user_id');
      if (n) setNom(n);
      await charger(n || '', uid || '');
    })();
  }, []);

  const charger = async (nomEleve: string, uidEleve: string = ''): Promise<boolean> => {
    setChargement(true);
    setHorsLigne(false);
    setAccesInterdit(false);
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const liste: Admin[] = [];
      // ⚠️ `userId` DOIT être lu : c'est le SEUL lien entre un doc de `admins`
      // et un élève. Il était jeté ici, d'où deux conséquences graves :
      //   1. `liste.some((a) => a.userId === uidEleve)` était TOUJOURS faux →
      //      `estAdmin = false` même pour le superadmin → l'écran d'administration
      //      (et tout son dashboard) était inutilisable par TOUT LE MONDE ;
      //   2. la « migration » ci-dessous se relançait à chaque chargement.
      snap.forEach((d) => {
        const data = d.data() as { nom?: string; ajouteLe?: string; userId?: string };
        liste.push({
          id: d.id,
          nom: data.nom || d.id,
          ajouteLe: data.ajouteLe || '',
          userId: data.userId,
        });
      });

      // 71 — ANTI-USURPATION + ANTI-COURSE : l'admin est identifié par userId.
      // Le bootstrap « premier arrivé = superadmin » était une prise de contrôle
      // ouverte : n'importe quel élève ouvrant l'écran en premier sur une base
      // fraîche devenait admin à vie. Désormais le bootstrap exige un CODE
      // PROVISEUR (config/superadmin.codeBootstrap, saisi ci-dessous) et le
      // superadmin est ensuite le seul à pouvoir promouvoir.
      if (liste.length === 0) {
        setEstAdmin(false);
        // Aucun admin : c'est le cas BOOTSTRAP (code superadmin ci-dessous).
        return false;
      }
      // Migration : un admin hérité par nom est rélié à ton userId à ta 1re visite
      for (const adm of liste) {
        if (!adm.userId && nomEleve !== '' && uidEleve !== '' && adm.nom.toLowerCase() === nomEleve.toLowerCase()) {
          // ⚠️ Convention serveur = `docId == uid` : indispensable car les
          // regles Firestore ne savent pas faire de « where », elles ne peuvent
          // tester qu'un CHEMIN : `exists(admins/$(request.auth.uid))`.
          // On cree donc le doc a l'ID de l'eleve (l'ancien doc, sans ID
          // d'eleve, ne compte plus pour isAdmin()).
          await setDoc(doc(db, 'admins', uidEleve), {
            nom: adm.nom,
            userId: uidEleve,
            ajouteLe: adm.ajouteLe || jourLocal(),
          });
          adm.id = uidEleve;
          adm.userId = uidEleve;
        }
      }

      liste.sort((a, b) => a.nom.localeCompare(b.nom));
      setAdmins(liste);
      // 🔑 SOURCE UNIQUE DE VÉRITÉ : `estAdminActuel()` lit `admins/<uid>` PUIS
      // `roles/<uid>.isAdmin` — exactement ce que teste `isAdmin()` côté serveur.
      // La liste locale ne suffisait pas : un admin provisionné par l'ancien
      // modèle (roles uniquement) n'y figure pas → l'écran le refusait alors que
      // les règles l'autorisaient. L'inverse est vrai aussi (liste OK mais
      // session sans uid) : on accepte donc l'un OU l'autre.
      const dansListe =
        uidEleve !== '' && liste.some((a) => a.id === uidEleve || a.userId === uidEleve);
      const estAdmin = dansListe || (uidEleve !== '' && (await estAdminActuel()));
      setEstAdmin(estAdmin);

      if (estAdmin) {
        await chargerDashboard();
      }
      return estAdmin;
    } catch (erreurChargement: unknown) {
      const codeErreur = (erreurChargement as { code?: string } | null)?.code || '';
      if (codeErreur === 'permission-denied') {
        setAccesInterdit(true);
      } else {
        setHorsLigne(true);
      }
      return false;
    } finally {
      setChargement(false);
    }
  };

  // 🛡️ BOOTSTRAP SUPERADMIN : le code est vérifié par la Cloud Function
  // `devenirSuperAdmin` (SHA-256 côté serveur). Il n'existe NI dans ce fichier
  // NI dans Firestore : impossible de le lire en décompilant l'APK.
  // Le SUPERADMIN est Mouhamad Ibrahim Alio — seul à pouvoir créer des admins.
  // 👑 BOOTSTRAP SUPERADMIN : le code est vérifié par la Cloud Function
  // `devenirSuperAdmin` (SHA-256 côté serveur). Il n'existe NI dans ce fichier
  // NI dans Firestore : impossible de le lire en décompilant l'APK.
  const [codeSuper, setCodeSuper] = useState('');
  const [estSuper, setEstSuper] = useState(false);
  const [reclamationSuper, setReclamationSuper] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('lex_user_id').then((v) => setUid(v || '')).catch((e) => rapporterErreur('app/admin.tsx', e));
    estSuperAdminActuel().then(setEstSuper).catch((e) => rapporterErreur('app/admin.tsx', e));
  }, []);

  /**
   * 👑 Réclamer le rôle superadmin. À n'utiliser qu'UNE fois : la fonction
   * refuse ensuite tout autre uid. Le succès écrit `roles/<uid>.estSuperAdmin`
   * + `admins/<uid>.role = 'superadmin'` côté serveur → cet écran devient
   * immédiatement accessible, sans rechargement manuel.
   */
  const devenirSuperAdmin = async () => {
    if (!codeSuper.trim()) {
      alerte('Code requis', 'Saisis le code superadmin.');
      return;
    }
    setReclamationSuper(true);
    try {
      const resultat = await reclamerSuperAdmin(codeSuper);
      if (!resultat.success) {
        alerte('❌ Refusé', resultat.error || 'Code incorrect.');
        return;
      }
      setCodeSuper('');
      setEstSuper(true);
      alerte(
        '👑 Superadmin activé',
        'Tu détiens tous les pouvoirs. Change ton mot de passe et note précieusement que le code de bootstrap ne resservira plus.'
      );
      await charger(nom, uid);
    } catch (error) {
      rapporterErreur('[admin] Réclamation superadmin:', error);
      alerte('Erreur', 'Réessaie une fois connecté au réseau.');
    } finally {
      setReclamationSuper(false);
    }
  };
  const devenirSuperAdminLegacy = async () => {
    // Retour silencieux auparavant : le créateur ne comprenait pas pourquoi
    // « Devenir superadmin (ancien modele) » ne faisait rien (uid ou nom non encore chargés).
    if (!uid || !nom) {
      alerte(
        'Connexion requise',
        'Crée d’abord ton compte élève (ou reconnecte-toi), puis reviens sur 🏛️ Administration pour devenir superadmin (ancien modèle).'
      );
      return;
    }
    if (!codeSuper.trim()) {
      alerte('Code requis', 'Saisis le code superadmin (ancien modèle) communiqué par le créateur de l’app.');
      return;
    }
    setChargement(true);
    try {
      const refProv = doc(db, 'config', 'superadmin');
      // 🛡️ PREMIER DÉMARRAGE — `config/superadmin` n'existe pas encore : les
      // règles (porte `create` à usage unique) autorisent le créateur à le
      // POSER lui-même. Avant, l'écran se contentait de lire : sans le code
      // écrit au préalable en console, « Code incorrect » apparaissait TOUJOURS
      // et aucun superadmin ne pouvait naître depuis l'app.
      const premierDemarrage = (await getDocs(collection(db, 'admins'))).empty;
      let snapProv = await getDoc(refProv);
      if (!snapProv.exists() && premierDemarrage && codeSuper.trim().length >= 4) {
        // `create` à usage unique (règles `config`) : un second créateur
        // concurrent reçoit permission-denied → il retombe sur le chemin
        // « Déjà initialisé » ci-dessous, jamais sur une auto-promotion.
        try {
          await setDoc(refProv, { codeBootstrap: codeSuper.trim() });
          snapProv = await getDoc(refProv);
        } catch (poseCode: unknown) {
          const codePose = (poseCode as { code?: string } | null)?.code || '';
          if (codePose === 'permission-denied') {
            alerte('Déjà initialisé', 'Un superadmin existe deja. Demande-lui de te promouvoir.');
          } else {
            alerte('Erreur', 'Vérifie ta connexion puis réessaie.');
          }
          return;
        }
      }
      const attendu = snapProv.exists() ? (snapProv.data() as { codeBootstrap?: string }).codeBootstrap : undefined;
      if (!attendu || codeSuper.trim() !== attendu) {
        alerte('Code incorrect', 'Demande le code superadmin (ancien modele) au createur de l\'app.');
        return;
      }
      const recheck = await getDocs(collection(db, 'admins'));
      if (!recheck.empty) {
        alerte('Déjà initialisé', 'Un superadmin existe deja. Demande-lui de te promouvoir.');
        await charger(nom, uid);
        return;
      }
      // 🛡️ Le doc `admins/<uid>` porte l'ID de l'eleve (docId == uid) : c'est ce
      // que teste `isAdmin()` cote serveur. Avant, `addDoc` generait un ID
      // aleatoire -> les regles ne pouvaient pas retrouver l'admin.
      await setDoc(doc(db, 'admins', uid), { nom, userId: uid, ajouteLe: jourLocal() });
      // 🔑 Double écriture (best-effort). Depuis la refonte de `firestore.rules`,
      // `isAdmin()` teste D'ABORD `admins/<uid>` (docId = uid) — donc l'appel
      // ci-dessus suffit déjà — et garde `roles/{uid}.isAdmin` en REPLI pour ne
      // verrouiller aucun admin déjà provisionné. Cette écriture est permise au
      // premier superadmin tant que la sentinelle `config/initialise` n'existe
      // pas (voir `adminInitialise()` dans les règles). Le try/catch garantit
      // que le bootstrap ne dépend jamais d'une écriture secondaire.
      try {
        await setDoc(
          doc(db, 'roles', uid),
          {
            userId: uid,
            nom,
            role: 'admin',
            isAdmin: true,
            classe: '',
            actif: true,
            isDeleted: false,
            dateAttribution: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        rapporterErreur('[admin] Écriture roles/{uid} du superadmin (best-effort):', error);
      }
      // 🚩 SENTINELLE (best-effort) : verrouille definitivement l'auto-promotion
      // (`!adminInitialise()` dans les regles). Ecrite EN DERNIER, apres les
      // ecritures qui exigent la porte encore ouverte.
      try {
        await setDoc(
          doc(db, 'config', 'initialise'),
          { par: uid, nom, le: jourLocal() },
          { merge: true }
        );
      } catch (error) {
        rapporterErreur('[admin] Sentinelle config/initialise (best-effort):', error);
      }
      setCodeSuper('');
      await charger(nom, uid);
    } catch {
      alerte('Erreur', 'Vérifie ta connexion puis réessaie.');
    } finally {
      setChargement(false);
    }
  };

  const chargerDashboard = async () => {
    try {
      const snapSign = await getDocs(query(collection(db, 'signalements'), limit(30)));
      const sig: { id: string; exoId: string; raison: string; dateISO: string }[] = [];
      snapSign.forEach((d) => {
        const donnees = d.data() as { exoId?: string; raison?: string; dateISO?: string };
        // 🔑 On conserve `d.id` : sans lui, « ✔ Traité » ne pouvait RIEN
        // supprimer et la liste de signalements ne se vidait jamais.
        sig.push({
          id: d.id,
          exoId: donnees.exoId || '?',
          raison: donnees.raison || '?',
          dateISO: (donnees.dateISO || '').slice(0, 10),
        });
      });
      setSignalements(sig.reverse());

      // 🆘 Demandes d'aide (mot de passe oublié) : envoyées par l'écran de
      // connexion, elles doivent être visibles ici (le guide élève renvoie
      // explicitement vers l'administrateur).
      try {
        const snapAide = await getDocs(query(collection(db, 'demandes_aide'), limit(30)));
        const aides: { id: string; nom: string; dateISO: string }[] = [];
        snapAide.forEach((d) => {
          const donnees = d.data() as { nom?: string; dateISO?: string };
          aides.push({
            id: d.id,
            nom: donnees.nom || '?',
            dateISO: (donnees.dateISO || '').slice(0, 16).replace('T', ' '),
          });
        });
        setDemandesAide(aides.reverse());
      } catch { /* ignore : collection vide ou inexistante */ }

      // 🕓 Journal des actions d'administration (promotions / retraits).
      try {
        const snapJournal = await getDocs(query(collection(db, 'journal_audit'), limit(50)));
        const journal: { id: string; action: string; parNom: string; cibleNom: string; le: string }[] = [];
        snapJournal.forEach((d) => {
          const donnees = d.data() as {
            type?: string; action?: string; parNom?: string; cibleNom?: string; le?: string;
          };
          if (donnees.type === 'admin') {
            journal.push({
              id: d.id,
              action: donnees.action || '?',
              parNom: donnees.parNom || '?',
              cibleNom: donnees.cibleNom || '?',
              le: donnees.le || '',
            });
          }
        });
        setJournalAdmin(journal.reverse().slice(0, 10));
      } catch { /* ignore */ }

      // 🩺 Santé de la sync : éléments en attente, XP non poussés, crashs.
      try {
        const stats = await syncQueue.getStats();
        setPendingSync(stats.pending);
      } catch { /* ignore */ }
      try {
        setXpNonSync(await lireXpNonSync());
      } catch { /* ignore */ }
      try {
        const liste = await derniersCrashs();
        setCrashs(liste.slice(-5).reverse());
      } catch { /* ignore */ }
    } catch {
      // dashboard indisponible
    }
  };

  const entrer = async () => {
    if (nom.trim() === '') {
      alerte('Nom requis', 'Entre ton nom d\'élève (celui de ton compte).');
      return;
    }
    // Le verdict d'accès est renvoyé par `charger` : sans cela, un élève voyait
    // un simple retour au même écran, sans jamais comprendre que l'accès est
    // réservé (l'écran paraissait « ne rien faire »).
    const autorise = await charger(nom.trim());
    if (!autorise) {
      alerte(
        'Accès réservé',
        'Cet écran est réservé au superadmin et aux admins désignés. Si tu es le créateur de l’app, saisis le CODE SUPERADMIN ; sinon demande à l\'élève administrateur de te promouvoir.'
      );
    }
  };

  // 🕓 Trace une action d'administration (best-effort : jamais bloquant).
  const tracer = async (action: string, cible: string, cibleNom: string) => {
    try {
      await addDoc(collection(db, 'journal_audit'), traceAdmin(action, uid, nom, cible, cibleNom, jourLocal()));
    } catch (error) {
      rapporterErreur('[admin] Journal d’audit (best-effort):', error);
    }
  };

  // 👑 PROMOTION RÉELLE — avant, « + Ajouter » se contentait d'un `Alert`
  // explicatif et n'écrivait RIEN : le superadmin devait passer par la console
  // Firestore, alors que les règles autorisent déjà `allow create: if isAdmin()`.
  const promouvoir = async (uidCible: string, nomCible: string) => {
    if (!uidCible) return;
    setChargement(true);
    try {
      // 📌 docId == uid : c'est le CHEMIN exact testé par `isAdmin()` côté
      // serveur (`exists(admins/$(request.auth.uid))`). Un ID aléatoire rendrait
      // la promotion invisible pour les règles.
      await setDoc(
        doc(db, 'admins', uidCible),
        docAdminAPromouvoir(uidCible, nomCible, jourLocal(), uid),
        { merge: true }
      );
      await tracer('promotion_admin', uidCible, nomCible);
      alerte('✅ Promu', `${nomCible} fait maintenant partie de l’administration.`);
      setNouvelAdmin('');
      setCandidats([]);
    } catch (error) {
      rapporterErreur('[admin] Promotion d’un admin:', error);
      alerte('Erreur', 'Promotion impossible : vérifie ta connexion et tes droits.');
    } finally {
      await charger(nom, uid);
    }
  };

  const ajouterAdmin = async () => {
    const saisie = nouvelAdmin.trim();
    if (saisie === '') return;
    setChargement(true);
    try {
      // Cas 1 : un identifiant technique (uid Firebase, code de transfert) a été
      // collé → promotion directe, sans ambiguïté ni risque d'usurpation.
      if (estUnUid(saisie)) {
        await promouvoir(saisie, `${saisie.slice(0, 10)}…`);
        return;
      }

      // Cas 2 : nom d'élève. Requête exacte d'abord (rapide), puis repli sur un
      // balayage local insensible aux accents/casse : les élèves saisissent
      // rarement leur nom exactement comme à l'inscription.
      let profils: ProfilEleve[] = [];
      try {
        const snap = await getDocs(
          query(collection(db, 'utilisateurs'), where('nom', '==', saisie), limit(10))
        );
        profils = snap.docs.map((d) => {
          const data = d.data() as { nom?: string; classe?: string; niveau?: string };
          return { uid: d.id, nom: data.nom || d.id, classe: data.classe, niveau: data.niveau };
        });
      } catch (error) {
        rapporterErreur('[admin] Recherche exacte du nom:', error);
      }

      let trouves = trouverCandidatsParNom(profils, saisie);
      if (trouves.length === 0) {
        const snapTous = await getDocs(query(collection(db, 'utilisateurs'), limit(300)));
        const tous: ProfilEleve[] = snapTous.docs.map((d) => {
          const data = d.data() as { nom?: string; classe?: string; niveau?: string };
          return { uid: d.id, nom: data.nom || d.id, classe: data.classe, niveau: data.niveau };
        });
        trouves = trouverCandidatsParNom(tous, saisie);
      }

      if (trouves.length === 0) {
        alerte(
          'Élève introuvable',
          `Aucun élève ne s’appelle « ${saisie} ». Vérifie l’orthographe, ou colle son identifiant (uid) depuis la console Firebase.`
        );
        return;
      }

      if (trouves.length === 1) {
        const candidat = trouves[0];
        const precision = candidat.classe || candidat.niveau;
        alerte(
          '👑 Promouvoir administrateur ?',
          `${candidat.nom}${precision ? ` (${precision})` : ''} aura accès à l’administration complète de l’app.`,
          [
            { text: 'Annuler', onPress: () => {} },
            { text: 'Promouvoir', onPress: () => { promouvoir(candidat.uid, candidat.nom); } },
          ]
        );
        return;
      }

      // Plusieurs homonymes : l'admin choisit explicitement dans la liste.
      setCandidats(trouves.slice(0, 8));
    } catch (error) {
      rapporterErreur('[admin] Ajout d’un admin:', error);
      alerte('Erreur', 'Recherche impossible : connexion requise.');
    } finally {
      setChargement(false);
    }
  };

  // 🗑️ RETRAIT D'UN ADMIN — impossible depuis l'app avant (renvoi à la console
  // Firestore), alors que la règle `allow update, delete: if isAdmin()` existe.
  const retirerAdmin = (a: Admin) => {
    const controleur = verifierRetraitAdmin(admins, a.id, uid);
    if (!controleur.autorise) {
      alerte('Retrait impossible', controleur.raison || 'Action refusée.');
      return;
    }
    alerte(
      '⚠️ Retirer un administrateur',
      `${controleur.avertissement ? `${controleur.avertissement}\n\n` : ''}${a.nom} perdra l’accès à l’administration. Il reste élève dans l’app.`,
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Retirer',
          onPress: async () => {
            setChargement(true);
            try {
              await deleteDoc(doc(db, 'admins', a.id));
              // 🔁 Repasser `roles/{uid}.isAdmin` à false : `isAdmin()` des règles
              // teste AUSSI ce repli — sans ce nettoyage, un admin provisionné
              // par l'ancien modèle garderait tous ses droits malgré le retrait.
              try {
                await setDoc(
                  doc(db, 'roles', a.id),
                  { isAdmin: false, role: 'etudiant', actif: false, revoqueLe: jourLocal() },
                  { merge: true }
                );
              } catch (error) {
                rapporterErreur('[admin] Nettoyage roles/ après retrait (best-effort):', error);
              }
              await tracer('retrait_admin', a.id, a.nom);
            } catch (error) {
              rapporterErreur('[admin] Retrait d’un admin:', error);
              alerte('Erreur', 'Retrait impossible : vérifie ta connexion.');
            } finally {
              await charger(nom, uid);
            }
          },
        },
      ]
    );
  };

  // ⚠️ « Traité » SUPPRIME le signalement : sans cela la liste restait pleine à
  // jamais et l'admin ne pouvait rien marquer comme réglé.
  const traiterSignalement = async (id: string, exoId: string) => {
    try {
      await deleteDoc(doc(db, 'signalements', id));
      setSignalements((liste) => liste.filter((s) => s.id !== id));
      await tracer('signalement_traite', id, exoId);
    } catch (error) {
      rapporterErreur('[admin] Traitement d’un signalement:', error);
      alerte(
        'Action impossible',
        'Vérifie que les règles Firestore autorisent l’admin à supprimer un signalement (allow update, delete: if isAdmin()).'
      );
    }
  };

  // 🆘 Demande d'aide « mot de passe oublié » : l'admin la voit ici,
  // réinitialise le mot de passe (console Auth) puis la marque traitée.
  const traiterDemandeAide = async (id: string, nomEleve: string) => {
    try {
      await deleteDoc(doc(db, 'demandes_aide', id));
      setDemandesAide((liste) => liste.filter((d) => d.id !== id));
      await tracer('demande_aide_traitee', id, nomEleve);
    } catch (error) {
      rapporterErreur('[admin] Traitement d’une demande d’aide:', error);
      alerte('Action impossible', 'Connexion requise. Réessaie une fois le wifi revenu.');
    }
  };

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backBtn}>‹ Retour</Text>
      </TouchableOpacity>
      <Text style={styles.subject}>DIRECTION DE L'APP</Text>
      <Text style={styles.title}>🏛️ Administration LEX</Text>
    </View>
  );

  if (chargement) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <ActivityIndicator size="large" color="#FBBF24" style={{ marginTop: 50 }} />
      </View>
    );
  }

  if (accesInterdit) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.blocConnexion}>
          <Text style={styles.intro}>
            Ton compte n'a pas les droits d'administration : la liste des admins
            ne t'est pas accessible et tu ne peux pas devenir superadmin depuis
            cet appareil. Si tu es le créateur de l'app, connecte-toi avec le
            compte superadmin ; sinon demande à l'administrateur de te promouvoir.
          </Text>
        </View>
      </View>
    );
  }

  if (horsLigne) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <Text style={styles.vide}>📴 L'administration nécessite une connexion (wifi du LEX).</Text>
      </View>
    );
  }

  if (!estAdmin) {
    // 🚨 BOOTSTRAP INATTEIGNABLE (bug corrigé) : sur une base vierge la
    // collection `admins` est vide… donc PERSONNE n'est admin, donc `estAdmin`
    // est faux, donc le tableau de bord n'est jamais rendu — et le bloc
    // « Devenir superadmin (ancien modele) » qu'il contenait ne pouvait jamais s'afficher.
    // L'administration était donc impossible à initialiser depuis l'app.
    // On rend ce bloc ICI, dans la branche « pas encore admin ».
    if (admins.length === 0) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
          {header}
          <View style={styles.blocConnexion}>
            <Text style={styles.intro}>
              Aucun superadmin n’existe encore.{'\n'}
              Le créateur de l’app saisit ici le CODE SUPERADMIN (communiqué par le créateur)
              pour devenir le premier superadmin. Ce code n’est jamais enregistré
              sur le téléphone.
            </Text>

            {/* 👑 VOIE RECOMMANDÉE : le superadmin. Elle fait tout d’un coup
                (admins + roles + sentinelle) côté serveur, et verrouille
                définitivement l’auto-promotion. */}
            <Text style={styles.superActif}>👑 Code superadmin (recommandé)</Text>
            <Text style={styles.superTexte}>
              Vérifié uniquement par le serveur, jamais stocké dans l’application, et utilisable
              une seule fois. Il accorde les 50 pouvoirs et rend le compte intouchable.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Code superadmin"
              placeholderTextColor="#64748B"
              value={codeSuper}
              onChangeText={setCodeSuper}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.bouton}
              onPress={devenirSuperAdmin}
              disabled={reclamationSuper}
            >
              <Text style={styles.boutonText}>
                {reclamationSuper ? '⏳ Vérification…' : '👑 Devenir superadmin'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.superTexte}>— ou, ancien modèle —</Text>
            <TextInput
              style={styles.input}
              placeholder="Code superadmin (ancien modele)"
              placeholderTextColor="#64748B"
              value={codeSuper}
              onChangeText={setCodeSuper}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.bouton} onPress={devenirSuperAdminLegacy}>
              <Text style={styles.boutonText}>Devenir superadmin (ancien modele)</Text>
            </TouchableOpacity>
            <Text style={styles.listeActuelle}>
              {nom ? `Compte utilisé : ${nom}` : 'Connecte-toi d’abord avec ton compte eleve.'}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        {header}
        <View style={styles.blocConnexion}>
          <Text style={styles.intro}>
            Écran réservé a l'administration (superadmins + admins désignés).{'\n'}
            Le premier nom enregistre devient superadmin. Entre ton nom exact de compte élève.
          </Text>
          <TextInput style={styles.input} placeholder="Ton nom d'élève" placeholderTextColor="#64748B" value={nom} onChangeText={setNom} />
          <TouchableOpacity style={styles.bouton} onPress={entrer}>
            <Text style={styles.boutonText}>Entrer</Text>
          </TouchableOpacity>
          <Text style={styles.listeActuelle}>Admins actuels : {admins.map((a) => a.nom).join(', ') || 'aucun'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {header}
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Signalements */}
        <Text style={styles.section}>⚠️ Exercices signalés par les élèves ({signalements.length})</Text>
        {signalements.length === 0 ? (
          <Text style={styles.vide}>Aucun signalement : la base est propre ! 🎉</Text>
        ) : (
          signalements.map((s) => (
            <View key={s.id} style={[styles.ligneSignalement, { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.signExo} numberOfLines={1}>{s.exoId}</Text>
                <Text style={styles.signRaison}>
                  {s.raison === 'reponse_fausse' ? '❌ réponse fausse' : '✏️ énoncé mal formulé'} · {s.dateISO}
                </Text>
              </View>
              <TouchableOpacity onPress={() => traiterSignalement(s.id, s.exoId)} style={{ paddingLeft: 10 }}>
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>✔ Traité</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* 🆘 Demandes d'aide (mots de passe oubliés) : l'élève les envoie depuis
            l'écran de connexion, le guide lui répond « va voir l'administrateur ».
            Elles doivent donc être visibles ICI. Réinitialisation du mot de passe
            via la console Firebase (Auth > Users > Reset password), puis « ✔ Traitée ». */}
        <Text style={styles.section}>🆘 Demandes d'aide — mots de passe ({demandesAide.length})</Text>
        {demandesAide.length === 0 ? (
          <Text style={styles.vide}>Aucune demande en attente.</Text>
        ) : (
          demandesAide.map((d) => (
            <View key={d.id} style={[styles.ligneClasse, { alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomClasse}>🔑 {d.nom}</Text>
                <Text style={styles.detailClasse}>Demande du {d.dateISO}</Text>
              </View>
              <TouchableOpacity onPress={() => traiterDemandeAide(d.id, d.nom)} style={{ paddingLeft: 10 }}>
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>✔ Traitée</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* 🩺 Santé de la synchronisation */}
        <Text style={styles.section}>🩺 Santé de la synchronisation (cet appareil)</Text>
        <View style={styles.ligneClasse}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nomClasse}>
              {pendingSync === 0 && xpNonSync === 0 ? '☁️ Tout est synchronisé' : `⏳ ${pendingSync} action(s) en attente · ${xpNonSync} XP non poussés`}
            </Text>
            <Text style={styles.detailClasse}>
              {pendingSync > 0 || xpNonSync > 0
                ? 'Partira automatiquement au retour du wifi — aucune donnée perdue.'
                : 'La file de synchronisation est vide.'}
            </Text>
          </View>
        </View>
        {crashs.length > 0 && (
          <View>
            <Text style={styles.detailClasse}>Derniers crashs signalés :</Text>
            {crashs.map((c, i) => (
              <Text key={i} style={styles.signExo}>⚠️ {c.dateISO.slice(0, 16)} — {c.message}</Text>
            ))}
          </View>
        )}

        {/* Gestion des admins */}
        <Text style={styles.section}>👥 Administration ({admins.length})</Text>
        {admins.length === 0 && (
          <View style={{ backgroundColor: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <Text style={{ color: '#FBBF24', fontWeight: 'bold', marginBottom: 6 }}>Aucun superadmin. Initialise l'administration (ancien modele) :</Text>
            <TextInput style={styles.inputAjout} placeholder="Code superadmin (ancien modele)" placeholderTextColor="#64748B" value={codeSuper} onChangeText={setCodeSuper} secureTextEntry autoCapitalize="none" />
            <TouchableOpacity style={[styles.boutonAjout, { marginTop: 8, alignItems: 'center' }]} onPress={devenirSuperAdminLegacy}>
              <Text style={styles.boutonAjoutText}>Devenir superadmin (ancien modele)</Text>
            </TouchableOpacity>
          </View>
        )}
        {admins.map((a) => (
          <View key={a.id} style={[styles.ligneAdmin, { flexDirection: "row", alignItems: "center" }]}>
            <Text style={[styles.nomAdmin, { flex: 1 }]}>
              👤 {a.nom}{a.ajouteLe ? ` (ajouté le ${a.ajouteLe})` : ' — admin 👑'}
            </Text>
            <TouchableOpacity onPress={() => retirerAdmin(a)} style={{ paddingLeft: 10 }}>
              <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold' }}>Retirer ✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* 👑 SUPERADMIN — le rôle est posé par la Cloud Function
            `devenirSuperAdmin` (empreinte SHA-256 vérifiée côté serveur) : il ne
            peut donc être ni découvert dans l’APK, ni réclamé deux fois. */}
        <Text style={styles.section}>👑 Superadmin</Text>
        {estSuper ? (
          <View style={styles.carteSuper}>
            <Text style={styles.superActif}>Tu es le superadmin ✅</Text>
            <Text style={styles.superTexte}>
              Tu disposes des 50 pouvoirs, y compris les 2 réservés (promouvoir / rétrograder un
              administrateur). Aucun autre admin ne peut te rétrograder ni retirer ton accès. Pour
              partager des pouvoirs précis avec un élève : ouvre 🔧 Rôles &amp; pouvoirs, puis
              touche « 🎁 Choisir ses pouvoirs ».
            </Text>
          </View>
        ) : (
          <View style={styles.carteSuper}>
            <Text style={styles.superTexte}>
              Le superadmin possède TOUS les pouvoirs et personne ne peut le rétrograder. Le code
              n’est vérifié que par le serveur (il n’existe pas dans l’application) et ne peut
              servir qu’UNE seule fois.
            </Text>
            <TextInput
              style={styles.inputAjout}
              placeholder="Code superadmin"
              placeholderTextColor="#64748B"
              value={codeSuper}
              onChangeText={setCodeSuper}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.boutonAjout, { marginTop: 8, alignItems: 'center' }]}
              onPress={devenirSuperAdmin}
              disabled={reclamationSuper}
            >
              <Text style={styles.boutonAjoutText}>
                {reclamationSuper ? '⏳ Vérification…' : '👑 Devenir superadmin'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Homonymes : le nom saisi correspond à plusieurs élèves → choix explicite
            (on ne devine JAMAIS qui promouvoir : risque d'usurpation d'accès). */}
        {candidats.length > 0 && (
          <View style={{ backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginTop: 8 }}>
            <Text style={{ color: '#FBBF24', fontWeight: 'bold', marginBottom: 6 }}>
              {candidats.length} élèves portent ce nom — choisis explicitement :
            </Text>
            {candidats.map((c) => (
              <View key={c.uid} style={[styles.ligneAdmin, { flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={[styles.nomAdmin, { flex: 1 }]}>
                  🎓 {c.nom}{c.classe || c.niveau ? ` — ${c.classe || c.niveau}` : ''}
                </Text>
                <TouchableOpacity onPress={() => promouvoir(c.uid, c.nom)} style={{ paddingLeft: 10 }}>
                  <Text style={{ color: '#10B981', fontSize: 12, fontWeight: 'bold' }}>Promouvoir</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => setCandidats([])} style={{ alignItems: 'center', marginTop: 6 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Roles des eleves : ce bouton est le SEUL lien vers admin_roles.
            Sans lui, l'ecran (473 l.) etait atteignable par personne — c'est
            pourquoi le module a pu rester casse sans que personne ne le voie. */}
        <TouchableOpacity
          style={[styles.boutonAjout, { alignItems: 'center', marginBottom: 10 }]}
          onPress={() => router.push('/admin_roles')}
        >
          <Text style={styles.boutonAjoutText}>🔧 Gérer les rôles des élèves</Text>
        </TouchableOpacity>
        <View style={styles.rowAjout}>
          <TextInput style={styles.inputAjout} placeholder="Nom de l'élève ou identifiant (uid)" placeholderTextColor="#64748B" value={nouvelAdmin} onChangeText={setNouvelAdmin} />
          <TouchableOpacity style={styles.boutonAjout} onPress={ajouterAdmin}>
            <Text style={styles.boutonAjoutText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.noteRetrait}>
          La promotion se fait par nom d'élève (homonymes gérés) ou par identifiant (uid).
          Le retrait s'effectue avec « Retirer ✕ » : impossible de supprimer le dernier
          administrateur. Les admins restent des élèves à part entière dans l'app.
        </Text>

        {/* 🕓 Journal des actions d'administration (traçabilité) */}
        <Text style={styles.section}>🕓 Dernières actions d'administration ({journalAdmin.length})</Text>
        {journalAdmin.length === 0 ? (
          <Text style={styles.vide}>Aucune action enregistrée pour l'instant.</Text>
        ) : (
          journalAdmin.map((j) => (
            <View key={j.id} style={styles.ligneAdmin}>
              <Text style={styles.nomAdmin}>
                {j.action === 'promotion_admin'
                  ? '👑 Promotion'
                  : j.action === 'retrait_admin'
                    ? '🗑️ Retrait'
                    : j.action === 'signalement_traite'
                      ? '✔ Signalement traité'
                      : j.action === 'demande_aide_traitee'
                        ? '✔ Demande d’aide traitée'
                        : j.action}
                {' · '}{j.cibleNom} · par {j.parNom} · {j.le}
              </Text>
            </View>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B', marginBottom: 10 },
  backBtn: { color: '#FBBF24', fontSize: 14, marginBottom: 10 },
  subject: { color: '#94A3B8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  vide: { color: '#94A3B8', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  blocConnexion: { padding: 10 },
  intro: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 15 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, color: '#F8FAFC', fontSize: 15, marginBottom: 12 },
  bouton: { backgroundColor: '#10B981', padding: 14, borderRadius: 10, alignItems: 'center' },
  boutonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  listeActuelle: { color: '#64748B', fontSize: 12, marginTop: 15, fontStyle: 'italic' },
  section: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  ligneClasse: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 8 },
  nomClasse: { color: '#F8FAFC', fontSize: 15, fontWeight: 'bold' },
  detailClasse: { color: '#64748B', fontSize: 12, marginTop: 3 },
  ligneSignalement: { backgroundColor: '#2A1010', borderRadius: 10, padding: 12, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  signExo: { color: '#FCA5A5', fontSize: 12, fontFamily: 'monospace' },
  signRaison: { color: '#94A3B8', fontSize: 11, marginTop: 3 },
  ligneAdmin: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 6 },
  nomAdmin: { color: '#F8FAFC', fontSize: 13 },
  rowAjout: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  inputAjout: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 12, color: '#F8FAFC', fontSize: 13, flex: 1, marginRight: 8 },
  boutonAjout: { backgroundColor: '#FBBF24', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  boutonAjoutText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
  noteRetrait: { color: '#475569', fontSize: 11, fontStyle: 'italic', marginTop: 10, lineHeight: 16 },
  /* 👑 Superadmin */
  carteSuper: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FBBF24',
  },
  superActif: { color: '#FBBF24', fontWeight: 'bold', fontSize: 14, marginBottom: 6 },
  superTexte: { color: '#94A3B8', fontSize: 12, lineHeight: 18, marginBottom: 10 },
});
