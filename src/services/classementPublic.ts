/**
 * 🏆 CLASSEMENT PUBLIC — service unique de l'écran classement.
 *
 * Pourquoi un service dédié :
 *  1. 🔒 l'écran lisait `utilisateurs` en repli, or les règles Firestore en
 *     interdisent la lecture (hors propriétaire/admin) : ce repli échouait
 *     toujours et vidait le classement → code mort + fuite potentielle si la
 *     règle avait été ouverte ;
 *  2. 📶 au Niger le réseau tombe : sans cache, l'écran affiche « indisponible »
 *     et l'élève perd son classement. Ici le dernier top 50 connu est conservé
 *     dans AsyncStorage (par filtre) et resservi hors-ligne ;
 *  3. 🎯 l'élève ne pouvait pas se situer : `maPosition` compte, côté serveur,
 *     les élèves du même niveau et ceux qui ont plus d'XP (rang réel).
 */

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Query,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebaseConfig';
import { classeCanonique, niveauPourClasse } from '../utils/nomenclatureLycee';
import { getCurrentUserId } from './userStorage';
import { lireXpSemaineActuelle, lireXpTotal } from './xpLocal';
import { rapporterErreur } from '../utils/logger';

export interface EleveClassement {
  /** UID = identifiant du document : permet de repérer SA ligne. */
  uid?: string;
  nom?: string;
  classe?: string;
  niveau?: string;
  xp?: number;
  xp_semaine?: number;
  avatar?: string;
}

export type SourceClassement = 'reseau' | 'cache' | 'vide';

export interface Position {
  /** Rang dans le niveau (1 = premier). */
  position: number;
  /** Nombre d'élèves classés dans ce niveau. */
  total: number;
}

export const TAILLE_CLASSEMENT = 50;
const COLLECTION = 'classement_public';
const CLE_CACHE = '@lex/classement_cache';

/** Document minimal attendu (compatible QueryDocumentSnapshot). */
export interface DocClassement {
  id: string;
  data: () => Record<string, unknown>;
}

