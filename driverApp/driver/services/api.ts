import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const extraApiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl || Constants.manifest?.extra?.apiBaseUrl;
const configuredUrl = extraApiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL;

console.log('[Driver API] extra.apiBaseUrl:', extraApiBaseUrl);
console.log('[Driver API] configured api base URL:', configuredUrl);

export const getBaseUrl = () => {
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      const port = url.port || '4000';
      return `${url.protocol}//${url.hostname}:${port}`;
    } catch {
      // fallback
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:4000`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      return `http://${ip}:4000`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  return 'http://localhost:4000';
};

let authToken: string | null = null;

export function setCaptainToken(value: string | null) {
  authToken = value;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      if (value) localStorage.setItem('captain_token', value);
      else localStorage.removeItem('captain_token');
    } catch {}
  }
  try {
    if (value) {
      AsyncStorage.setItem('captain_token', value).catch(() => {});
    } else {
      AsyncStorage.removeItem('captain_token').catch(() => {});
    }
  } catch {}
}

export async function getStoredToken(): Promise<string | null> {
  if (authToken) return authToken;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const token = localStorage.getItem('captain_token');
      if (token) {
        authToken = token;
        return token;
      }
    } catch {}
  }
  try {
    const token = await AsyncStorage.getItem('captain_token');
    if (token) authToken = token;
    return token;
  } catch {
    return null;
  }
}


export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const token = await getStoredToken();
  const fullUrl = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;

  console.log(`[Driver API] ${options.method || 'GET'} ${fullUrl}`);

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { token } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = Array.isArray(body)
      ? body.map((e: any) => e.msg || e.message).join(', ')
      : body.message || body.error || 'Request failed';
    throw new Error(errorMsg);
  }
  return body as T;
}

export interface CaptainProfile {
  _id: string;
  fullname: { firstname: string; lastname?: string };
  email: string;
  phone?: string;
  vehicle: {
    color: string;
    number: string;
    capacity: number;
    type: 'car' | 'bike' | 'auto';
    registrationNumber?: string;
    make?: string;
  };
  status: 'active' | 'inactive';
  socketId?: string;
  rides?: any[];
  name?: string;
  driverIdCode?: string;
  rating?: number;
  isOnline?: boolean;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'approved' | 'rejected';
  vehicleType?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  captain: CaptainProfile;
}

export const captainService = {
  async register(data: {
    fullname: { firstname: string; lastname?: string };
    email: string;
    password: string;
    phone?: string;
    vehicle: { color: string; number: string; capacity: number; type: 'car' | 'bike' | 'auto' };
  }): Promise<AuthResponse> {
    const res = await api<AuthResponse>('/captain/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setCaptainToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api<AuthResponse>('/captain/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setCaptainToken(res.token);
    return res;
  },

  async sendPhoneOtp(phone: string): Promise<{ message: string; isDemo?: boolean; otp?: string }> {
    return await api('/captain/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyPhoneOtp(
    phone: string,
    otp: string
  ): Promise<{ message: string; isNewCaptain: boolean; token?: string; captain?: CaptainProfile; phone?: string }> {
    const res = await api<{ message: string; isNewCaptain: boolean; token?: string; captain?: CaptainProfile; phone?: string }>(
      '/captain/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      }
    );
    if (res.token) setCaptainToken(res.token);
    return res;
  },

  async registerPhoneCaptain(data: {
    phone: string;
    fullname: { firstname: string; lastname?: string };
    email: string;
    vehicle: { color: string; number: string; capacity: number; type: 'car' | 'bike' | 'auto' };
  }): Promise<AuthResponse> {
    const res = await api<AuthResponse>('/captain/register-phone', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) setCaptainToken(res.token);
    return res;
  },

  async getProfile(): Promise<{ captain: CaptainProfile }> {
    return await api<{ captain: CaptainProfile }>('/captain/profile');
  },

  async updateProfile(captainData: Partial<CaptainProfile>): Promise<{ message: string; user: CaptainProfile }> {
    return await api<{ message: string; user: CaptainProfile }>('/captain/update', {
      method: 'POST',
      body: JSON.stringify({ captainData }),
    });
  },

  async logout(): Promise<{ message: string }> {
    try {
      const res = await api<{ message: string }>('/captain/logout');
      setCaptainToken(null);
      return res;
    } catch {
      setCaptainToken(null);
      return { message: 'Logged out' };
    }
  },

  async confirmRide(rideId: string): Promise<any> {
    return await api('/ride/confirm', {
      method: 'POST',
      body: JSON.stringify({ rideId }),
    });
  },

  async startRide(rideId: string, otp: string): Promise<any> {
    return await api(`/ride/start-ride?rideId=${rideId}&otp=${otp}`);
  },

  async endRide(rideId: string): Promise<any> {
    return await api('/ride/end-ride', {
      method: 'POST',
      body: JSON.stringify({ rideId }),
    });
  },

  async getChatDetails(rideId: string): Promise<{ user: any; captain: any; messages: any[] }> {
    return await api(`/ride/chat-details/${rideId}`);
  },

  async getActiveRide(): Promise<{ ride: any | null }> {
    return await api<{ ride: any | null }>('/ride/captain-active-ride');
  },
};
