/**
 * 🔧 GRILLE DE DÉLÉGATION DE POUVOIRS
 * Le superadmin coche les permissions qu'un élève (devenu admin) pourra exercer.
 * Les anciens rôles (moniteur / chef_classe / délégué) ont été retirés du modèle
 * en février 2026 : désormais, un admin n'a pas de rôle pédagogique, juste les
 * permissions que le superadmin lui a données via cette grille.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCurrentUserId } from '../services/auth';
import {
  UserRole,
  PermissionKey,
  getRolesClasse,
  revoquerRole,
  estAdminActuel,
  estSuperAdminActuel,
  deleguerPouvoirs,
  lirePouvoirsDelegues,
  grilleDelegation,
  PERMISSIONS_DELEGABLES,
  PERMISSIONS_SUPERADMIN_SEUL,
} from '../services/rolesPermissions';
import { libellePermission, libelleRoleAdmin, variantesClasse } from '../services/adminUtils';
import { rapporterErreur } from '../utils/logger';

interface StudentWithRole {
  userId: string;
  nom: string;
  classe: string;
  role?: UserRole;
}

export default function AdminPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  // 👑 Un superadmin voit en plus la grille de partage des pouvoirs (les 48
  // permissions délégables). Le reste de l'écran est identique.
  const [estSuper, setEstSuper] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classe, setClasse] = useState('');
  const [students, setStudents] = useState<StudentWithRole[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 🎁 Délégation de pouvoirs : élève visé + cases cochées + état d'écriture.
  const [eleveCible, setEleveCible] = useState<StudentWithRole | null>(null);
  const [pouvoirs, setPouvoirs] = useState<PermissionKey[]>([]);
  const [chargementPouvoirs, setChargementPouvoirs] = useState(false);
  const [enregistrementPouvoirs, setEnregistrementPouvoirs] = useState(false);

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

      // 🛡️ GARDE D'ACCES — deleguee a estAdminActuel() : lit la collection
      // `admins` (source de verite, remplie par le bootstrap "code superadmin"
      // de admin.tsx) PUIS `roles/{uid}`. Avant, le test etait
      // `peutEffectuerAction(userId, 'modifierRoles')`, qui ne lit QUE
      // `roles/{uid}` : le superadmin bootstrappe n'a pas de doc `roles` ->
      // "Acces refuse" a l'administrateur lui-meme, et aucun role ne pouvait
      // donc JAMAIS etre attribue.
      const isAdminUser = await estAdminActuel();
      if (!isAdminUser) {
        Alert.alert('❌ Accès refusé', 'Vous n\'êtes pas autorisé à accéder à cette page');
        router.back();
        return;
      }

      setEstSuper(await estSuperAdminActuel());
      setIsAdmin(true);
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

      // 🔎 Le modèle lycée valide `niveau` (« 2nde », « 1ere », « terminale »)
      // tandis que `classe` reste un texte libre hérité des anciens profils.
      // Un seul `where('classe','==',saisie)` exact renvoyait donc une liste
      // VIDE dès que la casse ou le champ différait — l'écran paraissait cassé.
      // On essaie maintenant la saisie PUIS ses variantes, sur les deux champs.
      const variantes = variantesClasse(classe);
      let valeurTrouvee = '';
      let docs: { id: string; data: DocumentData }[] = [];
      for (const variante of variantes) {
        for (const champ of ['classe', 'niveau'] as const) {
          const snap = await getDocs(
            query(collection(db, 'utilisateurs'), where(champ, '==', variante))
          );
          if (!snap.empty) {
            valeurTrouvee = variante;
            docs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
            break;
          }
        }
        if (docs.length > 0) break;
      }

      if (docs.length === 0) {
        setStudents([]);
        Alert.alert(
          'Aucun élève trouvé',
          `Aucun élève pour « ${classe} ». Essaie un niveau du lycée : 2nde, 1ere ou terminale — le champ « classe » des anciens profils peut différer.`
        );
        return;
      }

      // Les rôles sont enregistrés avec la valeur de classe utilisée lors de
      // l'attribution : on interroge donc celle qui a réellement trouvé des élèves.
      const roles = await getRolesClasse(valeurTrouvee);
      const rolesMap = new Map(roles.map((r) => [r.userId, r.role]));

      const adminId = currentUserId;
      const students: StudentWithRole[] = docs
        .map(({ id, data }) => {
          const userId = id;
          const nom = (data.nom || data.displayName || data.pseudo || 'Élève') as string;
          const role = rolesMap.get(userId);
          const libelle = (data.niveau || data.classe || valeurTrouvee) as string;
          return { userId, nom, classe: libelle, role };
        })
        .filter((s) => s.userId !== adminId)
        .sort((a, b) => a.nom.localeCompare(b.nom));

      setStudents(students);
    } catch (error) {
      rapporterErreur('[admin_roles] Chargement des eleves:', error);
      Alert.alert('Erreur', String(error));
    } finally {
      setLoading(false);
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
              Alert.alert('✅ Succès', 'Rôle révoqué');
              chargerEtudiantsClasse();
            } else {
              Alert.alert('❌ Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  // 🎁 PARTAGE DE POUVOIRS (réservé au superadmin) — la grille des 48
  // permissions délégables. On enregistre un TABLEAU (et non la carte) : c'est
  // exactement le champ `pouvoirsDelegues` que relit getPermissionsUtilisateur
  // pour fusionner les pouvoirs fins aux droits du rôle.
  const ouvrirPouvoirs = async (student: StudentWithRole) => {
    setEleveCible(student);
    setChargementPouvoirs(true);
    try {
      setPouvoirs(await lirePouvoirsDelegues(student.userId));
    } catch (error) {
      rapporterErreur('[admin_roles] Lecture des pouvoirs:', error);
      setPouvoirs([]);
    } finally {
      setChargementPouvoirs(false);
    }
  };

  const basculerPouvoir = (cle: PermissionKey) => {
    setPouvoirs((precedents) =>
      precedents.includes(cle) ? precedents.filter((p) => p !== cle) : [...precedents, cle]
    );
  };

  /** Coche/décoche d'un bloc (un domaine, ou tout le catalogue). */
  const basculerPouvoirsLot = (cles: readonly PermissionKey[], actif: boolean) => {
    setPouvoirs((precedents) => {
      const ensemble = new Set(
        actif ? [...precedents, ...cles] : precedents.filter((p) => !cles.includes(p))
      );
      // On repasse par PERMISSIONS_DELEGABLES : l'ordre reste celui du
      // catalogue et une clé non délégable ne peut pas s'y glisser.
      return PERMISSIONS_DELEGABLES.filter((cle) => ensemble.has(cle));
    });
  };

  const enregistrerPouvoirs = async () => {
    if (!eleveCible) return;
    setEnregistrementPouvoirs(true);
    const resultat = await deleguerPouvoirs(eleveCible.userId, pouvoirs);
    setEnregistrementPouvoirs(false);
    if (resultat.success) {
      Alert.alert(
        '✅ Pouvoirs partagés',
        `${pouvoirs.length} pouvoir(s) accordé(s) à ${eleveCible.nom}.`
      );
    } else {
      Alert.alert('❌ Erreur', resultat.error || 'Enregistrement impossible');
    }
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
        <Text style={styles.subtitle}>
          {estSuper ? '👑 Superadmin — grille de délégation de pouvoirs' : 'Délégation de pouvoirs'}
        </Text>
      </View>

      {/* SÉLECTION CLASSE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Sélectionner une classe</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 2nde, 1ere ou terminale"
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

      {/* 🎁 PARTAGE DE POUVOIRS — superadmin uniquement */}
      {estSuper && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 Partager des pouvoirs</Text>

          {eleveCible ? (
            <>
              <Text style={styles.pouvoirsCible}>
                Destinataire : <Text style={styles.roleActive}>{eleveCible.nom}</Text>
                {`   ${pouvoirs.length}/${PERMISSIONS_DELEGABLES.length} cochés`}
              </Text>

              {chargementPouvoirs ? (
                <ActivityIndicator color="#FBBF24" style={styles.pouvoirsLoader} />
              ) : (
                <>
                  <View style={styles.pouvoirsActions}>
                    <TouchableOpacity
                      style={styles.rolePill}
                      onPress={() => basculerPouvoirsLot(PERMISSIONS_DELEGABLES, true)}
                    >
                      <Text style={styles.btnText}>Tout cocher</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rolePillAnnuler}
                      onPress={() => basculerPouvoirsLot(PERMISSIONS_DELEGABLES, false)}
                    >
                      <Text style={styles.btnText}>Tout décocher</Text>
                    </TouchableOpacity>
                  </View>

                  {grilleDelegation().map((domaine) => {
                    const toutesCochees = domaine.cles.every((cle) => pouvoirs.includes(cle));
                    return (
                      <View key={domaine.domaine} style={styles.domaine}>
                        <TouchableOpacity
                          onPress={() => basculerPouvoirsLot(domaine.cles, !toutesCochees)}
                        >
                          <Text style={styles.domaineTitre}>
                            {`${domaine.domaine}  ${toutesCochees ? '✅' : '⬜'}`}
                          </Text>
                        </TouchableOpacity>
                        {domaine.cles.map((cle) => {
                          const coche = pouvoirs.includes(cle);
                          return (
                            <TouchableOpacity
                              key={cle}
                              style={[styles.permLigne, coche && styles.permLigneCochee]}
                              onPress={() => basculerPouvoir(cle)}
                            >
                              <Text style={styles.permTexte}>{libellePermission(cle)}</Text>
                              <Text style={styles.permCase}>{coche ? '☑️' : '⬜'}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={enregistrerPouvoirs}
                      disabled={enregistrementPouvoirs}
                    >
                      <Text style={styles.btnText}>
                        {enregistrementPouvoirs ? '⏳ Enregistrement…' : '💾 Enregistrer'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEleveCible(null)}>
                      <Text style={styles.btnText}>Fermer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          ) : (
            <Text style={styles.aidePouvoirs}>
              {`Charge une classe, puis touche « 🎁 Pouvoirs » sur l’élève dont tu veux choisir les droits. ${PERMISSIONS_DELEGABLES.length} pouvoirs sont partageables ; les ${PERMISSIONS_SUPERADMIN_SEUL.length} pouvoirs suprêmes (promouvoir / rétrograder un admin) restent réservés au superadmin.`}
            </Text>
          )}
        </View>
      )}

      {/* LISTE ÉTUDIANTS */}
      {students.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Élèves de {classe}</Text>
          {students.map((student) => (
            <View
              key={student.userId}
              style={[
                styles.studentCard,
                eleveCible?.userId === student.userId && styles.studentCardCible,
              ]}
            >
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.nom}</Text>
                {student.role ? (
                  <Text style={styles.studentRole}>
                    Rôle actuel: <Text style={styles.roleActive}>{libelleRoleAdmin(student.role)}</Text>
                  </Text>
                ) : (
                  <Text style={styles.studentNoRole}>Pas de rôle</Text>
                )}
              </View>

              {student.role && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => revoquerRoleEtudiant(student.userId, student.nom)}
                  >
                    <Text style={styles.btnText}>🗑️ Révoquer le rôle</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* 🎁 Superadmin uniquement : ouvrir la grille des pouvoirs
                  de CET élève (aucun rôle requis — un élève simple peut
                  recevoir un pouvoir précis sans changer de statut). */}
              {estSuper && (
                <TouchableOpacity
                  style={styles.pouvoirBtn}
                  onPress={() => ouvrirPouvoirs(student)}
                >
                  <Text style={styles.btnText}>🎁 Choisir ses pouvoirs</Text>
                </TouchableOpacity>
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
  /* 🎁 Partage des pouvoirs (superadmin) */
  studentCardCible: {
    borderColor: '#FBBF24',
    borderWidth: 2,
  },
  pouvoirBtn: {
    backgroundColor: '#7C3AED',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  pouvoirsCible: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 10,
  },
  pouvoirsLoader: {
    marginVertical: 12,
  },
  pouvoirsActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rolePill: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  rolePillAnnuler: {
    flex: 1,
    backgroundColor: '#6B7280',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  domaine: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  domaineTitre: {
    color: '#FBBF24',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 6,
  },
  permLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  permLigneCochee: {
    backgroundColor: '#16233B',
  },
  permTexte: {
    color: '#E2E8F0',
    fontSize: 12,
    flex: 1,
    paddingRight: 8,
  },
  permCase: {
    fontSize: 14,
  },
  aidePouvoirs: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
});
