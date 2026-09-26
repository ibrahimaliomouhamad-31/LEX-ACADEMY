import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { urlChat, headersIA, construireMessages, extraireReponse, extraireErreurProxy, quotaClientDepasse } from '../services/configIA';
import { chercher, memoriser } from '../services/qaCache';
import { estEnLigne } from '../utils/reseau';
import { rapporterErreur } from '../utils/logger';
import { assainir, compacterContexte, creerConversation, doitCompacter, enregistrerConversations, listerConversations, renommerConversation, sauvegarderConversation, supprimerConversation, titreAuto, type ConversationIA, type MessageIA } from '../services/conversationsIA';

// 🔒 AUCUNE CLÉ IA CÔTÉ CLIENT : l'appel passe par le proxy `lexaiChat`
// (cf. services/configIA.ts — contrat { reponse } + limites 30 msg / 32 Ko).

/** Message élève selon la nature réelle de l'échec (statut proxy, timeout, réseau). */
function texteErreur(error: unknown, enLigne: boolean): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return "⏱️ L'IA met trop de temps à répondre (30 s). Réessaie avec une question plus courte.";
  }
  const status = (error as { status?: number } | null)?.status;
  if (status === 404) {
    return "🛠️ L'assistant n'est pas encore activé sur ce serveur (fonction IA non déployée). Ce n'est PAS un problème de connexion.";
  }
  if (status === 429) {
    return "⏳ Trop de questions d'affilée ! Patientes quelques minutes avant de relancer LEX.AI.";
  }
  if (!enLigne) {
    return "📴 Tu es hors-ligne et je n'ai pas de réponse proche en mémoire. Reconnecte-toi, ou pose une question déjà posée un jour avec du wifi.";
  }
  const message = error instanceof Error && error.message ? ` (${error.message})` : '';
  return `Je ne peux pas répondre pour le moment${message}. Réessaie dans un instant.`;
}

/** Historique des envois (fenêtre glissante) pour le quota client. */
const FENETRE_QUOTA_MS = 10 * 60 * 1000;

/** Nettoie les horodatages hors fenêtre pour garder une trace légère. */
function borner(horodatages: number[], maintenant: number): number[] {
  return horodatages.filter((h) => maintenant - h < FENETRE_QUOTA_MS);
}

