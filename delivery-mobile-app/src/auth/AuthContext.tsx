import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient, getErrorMessage, normalizeRider, RIDER_KEY, TOKEN_KEY } from "../api";
import type { Rider } from "../types";

interface AuthContextValue {
  rider: Rider | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (credential: string) => Promise<void>;
  register: (form: Record<string, string>) => Promise<void>;
  signOut: () => Promise<void>;
  updateRider: (rider: Rider) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const [token, storedRider] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY).then(async (secureToken) => {
            if (secureToken) return secureToken;
            const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
            if (legacyToken) {
              await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
              await AsyncStorage.removeItem(TOKEN_KEY);
            }
            return legacyToken;
          }),
          AsyncStorage.getItem(RIDER_KEY),
        ]);
        if (token && storedRider) {
          const parsed: unknown = JSON.parse(storedRider);
          const restoredRider = normalizeRider(parsed);
          if (active && restoredRider) setRider(restoredRider);
        }
      } catch (error) {
        console.error("Could not restore the saved rider session.", error);
      } finally {
        if (active) setIsReady(true);
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const storeSession = useCallback(async (token: string, nextRider: Rider) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      AsyncStorage.setItem(RIDER_KEY, JSON.stringify(nextRider)),
      AsyncStorage.removeItem(TOKEN_KEY),
    ]);
    setRider(nextRider);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await apiClient.post("/api/delivery/auth/login", {
        email,
        password,
      });
      const nextRider = normalizeRider(data?.rider);
      if (!data?.token || !nextRider) {
        throw new Error("The server returned an invalid sign-in response.");
      }
      await storeSession(data.token, nextRider);
    } catch (error) {
      throw new Error(getErrorMessage(error, "Unable to sign in."));
    }
  }, [storeSession]);

  const signInWithGoogle = useCallback(async (credential: string) => {
    try {
      const { data } = await apiClient.post("/api/delivery/auth/google", {
        credential,
      });
      const nextRider = normalizeRider(data?.rider);
      if (!data?.token || !nextRider) {
        throw new Error("The server returned an invalid Google sign-in response.");
      }
      await storeSession(data.token, nextRider);
    } catch (error) {
      throw new Error(getErrorMessage(error, "Unable to sign in with Google."));
    }
  }, [storeSession]);

  const register = useCallback(async (form: Record<string, string>) => {
    try {
      const { data } = await apiClient.post("/api/delivery/auth/register", form);
      const nextRider = normalizeRider(data?.rider);
      if (!data?.token || !nextRider) {
        throw new Error(data?.message || "The server returned an invalid registration response.");
      }
      await storeSession(data.token, nextRider);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(getErrorMessage(error, "Unable to register."));
      }
      throw error;
    }
  }, [storeSession]);

  const signOut = useCallback(async () => {
    try {
      await apiClient.post("/api/delivery/auth/logout");
    } catch (error) {
      console.error("The server did not confirm rider sign-out.", error);
    } finally {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        AsyncStorage.multiRemove([TOKEN_KEY, RIDER_KEY]),
      ]);
      setRider(null);
    }
  }, []);

  const updateRider = useCallback(async (nextRider: Rider) => {
    await AsyncStorage.setItem(RIDER_KEY, JSON.stringify(nextRider));
    setRider(nextRider);
  }, []);

  const value = useMemo(
    () => ({ rider, isReady, signIn, signInWithGoogle, register, signOut, updateRider }),
    [rider, isReady, signIn, signInWithGoogle, register, signOut, updateRider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
