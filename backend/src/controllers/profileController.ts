import { Response } from 'express';
import Profile from '../models/Profile';
import { AuthRequest, CreateProfileBody, UpdateProfileBody } from '../types';
import { isMongoDuplicateError, isMongooseValidationError, getErrorMessage } from '../utils/errorHandlers';
import { uploadToYandexDisk, getAvatarPath, isStoredAvatarPath, downloadFromYandexDisk } from '../services/yandexDisk';
import { normalizeProfileDirections } from '../utils/profileDirections';
import { resolveProfileSkills } from '../services/skillDictionary';
import { resolveExperienceFields } from '../utils/profileExperience';

// Создание профиля специалиста
export const create = async (req: AuthRequest<{}, {}, CreateProfileBody>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Валидация выполнена Zod middleware
    const userId = req.user.userId;
    const {
      name,
      aboutMe,
      avatar,
      directions: rawDirections,
      level,
      skills,
      experience,
      workplaces: rawWorkplaces,
      projects: rawProjects,
      careerGoal,
      careerStartDate,
      currentCompany,
      currentPosition,
      currentAchievement,
      city,
      relocationFromCity,
      relocationToCountry,
      employmentType,
      lang,
      wantsRelocation,
      careerChangeTrackActive,
      careerChangeCurrentField,
      careerChangeTargetDirection,
      careerChangeAgeRange,
      careerChangeMotivation,
      careerChangeTimeline,
    } = req.body;

    const directions = normalizeProfileDirections({ directions: rawDirections });
    if (directions.length === 0) {
      res.status(400).json({ error: 'Выберите хотя бы одно направление' });
      return;
    }

    const existingProfile = await Profile.findOne({ userId });
    if (existingProfile) {
      res.status(409).json({ error: 'Профиль уже существует. Используйте PUT для обновления' });
      return;
    }

    const resolvedSkills = await resolveProfileSkills(skills, []);
    const {
      workplaces,
      projects,
      experience: resolvedExperience,
    } = resolveExperienceFields({
      workplaces: rawWorkplaces,
      projects: rawProjects,
      experience,
    });
    if (!resolvedExperience) {
      res.status(400).json({ error: 'Укажите хотя бы одно место работы' });
      return;
    }

    const profile = await Profile.create({
      userId,
      name,
      aboutMe: aboutMe?.trim() ? aboutMe.trim() : null,
      avatar,
      directions,
      level,
      skills: resolvedSkills,
      experience: resolvedExperience,
      workplaces,
      projects,
      careerGoal,
      careerStartDate,
      currentCompany,
      currentPosition,
      currentAchievement,
      city,
      relocationFromCity:
        city === 'abroad' ? relocationFromCity ?? 'kazakhstan' : null,
      relocationToCountry: city === 'abroad' ? relocationToCountry ?? null : null,
      employmentType,
      lang,
      wantsRelocation,
      careerChangeTrackActive: careerChangeTrackActive ?? false,
      careerChangeCurrentField: careerChangeTrackActive ? careerChangeCurrentField ?? null : null,
      careerChangeTargetDirection: careerChangeTrackActive ? careerChangeTargetDirection ?? null : null,
      careerChangeAgeRange: careerChangeTrackActive ? careerChangeAgeRange ?? null : null,
      careerChangeMotivation: careerChangeTrackActive ? careerChangeMotivation ?? null : null,
      careerChangeTimeline: careerChangeTrackActive ? careerChangeTimeline ?? null : null,
    });

    res.status(201).json(profile);
  } catch (error: unknown) {
    if (isMongooseValidationError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (isMongoDuplicateError(error)) {
      res.status(409).json({ error: 'Профиль уже существует' });
      return;
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// Получение профиля текущего авторизованного пользователя
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const userId = req.user.userId;
    const profile = await Profile.findOne({ userId });
    
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    res.status(200).json(profile);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// Обновление профиля текущего авторизованного пользователя
export const update = async (req: AuthRequest<{}, {}, UpdateProfileBody>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Валидация выполнена Zod middleware
    const userId = req.user.userId;
    const {
      name,
      aboutMe,
      avatar,
      directions: rawDirections,
      level,
      skills,
      experience,
      workplaces: rawWorkplaces,
      projects: rawProjects,
      careerGoal,
      careerStartDate,
      currentCompany,
      currentPosition,
      currentAchievement,
      city,
      relocationFromCity,
      relocationToCountry,
      employmentType,
      lang,
      wantsRelocation,
      careerChangeTrackActive,
      careerChangeCurrentField,
      careerChangeTargetDirection,
      careerChangeAgeRange,
      careerChangeMotivation,
      careerChangeTimeline,
    } = req.body;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    if (name !== undefined) profile.name = name;
    if (aboutMe !== undefined) {
      profile.aboutMe = aboutMe?.trim() ? aboutMe.trim() : null;
    }
    if (avatar !== undefined) profile.avatar = avatar;
    if (rawDirections !== undefined) {
      const directions = normalizeProfileDirections({ directions: rawDirections });
      if (directions.length === 0) {
        res.status(400).json({ error: 'Выберите хотя бы одно направление' });
        return;
      }
      profile.directions = directions;
    }
    if (level !== undefined) profile.level = level;
    if (skills !== undefined) {
      profile.skills = await resolveProfileSkills(skills, profile.skills);
    }
    if (
      rawWorkplaces !== undefined ||
      rawProjects !== undefined ||
      experience !== undefined
    ) {
      const resolved = resolveExperienceFields({
        workplaces: rawWorkplaces !== undefined ? rawWorkplaces : profile.workplaces,
        projects: rawProjects !== undefined ? rawProjects : profile.projects,
        experience:
          experience !== undefined ? experience : profile.experience,
      });
      if (!resolved.experience) {
        res.status(400).json({ error: 'Укажите хотя бы одно место работы' });
        return;
      }
      profile.workplaces = resolved.workplaces;
      profile.projects = resolved.projects;
      profile.experience = resolved.experience;
    }
    if (careerGoal !== undefined) profile.careerGoal = careerGoal;
    if (careerStartDate !== undefined) profile.careerStartDate = careerStartDate;
    if (currentCompany !== undefined) profile.currentCompany = currentCompany;
    if (currentPosition !== undefined) profile.currentPosition = currentPosition;
    if (currentAchievement !== undefined) profile.currentAchievement = currentAchievement;
    const nextCity = city !== undefined ? city : profile.city;
    if (city !== undefined) profile.city = city;
    if (nextCity !== 'abroad') {
      profile.relocationFromCity = null;
      profile.relocationToCountry = null;
    }
    if (relocationFromCity !== undefined) {
      profile.relocationFromCity =
        nextCity === 'abroad' ? relocationFromCity : null;
    }
    if (relocationToCountry !== undefined) {
      profile.relocationToCountry =
        nextCity === 'abroad' ? relocationToCountry : null;
    }
    if (employmentType !== undefined) profile.employmentType = employmentType;
    if (lang !== undefined) profile.lang = lang;
    if (wantsRelocation !== undefined) profile.wantsRelocation = wantsRelocation;

    if (careerChangeTrackActive !== undefined) {
      profile.careerChangeTrackActive = careerChangeTrackActive;
      if (careerChangeTrackActive === false) {
        profile.careerChangeCurrentField = null;
        profile.careerChangeTargetDirection = null;
        profile.careerChangeAgeRange = null;
        profile.careerChangeMotivation = null;
        profile.careerChangeTimeline = null;
      }
    }
    if (careerChangeCurrentField !== undefined) {
      profile.careerChangeCurrentField = careerChangeCurrentField;
    }
    if (careerChangeTargetDirection !== undefined) {
      profile.careerChangeTargetDirection = careerChangeTargetDirection;
    }
    if (careerChangeAgeRange !== undefined) {
      profile.careerChangeAgeRange = careerChangeAgeRange;
    }
    if (careerChangeMotivation !== undefined) {
      profile.careerChangeMotivation = careerChangeMotivation;
    }
    if (careerChangeTimeline !== undefined) {
      profile.careerChangeTimeline = careerChangeTimeline;
    }

    await profile.save();

    res.status(200).json(profile);
  } catch (error: unknown) {
    if (isMongooseValidationError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// Удаление аватарки пользователя
export const deleteAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const userId = req.user.userId;
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    profile.avatar = null;
    await profile.save();

    res.status(200).json(profile);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// Замена аватарки пользователя
export const updateAvatar = async (req: AuthRequest<{}, {}, { avatar: string }>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const userId = req.user.userId;
    const { avatar } = req.body;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    profile.avatar = avatar;
    await profile.save();

    res.status(200).json(profile);
  } catch (error: unknown) {
    if (isMongooseValidationError(error)) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// Загрузка аватарки как файла на Яндекс.Диск
export const uploadAvatarFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      res.status(400).json({ error: 'Файл avatar обязателен' });
      return;
    }

    const userId = req.user.userId;

    const remotePath = getAvatarPath(userId, file.originalname);

    await uploadToYandexDisk(file.buffer, remotePath, file.mimetype);

    // Профиль может ещё не существовать (первичное заполнение после регистрации).
    // В этом случае просто возвращаем путь; фронт передаст его в POST /api/profile.
    const profile = await Profile.findOne({ userId });
    if (profile) {
      profile.avatar = remotePath;
      await profile.save();
    }

    res.status(200).json({
      message: 'Аватарка загружена на Яндекс.Диск',
      avatar: remotePath,
    });
  } catch (error: unknown) {
    if (isMongooseValidationError(error)) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

// Получение аватарки: своей или чужой по пути /avatars/... (карточки поиска работодателя)
export const getAvatarFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const requestedPath =
      typeof req.query.v === 'string' ? req.query.v.trim() : '';
    let avatarPath: string | null = null;

    if (requestedPath && isStoredAvatarPath(requestedPath)) {
      const exists = await Profile.exists({ avatar: requestedPath });
      if (!exists) {
        res.status(404).json({ error: 'Аватарка не найдена' });
        return;
      }
      avatarPath = requestedPath;
    } else {
      const userId = req.user.userId;
      const profile = await Profile.findOne({ userId });

      if (!profile) {
        res.status(404).json({ error: 'Профиль не найден' });
        return;
      }

      avatarPath = profile.avatar ?? null;
    }

    if (!avatarPath || typeof avatarPath !== 'string' || avatarPath.trim() === '') {
      res.status(404).json({ error: 'Аватарка не найдена' });
      return;
    }

    // Если в профиле хранится внешний URL (не путь на Диске), просто редиректим
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      res.redirect(302, avatarPath);
      return;
    }

    if (!isStoredAvatarPath(avatarPath)) {
      res.status(404).json({ error: 'Аватарка не найдена' });
      return;
    }

    const { stream, contentType, contentLength } = await downloadFromYandexDisk(avatarPath);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Vary', 'Authorization');
    res.setHeader('Cache-Control', 'private, no-store');
    if (typeof contentLength === 'number' && Number.isFinite(contentLength)) {
      res.setHeader('Content-Length', String(contentLength));
    }

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Ошибка при скачивании аватарки' });
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    const isNotFound =
      msg.includes('404') ||
      msg.toLowerCase().includes('not found') ||
      msg.toLowerCase().includes('не найден');
    res.status(isNotFound ? 404 : 500).json({
      error: isNotFound ? 'Аватарка не найдена' : msg,
    });
  }
};

export const uploadPortfolioPdfFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ' });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      res.status(400).json({ error: 'Р¤Р°Р№Р» portfolio РѕР±СЏР·Р°С‚РµР»РµРЅ' });
      return;
    }

    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      res.status(400).json({ error: 'РџРѕСЂС‚С„РѕР»РёРѕ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ PDF-С„Р°Р№Р»РѕРј' });
      return;
    }

    const userId = req.user.userId;
    const profile = await Profile.findOne({ userId });

    if (!profile) {
      res.status(404).json({ error: 'РџСЂРѕС„РёР»СЊ РЅРµ РЅР°Р№РґРµРЅ' });
      return;
    }

    profile.portfolioPdfData = file.buffer;
    profile.portfolioPdfContentType = 'application/pdf';
    profile.portfolioPdfName = file.originalname;
    await profile.save();

    res.status(200).json({
      message: 'PDF РїРѕСЂС‚С„РѕР»РёРѕ Р·Р°РіСЂСѓР¶РµРЅ',
      portfolioPdfName: file.originalname,
    });
  } catch (error: unknown) {
    if (isMongooseValidationError(error)) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getPortfolioPdfFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РЅРµ Р°РІС‚РѕСЂРёР·РѕРІР°РЅ' });
      return;
    }

    const userId = req.user.userId;
    const profile = await Profile.findOne({ userId });

    if (!profile) {
      res.status(404).json({ error: 'РџСЂРѕС„РёР»СЊ РЅРµ РЅР°Р№РґРµРЅ' });
      return;
    }

    const portfolioPdfData = profile.portfolioPdfData;
    if (!portfolioPdfData || portfolioPdfData.length === 0) {
      res.status(404).json({ error: 'PDF РїРѕСЂС‚С„РѕР»РёРѕ РЅРµ РЅР°Р№РґРµРЅ' });
      return;
    }

    res.setHeader('Content-Type', profile.portfolioPdfContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(profile.portfolioPdfName ?? 'portfolio.pdf')}"`);
    res.setHeader('Vary', 'Authorization');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Length', String(portfolioPdfData.length));
    res.send(portfolioPdfData);
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    const isNotFound =
      msg.includes('404') ||
      msg.toLowerCase().includes('not found') ||
      msg.toLowerCase().includes('РЅРµ РЅР°Р№РґРµРЅ');
    res.status(isNotFound ? 404 : 500).json({
      error: isNotFound ? 'PDF РїРѕСЂС‚С„РѕР»РёРѕ РЅРµ РЅР°Р№РґРµРЅ' : msg,
    });
  }
};

