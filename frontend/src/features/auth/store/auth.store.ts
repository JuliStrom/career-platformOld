import { secureStorage } from '@/features/auth/lib';
import { resolveAuthFlowErrorMessage } from '@/features/auth/lib/mapBackendAuthError';
import i18n from '@/shared/config/i18n';
import { UserRole, UserType } from '@/shared/model';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { analytics } from '@/features/analytics/lib/track';
import { useEmployerStore } from '@/features/employer/store/employer-store';
import { useJobsStore } from '@/features/jobs/store';
import { useProfileStore } from '@/features/profile/store/profile-store';
import * as authApi from '../api/auth.api';
import {
  getRoleFromToken,
  getUserIdFromToken,
  getUserTypeFromToken,
  isTokenValid,
} from '../lib/jwt';
import { LoginFormData } from '../model/schemas';
import {
  AuthState,
  RegisterPayload,
  TelegramAuthPayload,
  User,
} from '../model/types';

interface AuthStore extends AuthState {
  login: (credentials: LoginFormData) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  loginWithGoogle: (idToken: string, inviteCode?: string) => Promise<void>;
  loginWithTelegram: (
    payload: TelegramAuthPayload,
    inviteCode?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  revalidateSession: () => Promise<boolean>;
  setUser: (user: User) => void;
  setUserType: (userType: UserType) => Promise<void>;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
}

function buildUserFromToken(accessToken: string): User | null {
  const userId = getUserIdFromToken(accessToken);
  const roleStr = getRoleFromToken(accessToken)?.toUpperCase();
  const userTypeStr = getUserTypeFromToken(accessToken);
  if (!userId) return null;

  const role =
    roleStr === UserRole.ADMIN ? UserRole.ADMIN : UserRole.SPECIALIST;

  const userType =
    userTypeStr === UserType.EMPLOYER
      ? UserType.EMPLOYER
      : userTypeStr === UserType.SPECIALIST
        ? UserType.SPECIALIST
        : null;

  return { id: userId, email: '', role, userType };
}

function clearProfileCache() {
  useProfileStore.getState().resetProfile();
  useEmployerStore.getState().reset();
  useJobsStore.getState().resetFilters();
  useJobsStore.getState().resetFavorites();
}

/** Параллельные вызовы revalidateSession (root layout + protected layout, StrictMode) → один проход. */
let revalidateSessionInFlight: Promise<boolean> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isInitializing: true,
  isLoading: false,
  authError: null,

  login: async (credentials: LoginFormData) => {
    set({ isLoading: true, authError: null });

    try {
      const response = await authApi.login(
        credentials.email,
        credentials.password
      );
      if (Platform.OS === 'web')
        localStorage.setItem('access_token', response.accessToken);
      else await secureStorage.setAccessToken(response.accessToken);

      analytics.loginSuccess();
      clearProfileCache();
      set({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      const errorMessage = resolveAuthFlowErrorMessage(error);
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        authError: errorMessage,
      });
      throw error;
    }
  },

  register: async (data: RegisterPayload) => {
    set({ isLoading: true, authError: null });

    try {
      const response = await authApi.register({
        ...(data.name && { name: data.name }),
        email: data.email,
        password: data.password,
        ...(data.inviteCode && { inviteCode: data.inviteCode }),
        ...(data.userType && { userType: data.userType }),
      });
      if (Platform.OS === 'web')
        localStorage.setItem('access_token', response.accessToken);
      else await secureStorage.setAccessToken(response.accessToken);
      analytics.registerCompleted();
      clearProfileCache();
      set({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      const errorMessage = resolveAuthFlowErrorMessage(error);
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        authError: errorMessage,
      });
      throw error;
    }
  },

  loginWithGoogle: async (idToken: string, inviteCode?: string) => {
    set({ isLoading: true, authError: null });
    try {
      const response = await authApi.loginWithGoogle(idToken, inviteCode);
      if (Platform.OS === 'web')
        localStorage.setItem('access_token', response.accessToken);
      else await secureStorage.setAccessToken(response.accessToken);
      analytics.loginSuccess();
      clearProfileCache();
      set({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      const errorMessage = resolveAuthFlowErrorMessage(error);
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        authError: errorMessage,
      });
      throw error;
    }
  },

