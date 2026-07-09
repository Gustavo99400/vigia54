// ============================================================
// VIGÍA 54 — Auth Helpers (RF6)
// ============================================================
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { AppUser, UserRole } from '@/types';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Sign in with Google ─────────────────────────────────────
export async function signInWithGoogle(): Promise<AppUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return ensureUserDocument(result.user, 'ciudadano');
}

// ── Sign in with email/password ─────────────────────────────
export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

// ── Register new citizen ─────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AppUser> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  return ensureUserDocument(user, 'ciudadano');
}

// ── Sign out ─────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ── Reset password ────────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ── Ensure Firestore user document exists ────────────────────
export async function ensureUserDocument(user: User, defaultRole: UserRole = 'ciudadano'): Promise<AppUser> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const isSpecialAdmin = user.email && (
    user.email.toLowerCase().includes('admin') || 
    user.email.toLowerCase().includes('gustavo') ||
    user.email.toLowerCase().includes('gusta')
  );

  if (!snap.exists()) {
    const newUser: Omit<AppUser, 'uid'> = {
      email:          user.email!,
      displayName:    user.displayName || 'Ciudadano',
      photoURL:       user.photoURL ?? undefined,
      role:           isSpecialAdmin ? 'admin' : defaultRole,
      trustScore:     100,
      totalReports:   0,
      verifiedReports:0,
      falseAlarms:    0,
      createdAt:      new Date(),
    };
    await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
    return { uid: user.uid, ...newUser };
  }

  const data = snap.data();
  let role = data.role;

  if (isSpecialAdmin && role !== 'admin') {
    role = 'admin';
    await setDoc(ref, { role: 'admin' }, { merge: true });
  }

  return {
    uid:            user.uid,
    email:          data.email,
    displayName:    data.displayName,
    photoURL:       data.photoURL,
    role:           role,
    trustScore:     data.trustScore ?? 100,
    totalReports:   data.totalReports ?? 0,
    verifiedReports:data.verifiedReports ?? 0,
    falseAlarms:    data.falseAlarms ?? 0,
    createdAt:      data.createdAt && typeof data.createdAt.toDate === 'function'
                      ? data.createdAt.toDate()
                      : (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt || Date.now())),
    district:       data.district,
  };
}

// ── Get user profile from Firestore ────────────────────────
export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();

  const isSpecialAdmin = data.email && (
    data.email.toLowerCase().includes('admin') || 
    data.email.toLowerCase().includes('gustavo') ||
    data.email.toLowerCase().includes('gusta')
  );

  let role = data.role;
  if (isSpecialAdmin && role !== 'admin') {
    role = 'admin';
    await setDoc(ref, { role: 'admin' }, { merge: true });
  }

  return {
    uid,
    email:          data.email,
    displayName:    data.displayName,
    photoURL:       data.photoURL,
    role:           role,
    trustScore:     data.trustScore ?? 100,
    totalReports:   data.totalReports ?? 0,
    verifiedReports:data.verifiedReports ?? 0,
    falseAlarms:    data.falseAlarms ?? 0,
    createdAt:      data.createdAt && typeof data.createdAt.toDate === 'function'
                      ? data.createdAt.toDate()
                      : (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt || Date.now())),
    district:       data.district,
  };
}