// Удаление профиля текущего авторизованного пользователя
export const uploadCertificatePdfFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: 'Файл certificate обязателен' });
      return;
    }

    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      res.status(400).json({ error: 'Сертификат должен быть PDF-файлом' });
      return;
    }

    const profile = await Profile.findOne({ userId: req.user.userId });
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    profile.certificatePdfs = profile.certificatePdfs ?? [];
    profile.certificatePdfs.push({
      name: file.originalname,
      contentType: 'application/pdf',
      data: file.buffer,
      uploadedAt: new Date(),
    });
    await profile.save();

    const certificate = profile.certificatePdfs[profile.certificatePdfs.length - 1];
    res.status(200).json({
      certificate: {
        _id: certificate._id,
        name: certificate.name,
        contentType: certificate.contentType,
        uploadedAt: certificate.uploadedAt,
      },
    });
  } catch (error: unknown) {
    if (isMongooseValidationError(error)) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const getCertificatePdfFile = async (req: AuthRequest<{ id: string }>, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const profile = await Profile.findOne({ userId: req.user.userId });
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    const certificate = profile.certificatePdfs?.find(
      (item) => item._id?.toString() === req.params.id
    );
    if (!certificate?.data || certificate.data.length === 0) {
      res.status(404).json({ error: 'PDF сертификата не найден' });
      return;
    }

    res.setHeader('Content-Type', certificate.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(certificate.name || 'certificate.pdf')}"`);
    res.setHeader('Vary', 'Authorization');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Length', String(certificate.data.length));
    res.send(certificate.data);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};

export const deleteProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    const userId = req.user.userId;
    const profile = await Profile.findOneAndDelete({ userId });
    
    if (!profile) {
      res.status(404).json({ error: 'Профиль не найден' });
      return;
    }

    await resolveProfileSkills([], profile.skills);

    res.status(200).json({ 
      message: 'Профиль успешно удалён',
      deletedProfile: {
        id: profile._id,
        name: profile.name,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
