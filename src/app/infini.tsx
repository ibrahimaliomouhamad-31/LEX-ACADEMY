import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { doc, getDoc } from 'firebase/firestore';
import { getStats } from '../services/statsSuivi';
import { db } from '../config/firebaseConfig';
import { urlChat, headersIA } from '../services/configIA';

 

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function Infini() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const id = params.id as string;
  const titre = (params.titre as string) || 'Exercice';
  const classe = (params.classe as string) || '';
  const matiere = (params.matiere as string) || '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [coursLoading, setCoursLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [texteDuCours, setTexteDuCours] = useState<string>('');
  const [pointsFaibles, setPointsFaibles] = useState<string>('');
  const hasInitialized = useRef(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    const fetchCours = async () => {
      if (!id) { setError("ID du cours manquant."); setCoursLoading(false); return; }
      try {
        setCoursLoading(true);
        const docRef = doc(db, 'cours', id); 
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const contenu = docSnap.data().theorie || docSnap.data().contenu;
          if (contenu) setTexteDuCours(contenu);
          else setError("Ce cours n'a pas de texte.");
        } else {
          setError("Cours introuvable.");
        }
      } catch (err) {
        setError("Erreur Firebase.");
      } finally {
        setCoursLoading(false);
      }
    };
    fetchCours();
    (async () => {
      try {
        const stats = await getStats();
        const faibles = Object.entries(stats.chapitres)
          .filter(([, ch]) => ch.total >= 3)
          .sort((a, b) => a[1].reussis / a[1].total - b[1].reussis / b[1].total)
          .slice(0, 3)
          .map(([id]) => id.replace(/_/g, ' '))
          .join(', ');
        if (faibles) setPointsFaibles(faibles);
      } catch { /* ignore */ }
    })();
  }, [id]);

  useEffect(() => {
    if (!coursLoading && texteDuCours && !hasInitialized.current) {
      hasInitialized.current = true;
      sendMessage("Je suis prêt pour l'exo !", true);
    }
  }, [coursLoading, texteDuCours]);

  const sendMessage = async (text: string, isInit: boolean = false) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    if(!isInit) setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // LE PROMPT "GRAND FRÈRE POTTE" ULTIME
      const systemPrompt = `Tu es LEX.AI, le grand frère pote qui aide les élèves du Lycée d'Excellence (LEX) au Niger. 
Tu es cool, détendu, tu tutoies et tu parles comme un lycéen (ex: "Bien joué frérot !", "Nan, t'as zappé un truc", "C'est ça bg").
Matière : ${matiere}, Classe : ${classe}.
Points faibles détectés chez cet élève (oriente discrètement tes exercices dessus) : ${pointsFaibles || "inconnus"}.
Cours de référence :
---
 ${texteDuCours}
---

RÈGLES STRICTES D'EXERCICE :
1. Pose UNE seule question ou UN seul problème à la fois basé sur le cours.
2. Attends que l'élève tape sa réponse.
3. SI LA RÉPONSE EST JUSTE : Félicite de façon cool ("Clap clap", "C'est ça, trop fort"), et passe DIRECTEMENT à la question suivante.
4. SI LA RÉPONSE EST FAUSSE (1ère erreur sur la question) : Explique POURQUOI c'est faux de façon directe (ex: "Nan, t'as oublié de changer le signe quand t'as passé de l'autre côté"), mais NE DONNE PAS la solution finale. Dis-lui de réessayer.
5. SI LA RÉPONSE EST FAUSSE (2ème erreur sur la même question) : C'est le fail. Donne la solution détaillée étape par étape. Dis un truc style "C'est pas grave, on va le retenir pour le bac. On passe à la suite." et pose un NOUVEAU problème.
6. Ne fais JAMAIS de longs paragraphes. Sois direct, utile et un peu taquin.`;

      const response = await fetch(urlChat(), {
        method: 'POST',
        headers: headersIA(),
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.5,
          // gpt-oss est un modèle "raisonneur" : il brûle des tokens dans son champ
          // "reasoning" AVANT d'écrire la réponse. Avec 300 tokens, la réponse
          // revenait souvent VIDE. On augmente le budget et on réduit le raisonnement.
          max_tokens: 2000,
          reasoning_effort: "low",
          messages: [
            { role: 'system', content: systemPrompt },
            // On ne renvoie que les messages ayant un contenu non vide
            ...messages.filter(m => m.content && m.content.trim() !== '').map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content }
          ]
        })
      });

      const data = await response.json();

      const aiResponse = data.choices?.[0]?.message?.content;
      if (aiResponse && aiResponse.trim() !== '') {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      } else {
        const errorMsg = data.error?.message || (aiResponse === undefined ? "Réponse vide de l'IA (réessaie)." : "Réponse vide de l'IA.");
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Erreur : ${errorMsg}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Oups, problème de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (coursLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FBBF24" />
        <Text style={{ color: '#F8FAFC', marginTop: 15 }}>Chargement de LEX.AI...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: '#EF4444', fontSize: 18, textAlign: 'center', marginBottom: 20 }}>Oups !</Text>
        <Text style={{ color: '#94A3B8', textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 30, backgroundColor: '#FBBF24', padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#0F172A', fontWeight: 'bold' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>LEX.AI : {titre}</Text>
          <Text style={styles.subtitle}>Mode Grand Frère 🤙</Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
      >
        {messages.map((msg, index) => (
          <View key={index} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.bubbleText}>{msg.content}</Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', alignItems: 'center' }]}>
            <ActivityIndicator color="#FBBF24" size="small" style={{ marginRight: 10 }} />
            <Text style={styles.bubbleText}>LEX.AI tape...</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput 
          style={styles.input}
          placeholder="Ta réponse ou ton calcul..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, (loading || input.trim() === '') && { opacity: 0.5 }]} 
          onPress={() => sendMessage(input)} 
          disabled={loading || input.trim() === ''}
        >
          <Text style={styles.sendBtnText}>Envoyer</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E293B', backgroundColor: '#0F172A' },
  backBtn: { color: '#FBBF24', fontSize: 16, marginRight: 15, fontWeight: 'bold' },
  title: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' },
  subtitle: { color: '#FBBF24', fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  chatContainer: { flex: 1 },
  bubble: { maxWidth: '85%', padding: 15, borderRadius: 15, marginBottom: 15 },
  userBubble: { backgroundColor: '#3B82F6', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  aiBubble: { backgroundColor: '#1E293B', alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#334155' },
  bubbleText: { color: '#F8FAFC', fontSize: 15, lineHeight: 22 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: '#1E293B' },
  input: { flex: 1, backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, borderWidth: 1, borderColor: '#334155' },
  sendBtn: { backgroundColor: '#FBBF24', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 10 },
  sendBtnText: { color: '#0F172A', fontWeight: 'bold' }
});