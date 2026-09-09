import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GROUPES_DISPONIBLES, envoyerMessage, getMessages, getReactions, reagirMessage, type MessageGroupe } from '../services/groupesEntraide';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GroupesEntraide() {
  const router = useRouter();
  const [groupeActif, setGroupeActif] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageGroupe[]>([]);
  const [texte, setTexte] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [reactions, setReactions] = useState<Record<string, { n: number; moi: boolean }>>({});

  useEffect(() => {
    if (groupeActif) getReactions(groupeActif).then(setReactions);
  }, [groupeActif]);

  const reagir = async (id: string) => {
    if (!groupeActif) return;
    await reagirMessage(groupeActif, id);
    setReactions(await getReactions(groupeActif));
  };

  useEffect(() => {
    AsyncStorage.getItem('@lex/pseudo').then((p) => setPseudo(p || 'Élève LEX'));
  }, []);
  useEffect(() => {
    if (groupeActif) getMessages(groupeActif).then(setMessages);
  }, [groupeActif]);

  const envoyer = async () => {
    if (!groupeActif) return;
    const res = await envoyerMessage(groupeActif, pseudo, texte);
    if (!res.ok) {
      Alert.alert('Message bloqué', res.raison || 'Message non autorisé');
      return;
    }
    setTexte('');
    setMessages(await getMessages(groupeActif));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (groupeActif ? setGroupeActif(null) : router.back())}>
          <Text style={styles.retour}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.titre}>{groupeActif ? `💬 ${groupeActif}` : '🤝 Groupes d\'entraide'}</Text>
      </View>
      <View style={styles.body}>
        {!groupeActif ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.hint}>Pose tes questions, aide les autres. 100% élèves, respect obligatoire 💙</Text>
            {GROUPES_DISPONIBLES.map((g) => (
              <TouchableOpacity key={g.matiere} style={styles.card} onPress={() => setGroupeActif(g.matiere)}>
                <Text style={styles.emoji}>{g.emoji}</Text>
                <Text style={styles.titreCard}>{g.matiere}</Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {messages.length === 0 && <Text style={styles.hint}>Aucun message. Sois le premier à aider ! 🙌</Text>}
              {messages.map((m) => (
                <View key={m.id} style={styles.msg}>
                  <Text style={styles.auteur}>{m.auteur}</Text>
                  <Text style={styles.texte}>{m.texte}</Text>
                  <TouchableOpacity onPress={() => reagir(m.id)} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 13, color: reactions[m.id]?.moi ? '#F472B6' : '#64748B' }}>
                      💙 {reactions[m.id]?.n || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={styles.barre}>
              <TextInput style={styles.input} placeholder="Ta question ou ta réponse..." placeholderTextColor="#64748B" value={texte} onChangeText={setTexte} multiline />
              <TouchableOpacity style={styles.envoyer} onPress={envoyer}><Text style={{ fontSize: 20 }}>➤</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 55 },
  retour: { color: '#FBBF24', fontSize: 15, marginBottom: 10 },
  titre: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: 16 },
  hint: { color: '#94A3B8', textAlign: 'center', marginVertical: 16, fontSize: 14 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  emoji: { fontSize: 26, marginRight: 14 },
  titreCard: { color: '#FFF', fontSize: 16, fontWeight: '700', flex: 1 },
  chevron: { color: '#64748B', fontSize: 22 },
  msg: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, marginBottom: 8 },
  auteur: { color: '#FBBF24', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  texte: { color: '#E2E8F0', fontSize: 14, lineHeight: 20 },
  barre: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 10, gap: 8 },
  input: { flex: 1, backgroundColor: '#1E293B', color: '#FFF', borderRadius: 12, padding: 12, fontSize: 14, maxHeight: 90 },
  envoyer: { backgroundColor: '#F59E0B', borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});