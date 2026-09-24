// PARTAGE MULTIPLATEFORMES — sur react-native-web, `Share.share` REJETTE quand
// `navigator.share` est absent (navigation desktop non sécurisée) : le rejet
// non catché générait une unhandled promise rejection et le partage échouait
// silencieusement. Ici : web → `navigator.share` si présent, sinon repli
// presse-papiers avec confirmation ; natif → `Share.share` inchangé.
// Ne JETTE jamais : les call sites (dont dans des callbacks d'alerte) peuvent
// l'ignorer en toute sécurité.
import { Platform, Share } from 'react-native';
import { alerte } from './alerte';

type NavigateurPartage = {
  share?: (donnees: { text: string }) => Promise<void>;
  clipboard?: { writeText: (texte: string) => Promise<void> };
};

/**
 * Partage `message` et renvoie true si le contenu est bien parti (ou copié).
 * false = indisponible ou annulé par l'utilisateur — jamais une exception.
 */
export async function partager(message: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as NavigateurPartage | undefined;
      if (nav && typeof nav.share === 'function') {
        await nav.share({ text: message });
        return true;
      }
      if (nav && typeof nav.clipboard?.writeText === 'function') {
        await nav.clipboard.writeText(message);
        alerte(
          '📋 Copié !',
          'Le partage direct n’est pas disponible sur ce navigateur : le texte a été copié dans le presse-papiers.'
        );
        return true;
      }
      return false;
    }
    await Share.share({ message });
    return true;
  } catch {
    // Partage annulé par l'utilisateur ou refusé par le système : pas une erreur.
    return false;
  }
}