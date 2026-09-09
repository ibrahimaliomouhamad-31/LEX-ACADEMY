import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { urlChat, headersIA } from '../services/configIA';
import { chercher, memoriser } from '../services/qaCache';
import { estEnLigne } from '../utils/reseau';

// ⚠️ REMPLACE "TA_CLE_GROQ_ICI" par ta clé gratuite de Groq

export default function LexAI() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: 'Bonjour, je suis LEX.AI, ton assistant. En quoi puis-je t\'aider aujourd\'hui ?'}
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (input.trim() === '') return;
    
    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(urlChat(), {
        method: 'POST',
        headers: headersIA(),
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.5,
          max_tokens: 2000,
          reasoning_effort: "low",
          messages: [
            { role: 'system', content: "Tu es LEX.AI, un professeur virtuel strict mais pédagogue du Lycée d'Excellence (LEX) au Niger. Tu aides l'élève en lui donnant des indices et en le guidant. Tu ne donnes JAMAIS la réponse finale directement. Tu utilises le programme officiel du Niger." },
            ...messages.filter(m => m.content && m.content.trim() !== '').map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content }
          ]
        })
      });

      const data = await response.json();

      const aiResponse = data.choices?.[0]?.message?.content;
      if (aiResponse && aiResponse.trim() !== '') {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
        // 💾 Mémorise la paire Q/R : servira en mode dégradé hors-ligne.
        await memoriser(userMessage.content, aiResponse);
      } else {
        throw new Error(data.error?.message || "Réponse vide de l'API");
      }
    } catch (error) {
      console.error("Erreur LEX.AI : ", error);
      // 📴 MODE DÉGRADÉ HORS-LIGNE : rejoue une réponse similaire du cache
      // plutôt que le message d'erreur générique. L'élève reste aidé,
      // même 4 jours sans wifi.
      const enLigne = await estEnLigne().catch(() => false);
      const carte = await chercher(userMessage.content);
      if (!enLigne && carte) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚡ Mode hors-ligne — voici une réponse à une question proche que j'avais mémorisée :\n\n${carte.reponse}`
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Je ne peux pas répondre pour le moment. Vérifie ta connexion internet — ou pose une question proche de celles déjà mémorisées.' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')}>
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