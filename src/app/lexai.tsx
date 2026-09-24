import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { urlChat, headersIA, construireMessages, extraireReponse, extraireErreurProxy } from '../services/configIA';
import { chercher, memoriser } from '../services/qaCache';
import { bloquerSiExamen } from '../services/parametres';
import { estEnLigne } from '../utils/reseau';
import { rapporterErreur } from '../utils/logger';

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

export default function LexAI() {
  const router = useRouter();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Bonjour, je suis LEX.AI, ton assistant. En quoi puis-je t\'aider aujourd\'hui ?'}
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // 🔒 MODE EXAMEN : LEX.AI est l'outil d'aide le plus puissant de l'app —
  // il doit être verrouillé pendant une épreuve, comme le solveur, les
  // flashcards et la recherche (bloquerSiExamen, garde partagée).
  useEffect(() => { bloquerSiExamen(router, 'LEX.AI'); }, []);

  const sendMessage = async () => {
    const texte = input.trim();
    if (texte === '' || loading) return;

    const userMessage = { role: 'user', content: texte };
    setMessages(prev => [...prev, userMessage]);
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
          messages: construireMessages(messages, texte),
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
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      // 💾 Mémorise la paire Q/R : servira en mode dégradé hors-ligne.
      await memoriser(userMessage.content, aiResponse);
    } catch (error) {
      rapporterErreur("Erreur LEX.AI : ", error);
      // 📴 REPLI SUR LE CACHE À CHAQUE ÉCHEC (hors-ligne OU proxy en panne) :
      // une réponse déjà mémorisée vaut toujours mieux qu'un message d'erreur.
      const enLigne = await estEnLigne().catch(() => false);
      const carte = await chercher(userMessage.content);
      if (carte) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚡ ${enLigne ? 'Moteur IA momentanément indisponible —' : 'Mode hors-ligne —'} voici une réponse à une question proche que j'avais mémorisée :\n\n${carte.reponse}`
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: texteErreur(error, enLigne) }]);
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

      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20 }}
      >
        {messages.map((msg, index) => (
          <View key={index} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.bubbleText}>{msg.content}</Text>
          </View>
        ))}
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
  aiBubble: { backgroundColor: '#1E293B', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  bubbleText: { color: '#F8FAFC', fontSize: 15 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: '#1E293B' },
  input: { flex: 1, backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: '#FBBF24', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 10 },
  sendBtnText: { color: '#0F172A', fontWeight: 'bold' }
});