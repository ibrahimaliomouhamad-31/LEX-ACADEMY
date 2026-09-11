/**
 * 🎒 SAUVEGARDE DE COMPTE — sélection des clés à exporter / restaurer.
 *
 * La sauvegarde (code de transfert) doit contenir TOUTE la progression de
 * l'élève — y compris l'état anti-farm, les scores BAC/flashcards/QCM, le
 * planning SRS — mais JAMAIS les secrets (hash du mot de passe, session)
 * ni le cache de cours re-téléchargeable.
 *
 * 🛡️ AUDIT cycle J : avant, l'export filtrait explicitement ~6 clés et
 * OMETTAIT `lex_exos_resolus`, `lex_bac_blanc_scores`, `lex_flashcards_scores`,
 * `lex_qcm_meilleur`, `lex_infini_stats`, `lex_srs`… → restauration sur un
 * nouveau téléphone = anti-farm réinitialisé (re-farm illimité) + historique
 * perdu. Désormais : ALLOWLIST complète et vérifiée par tests.
 */

/** Clés globales de progression (hors espace `lex_user_*`) à sauvegarder. */
export const CLES_GLOBALES_PROGRESSION: readonly string[] = [
  // XP / streak / anti-farm
  'lex_xp_local', 'lex_streak_local', 'lex_streak_freezes',
  'lex_exos_resolus', 'lex_booster_double_xp_fin',
  // Scores pédagogiques
  'lex_bac_blanc_scores', 'lex_flashcards_scores', 'lex_qcm_meilleur',
  'lex_qcm_svt_scores', 'lex_infini_stats', 'lex_olympiades_resolus',
  // Révisions planifiées (SM2)
  'lex_srs', 'lex_srs_sm2', 'lex_srs_faits',
  // Objectifs / positionnement / progression
  'lex_objectifs', 'lex_positionnement', 'lex_maitrise_notions',
  'lex_badges_debloques',
  // Économie / boutique / personnalisation
  'lex_boutique_achats', 'lex_credits', 'lex_duels', 'lex_titre_actif',
  'lex_favoris_chapitres', 'lex_dernier_chapitre',
  // Notes & assistant
  'lex_annotations', 'lex_qa_cache',
  // Réglages (plutôt que de tous les reconfigurer)
  'lex_langue', 'lex_theme', 'lex_taille_police', 'lex_option_dortoir',
  'lex_rappel_actif', 'lex_rappel_heure', 'lex_mode_economie_donnees',
];

/** Clés à NE JAMAIS exporter (secrets, session, état transitoire de sync). */
const CLES_EXCLUES: readonly string[] = [
  'lex_comptes_locaux', // hash du mot de passe !
  'lex_user_session', 'lex_session_expiry', // session de connexion
  'lex_examen_actif', // verrou local de sécurité (anti-triche)
  'lex_sync_queue', 'lex_sync_conflicts', 'lex_last_sync_timestamp',
  'lex_defi_en_attente', 'lex_file_sync_globale', 'lex_signalements_en_attente',
  'lex_dernier_pretelechargement', 'lex_crash_logs', 'lex_guide_vu',
];

/**
 * Filtre les clés locales à inclure dans le code de sauvegarde.
 * Règle : espace utilisateur `lex_user_*` (sauf la session) + allowlist
 * des clés globales de progression ; jamais les secrets ni le cache.
 */
export function selectionnerClesProgression(cles: readonly string[]): string[] {
  const globales = new Set(CLES_GLOBALES_PROGRESSION);
  const exclues = new Set(CLES_EXCLUES);
  return cles.filter((k) => {
    if (exclues.has(k)) return false;
    // Cache de cours/exercices : re-téléchargeable, trop lourd pour WhatsApp.
    if (k.startsWith('lex_cache_') || k.startsWith('lex_cours_')) return false;
    if (k.startsWith('lex_user_')) return k !== 'lex_user_session';
    return globales.has(k);
  });
}

/** Garde les `max` premières entrées (sémantique « plus récentes d'abord »). */
export function plafonner<T>(liste: T[], max: number): T[] {
  return liste.length <= max ? liste : liste.slice(0, max);
}