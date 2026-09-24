// ALERTE MULTIPLATEFORMES — sur react-native-web, `Alert.alert` est un NO-OP :
// la classe livrée par RNW est vide (`static alert() {}`). Résultat sur web,
// AVANT ce wrapper : aucun message visible ET aucun callback `onPress` des
// boutons ne s'exécutait jamais (confirmations de promotion d'admin, révocation
// de rôle, restauration de sauvegarde, signalement d'exercice, abandon de jeu…).
// Ici : iOS/Android → `Alert` natif (inchangé) ; web → fenêtre DOM équivalente
// avec les mêmes boutons, styles et callbacks.
import { Alert, Platform, type AlertButton } from 'react-native';

export type BoutonAlerte = Pick<AlertButton, 'text' | 'style' | 'onPress'>;

/**
 * Affiche une alerte (titre, message, boutons) sur toutes les plateformes.
 * Signature alignée sur `Alert.alert` : migration 1:1 des call sites.
 */
export function alerte(titre: string, message?: string, boutons?: BoutonAlerte[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(titre, message, boutons);
    return;
  }
  afficherFenetreWeb(titre, message, boutons ?? []);
}

function afficherFenetreWeb(titre: string, message: string | undefined, boutons: BoutonAlerte[]): void {
  // Garde SSR / environnements sans DOM : ne rien faire plutôt que de planter.
  if (typeof document === 'undefined') return;

  const liste = boutons.length > 0 ? boutons : [{ text: 'OK' }];
  const boutonAnnulation = liste.find((b) => b.style === 'cancel');

  const couche = document.createElement('div');
  couche.setAttribute('role', 'alertdialog');
  couche.setAttribute('aria-modal', 'true');
  couche.setAttribute('aria-label', titre);
  couche.style.cssText =
    'position:fixed;inset:0;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;z-index:9999;';

  const fenetre = document.createElement('div');
  fenetre.style.cssText =
    'background:#1E293B;color:#F8FAFC;border-radius:16px;max-width:340px;width:92%;padding:20px 18px 16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.45);';

  const titreEl = document.createElement('div');
  titreEl.textContent = titre;
  titreEl.style.cssText = 'font-size:17px;font-weight:700;margin-bottom:8px;';
  fenetre.appendChild(titreEl);

  if (message) {
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText =
      'font-size:14.5px;line-height:1.45;opacity:.85;white-space:pre-wrap;margin-bottom:16px;';
    fenetre.appendChild(messageEl);
  }

  const rangee = document.createElement('div');
  rangee.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;';

  let fermee = false;

  function fermer(): void {
    if (fermee) return;
    fermee = true;
    document.removeEventListener('keydown', surEchap);
    couche.remove();
  }

  function surEchap(e: KeyboardEvent): void {
    // Échap = annulation uniquement si un bouton Annuler existe (sinon
    // l'alerte reste bloquante, fidèle au comportement iOS sans bouton cancel).
    if (e.key !== 'Escape' || !boutonAnnulation) return;
    fermer();
    boutonAnnulation.onPress?.();
  }

  liste.forEach((b, i) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.textContent = b.text ?? 'OK';
    const base =
      'border:none;border-radius:10px;padding:10px 12px;font-size:14.5px;font-weight:600;cursor:pointer;flex:1;min-width:88px;';
    if (b.style === 'destructive') {
      bouton.style.cssText = base + 'background:#EF4444;color:#fff;';
    } else if (b.style === 'cancel') {
      bouton.style.cssText = base + 'background:#334155;color:#CBD5E1;';
    } else {
      bouton.style.cssText = base + 'background:#2563EB;color:#fff;';
    }
    bouton.onclick = () => {
      fermer();
      b.onPress?.();
    };
    if (i === 0) setTimeout(() => bouton.focus(), 0);
    rangee.appendChild(bouton);
  });

  fenetre.appendChild(rangee);
  couche.appendChild(fenetre);

  // Clic sur le voile = geste « retour » : ferme seulement si un bouton
  // Annuler existe, sinon l'alerte reste bloquante (aucune action hasardeuse).
  couche.onclick = (e) => {
    if (e.target !== couche || !boutonAnnulation) return;
    fermer();
    boutonAnnulation.onPress?.();
  };

  document.addEventListener('keydown', surEchap);
  document.body.appendChild(couche);
}