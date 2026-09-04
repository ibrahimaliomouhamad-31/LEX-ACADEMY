// RAPPEL QUOTIDIEN (notification locale, réglable par l'élève)


import * as Notifications from 'expo-notifications';
import { getHeureRappel, getRappelActif, setRappelActif } from './parametres';

// --- Rappel quotidien ---

const ID_RAPPEL = 'lex-rappel-quotidien';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function demanderPermissionNotifications(): Promise<boolean> {
  try {
    const actuelle = await Notifications.getPermissionsAsync();
    let accordée = actuelle.granted;
    if (!accordée) {
      const demande = await Notifications.requestPermissionsAsync();
      accordée = demande.granted;
    }
    return accordée;
  } catch {
    return false;
  }
}

// Programme (ou annule) le rappel quotidien à l'heure choisie par l'élève.
// Renvoie un message de statut lisible.
export async function appliquerRappel(): Promise<string> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const actif = await getRappelActif();
    if (!actif) return 'Rappel désactivé ✅';

    const autorise = await demanderPermissionNotifications();
    if (!autorise) {
      await setRappelActif(false);
      return 'Notifications refusées : active-les dans les réglages du téléphone.';
    }

    const heure = await getHeureRappel();

    // 79 — RAPPELS INTELLIGENTS : silencieux pendant les vacances,
    // doublé (matin + soir) dans les 21 jours avant les compositions.
    const maintenant = new Date();
    const mois = maintenant.getMonth() + 1;
    const enVacances = (mois === 7 && maintenant.getDate() >= 10) || mois === 8 || (mois === 12 && maintenant.getDate() >= 20) || (mois === 1 && maintenant.getDate() <= 4);
    if (enVacances) return 'Vacances scolaires : rappel en pause 😴 (reprend à la rentrée)';

    const avantCompo = (mois === 10 && maintenant.getDate() >= 25) || (mois === 2 && maintenant.getDate() >= 18) || (mois === 5);
    if (avantCompo) {
      await Notifications.scheduleNotificationAsync({
        identifier: ID_RAPPEL + '_matin',
        content: { title: 'LEX ACADEMY ⚡', body: 'Compositions bientôt : 10 minutes de révision ce matin ?' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 } as Notifications.NotificationTriggerInput,
      });
    }

    await Notifications.scheduleNotificationAsync({
      identifier: ID_RAPPEL,
      content: {
        title: 'LEX ACADEMY 🔥',
        body: 'Tes révisions du jour t\'attendent ! 10 minutes suffisent pour garder ta série.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: heure,
        minute: 0,
      } as Notifications.NotificationTriggerInput,
    });
    return `Rappel activé : chaque jour à ${String(heure).padStart(2, '0')}h00 ✅`;
  } catch {
    return 'Notifications indisponibles sur cet appareil.';
  }
}