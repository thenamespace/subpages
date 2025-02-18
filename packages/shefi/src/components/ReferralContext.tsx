import { createContext, useContext, useState, ReactNode } from 'react';

interface ReferralContextProps {
  referralCode: string;
  setReferralCode: (code: string) => void;
}

const ReferralContext = createContext<ReferralContextProps | undefined>(undefined);

export const ReferralProvider = ({ children }: { children: ReactNode }) => {
  const [referralCode, setReferralCode] = useState<string>("");

  return (
    <ReferralContext.Provider value={{ referralCode, setReferralCode }}>
      {children}
    </ReferralContext.Provider>
  );
};

export const useReferral = () => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
};