const nombre = (valeur: unknown): number => {
  const n = Number(valeur);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Transforme des documents en élèves (UID conservé, jamais de champ privé). */
export function elevesDepuisDocs(docs: DocClassement[]): EleveClassement[] {
  return docs
    .map((d) => {
      const donnees = d.data() || {};
      return {
        uid: d.id,
        nom: typeof donnees.nom === 'string' ? donnees.nom : 'Élève',
        classe: typeof donnees.classe === 'string' ? donnees.classe : '',
        niveau: typeof donnees.niveau === 'string' ? donnees.niveau : '',
        xp: nombre(donnees.xp),
        xp_semaine: nombre(donnees.xp_semaine),
        avatar: typeof donnees.avatar === 'string' ? donnees.avatar : '🎓',
      };
    })
    .sort((a, b) => (b.xp || 0) - (a.xp || 0));
}

/** Requête du top 50, filtrée par niveau si demandé. */
export function requeteClassement(niveau: string, taille: number = TAILLE_CLASSEMENT): Query {
  const base = collection(db, COLLECTION);
  return niveau
    ? query(base, where('niveau', '==', niveau), orderBy('xp', 'desc'), limit(taille))
    : query(base, orderBy('xp', 'desc'), limit(taille));
}

const cleCache = (niveau: string): string => `${CLE_CACHE}:${niveau || 'general'}`;

export async function lireCacheClassement(niveau: string): Promise<EleveClassement[]> {
  try {
    const brut = await AsyncStorage.getItem(cleCache(niveau));
    if (!brut) return [];
    const parse: unknown = JSON.parse(brut);
    return Array.isArray(parse) ? (parse as EleveClassement[]) : [];
  } catch {
    // Cache corrompu : on repart du réseau, jamais d'erreur bloquante.
    return [];
  }
}

export async function ecrireCacheClassement(
  niveau: string,
  eleves: EleveClassement[]
): Promise<void> {
  if (eleves.length === 0) return;
  try {
    await AsyncStorage.setItem(
      cleCache(niveau),
      JSON.stringify(eleves.slice(0, TAILLE_CLASSEMENT))
    );
  } catch (erreur) {
    rapporterErreur('[classement] écriture du cache impossible', erreur);
  }
}

/**
 * Charge le classement : réseau d'abord, cache local en secours.
 * Ne lève jamais : l'écran affiche soit la liste, soit une carte hors-ligne.
 */
export async function chargerClassement(
  niveau: string
): Promise<{ eleves: EleveClassement[]; source: SourceClassement }> {
  try {
    const instantane = await getDocs(requeteClassement(niveau));
    const eleves = elevesDepuisDocs(instantane.docs);
    if (eleves.length > 0) {
      await ecrireCacheClassement(niveau, eleves);
      return { eleves, source: 'reseau' };
    }
  } catch (erreur) {
    rapporterErreur('[classement] lecture réseau impossible, repli sur le cache', erreur);
  }
  const cache = await lireCacheClassement(niveau);
  return { eleves: cache, source: cache.length > 0 ? 'cache' : 'vide' };
}

/** Fiche publique de l'élève connecté (XP synchronisé), ou null. */
export async function lireMonProfilPublic(uid: string | null): Promise<EleveClassement | null> {
  if (!uid) return null;
  try {
    const instantane = await getDoc(doc(db, COLLECTION, uid));
    if (!instantane.exists()) return null;
    return elevesDepuisDocs([{ id: instantane.id, data: () => instantane.data() }])[0] ?? null;
  } catch (erreur) {
    rapporterErreur('[classement] fiche publique illisible', erreur);
    return null;
  }
}

/**
 * 📣 MIROIR CLIENT — publie SA fiche publique dans `classement_public`.
 *
 * Pourquoi côté client : le projet est sur le plan SPARK, donc la Cloud
 * Function `reflechirClassementPublic` ne peut PAS être déployée. Sans ce
 * miroir, la collection reste vide → le classement n'afficherait plus rien.
 *
 * 🔒 Les règles Firestore n'autorisent QUE le propriétaire, et UNIQUEMENT les
 * champs listés (nom, classe, niveau, xp, xp_semaine, avatar, majISO) : ni
 * email, ni hash, ni code de transfert ne peuvent fuir par ici.
 * Ne throw jamais : la publication est un bonus, jamais bloquante.
 */
export async function publierMonProfilPublic(): Promise<boolean> {
  try {
    const uid = await getCurrentUserId();
    if (!uid || uid === 'invite_local') return false;
    const instantane = await getDoc(doc(db, 'utilisateurs', uid));
    if (!instantane.exists()) return false;
    const profil = instantane.data() as {
      nom?: string;
      classe?: string;
      avatar?: string;
      /** Absent sur les profils créés avant le modèle lycée. */
      niveau?: string;
    };
    // 🧽 La fiche publiée porte EXACTEMENT la valeur du filtre, sinon l'élève
    // serait introuvable dans sa propre classe.
    const classe = classeCanonique(profil.classe) || (profil.classe || '').trim();
    const niveau = niveauPourClasse(classe || profil.classe);
    const [xp, xpSemaine] = await Promise.all([lireXpTotal(), lireXpSemaineActuelle()]);
    const fiche: Record<string, unknown> = {
      nom: (profil.nom || 'Élève').slice(0, 60),
      classe,
      xp: Math.max(0, Math.round(Number(xp) || 0)),
      xp_semaine: Math.max(0, Math.round(Number(xpSemaine) || 0)),
      avatar: profil.avatar || '',
      majISO: new Date().toISOString(),
    };
    // ⚠️ « inconnu » (classe non reconnue : compte de test, faute de frappe)
    // n'est PAS accepté par les règles Firestore. On OMET le champ au lieu de
    // publier une fiche que le serveur refuserait — et au lieu d'écrire un
    // `niveau` invalide dans `utilisateurs`, ce qui bloquerait ensuite TOUTES
    // les mises à jour du profil (garde `profilScolaireValide`).
    const niveauPubliable = niveau !== 'inconnu';
    if (niveauPubliable) fiche.niveau = niveau;
    await setDoc(doc(db, COLLECTION, uid), fiche, { merge: true });
    //  AUTO-RÉPARATION (plan Spark) : la Cloud Function `migrerClassementPublic`
    // ne peut pas être déployée sur le plan gratuit. Écrire ici le `niveau`
    // manquant des profils antérieurs répare le même défaut, sans intervention
    // de l'admin, et rend `utilisateurs` cohérent avec le filtre. N'échoue
    // jamais : c'est du rattrapage, pas une condition de succès.
    if (niveauPubliable && profil.niveau !== niveau) {
      try {
        await updateDoc(doc(db, 'utilisateurs', uid), { niveau });
      } catch (erreur) {
        rapporterErreur('[classement] rattrapage du niveau impossible', erreur);
      }
    }
    return true;
  } catch (erreur) {
    // Hors-ligne : la publication repartira à la prochaine synchro.
    rapporterErreur('[classement] publication de ma fiche impossible', erreur);
    return false;
  }
}

/**
 * Rang réel dans le niveau : nombre d'élèves du même niveau ayant plus d'XP,
 * plus un. Le comptage est fait par le serveur (`getCountFromServer`) : pas de
 * téléchargement de toute la collection.
 */
export async function maPosition(niveau: string, xp: number): Promise<Position | null> {
  if (!niveau) return null;
  try {
    const base = collection(db, COLLECTION);
    const total = (await getCountFromServer(query(base, where('niveau', '==', niveau)))).data().count;
    const devant = (
      await getCountFromServer(
        query(base, where('niveau', '==', niveau), where('xp', '>', Math.max(0, xp)))
      )
    ).data().count;
    if (total <= 0) return null;
    return { position: devant + 1, total };
  } catch (erreur) {
    // Hors-ligne ou index manquant : on masque simplement le rang.
    rapporterErreur('[classement] position indisponible', erreur);
    return null;
  }
}
