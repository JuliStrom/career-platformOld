import express, { Router } from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware';
import * as profileController from '../controllers/profileController';
import { validateRequest } from '../middleware/validateRequest';
import { createProfileSchema, updateProfileSchema, updateAvatarSchema } from '../schemas';

const router: Router = express.Router();
const upload = multer();

// Применение middleware авторизации ко всем роутам
router.use(authMiddleware);

// DELETE /api/profile/avatar - Удаление аватарки
router.delete('/avatar', profileController.deleteAvatar);

// PUT /api/profile/avatar - Замена аватарки
router.put('/avatar', validateRequest(updateAvatarSchema), profileController.updateAvatar);

// POST /api/profile/avatar/upload - Загрузка аватарки как файла на Яндекс.Диск
router.post('/avatar/upload', upload.single('avatar'), profileController.uploadAvatarFile);

// GET /api/profile/avatar/file - Прокси аватарки (своя или ?v=/avatars/...)
router.get('/avatar/file', profileController.getAvatarFile);
router.post(
  '/portfolio/pdf',
  upload.single('portfolio'),
  profileController.uploadPortfolioPdfFile
);
router.get('/portfolio/pdf', profileController.getPortfolioPdfFile);
router.post(
  '/certificates/pdf',
  upload.single('certificate'),
  profileController.uploadCertificatePdfFile
);
router.get('/certificates/pdf/:id', profileController.getCertificatePdfFile);

// POST /api/profile - Создание профиля специалиста
router.post('/', validateRequest(createProfileSchema), profileController.create);

// GET /api/profile - Получение своего профиля
router.get('/', profileController.getProfile);

// PUT /api/profile - Обновление своего профиля
router.put('/', validateRequest(updateProfileSchema), profileController.update);

// DELETE /api/profile - Удаление своего профиля
router.delete('/', profileController.deleteProfile);

export default router;
