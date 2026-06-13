import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@workspace/api-client-react";

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  permissions: string[];
  login: (token: string, user: User, permissions?: string[]) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isTechnician: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem("fnashha_token");
    const savedUserStr = localStorage.getItem("fnashha_user");
    const savedPermsStr = localStorage.getItem("fnashha_permissions");

    if (savedToken && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setToken(savedToken);
        setCurrentUser(savedUser);
        if (savedPermsStr) {
          setPermissions(JSON.parse(savedPermsStr));
        }
      } catch {
        localStorage.removeItem("fnashha_token");
        localStorage.removeItem("fnashha_user");
        localStorage.removeItem("fnashha_permissions");
      }
    }
  }, []);

  const login = useCallback((newToken: string, user: User, perms: string[] = []) => {
    setToken(newToken);
    setCurrentUser(user);
    setPermissions(perms);
    localStorage.setItem("fnashha_token", newToken);
    localStorage.setItem("fnashha_user", JSON.stringify(user));
    localStorage.setItem("fnashha_permissions", JSON.stringify(perms));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
    setPermissions([]);
    localStorage.removeItem("fnashha_token");
    localStorage.removeItem("fnashha_user");
    localStorage.removeItem("fnashha_permissions");
  }, []);

  const hasPermission = useCallback(
    (key: string): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === "super_admin") return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(key);
    },
    [currentUser, permissions]
  );

  const value: AuthContextType = {
    currentUser,
    token,
    permissions,
    login,
    logout,
    isAuthenticated: !!token && !!currentUser,
    isCustomer: currentUser?.role === "customer",
    isTechnician: currentUser?.role === "technician",
    isAdmin: currentUser?.role === "admin" || currentUser?.role === "super_admin",
    isSuperAdmin: currentUser?.role === "super_admin",
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
