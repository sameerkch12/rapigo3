import React, { createContext, useContext, useState, useEffect } from 'react';
import { captainService, CaptainProfile, getStoredToken } from '../services/api';
import { joinCaptainSocket } from '../services/socket';

interface DriverAuthContextType {
  driver: CaptainProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    fullname: { firstname: string; lastname?: string };
    email: string;
    password: string;
    phone?: string;
    vehicle: { color: string; number: string; capacity: number; type: 'car' | 'bike' | 'auto' };
  }) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<{ message: string; isDemo?: boolean; otp?: string }>;
  verifyPhoneOtp: (
    phone: string,
    otp: string
  ) => Promise<{ isNewCaptain: boolean; phone?: string }>;
  registerPhoneCaptain: (data: {
    phone: string;
    fullname: { firstname: string; lastname?: string };
    email: string;
    vehicle: { color: string; number: string; capacity: number; type: 'car' | 'bike' | 'auto' };
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateDriverState: (partial: Partial<CaptainProfile>) => void;
  refreshProfile: () => Promise<void>;
}

const DriverAuthContext = createContext<DriverAuthContextType | undefined>(undefined);

export const DriverAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [driver, setDriver] = useState<CaptainProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const storedToken = await getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        const { captain } = await captainService.getProfile();
        setDriver(captain);
        joinCaptainSocket(captain._id);
      } else {
        setDriver(null);
        setToken(null);
      }
    } catch {
      setDriver(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await captainService.login({ email, password });
      setDriver(res.captain);
      setToken(res.token);
      joinCaptainSocket(res.captain._id);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    fullname: { firstname: string; lastname?: string };
    email: string;
    password: string;
    phone?: string;
    vehicle: { color: string; number: string; capacity: number; type: 'car' | 'bike' | 'auto' };
  }) => {
    setIsLoading(true);
    try {
      const res = await captainService.register(data);
      setDriver(res.captain);
      setToken(res.token);
      joinCaptainSocket(res.captain._id);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneOtp = async (phone: string) => {
    return await captainService.sendPhoneOtp(phone);
  };

  const verifyPhoneOtp = async (phone: string, otp: string) => {
    const res = await captainService.verifyPhoneOtp(phone, otp);
    if (!res.isNewCaptain && res.token && res.captain) {
      setDriver(res.captain);
      setToken(res.token);
      joinCaptainSocket(res.captain._id);
    }
    return { isNewCaptain: res.isNewCaptain, phone: res.phone };
  };

  const registerPhoneCaptain = async (data: {
    phone: string;
    fullname: { firstname: string; lastname?: string };
    email: string;
    vehicle: { color: string; number: string; capacity: number; type: 'car' | 'bike' | 'auto' };
  }) => {
    setIsLoading(true);
    try {
      const res = await captainService.registerPhoneCaptain(data);
      setDriver(res.captain);
      setToken(res.token);
      joinCaptainSocket(res.captain._id);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await captainService.logout();
    } finally {
      setDriver(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const updateDriverState = (partial: Partial<CaptainProfile>) => {
    setDriver((prev) => (prev ? { ...prev, ...partial } : null));
  };

  return (
    <DriverAuthContext.Provider
      value={{
        driver,
        token,
        isLoading,
        login,
        register,
        sendPhoneOtp,
        verifyPhoneOtp,
        registerPhoneCaptain,
        logout,
        updateDriverState,
        refreshProfile,
      }}
    >
      {children}
    </DriverAuthContext.Provider>
  );
};

export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (!context) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};
