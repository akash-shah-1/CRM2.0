import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile, UserRole } from '../types/auth';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        setLoading(true);
        try {
          // Reactively listen to profile changes to catch "disabled" status in real-time
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          profileUnsub = onSnapshot(userDocRef, async (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              if (data.status === 'disabled') {
                await signOut(auth);
                setUser(null);
                alert('Your account has been disabled. Please contact an administrator.');
              } else {
                setUser({ ...data, id: firebaseUser.uid, uid: firebaseUser.uid });
              }
            } else {
              // Fallback for when profile doesn't exist yet (claiming process)
              const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const preProfileDoc = querySnapshot.docs[0];
                const preProfileData = preProfileDoc.data() as UserProfile;
                const finalProfile = {
                  ...preProfileData,
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  createdAt: preProfileData.createdAt || Date.now()
                };

                const { id, ...savableProfile } = finalProfile;
                await setDoc(userDocRef, { ...savableProfile, createdAt: serverTimestamp() });
                if (preProfileDoc.id !== firebaseUser.uid) {
                  await deleteDoc(preProfileDoc.ref);
                }
                // onSnapshot will trigger again for userDocRef
              } else {
                // Create default profile
                const isAdminEmail = firebaseUser.email === 'admin@nexus.com' || firebaseUser.email === 'akash.s@cisinlabs.com';
                const newProfile: UserProfile = {
                  id: firebaseUser.uid,
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || 'Anonymous User',
                  role: isAdminEmail ? UserRole.ADMIN : UserRole.EMPLOYEE,
                  permissions: isAdminEmail ? [] : ['dashboard', 'chat', 'documents', 'communication'],
                  projectAccess: [],
                  status: 'active',
                  avatarUrl: firebaseUser.photoURL || null,
                  createdAt: Date.now(),
                };
                const { id, ...savable } = newProfile;
                await setDoc(userDocRef, { ...savable, createdAt: serverTimestamp() });
              }
            }
            setLoading(false);
          }, (err) => {
            console.error('Profile snapshot error:', err);
            setLoading(false);
          });

        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