  loginWithTelegram: async (
    payload: TelegramAuthPayload,
    inviteCode?: string
  ) => {
    set({ isLoading: true, authError: null });
    try {
      const response = await authApi.loginWithTelegram(payload, inviteCode);
      if (Platform.OS === 'web')
        localStorage.setItem('access_token', response.accessToken);
      else await secureStorage.setAccessToken(response.accessToken);
      clearProfileCache();
      set({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
        authError: null,
      });
    } catch (error) {
      const errorMessage = resolveAuthFlowErrorMessage(error);
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        authError: errorMessage,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Error during logout API call:', error);
    } finally {
      if (Platform.OS === 'web') {
        localStorage.removeItem('access_token');
      } else await secureStorage.clearTokens();
      clearProfileCache();
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        authError: null,
      });
    }
  },

  refreshAccessToken: async () => {
    try {
      const response = await authApi.refreshToken();

      await applyAccessTokenUpdate(response.accessToken);
    } catch (error) {
      await applyAuthRefreshFailure(i18n.t('auth:errors.refreshFailed'));
      throw error;
    }
  },

  revalidateSession: async () => {
    if (revalidateSessionInFlight) {
      return revalidateSessionInFlight;
    }

    revalidateSessionInFlight = (async (): Promise<boolean> => {
      try {
        const accessToken =
          Platform.OS === 'web'
            ? localStorage.getItem('access_token')
            : await secureStorage.getAccessToken();
        if (accessToken && isTokenValid(accessToken)) {
          const user = buildUserFromToken(accessToken);
          set({
            isAuthenticated: true,
            user,
            authError: null,
          });
          return true;
        }

        try {
          await get().refreshAccessToken();
          return true;
        } catch {
          if (Platform.OS === 'web') {
            localStorage.removeItem('access_token');
          } else await secureStorage.clearTokens();
          clearProfileCache();
          set({ isAuthenticated: false, user: null, authError: null });
          return false;
        }
      } catch (error) {
        console.error('Error revalidating session:', error);
        if (Platform.OS === 'web') {
          localStorage.removeItem('access_token');
        } else await secureStorage.clearTokens();
        clearProfileCache();
        set({ isAuthenticated: false, user: null, authError: null });
        return false;
      } finally {
        revalidateSessionInFlight = null;
      }
    })();

    return revalidateSessionInFlight;
  },

  setUser: (user: User) => {
    set({ user });
  },

  setUserType: async (userType: UserType) => {
    set({ isLoading: true, authError: null });
    try {
      const user = await authApi.setUserType(userType);
      set({ user, isLoading: false, authError: null });
    } catch (error) {
      set({
        isLoading: false,
        authError: resolveAuthFlowErrorMessage(error),
      });
      throw error;
    }
  },

  clearError: () => {
    set({ authError: null });
  },

  initializeAuth: async () => {
    set({ isInitializing: true });

    try {
      await get().revalidateSession();
    } finally {
      set({ isInitializing: false });
    }
  },
}));

export async function applyAccessTokenUpdate(accessToken: string) {
  if (Platform.OS === 'web') localStorage.setItem('access_token', accessToken);
  else await secureStorage.setAccessToken(accessToken);
  const currentUser = useAuthStore.getState().user;
  const tokenUser = buildUserFromToken(accessToken);
  const user =
    currentUser && tokenUser
      ? {
          ...currentUser,
          role: tokenUser.role,
          userType: tokenUser.userType ?? currentUser.userType,
        }
      : tokenUser;
  useAuthStore.setState({
    isAuthenticated: true,
    user,
    authError: null,
  });
}

export async function applyAuthRefreshFailure(errorMessage?: string) {
  if (Platform.OS === 'web') {
    localStorage.removeItem('access_token');
  } else await secureStorage.clearTokens();
  useProfileStore.getState().resetProfile();
  useEmployerStore.getState().reset();
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    authError: errorMessage ?? i18n.t('auth:errors.refreshFailed'),
  });
}
