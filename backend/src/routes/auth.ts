import express, { Router } from 'express';
import * as authController from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';
import authMiddleware from '../middleware/authMiddleware';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  telegramAuthSchema,
  setUserTypeSchema,
} from '../schemas';
import { authRateLimiter } from '../middleware/rateLimiter';

const router: Router = express.Router();

// Refresh/logout не должны попадать под brute-force лимит логина:
// истекший access token вызывает refresh, а 5 неудач подряд блокировали сессию.
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Применяем строгий rate limiter к эндпоинтам входа
router.use(authRateLimiter);

// POST /api/auth/register - Регистрация (email + пароль)
router.post('/register', validateRequest(registerSchema), authController.register);

// POST /api/auth/login - Вход по email + пароль
router.post('/login', validateRequest(loginSchema), authController.login);

// POST /api/auth/google - Вход через Google (id_token от Google Sign-In)
router.post('/google', validateRequest(googleAuthSchema), authController.googleAuth);

// POST /api/auth/telegram - Вход через Telegram (данные от Telegram Login Widget)
router.post('/telegram', validateRequest(telegramAuthSchema), authController.telegramAuth);

// PATCH /api/auth/user-type - Выбор пути после регистрации: employer | specialist
router.patch(
  '/user-type',
  authMiddleware,
  validateRequest(setUserTypeSchema),
  authController.setUserType
);

export default router;
