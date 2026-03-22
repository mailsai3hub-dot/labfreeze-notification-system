import {
  Sample,
  User,
  View,
  HoldCase,
  Evaluation,
  NotificationSettings,
  InventorySchedule,
  Fridge,
  UserRole
} from '../types';
import { auth, db } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteField
} from 'firebase/firestore';

const KEYS = {
  SAMPLES: 'lf_samples',
  HOLD: 'lf_hold',
  USERS: 'lf_users',
  EVALS: 'lf_evals',
  SCHED: 'lf_sched',
  NOTIF: 'lf_notif',
  FEAT: 'lf_feat',
  LOGS: 'lf_logs',
  THEME: 'lf_theme',
  USER_EMAILS_MAP: 'lf_user_emails_map'
};

const getJSON = (key: string, def: any) => {
  if (typeof window === 'undefined') return def;
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : def;
  } catch {
    return def;
  }
};

const setJSON = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage not available', e);
  }
};

const shouldUseCloud = async () => {
  return !!auth.currentUser;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const storageService = {
  subscribeToChanges(onSampleChange: () => void, onHoldChange: () => void) {
    if (!auth.currentUser) {
      console.log('Skipping realtime subscription: No Firebase user authenticated.');
      return { unsubscribe: () => {} };
    }

    try {
      const qSamples = query(collection(db, 'samples'), where('status', '!=', 'Deleted'));
      const unsubSamples = onSnapshot(
        qSamples,
        () => {
          onSampleChange();
        },
        (error) => {
          if ((error as any).code === 'permission-denied') {
            console.warn('Firestore permission denied for samples listener. User might not be authenticated in Firebase.');
          } else {
            handleFirestoreError(error, OperationType.GET, 'samples');
          }
        }
      );

      const qHold = query(collection(db, 'hold_cases'));
      const unsubHold = onSnapshot(
        qHold,
        () => {
          onHoldChange();
        },
        (error) => {
          if ((error as any).code === 'permission-denied') {
            console.warn('Firestore permission denied for hold_cases listener.');
          } else {
            handleFirestoreError(error, OperationType.GET, 'hold_cases');
          }
        }
      );

      return {
        unsubscribe: () => {
          unsubSamples();
          unsubHold();
        }
      };
    } catch (e) {
      console.warn('Failed to setup realtime listeners:', e);
      return { unsubscribe: () => {} };
    }
  },

  async login(identifier: string, pass: string): Promise<{ user: User | null; error: any; requiresVerification?: boolean }> {
    try {
      let emailToLogin = identifier.trim();
      const isEmail = emailToLogin.includes('@');

      if (!isEmail) {
        let foundEmail: string | null = null;
        const usernameLower = emailToLogin.toLowerCase();

        try {
          const usernameDocRef = doc(db, 'usernames', usernameLower);
          const usernameDoc = await getDoc(usernameDocRef);

          if (usernameDoc.exists()) {
            const usernameData = usernameDoc.data() as any;
            if (usernameData?.email) {
              foundEmail = usernameData.email;
            }
          }
        } catch (e) {
          console.warn('Username doc lookup failed:', e);
        }

        if (!foundEmail) {
          const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
          if (userEmailsMap[usernameLower]) {
            foundEmail = userEmailsMap[usernameLower];
          }
        }

        if (!foundEmail && usernameLower === 'admin') {
          foundEmail = 'admin@lab.com';
        }

        if (!foundEmail) {
          throw new Error('user-not-found');
        }

        emailToLogin = foundEmail;
      }

      let userCredential;
      try {
        await setPersistence(auth, inMemoryPersistence);
        userCredential = await signInWithEmailAndPassword(auth, emailToLogin, pass);
      } catch (signInError: any) {
        if (
          signInError.code === 'auth/invalid-credential' ||
          signInError.code === 'auth/user-not-found' ||
          signInError.message?.includes('auth/invalid-credential')
        ) {
          const users = await storageService.getUsers();
          const legacyUser = users.find(
            u =>
              (u.username?.toLowerCase() === identifier.trim().toLowerCase() || u.email === emailToLogin) &&
              u.password === pass
          );

          if (legacyUser) {
            try {
              await setPersistence(auth, inMemoryPersistence);
              userCredential = await createUserWithEmailAndPassword(auth, emailToLogin, pass);
            } catch {
              throw signInError;
            }
          } else {
            throw signInError;
          }
        } else {
          throw signInError;
        }
      }

      const firebaseUser = userCredential.user;

      let role = UserRole.USER;
      let fullName = firebaseUser.displayName || emailToLogin.split('@')[0];
      let permissions: View[] = [
        'sample-registration',
        'home',
        'dashboard',
        'inventory',
        'hold-cases',
        'register-pending-cases',
        'hold-dashboard',
        'staff-evaluation',
        'settings'
      ];
      let phone = '';

      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          if (data.fullName) fullName = data.fullName;
          if (data.role) role = data.role as UserRole;
          if (data.permissions) permissions = data.permissions;
          if (data.phone) phone = data.phone;
        } else {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', emailToLogin));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data() as any;
            if (data.fullName) fullName = data.fullName;
            if (data.role) role = data.role as UserRole;
            if (data.permissions) permissions = data.permissions;
            if (data.phone) phone = data.phone;
          }
        }
      } catch (e) {
        console.error('Error fetching user from Firestore:', e);
      }

      const finalUsername = identifier.includes('@') ? identifier.split('@')[0] : identifier;
      const user: User = {
        id: firebaseUser.uid,
        name: fullName,
        username: finalUsername,
        email: emailToLogin,
        role,
        permissions,
        createdAt: new Date().toISOString(),
        phone
      };

      const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
      userEmailsMap[finalUsername.toLowerCase()] = emailToLogin;
      setJSON(KEYS.USER_EMAILS_MAP, userEmailsMap);

      return { user, error: null };
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An error occurred during login.';

      const identifierLower = identifier.trim().toLowerCase();
      const isEmail = identifierLower.includes('@');
      const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
      const isKnownLocally = !!userEmailsMap[identifierLower] || identifierLower === 'admin';

      if (
        !isEmail &&
        !isKnownLocally &&
        (error.code === 'auth/network-request-failed' ||
          error.message?.includes('auth/invalid-credential') ||
          error.code === 'auth/user-not-found' ||
          error.message === 'user-not-found')
      ) {
        errorMessage = 'اسم المستخدم غير موجود';
      } else if (
        error.code === 'auth/invalid-credential' ||
        error.message?.includes('auth/invalid-credential') ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        errorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      } else {
        errorMessage = error.message;
      }

      return { user: null, error: errorMessage };
    }
  },

  async loginByUsername(identifier: string, pass: string): Promise<{ user: User | null; error: any; requiresVerification?: boolean }> {
    try {
      const cleanIdentifier = identifier?.trim().toLowerCase();
      if (!cleanIdentifier) {
        throw new Error('يرجى إدخال البريد الإلكتروني أو اسم المستخدم');
      }

      let emailToLogin = cleanIdentifier;
      const isEmail = cleanIdentifier.includes('@');

      if (!isEmail) {
        let foundEmail: string | null = null;

        try {
          const usernameDocRef = doc(db, 'usernames', cleanIdentifier);
          const usernameDoc = await getDoc(usernameDocRef);

          if (usernameDoc.exists()) {
            const usernameData = usernameDoc.data() as any;
            if (usernameData?.email) {
              foundEmail = usernameData.email;
            }
          }
        } catch (e) {
          console.warn('Username doc lookup failed:', e);
        }

        if (!foundEmail) {
          const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
          if (userEmailsMap[cleanIdentifier]) {
            foundEmail = userEmailsMap[cleanIdentifier];
          }
        }

        if (!foundEmail) {
          throw new Error('user-not-found');
        }

        emailToLogin = foundEmail;
      }

      let userCredential;
      try {
        await setPersistence(auth, inMemoryPersistence);
        userCredential = await signInWithEmailAndPassword(auth, emailToLogin, pass);
      } catch (signInError: any) {
        if (
          signInError.code === 'auth/invalid-credential' ||
          signInError.code === 'auth/user-not-found' ||
          signInError.message?.includes('auth/invalid-credential')
        ) {
          const users = await storageService.getUsers();
          const legacyUser = users.find(
            u => (u.username?.toLowerCase() === cleanIdentifier || u.email === emailToLogin) && u.password === pass
          );

          if (legacyUser) {
            try {
              await setPersistence(auth, inMemoryPersistence);
              userCredential = await createUserWithEmailAndPassword(auth, emailToLogin, pass);

              const userRef = doc(db, 'users', userCredential.user.uid);
              const usernameToSave = legacyUser.username?.toLowerCase() || emailToLogin.split('@')[0];
              await setDoc(
                userRef,
                {
                  email: emailToLogin,
                  username: usernameToSave,
                  fullName: legacyUser.name,
                  role: legacyUser.role,
                  permissions: legacyUser.permissions,
                  phone: legacyUser.phone || '',
                  createdAt: new Date().toISOString()
                },
                { merge: true }
              );

              await setDoc(
                doc(db, 'usernames', usernameToSave),
                {
                  uid: userCredential.user.uid,
                  email: emailToLogin
                },
                { merge: true }
              );
            } catch {
              throw signInError;
            }
          } else {
            throw signInError;
          }
        } else {
          throw signInError;
        }
      }

      const firebaseUser = userCredential.user;

      let role = UserRole.USER;
      let fullName = firebaseUser.displayName || emailToLogin.split('@')[0];
      let permissions: View[] = [
        'sample-registration',
        'home',
        'dashboard',
        'inventory',
        'hold-cases',
        'register-pending-cases',
        'hold-dashboard',
        'staff-evaluation',
        'settings'
      ];
      let phone = '';

      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          if (data.fullName) fullName = data.fullName;
          if (data.role) role = data.role as UserRole;
          if (data.permissions) permissions = data.permissions;
          if (data.phone) phone = data.phone;
        }
      } catch (e) {
        console.error('Error fetching user from Firestore:', e);
      }

      const finalUsername = identifier.includes('@') ? identifier.split('@')[0] : identifier;
      const user: User = {
        id: firebaseUser.uid,
        name: fullName,
        username: finalUsername,
        email: emailToLogin,
        role,
        permissions,
        createdAt: new Date().toISOString(),
        phone
      };

      const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
      userEmailsMap[finalUsername.toLowerCase()] = emailToLogin;
      setJSON(KEYS.USER_EMAILS_MAP, userEmailsMap);

      return { user, error: null };
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      } else if (error.code === 'auth/user-not-found' || error.message === 'user-not-found') {
        errorMessage = 'اسم المستخدم غير موجود';
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { user: null, error: errorMessage };
    }
  },

  async loginWithGoogle(): Promise<{ user: User | null; error: any }> {
    try {
      const provider = new GoogleAuthProvider();
      await setPersistence(auth, inMemoryPersistence);
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      const user: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Google User',
        username: firebaseUser.email?.split('@')[0] || 'google_user',
        email: firebaseUser.email || '',
        role: UserRole.USER,
        permissions: [
          'sample-registration',
          'home',
          'dashboard',
          'inventory',
          'hold-cases',
          'register-pending-cases',
          'hold-dashboard',
          'staff-evaluation',
          'settings'
        ] as View[],
        createdAt: new Date().toISOString(),
        phone: firebaseUser.phoneNumber || ''
      };

      return { user, error: null };
    } catch (error: any) {
      console.error('Google Login error:', error);
      return { user: null, error: error.message };
    }
  },

  async signup(email: string, pass: string, username?: string): Promise<{ user: User | null; error: any; requiresVerification?: boolean }> {
    try {
      const cleanUsername = username?.trim().toLowerCase();

      if (!pass || pass.trim().length < 6) {
        const err: any = new Error('Password should be at least 6 characters');
        err.code = 'auth/weak-password';
        throw err;
      }

      await setPersistence(auth, inMemoryPersistence);

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass.trim());
      const firebaseUser = userCredential.user;

      const newUserDoc = {
        email: email.trim(),
        username: cleanUsername || email.split('@')[0].toLowerCase(),
        fullName: cleanUsername || email.split('@')[0],
        role: UserRole.USER,
        permissions: ['home'] as View[],
        phone: '',
        createdAt: new Date().toISOString()
      };

      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        newUserDoc,
        { merge: true }
      );

      await setDoc(
        doc(db, 'usernames', newUserDoc.username.toLowerCase()),
        {
          uid: firebaseUser.uid,
          email: newUserDoc.email
        },
        { merge: true }
      );

      const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
      userEmailsMap[newUserDoc.username.toLowerCase()] = newUserDoc.email;
      setJSON(KEYS.USER_EMAILS_MAP, userEmailsMap);

      if (!firebaseUser.emailVerified) {
        await sendEmailVerification(firebaseUser);
        await signOut(auth);
        return { user: null, error: null, requiresVerification: true };
      }

      const user: User = {
        id: firebaseUser.uid,
        name: newUserDoc.fullName,
        username: newUserDoc.username,
        email: newUserDoc.email,
        role: UserRole.USER,
        permissions: ['home'],
        createdAt: newUserDoc.createdAt,
        phone: ''
      };

      return { user, error: null };
    } catch (error: any) {
      console.error('Signup error:', error);

      let errorMessage = 'An error occurred during signup.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'User already exists. Please sign in';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
        errorMessage = 'ليس لديك صلاحية إنشاء المستخدم';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { user: null, error: errorMessage };
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
  },

  async getCurrentSessionUser(): Promise<User | null> {
    return null;
  },

  async resetAll(): Promise<void> {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('localStorage not available', e);
    }
  },

  async getFridges(): Promise<Fridge[]> {
    if (await shouldUseCloud()) {
      const path = 'fridges';
      try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Fridge));
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
    return [];
  },

  async getSamples(): Promise<Sample[]> {
    if (await shouldUseCloud()) {
      const path = 'samples';
      try {
        const q = query(collection(db, path));
        const snapshot = await Promise.race([
          getDocs(q),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 30000))
        ]);
        const samples = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Sample));
        return samples
          .filter((s: Sample) => s.status !== 'Deleted')
          .sort((a: Sample, b: Sample) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } catch (e: any) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
    return getJSON(KEYS.SAMPLES, []).filter((s: Sample) => s.status !== 'Deleted');
  },

  async addSample(sample: Omit<Sample, 'id'>) {
    if (await shouldUseCloud()) {
      const path = 'samples';
      try {
        const docRef = await addDoc(collection(db, path), sample);
        return { id: docRef.id, ...sample };
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    const list = getJSON(KEYS.SAMPLES, []) as Sample[];
    const newSample = { ...sample, id: crypto.randomUUID() } as Sample;
    list.unshift(newSample);
    setJSON(KEYS.SAMPLES, list);
    return newSample;
  },

  async updateSample(id: string, updates: Partial<Sample>) {
    if (await shouldUseCloud()) {
      const path = `samples/${id}`;
      try {
        const docRef = doc(db, 'samples', id);
        const cleanUpdates: any = { ...updates };
        Object.keys(cleanUpdates).forEach(key => {
          if (cleanUpdates[key] === undefined) {
            cleanUpdates[key] = deleteField();
          }
        });
        await updateDoc(docRef, cleanUpdates);
        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
      }
    }

    const list = getJSON(KEYS.SAMPLES, []) as Sample[];
    const idx = list.findIndex(s => s.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...updates };
      setJSON(KEYS.SAMPLES, list);
    }
  },

  async deleteSample(id: string): Promise<boolean> {
    if (await shouldUseCloud()) {
      const path = `samples/${id}`;
      try {
        const docRef = doc(db, 'samples', id);
        await updateDoc(docRef, { status: 'Deleted' });
        return true;
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
        return false;
      }
    }

    const list = getJSON(KEYS.SAMPLES, []) as Sample[];
    const newList = list.filter(s => s.id !== id);
    setJSON(KEYS.SAMPLES, newList);
    return true;
  },

  async logInventoryAction(sampleId: string, action: string, details: string, user: string) {
    if (await shouldUseCloud()) {
      const path = 'inventory_logs';
      try {
        await addDoc(collection(db, path), {
          sample_id: sampleId,
          action_type: action,
          details,
          performed_by: user,
          timestamp: new Date().toISOString()
        });
        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    const logs = getJSON(KEYS.LOGS, []);
    logs.unshift({
      id: crypto.randomUUID(),
      sampleId,
      action,
      details,
      user,
      timestamp: new Date().toISOString()
    });
    setJSON(KEYS.LOGS, logs);
  },

  async getHoldCases(): Promise<HoldCase[]> {
    if (await shouldUseCloud()) {
      const path = 'hold_cases';
      try {
        const q = query(collection(db, path), orderBy('created_at', 'desc'));
        const snapshot = await Promise.race([
          getDocs(q),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 30000))
        ]);
        return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as HoldCase));
      } catch (e: any) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
    return getJSON(KEYS.HOLD, []);
  },

  async addHoldCase(item: Omit<HoldCase, 'id'>) {
    if (await shouldUseCloud()) {
      const path = 'hold_cases';
      try {
        const docRef = await addDoc(collection(db, path), item);
        return { id: docRef.id, ...item };
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, path);
      }
    }

    const list = getJSON(KEYS.HOLD, []) as HoldCase[];
    const newObj = { ...item, id: crypto.randomUUID() } as HoldCase;
    list.unshift(newObj);
    setJSON(KEYS.HOLD, list);
    return newObj;
  },

  async updateHoldCase(id: string, updates: Partial<HoldCase>) {
    if (await shouldUseCloud()) {
      const path = `hold_cases/${id}`;
      try {
        const docRef = doc(db, 'hold_cases', id);
        const cleanUpdates: any = { ...updates };
        Object.keys(cleanUpdates).forEach(key => {
          if (cleanUpdates[key] === undefined) {
            cleanUpdates[key] = deleteField();
          }
        });
        await updateDoc(docRef, cleanUpdates);
        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, path);
      }
    }

    const list = getJSON(KEYS.HOLD, []) as HoldCase[];
    const idx = list.findIndex(s => s.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...updates };
      setJSON(KEYS.HOLD, list);
    }
  },

  async deleteHoldCase(id: string) {
    if (await shouldUseCloud()) {
      const path = `hold_cases/${id}`;
      try {
        await deleteDoc(doc(db, 'hold_cases', id));
        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }

    const list = getJSON(KEYS.HOLD, []) as HoldCase[];
    setJSON(KEYS.HOLD, list.filter(s => s.id !== id));
  },

  async getEvaluations(): Promise<Evaluation[]> {
    if (await shouldUseCloud()) {
      const path = 'evaluations';
      try {
        const q = query(collection(db, path), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
      } catch (e: any) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
    return getJSON(KEYS.EVALS, []);
  },

  async saveEvaluations(evals: Evaluation[]) {
    if (await shouldUseCloud()) {
      try {
        const batchPromises = evals.map(e => {
          if (e.id) {
            return setDoc(doc(db, 'evaluations', e.id), e, { merge: true });
          } else {
            return addDoc(collection(db, 'evaluations'), e);
          }
        });
        await Promise.all(batchPromises);
        return;
      } catch (e: any) {
        const msg = e.message || '';
        if (e.code === 'permission-denied' || msg.toLowerCase().includes('permission')) {
          console.warn('Firestore permission denied for saveEvaluations, using local fallback');
        } else {
          console.error('Firestore saveEvaluations error:', e);
        }
      }
    }

    const current = getJSON(KEYS.EVALS, []);
    setJSON(KEYS.EVALS, [...evals, ...current]);
  },

  async getSchedules(): Promise<InventorySchedule[]> {
    if (await shouldUseCloud()) {
      const path = 'inventory_schedules';
      try {
        const q = query(collection(db, path), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventorySchedule));
      } catch (e: any) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
    return getJSON(KEYS.SCHED, []);
  },

  async saveSchedules(schedules: InventorySchedule[]) {
    if (await shouldUseCloud()) {
      try {
        const batchPromises = schedules.map(s =>
          setDoc(doc(db, 'inventory_schedules', s.id), s, { merge: true })
        );
        await Promise.all(batchPromises);
        return;
      } catch (e: any) {
        const msg = e.message || '';
        if (e.code === 'permission-denied' || msg.toLowerCase().includes('permission')) {
          console.warn('Firestore permission denied for saveSchedules, using local fallback');
        } else {
          console.error('Firestore saveSchedules error:', e);
        }
      }
    }

    const current = getJSON(KEYS.SCHED, []) as InventorySchedule[];
    schedules.forEach(s => {
      const idx = current.findIndex(c => c.id === s.id);
      if (idx > -1) current[idx] = s;
      else current.unshift(s);
    });
    setJSON(KEYS.SCHED, current);
  },

  async deleteSchedule(id: string) {
    if (await shouldUseCloud()) {
      try {
        await deleteDoc(doc(db, 'inventory_schedules', id));
        return;
      } catch (e) {
        console.error('Firestore deleteSchedule error:', e);
      }
    }

    const list = getJSON(KEYS.SCHED, []) as InventorySchedule[];
    setJSON(KEYS.SCHED, list.filter(s => s.id !== id));
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    if (await shouldUseCloud()) {
      try {
        const docRef = doc(db, 'settings', 'notifications');
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data() as NotificationSettings;
      } catch (e) {
        console.error('Firestore getNotificationSettings error:', e);
      }
    }
    return getJSON(KEYS.NOTIF, { inventory_day: 25, whatsapp_enabled: true, email_enabled: true });
  },

  async saveNotificationSettings(settings: NotificationSettings) {
    if (await shouldUseCloud()) {
      try {
        await setDoc(doc(db, 'settings', 'notifications'), settings, { merge: true });
        return;
      } catch (e: any) {
        const msg = e.message || '';
        if (e.code === 'permission-denied' || msg.toLowerCase().includes('permission')) {
          console.warn('Firestore permission denied for saveNotificationSettings, using local fallback');
        } else {
          console.error('Firestore saveNotificationSettings error:', e);
        }
      }
    }
    setJSON(KEYS.NOTIF, settings);
  },

  async getUsers(): Promise<User[]> {
    if (await shouldUseCloud()) {
      const path = 'users';
      try {
        const snapshot = await Promise.race([
          getDocs(collection(db, path)),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 30000))
        ]);
        return snapshot.docs.map((d: any) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            name: data.fullName || data.name || 'Unknown User',
            email: data.email || '',
            role: data.role || UserRole.USER
          } as User;
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, path);
      }
    }
    return getJSON(KEYS.USERS, []);
  },

  async saveUsers(users: User[]) {
    if (await shouldUseCloud()) {
      try {
        const batchPromises = users.map(u => setDoc(doc(db, 'users', u.id), u, { merge: true }));
        await Promise.all(batchPromises);

        const usernameWrites = users
          .filter(u => !!u.username && !!u.email)
          .map(u =>
            setDoc(
              doc(db, 'usernames', u.username.toLowerCase()),
              {
                uid: u.id,
                email: u.email
              },
              { merge: true }
            )
          );

        await Promise.all(usernameWrites);
        return;
      } catch (e: any) {
        const msg = e.message || '';
        if (e.code === 'permission-denied' || msg.toLowerCase().includes('permission')) {
          console.warn('Firestore permission denied for saveUsers, using local fallback');
        } else {
          console.error('Firestore saveUsers error:', e);
        }
      }
    }

    const current = getJSON(KEYS.USERS, []) as User[];
    users.forEach(u => {
      const idx = current.findIndex(c => c.id === u.id);
      if (idx > -1) current[idx] = u;
      else current.push(u);
    });
    setJSON(KEYS.USERS, current);

    const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
    users.forEach(u => {
      if (u.username && u.email) {
        userEmailsMap[u.username.toLowerCase()] = u.email;
      }
    });
    setJSON(KEYS.USER_EMAILS_MAP, userEmailsMap);
  },

  async deleteUser(id: string): Promise<void> {
    let usernameToDelete: string | null = null;

    try {
      const allUsers = await this.getUsers();
      const targetUser = allUsers.find(u => u.id === id);
      if (targetUser?.username) {
        usernameToDelete = targetUser.username.toLowerCase();
      }
    } catch (e) {
      console.warn('Could not resolve username before delete:', e);
    }

    if (await shouldUseCloud()) {
      const path = `users/${id}`;
      try {
        await deleteDoc(doc(db, 'users', id));

        if (usernameToDelete) {
          try {
            await deleteDoc(doc(db, 'usernames', usernameToDelete));
          } catch (e) {
            console.warn('Could not delete usernames mapping:', e);
          }
        }

        return;
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }

    const current = getJSON(KEYS.USERS, []) as User[];
    const updated = current.filter(u => u.id !== id);
    setJSON(KEYS.USERS, updated);

    if (usernameToDelete) {
      const userEmailsMap = getJSON(KEYS.USER_EMAILS_MAP, {});
      delete userEmailsMap[usernameToDelete];
      setJSON(KEYS.USER_EMAILS_MAP, userEmailsMap);
    }
  },

  async getEnabledFeatures(): Promise<View[]> {
    if (await shouldUseCloud()) {
      const path = 'settings/enabled_features';
      try {
        const docRef = doc(db, 'settings', 'enabled_features');
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data().value;
      } catch (e: any) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    }
    return getJSON(KEYS.FEAT, [
      'sample-registration',
      'home',
      'dashboard',
      'inventory',
      'hold-cases',
      'register-pending-cases',
      'hold-dashboard',
      'staff-evaluation',
      'settings'
    ]);
  },

  async saveEnabledFeatures(features: View[]) {
    if (await shouldUseCloud()) {
      try {
        await setDoc(doc(db, 'settings', 'enabled_features'), { value: features }, { merge: true });
        return;
      } catch (e: any) {
        const msg = e.message || '';
        if (e.code === 'permission-denied' || msg.toLowerCase().includes('permission')) {
          console.warn('Firestore permission denied for saveEnabledFeatures, using local fallback');
        } else {
          console.error('Firestore saveEnabledFeatures error:', e);
        }
      }
    }
    setJSON(KEYS.FEAT, features);
  },

  async saveSamples(samples: Sample[]) {
    if (await shouldUseCloud()) {
      try {
        const batchPromises = samples.map(s => setDoc(doc(db, 'samples', s.id), s, { merge: true }));
        await Promise.all(batchPromises);
        return;
      } catch (e: any) {
        const msg = e.message || '';
        if (e.code === 'permission-denied' || msg.toLowerCase().includes('permission')) {
          console.warn('Firestore permission denied for saveSamples, using local fallback');
        } else {
          console.error('Firestore saveSamples error:', e);
        }
      }
    }
    setJSON(KEYS.SAMPLES, samples);
  },

  async saveHoldCases(cases: HoldCase[]) {
    if (await shouldUseCloud()) {
      try {
        const batchPromises = cases.map(c => setDoc(doc(db, 'hold_cases', c.id), c, { merge: true }));
        await Promise.all(batchPromises);
        return;
      } catch (e: any) {
        handleFirestoreError(e, OperationType.WRITE, 'hold_cases');
      }
    }
    setJSON(KEYS.HOLD, cases);
  },

  async getTheme(): Promise<{ primary: string; isDark: boolean }> {
    if (await shouldUseCloud()) {
      const path = 'settings/app_theme';
      try {
        const docRef = doc(db, 'settings', 'app_theme');
        const snap = await getDoc(docRef);
        if (snap.exists()) return snap.data().value;
      } catch (e: any) {
        handleFirestoreError(e, OperationType.GET, path);
      }
    }
    return getJSON(KEYS.THEME, { primary: 'blue', isDark: false });
  },

  async saveTheme(theme: { primary: string; isDark: boolean }) {
    if (await shouldUseCloud()) {
      try {
        await setDoc(doc(db, 'settings', 'app_theme'), { value: theme }, { merge: true });
        return;
      } catch (e: any) {
        handleFirestoreError(e, OperationType.WRITE, 'settings/app_theme');
      }
    }
    setJSON(KEYS.THEME, theme);
  }
};