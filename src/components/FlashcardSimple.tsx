/**
 * 🃏 FlashcardSimple — carte de révision, sans animation lourde.
 * Appuyez pour retourner, swipe pour passer à la suivante.
 */
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FlashcardSimpleProps {
  question: string;
  answer: string;
  /** Optionnel : appelle ce callback quand la carte est retournée. */
  onReveal?: (revealed: boolean) => void;
  /** Si fourni, on affiche une puces / format court. */
  answerAsList?: boolean;
}

export default function FlashcardSimple({
  question,
  answer,
  onReveal,
  answerAsList = false,
}: FlashcardSimpleProps) {
  const [revealed, setRevealed] = useState(false);

  const handlePress = () => {
    const next = !revealed;
    setRevealed(next);
    onReveal?.(next);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.92}
      >
        <Text style={styles.label}>
          {revealed ? '✅ Réponse' : '❓ Question'}
        </Text>
        <Text style={styles.content} numberOfLines={revealed ? undefined : 3}>
          {revealed ? answer : question}
        </Text>
        {answerAsList && revealed && (
          <Text style={styles.listHint}>
            ← glisse vers la gauche pour passer à la carte suivante
          </Text>
        )}
        {!revealed && (
          <Text style={styles.hint}>Appuie pour voir la réponse</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  label: {
    color: '#fbbf24',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  content: {
    color: '#f8fafc',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  hint: {
    color: '#94a3b8',
    marginTop: 14,
    fontSize: 13,
    fontStyle: 'italic',
  },
  listHint: {
    color: '#a78bfa',
    marginTop: 12,
    fontSize: 12,
  },
});
