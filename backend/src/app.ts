import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import inviteRoutes from './routes/invite';
import adminInvitesRoutes from './routes/adminInvites';
import profileRoutes from './routes/profile';
import jobRoutes from './routes/job';
import careerRoutes from './routes/career';
import usersRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import adminAnalyticsRoutes from './routes/adminAnalytics';
import adminRecommendationsRoutes from './routes/adminRecommendations';
import adminCompaniesRoutes from './routes/adminCompanies';
import adminAiRiskIndexRoutes from './routes/adminAiRiskIndex';
import adminCareerTriggersRoutes from './routes/adminCareerTriggers';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';
import learningRoutes from './routes/learning';
import notificationRoutes from './routes/notification';
import employerRoutes from './routes/employer';
import skillsRoutes from './routes/skills';
import guestAnalysisRoutes from './routes/guestAnalysis';
const app: Express = express();
app.set('trust proxy', 1); // добавила для запуска на railway
// Security middleware (COOP/COEP отключены для OAuth popup от Google)
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS whitelist
const corsOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
if (corsOrigins.length === 0) {
  corsOrigins.push('http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:8081', 'http://127.0.0.1:3000');
}
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.some((o) => origin === o || origin?.startsWith(o))) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(cookieParser()); // Парсинг cookies

// Logging middleware (только в development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Логирование HTTP запросов
} else {
  app.use(morgan('combined')); // Расширенное логирование для production
}

// Rate limiting (общий для всех эндпоинтов)
app.use(generalRateLimiter);

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/admin/invites', adminInvitesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/recommendations', adminRecommendationsRoutes);
app.use('/api/admin/companies', adminCompaniesRoutes);
app.use('/api/admin/ai-risk-index', adminAiRiskIndexRoutes);
app.use('/api/admin/career-triggers', adminCareerTriggersRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/employer", employerRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/guest/analyses', guestAnalysisRoutes);
// Обработка 404 для несуществующих роутов
app.use((req, res) => {
  res.status(404).json({
    error: 'Эндпоинт не найден',
    path: req.path,
  });
});

// Глобальный обработчик ошибок (должен быть последним middleware)
app.use(errorHandler);

export default app;
