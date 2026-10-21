import mongoose, { Schema, Model } from 'mongoose';
import { IUser, UserRole, UserType } from '../types';
import type { AuthProvider } from '../types/auth';

const AUTH_PROVIDERS: AuthProvider[] = ['email', 'google', 'telegram'];

// Схема пользователя (email и password опциональны для OAuth)
const userSchema = new Schema<IUser>({
  name: {
    type: String,
    trim: true,
  },
  firstTouch: { type: Schema.Types.Mixed },
  // Optional until legacy profile favorites have been migrated on first access.
  favoriteJobs: { type: [{ type: Schema.Types.ObjectId, ref: 'Job' }], default: undefined, select: false },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // несколько null/отсутствующих допустимы
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Неверный формат email'],
  },
  password: {
    type: String,
    required: false,
  },
  authProvider: {
    type: String,
    enum: AUTH_PROVIDERS,
    required: true,
    default: 'email',
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  telegramId: {
    type: Number,
    unique: true,
    sparse: true,
  },
  telegramUsername: {
    type: String,
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.SPECIALIST,
  },
  userType: {
    type: String,
    enum: Object.values(UserType),
    required: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isSubscribed: {
    type: Boolean,
    default: true, // В тестовом режиме — полный доступ. Позже default: false
  },
}, {
  timestamps: true,
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
