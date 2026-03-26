"use client";

import { createContext, useContext, useEffect, useState } from "react";
import liff from "@line/liff";

interface LiffContextType {
  liff: typeof liff | null;
  profile: any | null;
  user: any | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  profile: null,
  user: null,
  isRegistered: false,
  isLoading: true,
  error: null,
  refreshUser: async () => {},
});

export const useLiff = () => useContext(LiffContext);

import { checkLiffRegistration } from "../liffActions";

export default function LiffProvider({ children }: { children: React.ReactNode }) {
  const [liffInstance, setLiffInstance] = useState<typeof liff | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkUserStatus = async (lineUid: string) => {
    setIsLoading(true);
    try {
      const result = await checkLiffRegistration(lineUid);
      if (result.success) {
        setIsRegistered(result.isRegistered);
        setUser(result.user);
      }
    } catch (err: any) {
      console.error("User Status Check Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
        
        if (!liffId) {
          console.warn("LIFF ID is missing. Please set NEXT_PUBLIC_LIFF_ID in .env");
          // Non-blocking for local dev simulation if needed, but in production we need it
          setLiffInstance(liff as any);
          setIsLoading(false);
          return;
        }

        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
          await checkUserStatus(userProfile.userId);
        } else {
          // If not in LINE browser and not logged in, trigger login
          // liff.login();
          setIsLoading(false);
        }

        setLiffInstance(liff);
      } catch (err: any) {
        console.error("LIFF Integration Error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initLiff();
  }, []);

  const refreshUser = async () => {
    if (profile?.userId) {
      await checkUserStatus(profile.userId);
    }
  };

  return (
    <LiffContext.Provider value={{ 
      liff: liffInstance, 
      profile, 
      user, 
      isRegistered, 
      isLoading, 
      error,
      refreshUser
    }}>
      {children}
    </LiffContext.Provider>
  );
}
