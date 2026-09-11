/**
 * 🔧 ADMIN PANEL - ATTRIBUTION DE RÔLES
 * Interface pour attribuer des postes aux élèves < 14 ans
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCurrentUserId, getSessionValide } from '../services/auth';
import {
  UserRole,
  UserPermissions,
  attribuerRoleEtudiant,
  getRolesClasse,
  revoquerRole,
  getPermissionsUtilisateur,
  peutEffectuerAction,
} from '../services/rolesPermissions';
import { t } from '../services/traductions';
import { getLangue } from '../services/parametres';
import { avertirDev, logDev, rapporterErreur } from '../utils/logger';

const ROLES_DISPONIBLES: { id: UserRole; label: string; icon: string; description: string }[] = [
  {
    id: 'moniteur',
    label: '🎯 Moniteur',
    icon: '👨‍🏫',
    description: 'Aide les autres élèves, corrige les exercices',
  },
  {
    id: 'chef_classe',
    label: '📋 Chef de classe',
    icon: '👑',
    description: 'Gère la classe, crée défis, valide devoirs',
  },
  {
    id: 'delegue',
    label: '📣 Délégué',
    icon: '📢',
    description: 'Représente la classe, voit les stats, crée annonces',
  },
];

interface StudentWithRole {
  userId: string;
  nom: string;
  classe: string;
  role?: UserRole;
  selectedRole?: UserRole;
}

export default function AdminPanel() {
  const router = useRouter();
  const [langue, setLangue] = useState<'fr' | 'en'>('fr');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classe, setClasse] = useState('');
  const [students, setStudents] = useState<StudentWithRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('moniteur');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    verifyAdmin();
  }, []);

  const verifyAdmin = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        router.replace('/login');
        return;
      }

      setCurrentUserId(userId);

      const isAdminUser = await peutEffectuerAction(userId, 'modifierRoles');
      if (!isAdminUser) {
        Alert.alert('❌ Accès refusé', 'Vous n\'êtes pas autorisé à accéder à cette page');
        router.back();
        return;
      }

      setIsAdmin(true);
      const lang = await getLangue();
      setLangue(lang);
      setLoading(false);
    } catch (error) {
      rapporterErreur('[admin]:', error);
      setLoading(false);
    }
  };

  const chargerEtudiantsClasse = async () => {
    if (!classe.trim()) {
      Alert.alert('Classe requise', 'Veuillez entrer une classe');
      return;
    }

    try {
      setLoading(true);
      const roles = await getRolesClasse(classe);
      const rolesMap = new Map(roles.map((r) => [r.userId, r.role]));

      // Récupérer la vraie liste des élèves de la classe depuis Firestore
      const utilisateursRef = collection(db, 'utilisateurs');
      const q = query(utilisateursRef, where('classe', '==', classe));
      const snapshot = await getDocs(q);
      const adminId = currentUserId;
      const students: StudentWithRole[] = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          const userId = doc.id;
          const nom = (data.nom || data.displayName || data.pseudo || 'Élève') as string;
          const role = rolesMap.get(userId);
          return { userId, nom, classe, role };
        })
        .filter((s) => s.userId !== adminId)
        .sort((a, b) => a.nom.localeCompare(b.nom));

      setStudents(students);
      setLoading(false);
    } catch (error) {
      Alert.alert('Erreur', String(error));
      setLoading(false);
    }
  };

  const attribuerRole = async (userId: string) => {
    if (!selectedRole) {
      Alert.alert('Sélectionnez un rôle');
      return;
    }

    try {
      const student = students.find((s) => s.userId === userId);
      if (!student) return;

      const result = await attribuerRoleEtudiant(
        userId,
        student.nom,
        classe,
        selectedRole
      );

      if (result.success) {
        Alert.alert('✅ Succès', `Rôle "${selectedRole}" attribué à ${student.nom}`);
        setEditingUserId(null);
        chargerEtudiantsClasse();
      } else {
        Alert.alert('❌ Erreur', result.error || 'Impossible d\'attribuer le rôle');
      }
    } catch (error) {
      Alert.alert('Erreur', String(error));
    }
  };

  const revoquerRoleEtudiant = async (userId: string, nom: string) => {
    Alert.alert(
      '⚠️ Confirmation',
      `Êtes-vous sûr de révoquer le rôle de ${nom}?`,
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Révoquer',
          onPress: async () => {
            const result = await revoquerRole(userId);
            if (result.success) {
              Alert.alert('✅ Succès', 'Rôle révoké');
              chargerEtudiantsClasse();
            } else {
              Alert.alert('❌ Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>❌ Accès refusé</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Admin Panel</Text>
        <Text style={styles.subtitle}>Gestion des rôles et permissions</Text>
      </View>

      {/* SÉLECTION CLASSE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Sélectionner une classe</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 2nde A"
          value={classe}
          onChangeText={setClasse}
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity
          style={styles.btn}
          onPress={chargerEtudiantsClasse}
        >
          <Text style={styles.btnText}>Charger élèves</Text>
        </TouchableOpacity>
      </View>

      {/* RÔLES DISPONIBLES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Rôles disponibles</Text>
        {ROLES_DISPONIBLES.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[
              styles.roleCard,
              selectedRole === role.id && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole(role.id)}
          >
            <View>
              <Text style={styles.roleLabel}>{role.label}</Text>
              <Text style={styles.roleDesc}>{role.description}</Text>
            </View>
            <View style={styles.checkbox}>
              {selectedRole === role.id && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* LISTE ÉTUDIANTS */}
      {students.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Élèves de {classe}</Text>
          {students.map((student) => (
            <View key={student.userId} style={styles.studentCard}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.nom}</Text>
                {student.role ? (
                  <Text style={styles.studentRole}>
                    Rôle actuel: <Text style={styles.roleActive}>{student.role}</Text>
                  </Text>
                ) : (
                  <Text style={styles.studentNoRole}>Pas de rôle</Text>
                )}
              </View>

              {editingUserId === student.userId ? (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => attribuerRole(student.userId)}
                  >
                    <Text style={styles.btnText}>✅ Confirmer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditingUserId(null)}
                  >
                    <Text style={styles.btnText}>❌ Annuler</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setEditingUserId(student.userId)}
                  >
                    <Text style={styles.btnText}>✏️ Modifier</Text>
                  </TouchableOpacity>
                  {student.role && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => revoquerRoleEtudiant(student.userId, student.nom)}
                    >
                      <Text style={styles.btnText}>🗑️ Révoquer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FBBF24',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    marginBottom: 10,
  },
  btn: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  roleCard: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    borderColor: '#FBBF24',
    backgroundColor: '#16233B',
  },
  roleLabel: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 14,
  },
  roleDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FBBF24',
    fontWeight: 'bold',
  },
  studentCard: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  studentInfo: {
    marginBottom: 10,
  },
  studentName: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 14,
  },
  studentRole: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  roleActive: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  studentNoRole: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#6B7280',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  error: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
});
