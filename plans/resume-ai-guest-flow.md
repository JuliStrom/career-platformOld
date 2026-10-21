# Фича «AI-разбор резюме + первые вакансии без регистрации»

## Goal
Человек без аккаунта загружает резюме (PDF/DOCX), за ~60 секунд получает AI-разбор (сильные стороны, зоны роста, рекомендуемые направления/грейд) и первые подходящие вакансии. Полный разбор и все вакансии открываются после регистрации. Фича собирает аудиторию WorkOS: гостевой вход → ценность → конверсия в регистрацию.

## Context

### Ключевые файлы и системы
- **Бэкенд** (Express 5 + Mongoose 9 + Zod 4, `backend/src/`):
  - `app.ts` — монтирование роутов под `/api/*`, глобальный `generalRateLimiter`.
  - `routes/job.ts` — `router.use(authMiddleware)` в начале: **`GET /api/jobs` сейчас требует авторизации**.
  - `routes/profile.ts` — multer уже подключён, есть загрузка PDF (portfolio/certificates) на Яндекс.Диск.
  - `services/yandexDisk.ts` — готовый клиент загрузки/скачивания файлов.
  - `models/Job.ts` — вакансия: `direction`, `level`, `workFormat`, `location`, `salary`, `requirements`, `responsibilities`. **Нет поля `skills`** — матчинг сейчас только по direction+level.
  - `models/Profile.ts` — профиль специалиста: `directions`, `level`, `skills`, `experience`, `workplaces`.
  - `middleware/authMiddleware.ts` — жёсткий Bearer-токен, без guest-режима.
  - `middleware/rateLimiter.ts` — общий лимит 100 req/15 мин на IP (в dev отключён).
  - `utils/tokenService.ts` — JWT access/refresh, `JWT_SECRET` обязателен.
- **Фронтенд** (Expo Router + React Native + web, Zustand, axios, `frontend/`):
  - `app/index.tsx` — неавторизованных редиректит на `/(auth)/login`.
  - `app/(auth)/` — login/register.
  - `app/(onboarding)/` — choose-path, specialist/employer onboarding.
  - `src/features/jobs/` — api/store/ui для вакансий.
  - `src/features/auth/store/auth.store.ts` — Zustand-стор авторизации.
  - `src/shared/config/api.ts` — axios-клиент, `timeout: 30000` (важно для 60-сек AI-запроса).

### Ограничения
- **Нет ни одного AI-провайдера** в коде (grep по openai/anthropic/gpt/llm = 0 совпадений). Нужно выбрать LLM и добавить ключ.
- **Нет guest/анонимного механизма** — все роуты, кроме auth, требуют Bearer-токен.
- **Нет извлечения текста из PDF/DOCX** — multer есть, но парсинга резюме нет.
- **Нет поля `skills` у Job** — для качественного матчинга вакансий по навыкам из резюме потребуется либо расширение модели, либо матчинг по direction+level (как сейчас).
- **Таймаут axios 30 сек** — AI-разбор за 60 сек требует либо стриминга, либо увеличения таймаута, либо фоновой задачи + polling.
- **Rate limit 100/15 мин на IP** — гостевой флоу без токена упрётся в общий лимит при массовом трафике.

---

## Options

### Option A — Гостевой JWT-токен + синхронный AI-разбор (минимальный путь)
- **Approach:** Ввести «гостевую сессию»: при первом заходе на лендинг бэкенд выдаёт короткоживущий guest access-token (без User в БД, либо с временной User-записью `isGuest`). Загрузка резюме → парсинг текста (pdf-parse / mammoth) → один синхронный вызов LLM (OpenAI/Anthropic) → ответ с разбором + подбор вакансий по direction+level. Полный разбор/все вакансии — за флагом «зарегистрируйся».
- **Files / systems:**
  - Бэкенд: новый `routes/guest.ts` + `controllers/guestController.ts` + `services/resumeParser.ts` + `services/aiResumeAnalysis.ts`; модель `GuestSession` (или флаг `isGuest` в User); `middleware/guestMiddleware.ts` (выдаёт/проверяет guest-токен); публичный `GET /api/jobs` для гостей (или отдельный `GET /api/guest/jobs`).
  - Фронтенд: новый `app/(guest)/` роут-группа (лендинг + загрузка + результат), `src/features/guest/` (api/store/ui), правка `app/index.tsx` для редиректа гостя на лендинг.
- **Pros:** Минимум новых сущностей; переиспользует существующий JWT-механизм; быстрый MVP; легко ограничить «полный разбор» флагом.
- **Cons:** Синхронный LLM-вызов на 60 сек упирается в axios timeout 30 сек и в таймауты Railway/Render (обычно 30–60 сек) — риск обрыва; guest-токены без очистки засоряют БД; матчинг вакансий только по direction+level (без skills) — низкая релевантность.
- **Problems after adding this:** обрыв запроса на 60 сек в проде (таймаут прокси/платформы), рост БД от guest-сессий, LLM-стоимость на каждый гостевой заход без лимита, rate limit 100/15 мин блокирует массовый трафик.
- **Staging blind spots:** локально нет таймаутов платформы и реального трафика; LLM-ключ в dev может отличаться от prod; нет замера реальной стоимости LLM на 1000 гостей.
- **Prod risk:** medium
- **Reversibility:** easy (откат роутов + флаг фичи)

