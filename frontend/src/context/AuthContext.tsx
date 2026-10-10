import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  type UserMe,
  type TokenResponse,
  type RegisterPayload,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  removeRefreshToken,
  setRefreshToken,
  refreshAccessToken,
  loginUser,
  registerUser,
  getCurrentUser,
  deleteAccount,
} from '../lib/authApi';
import { clearUserCache } from '../lib/queryClient';

interface AuthContextType {
  user: UserMe | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phoneOrEmail: string, password: string) => Promise<TokenResponse>;
  register: (payload: RegisterPayload) => Promise<TokenResponse>;
  logout: () => void;
  deleteMyAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<UserMe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    let currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setTokenState(currentToken);
    } catch (err: any) {
      if (err.message === 'Session expired or invalid token' || err.message?.includes('Session expired')) {
        try {
          const newToken = await refreshAccessToken();
          currentToken = newToken;
          const userData = await getCurrentUser();
          setUser(userData);
          setTokenState(currentToken);
        } catch (refreshErr) {
          console.warn('Session expired or invalid token:', refreshErr);
          removeAuthToken();
          setTokenState(null);
          setUser(null);
        }
      } else {
        console.warn('Failed to fetch user:', err);
        removeAuthToken();
        setTokenState(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (phoneOrEmail: string, password: string): Promise<TokenResponse> => {
    setIsLoading(true);
    try {
      const res = await loginUser(phoneOrEmail, password);
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      if (res.refresh_token) setRefreshToken(res.refresh_token);
      // Fetch full user details
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch {
        // Fallback user structure if /me has slight delay
        setUser({
          user_id: res.user_id,
          phone_number: phoneOrEmail,
          role: 'MEMBER',
          profile_id: res.profile_id,
          first_name: res.first_name,
          profile_status: res.profile_status,
          is_premium: false,
        });
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<TokenResponse> => {
    setIsLoading(true);
    try {
      const res = await registerUser(payload);
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      if (res.refresh_token) setRefreshToken(res.refresh_token);
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch {
        setUser({
          user_id: res.user_id,
          phone_number: payload.phone_number,
          role: 'MEMBER',
          profile_id: res.profile_id,
          first_name: res.first_name,
          profile_status: res.profile_status,
          is_premium: false,
        });
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    removeRefreshToken();
    setTokenState(null);
    setUser(null);
    clearUserCache();
  };

  const deleteMyAccount = async () => {
    await deleteAccount();
    removeAuthToken();
    removeRefreshToken();
    setTokenState(null);
    setUser(null);
    clearUserCache();
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    deleteMyAccount,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
