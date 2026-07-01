"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { UserRole } from "@/types";

export type { UserRole };

interface AuthContextValue {
  user: User | null;
  role: UserRole;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Verificar si es administrador primero
          const adminDoc = await getDoc(doc(db, "administradores", firebaseUser.uid));
          if (adminDoc.exists() && adminDoc.data().activo !== false) {
            setRole(adminDoc.data().rol as UserRole);
          } else {
            // Usuario ciudadano
            const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
            setRole(
              (userDoc.exists() ? (userDoc.data().rol as UserRole) : null) ?? "ciudadano"
            );
          }
        } catch {
          setRole("ciudadano");
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
