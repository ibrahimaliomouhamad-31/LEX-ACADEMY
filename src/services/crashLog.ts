/**
 * 🚨 JOURNAL DE CRASHS — file offline-first
 *
 * Un plantage ne doit jamais être perdu : le rapport est stocké localement
 * et envoyé au retour du wifi via la file de synchronisation. L'admin voit
 * les crashs dans Firestore (collection crash_logs).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueue } from './syncQueue';

const CLE_LOGS = 'lex_crash_logs';
const MAX_LOCAL = 20;

export interface CrashLog {
  message: string;
  stack?: string;
  dateISO: string;
}

export async function signalerCrash(error: unknown): Promise<void> {
  try {
    const crash: CrashLog = {
      message: String(error instanceof Error ? error.message : error).slice(0, 480),
      stack: error instanceof Error ? error.stack?.slice(0, 2000) : undefined,
      dateISO: new Date().toISOString(),
    };

    // 1) Copie locale (toujours, même hors-ligne)
    const brut = await AsyncStorage.getItem(CLE_LOGS);
    const liste: CrashLog[] = brut ? JSON.parse(brut) : [];
    liste.push(crash);
    await AsyncStorage.setItem(CLE_LOGS, JSON.stringify(liste.slice(-MAX_LOCAL)));

    // 2) File de sync →Firestore 'crash_logs' au retour du wifi
    const userId = await AsyncStorage.getItem('lex_user_id');
    await syncQueue.add('create', 'crash_logs', `${crash.dateISO}_${userId || 'inconnu'}`, {
      message: crash.message,
      stack: crash.stack || '',
      userId: userId || null,
      dateISO: crash.dateISO,
    });
  } catch {
    // même le journaling doit jamais crasher
  }
}

/** Derniers crashs locaux (écran admin). */
export async function derniersCrashs(): Promise<CrashLog[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_LOGS);
    return brut ? (JSON.parse(brut) as CrashLog[]) : [];
  } catch {
    return [];
  }
}