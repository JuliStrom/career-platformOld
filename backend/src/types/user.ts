import { Document, Types } from 'mongoose';
import { UserRole, UserType } from './auth';
import type { AuthProvider } from './auth';

// User Model (email и password опциональны для OAuth: Google, Telegram)
export interface IUser extends Document {
  firstTouch?: Record<string, unknown>;
  favoriteJobs?: Types.ObjectId[];
  name?: string;
  email?: string;
  password?: string;
  authProvider: AuthProvider;
  googleId?: string;
  telegramId?: number;
  telegramUsername?: string;
  role: UserRole;
  /** Путь платформы, выбранный при регистрации. Пусто у аккаунтов до этого поля. */
  userType?: UserType;
  isBlocked: boolean;
  isDeleted: boolean;
  isSubscribed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Request типы для управления пользователями (ADMIN)
export type UpdateUserRoleBody = {
  role: UserRole;
};

export type UpdateUserBlockBody = {
  blocked: boolean;
};

export type UpdateUserSubscriptionBody = {
  isSubscribed: boolean;
};
