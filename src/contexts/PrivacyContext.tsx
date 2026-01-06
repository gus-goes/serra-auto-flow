import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PrivacyContextType {
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  setPrivacyMode: (value: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const STORAGE_KEY = 'autos_serra_privacy_mode';

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyModeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(privacyMode));
  }, [privacyMode]);

  const togglePrivacyMode = () => {
    setPrivacyModeState(prev => !prev);
  };

  const setPrivacyMode = (value: boolean) => {
    setPrivacyModeState(value);
  };

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacyMode, setPrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
