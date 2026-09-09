/**
 * 🖼️ AvatarEditor — télécharge / choisit un avatar et l'affiche en cercle.
 * Persiste localement dans AsyncStorage pour un usage hors-ligne.
 * 100% hors-ligne, 0 dépendance payante, 0 argent.
 */
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE_AVATAR = 'lex_avatar_uri';

interface AvatarEditorProps {
  /** URI locale de l'image, ou null pour revenir à l'emoji par défaut. */
  imageUri?: string | null;
  /** Emoji affiché quand aucune image n'est sélectionnée. */
  emojiFallback?: string;
  size?: number;
  onAvatarChange?: (image: string | null, emoji?: string) => void;
  buttonLabel?: string;
  /** Si vrai, on affiche l'emoji fallback au lieu de l'icône Ionicons. */
  showFallbackEmoji?: boolean;
}

export default function AvatarEditor({
  imageUri,
  emojiFallback = '🎓',
  size = 80,
  onAvatarChange,
  buttonLabel = 'Modifier l\'avatar',
  showFallbackEmoji = true,
}: AvatarEditorProps) {
  const [loading, setLoading] = useState(false);
  const hasImage = Boolean(imageUri);

  const handlePick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      const uri = !result.canceled ? result.assets?.[0]?.uri : undefined;
      if (uri) {
        await AsyncStorage.setItem(CLE_AVATAR, uri);
        onAvatarChange?.(uri);
      }
    } catch (err) {
      console.warn('[AvatarEditor] Échec de la sélection :', err);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (hasImage) {
      return (
        <Image
          source={{ uri: imageUri! }}
          style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
        />
      );
    }
    if (showFallbackEmoji) {
      return (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.emojiFallback, { fontSize: size * 0.5 }]}>{emojiFallback}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.emojiFallback, { fontSize: size * 0.5 }]}>👤</Text>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={handlePick}
        activeOpacity={0.85}
        disabled={loading}
      >
        {renderContent()}
        <View style={[styles.overlay, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.emojiFallback, { fontSize: size * 0.28, color: '#ffffff' }]}>📷</Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.label}>{buttonLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fbbf24',
  },
  img: {
    resizeMode: 'cover',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  emojiFallback: {
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 13,
  },
});
