"use client";

import { createContext, useContext, useEffect, useState } from "react";
import liff from "@line/liff";

interface LiffContextType {
  liff: typeof liff | null;
  profile: any | null;
  error: string | null;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  profile: null,
  error: null,
});

export const useLiff = () => useContext(LiffContext);

export default function LiffProvider({ children }: { children: React.ReactNode }) {
  const [liffInstance, setLiffInstance] = useState<typeof liff | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        // Use your actual LIFF ID here - user must provide it later
        // For development, we'll try initializing and handle failure gracefully
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
        
        if (!liffId) {
          console.warn("LIFF ID is missing. Please set NEXT_PUBLIC_LIFF_ID in .env");
          setLiffInstance(liff as any);
          return;
        }

        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
        } else {
          // In some cases we might want to trigger login
          // liff.login();
        }

        setLiffInstance(liff);
      } catch (err: any) {
        console.error("LIFF Integration Error:", err);
        setError(err.message);
      }
    };

    initLiff();
  }, []);

  return (
    <LiffContext.Provider value={{ liff: liffInstance, profile, error }}>
      {children}
    </LiffContext.Provider>
  );
}