### Option B — Гостевая сессия + фоновая задача (queue/polling) + расширенный матчинг
- **Approach:** Как A, но AI-разбор выполняется асинхронно: загрузка резюме → создание `ResumeAnalysis` (статус pending) → фоновая обработка (in-process очередь или BullMQ/Redis) → фронт поллит статус. Плюс расширение `Job` полем `skills: string[]` и матчинг вакансий по пересечению навыков из резюме. Полный разбор — за регистрацией.
- **Files / systems:** всё из A + модель `ResumeAnalysis`; `services/analysisQueue.ts`; расширение `models/Job.ts` (поле `skills`) + миграция/бэкфилл; `services/jobMatching.ts` (score по skills+direction+level); фронт — polling-хук.
- **Pros:** Надёжно для 60-сек и дольше (нет обрыва таймаута); масштабируется; качественный матчинг по навыкам; можно кэшировать результат.
- **Cons:** Больше инфраструктуры (очередь/Redis или in-process worker); сложнее; нужна миграция Job + бэкфилл skills; больше точек отказа.
- **Problems after adding this:** миграция Job на проде (бэкфилл skills для существующих вакансий), отказ Redis/очереди, гонки при повторной загрузке, стоимость LLM без квоты на гостя.
- **Staging blind spots:** очередь/Redis в staging может отсутствовать или отличаться от prod; бэкфилл на малом объёме не покажет проблем на большом; polling-нагрузка при реальном трафике.
- **Prod risk:** medium
- **Reversibility:** medium (миграция Job + очередь)

### Option C — Полностью публичный лендинг без guest-токена + серверный кэш по fingerprint
- **Approach:** Не создавать guest-сессию вообще. Публичные эндпоинты `/api/public/resume-analysis` и `/api/public/jobs` без авторизации, идентификация по анонимному `fingerprintId` (клиент генерирует UUID, хранит в localStorage). Результат разбора кэшируется на сервере по fingerprintId с TTL. Регистрация «привязывает» fingerprintId к новому User.
- **Files / systems:** публичные роуты без authMiddleware; `services/resumeAnalysis.ts`; кэш (in-memory/Redis) по fingerprintId; фронт — генерация fingerprintId, лендинг.
- **Pros:** Нет guest-записей в БД; проще всего; нет JWT-усложнения.
- **Cons:** Нет серверной защиты от злоупотребления (только rate limit по IP); fingerprintId легко подделать/потерять (смена браузера теряет результат); привязка к User при регистрации хрупкая; сложнее ограничить «полный разбор».
- **Problems after adding this:** abuse без аутентификации (спам LLM-вызовами), потеря результата при смене устройства, невозможность надёжно связать гостя с будущим аккаунтом.
- **Staging blind spots:** abuse-сценарии не видны без реального трафика; кэш по fingerprint в staging не отражает prod-нагрузку.
- **Prod risk:** high (abuse + стоимость LLM)
- **Reversibility:** easy

---

## Comparison

| Criterion | A (guest JWT + sync) | B (guest + queue + skills) | C (public + fingerprint) |
| --- | --- | --- | --- |
| Correctness / fit | Средняя (матчинг слабый) | Высокая (skills-матчинг) | Средняя |
| Blast radius | Низкий | Средний (миграция Job) | Низкий |
| Staging blind spots | Таймауты/стоимость LLM | Очередь/бэкфилл | Abuse-сценарии |
| Rollback | Easy | Medium | Easy |
| Effort | Низкий | Высокий | Низкий |

## Recommended
- **Pick:** Option B (гостевая сессия + фоновая задача + skills-матчинг), но с поэтапным внедрением: сначала A (guest JWT + синхронный разбор с увеличенным таймаутом и стримингом/SSE), затем добавить очередь и skills-матчинг.
- **Why:** B даёт надёжный 60-сек UX и качественный матчинг, что напрямую влияет на конверсию в регистрацию; A — быстрый MVP для проверки гипотезы, но упирается в таймауты и слабый матчинг.
- **If you pick another:** A — быстрее, но рискуешь обрывом 60-сек запроса и низкой релевантностью вакансий; C — проще, но высокий риск abuse и потери результата.

## Open questions
1. **Какой LLM-провайдер?** OpenAI (GPT-4o-mini) vs Anthropic (Claude Haiku) vs локальный. Влияет на стоимость, ключ в env, формат ответа. Нужен ключ и бюджет.
2. **Формат резюме:** только PDF или также DOCX? (влияет на парсер: pdf-parse vs mammoth).
3. **Что именно в «полном разборе»** (за регистрацией) vs «первом разборе» (бесплатно)? Нужно чёткое ТЗ по контенту, чтобы спроектировать флаг.
4. **Матчинг вакансий:** достаточно direction+level (как сейчас) или нужен skills-матчинг (требует миграции Job)? Это ключевой развилочный вопрос между A и B.
5. **Инфраструктура очереди:** есть ли Redis/Railway-аддон, или использовать in-process очередь (проще, но теряется при рестарте)?
6. **Бюджет/квота на LLM для гостей:** нужен ли лимит на число бесплатных разборов с одного IP/устройства?

## Next step
Дождаться выбора варианта (A / B / C) и ответов на открытые вопросы. Исходный код в Plan mode не меняется.
