/**
 * 🔔 NOTIFICATIONS LOCALES INTELLIGENTES (100% hors-ligne)
 *
 * Le rappel quotidien existe déjà (optionsApp.ts). Ce service ajoute deux
 * rappels CONTEXTUELS, recalculés à chaque ouverture de l'app :
 *  - « Défi du jour non fait » (19h) : seulement si le défi du jour
 *    n'a pas encore été joué ;
 *  - « Série en danger » (20h) : seulement si l'élève a un streak actif
 *    mais n'a rien fait aujourd'hui.
 * Chaque ouverture de l'app reprogramme tout → jamais de notification
 * inutile, et ça marche sans aucune connexion.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { demanderPermissionNotifications } from './optionsApp';
import { jourLocal } from '../utils/correctifsAudit';

const CLE_ACTIVE = 'lex_notifs_extras';
const ID_DEFI = 'lex-rappel-defi';
const ID_STREAK = 'lex-rappel-streak';

/** Toggle (Paramètres) : rappels contextuels défi + série. */
export async function getNotifsExtras(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_ACTIVE)) === '1';
  } catch {
    return false;
  }
}

export async function setNotifsExtras(actif: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_ACTIVE, actif ? '1' : '0');
    if (actif) await planifierRappelsDuJour();
    else await annulerExtras();
  } catch {
    // ignore
  }
}

async function annulerExtras(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID_DEFI);
  } catch { /* pas programmée */ }
  try {
    await Notifications.cancelScheduledNotificationAsync(ID_STREAK);
  } catch { /* pas programmée */ }
}

function heureAujourdhui(heure: number): Date {
  const d = new Date();
  d.setHours(heure, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Reprogramme les rappels du jour selon l'état réel de l'élève.
 * À appeler à chaque démarrage de l'app (best-effort).
 */
export async function planifierRappelsDuJour(): Promise<void> {
  try {
    if (!(await getNotifsExtras())) return;
    if (!(await demanderPermissionNotifications())) return;

    await annulerExtras();
    const aujourdHui = jourLocal();

    // 1) Défi du jour non fait ? → rappel à 19h.
    const classe = await AsyncStorage.getItem('lex_classe_actuelle');
    if (classe) {
      const fait = await AsyncStorage.getItem(`lex_defi_fait_${classe}`);
      if (fait !== aujourdHui) {
        await Notifications.scheduleNotificationAsync({
          identifier: ID_DEFI,
          content: {
            title: '📰 Défi du jour',
            body: "Ta classe joue au même défi aujourd'hui. 3 questions, 5 minutes — à toi de jouer !",
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: heureAujourdhui(19) },
        });
      }
    }

    // 2) Série active mais rien fait aujourd'hui ? → alerte à 20h.
    const streakBrut = await AsyncStorage.getItem('lex_streak_local');
    if (streakBrut) {
      const s = JSON.parse(streakBrut) as { streak: number; dernierJour: string };
      if (s.streak > 0 && s.dernierJour !== aujourdHui) {
        await Notifications.scheduleNotificationAsync({
          identifier: ID_STREAK,
          content: {
            title: '🔥 Ta série est en danger !',
            body: `${s.streak} jour(s) de série... Un seul exercice ce soir la garde en vie.`,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: heureAujourdhui(20) },
        });
      }
    }
  } catch {
    // notifications indisponibles : jamais bloquant
  }
}