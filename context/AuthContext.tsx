"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

const SESSION_KEY = "c24_auth";
const USERNAME = "care24jpn";
const PASSWORD = "Care1000%";

type AuthContextValue = {
  loggedIn: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  loggedIn: false,
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  /* Read session state after mount so server and client first renders match. */
  useEffect(() => {
    setLoggedIn(sessionStorage.getItem(SESSION_KEY) === "1");
    setReady(true);
  }, []);

  /* Redirect unauthenticated users away from protected routes. */
  useEffect(() => {
    if (!ready) return;
    if (!loggedIn && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loggedIn, ready, pathname, router]);

  function login(username: string, password: string): boolean {
    if (username === USERNAME && password === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setLoggedIn(true);
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setLoggedIn(false);
    router.replace("/login");
  }

  /* Avoid flashing protected content before redirect fires. */
  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