export default function LexAI() {
  const router = useRouter();
  const [conv, setConv] = useState<ConversationIA>(() => creerConversation());
  const [liste, setListe] = useState<ConversationIA[]>([]);
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionTitre, setEditionTitre] = useState('');
  // Suppression en deux temps : pas d'Alert (no-op sur le web) et pas de
  // suppression définitive sur un appui malencontreux.
  const [suppressionId, setSuppressionId] = useState<string | null>(null);
  const messages: MessageIA[] = useMemo(
    () =>
      conv.messages.length > 0
        ? conv.messages
        : [{ role: 'assistant', content: "Bonjour, je suis LEX.AI, ton assistant. En quoi puis-je t'aider aujourd'hui ?" }],
    [conv.messages]
  );
  const aCompacter = useMemo(() => doitCompacter(conv), [conv]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const horodatagesEnvois = useRef<number[]>([]);

  // 💬 Reprise de session : la discussion la plus récente est rouverte telle
  // quelle (les messages survivaient déjà au reboot, mais l'écran repartait
  // sur un chat vide — la persistance ne servait qu'au tiroir).
  useEffect(() => {
    (async () => {
      try {
        const fraiche = await listerConversations();
        setListe(fraiche);
        if (fraiche.length > 0) setConv(fraiche[0]);
      } catch {
        setListe([]);
      }
    })();
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Mise à jour de la conversation ACTIVE : titre auto au 1er échange, bornage
  // aux limites du proxy (60 messages / 8000 car.) via `assainir`.
  const ajouterMessagePrev = (maj: (prev: MessageIA[]) => MessageIA[]) => {
    setConv((prev) => {
      const suivants = maj(prev.messages);
      const titre =
        prev.titre === 'Nouvelle discussion' && suivants.length > prev.messages.length
          ? titreAuto(suivants)
          : prev.titre;
      return { ...prev, messages: assainir(suivants), titre, majLe: Date.now() };
    });
  };

  // 💾 Sauvegarde auto : chaque conv survit au changement d'écran / reboot.
  useEffect(() => {
    if (conv.messages.length === 0) return;
    const t = setTimeout(() => {
      sauvegarderConversation(conv).then(setListe).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [conv]);

  /** Ferme le tiroir et remet à zéro les modes édition / confirmation. */
  const fermerTiroir = () => {
    setTiroirOuvert(false);
    setEditionId(null);
    setEditionTitre('');
    setSuppressionId(null);
  };

  const nouvelleDiscussion = async () => {
    try {
      if (conv.messages.length > 0) setListe(await sauvegarderConversation(conv));
    } catch { /* sauvegarde best-effort */ }
    setConv(creerConversation());
    fermerTiroir();
  };

  const ouvrirConversation = async (id: string) => {
    try {
      if (conv.messages.length > 0) await sauvegarderConversation(conv);
      const fraiche = await listerConversations();
      setListe(fraiche);
      const trouvee = fraiche.find((c) => c.id === id);
      if (trouvee) setConv(trouvee);
    } catch { /* lecture best-effort */ }
    fermerTiroir();
  };

  const effacerConversation = async (id: string) => {
    setSuppressionId(null);
    try {
      setListe(await supprimerConversation(id));
    } catch { /* suppression best-effort */ }
    if (conv.id === id) setConv(creerConversation());
  };

  const validerRenommage = async () => {
    if (!editionId) return;
    const source = liste.some((c) => c.id === editionId) ? liste : [...liste, conv];
    const suivante = renommerConversation(source, editionId, editionTitre);
    const cible = suivante.find((c) => c.id === editionId);
    setEditionId(null);
    setEditionTitre('');
    if (!cible) return;
    setListe(suivante);
    if (conv.id === cible.id) setConv((prev) => ({ ...prev, titre: cible.titre }));
    // 💾 Le renommage doit survivre au redémarrage : l'auto-save ne suit que la
    // conversation ACTIVE, on écrit donc la liste complète.
    try {
      setListe(await enregistrerConversations(suivante));
    } catch { /* persistance best-effort */ }
  };

  const compacter = async () => {
    const { conv: compactee, archives } = compacterContexte(conv);
    if (archives === 0) return;
    setConv(compactee);
    try {
      setListe(await sauvegarderConversation(compactee));
    } catch { /* sauvegarde best-effort */ }
  };

  const sendMessage = async () => {
    const texte = input.trim();
    if (texte === '' || loading) return;

    // ⏳ QUOTA CLIENT : on compte les TENTATIVES (pas seulement les succès)
    // pour devancer le rate-limiter serveur (60/10 min/IP partagée en ville).
    const maintenant = Date.now();
    if (quotaClientDepasse(horodatagesEnvois.current, maintenant)) {
      ajouterMessagePrev(() => [{
        role: 'assistant',
        content: "⏳ Tu as déjà beaucoup questionné LEX.AI sur les 10 dernières minutes. Fais une petite pause — je serai là juste après ! (quota de sécurité anti-abus)"
      }]);
      return;
    }
    horodatagesEnvois.current = [...borner(horodatagesEnvois.current, maintenant), maintenant];

    const userMessage: MessageIA = { role: 'user', content: texte };
    ajouterMessagePrev((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(urlChat(), {
        method: 'POST',
        headers: headersIA(),
        signal: controller.signal,
        body: JSON.stringify({
          // ⚠️ `model` N'EST PLUS ENVOYÉ : le proxy impose son modèle autorisé
          // côté serveur (le choix client était un risque d'abus).
          temperature: 0.5,
          max_tokens: 2000,
          // Historique tronqué aux limites du proxy (30 msg / 32 Ko / 8000 car.)
          // → le chat ne meurt plus après ~15 échanges (400 « trop long »).
          // Le résumé compacté repart en tête pour ne rien perdre des échanges
          // archivés par 🗜️ Compacter.
          messages: construireMessages(messages, texte, conv.resumeContexte),
        }),
      });

      // ⚠️ STATUT AVANT JSON : la fonction non déployée renvoie du HTML (404)
      // et `response.json()` dessus échouerait avec une erreur illisible.
      if (!response.ok) {
        let corps: unknown = null;
        try { corps = await response.json(); } catch { /* corps non-JSON (page HTML) */ }
        const erreur = new Error(
          extraireErreurProxy(corps) || `Erreur HTTP ${response.status}`
        ) as Error & { status?: number };
        erreur.status = response.status;
        throw erreur;
      }

      const data: unknown = await response.json();
      const aiResponse = extraireReponse(data);
      if (aiResponse === null) {
        // Contrat { reponse } non respecté (ou réponse vide) → erreur lisible.
        throw new Error(extraireErreurProxy(data) || "Réponse vide de l'API");
      }
      ajouterMessagePrev((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
      // 💾 Mémorise la paire Q/R : servira en mode dégradé hors-ligne.
      await memoriser(userMessage.content, aiResponse);
    } catch (error) {
      rapporterErreur("Erreur LEX.AI : ", error);
      // 📴 REPLI SUR LE CACHE À CHAQUE ÉCHEC (hors-ligne OU proxy en panne) :
      // une réponse déjà mémorisée vaut toujours mieux qu'un message d'erreur.
      const enLigne = await estEnLigne().catch(() => false);
      const carte = await chercher(userMessage.content);
      if (carte) {
        ajouterMessagePrev((prev) => [...prev, {
          role: 'assistant',
          content: `⚡ ${enLigne ? 'Moteur IA momentanément indisponible —' : 'Mode hors-ligne —'} voici une réponse à une question proche que j'avais mémorisée :\n\n${carte.reponse}`
        }]);
      } else {
        ajouterMessagePrev((prev) => [...prev, { role: 'assistant', content: texteErreur(error, enLigne) }]);
      }
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🤖 LEX.AI</Text>
        <TouchableOpacity onPress={() => { setSuppressionId(null); setTiroirOuvert(true); }} style={styles.chatsBtn}>
          <Text style={styles.chatsBtnTexte}>💬 Chats</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sousBarre}>
        <TouchableOpacity onPress={nouvelleDiscussion} style={styles.actionBtn}>
          <Text style={styles.actionTexte}>＋ Nouveau</Text>
        </TouchableOpacity>
        {aCompacter && (
          <TouchableOpacity onPress={compacter} style={styles.actionBtn}>
            <Text style={styles.actionTexte}>🗜️ Compacter</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
      >
        {messages.map((msg, index) => (
          <View key={index} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.bulleRole}>{msg.role === 'user' ? '🧑 Toi' : '🤖 LEX.AI'}</Text>
            <Text style={styles.bubbleText}>{msg.content}</Text>
          </View>
        ))}
        {conv.resumeContexte !== '' && (
          <View style={styles.resumeBloc}>
            <Text style={styles.resumeTexte}>🗜️ Contexte compacté mémorisé ({conv.messages.length} messages actifs)</Text>
          </View>
        )}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <ActivityIndicator color="#FBBF24" size="small" />
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput 
          style={styles.input}
          placeholder="Écris ta question..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          maxLength={4000}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading}>
          <Text style={styles.sendBtnText}>Envoyer</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Modal visible={tiroirOuvert} animationType="slide" transparent onRequestClose={fermerTiroir}>
        <View style={styles.tiroirFond}>
          <View style={styles.tiroir}>
            <View style={styles.tiroirEntete}>
              <Text style={styles.tiroirTitre}>💬 Mes discussions</Text>
              <TouchableOpacity onPress={fermerTiroir}>
                <Text style={styles.tiroirFermer}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={nouvelleDiscussion} style={styles.nouveauBtn}>
              <Text style={styles.nouveauTexte}>＋ Nouvelle discussion</Text>
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false}>
              {liste.length === 0 && (
                <Text style={styles.tiroirVide}>Aucune discussion sauvegardee pour l&apos;instant.</Text>
              )}
              {liste.map((c) => (
                <View key={c.id} style={[styles.itemChat, c.id === conv.id && styles.itemChatActif]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => ouvrirConversation(c.id)}>
                    {editionId === c.id ? (
                      <TextInput
                        value={editionTitre}
                        onChangeText={setEditionTitre}
                        onSubmitEditing={validerRenommage}
                        style={styles.itemRenommer}
                        autoFocus
                        maxLength={60}
                      />
                    ) : (
                      <>
                        <Text style={styles.itemTitre} numberOfLines={1}>{c.titre}</Text>
                        <Text style={styles.itemMeta}>{c.messages.length} msg</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {editionId === c.id && (
                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={validerRenommage}>
                        <Text style={styles.itemActionConfirme}>Enregistrer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {editionId !== c.id && suppressionId === c.id && (
                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={() => effacerConversation(c.id)}>
                        <Text style={styles.itemActionConfirme}>Supprimer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setSuppressionId(null)}>
                        <Text style={styles.itemActionTexte}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {editionId !== c.id && suppressionId !== c.id && (
                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={() => { setEditionId(c.id); setEditionTitre(c.titre); }}>
                        <Text style={styles.itemAction}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setSuppressionId(c.id)}>
                        <Text style={styles.itemAction}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backBtn: { color: '#FBBF24', fontSize: 14, marginRight: 20 },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold' },
  chatContainer: { flex: 1 },
  bubble: { maxWidth: '80%', padding: 15, borderRadius: 15, marginBottom: 15 },
  userBubble: { backgroundColor: '#3B82F6', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  aiBubble: { backgroundColor: '#1E293B', alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderLeftWidth: 3, borderLeftColor: '#FBBF24' },
  bubbleText: { color: '#F8FAFC', fontSize: 15, lineHeight: 21 },
  bulleRole: { color: '#FBBF24', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  resumeBloc: { backgroundColor: '#0B2B1F', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#10B981' },
  resumeTexte: { color: '#6EE7B7', fontSize: 11 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: '#1E293B' },
  input: { flex: 1, backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: '#FBBF24', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 10 },
  sendBtnText: { color: '#0F172A', fontWeight: 'bold' },
  chatsBtn: { marginLeft: 'auto', backgroundColor: '#1E293B', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chatsBtnTexte: { color: '#FBBF24', fontWeight: 'bold', fontSize: 12 },
  sousBarre: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  actionBtn: { backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  actionTexte: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  tiroirFond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  tiroir: { backgroundColor: '#0F172A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  tiroirEntete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tiroirTitre: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  tiroirFermer: { color: '#94A3B8', fontSize: 18 },
  nouveauBtn: { backgroundColor: '#FBBF24', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 },
  nouveauTexte: { color: '#0F172A', fontWeight: 'bold' },
  tiroirVide: { color: '#64748B', textAlign: 'center', marginTop: 20 },
  itemChat: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 8 },
  itemChatActif: { borderWidth: 1, borderColor: '#FBBF24' },
  itemTitre: { color: '#F8FAFC', fontWeight: '600' },
  itemMeta: { color: '#64748B', fontSize: 11, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 12, marginLeft: 8 },
  itemAction: { fontSize: 16 },
  itemActionTexte: { color: '#94A3B8', fontSize: 12 },
  itemActionConfirme: { color: '#FBBF24', fontSize: 12, fontWeight: '800' },
  itemRenommer: { backgroundColor: '#0F172A', color: '#F8FAFC', borderRadius: 8, padding: 8 }
});