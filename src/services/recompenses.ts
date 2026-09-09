// RÉCOMPENSES : coupons bien-être virtuels (amélioration 13)
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coupon {
  id: string;
  titre: string;
  description: string;
  coutJetons: number;
  emoji: string;
}

const CLE_COUPONS = '@lex/couponsObtenus';

export const CATALOGUE_COUPONS: Coupon[] = [
  { id: 'pause-longue', titre: 'Grande pause', description: '1h de pause bien méritée sans culpabilité', coutJetons: 50, emoji: '🛋️' },
  { id: 'musique', titre: 'Concert privé', description: '30 min de musique de ton choix pendant l\'étude', coutJetons: 30, emoji: '🎵' },
  { id: 'gouter', titre: 'Goûter spécial', description: 'Un goûter préféré après une session réussie', coutJetons: 40, emoji: '🍪' },
  { id: 'sport', titre: 'Session sport', description: '30 min de foot / basket / course', coutJetons: 60, emoji: '⚽' },
  { id: 'film', titre: 'Séance ciné', description: 'Un épisode ou film éducatif après les révisions', coutJetons: 80, emoji: '🎬' },
  { id: 'dodo', titre: 'Grasse matinée', description: 'Dormir 1h de plus le week-end (mémoire +)', coutJetons: 100, emoji: '😴' },
];

export async function getCouponsObtenus(): Promise<string[]> {
  const brut = await AsyncStorage.getItem(CLE_COUPONS);
  return brut ? (JSON.parse(brut) as string[]) : [];
}

/** Échange des jetons contre un coupon. Retourne false si solde insuffisant ou déjà obtenu. */
export async function echangerCoupon(id: string, jetonsDisponibles: number): Promise<boolean> {
  const coupon = CATALOGUE_COUPONS.find((c) => c.id === id);
  if (!coupon || jetonsDisponibles < coupon.coutJetons) return false;
  const obtenus = await getCouponsObtenus();
  if (obtenus.includes(id)) return false;
  obtenus.push(id);
  await AsyncStorage.setItem(CLE_COUPONS, JSON.stringify(obtenus));
  return true;
}