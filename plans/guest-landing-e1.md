# Э1 — Лендинг / стартовый экран гостевого флоу (только первый экран)

## Goal
Неавторизованный пользователь попадает на лендинг с заголовком «Проверь резюме глазами AI-рекрутера за 1 минуту», кнопкой «Загрузить резюме» и ссылкой «У меня нет резюме». UTM-метки и реферальный код из URL сохраняются в гостевую сессию. Переключатель языка (RU/KZ/UZ/EN) в этот этап НЕ входит — остаётся существующий ru/en.

## Context

### Ключевые файлы и системы
- **Роутинг** (`frontend/app/`): `index.tsx` редиректит неавторизованных на `/(auth)/login`. Группы: `(auth)`, `(onboarding)`, `(protected)`, `admin/`. Гостевой группы нет.
- **UI-паттерны**: `AppHeader` (лого + LanguageSwitcher), `PrimaryButton`, `SafeAreaView` + `ScrollView` + `max-w-md self-center`, `useTranslation(namespace)`.
- **Аналитика** (`frontend/src/features/analytics/`, `backend/src/models/AnalyticsEvent.ts`, `backend/src/controllers/analyticsController.ts`):
  - `POST /api/analytics/events` с `optionalAuthMiddleware` — принимает события без авторизации, `userId` nullable, `properties` Mixed.
  - `trackEvent({ eventName, entityType, entityId, properties })`.
- **Гостевая сессия**: модели нет. Есть `optionalAuthMiddleware` (не требует токен). UTM/реферальный код нигде не сохраняется (grep = 0).
- **i18n**: остаётся как есть (ru/en). Лендинг использует существующий `useTranslation('common')` или новый namespace `guest` с ru/en.

### Ограничения
- `index.tsx` жёстко редиректит гостя на login — лендинг нужно встроить в роутинг без ломки существующих флоу.
- Нет backend-модели гостевой сессии — UTM/реферальный код пока некуда «сохранять» серверно.
- Expo Router `typedRoutes: true` — новые маршруты должны быть типизированы.
- Кнопка «Загрузить резюме» и ссылка «У меня нет резюме» ведут на экраны, которых ещё нет (Э2 и загрузка) — на этом этапе это заглушки-переходы.

---

## Options

### Option A — Лендинг на фронте + UTM/ref в localStorage (без backend)
- **Approach:** Новый публичный роут `app/(guest)/index.tsx` (лендинг). UTM-метки (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) и реферальный код (`ref`/`referral`) парсятся из URL на клиенте и сохраняются в `localStorage` (web) / SecureStore (native) под ключом гостевой сессии. При регистрации/первом analytics-событии значения подмешиваются в `properties`.
- **Files / systems:**
  - Фронт: `app/(guest)/_layout.tsx` + `app/(guest)/index.tsx`; `src/features/guest/` (ui `GuestLandingScreen`, lib `utm.ts`, store `guest-session.store.ts`); правка `app/index.tsx` (редирект гостя на `/(guest)`); локали `guest` ru/en.
  - Бэкенд: без изменений (UTM уходит в `properties` analytics-события).
- **Pros:** Минимум работы, нет новой backend-модели; быстрый MVP; UTM доступен сразу на клиенте.
- **Cons:** UTM/ref живут только на устройстве — теряются при смене браузера/очистке; нет серверной «гостевой сессии» для сквозной атрибуции; реферальный код нельзя валидировать серверно.
- **Problems after adding this:** потеря атрибуции при смене устройства/инкогнито; нет единого источника правды для UTM; при регистрации нужно явно пробрасывать UTM из localStorage.
- **Staging blind spots:** localStorage/SecureStore поведение на web vs native; UTM-парсинг на deep-link (native) vs query-string (web) отличается.
- **Prod risk:** low
- **Reversibility:** easy

### Option B — Лендинг + backend GuestSession (UTM/ref сохраняются серверно)
- **Approach:** Как A, но добавляется backend-модель `GuestSession` (guestId, utm-поля, refCode, createdAt, TTL) и эндпоинт `POST /api/guest/session` (создать/обновить сессию, вернуть `guestId`). Клиент при первом заходе шлёт UTM/ref на бэкенд, получает `guestId`, хранит его в localStorage/SecureStore. При регистрации `guestId` пробрасывается в `register` для привязки атрибуции к User.
- **Files / systems:**
  - Бэкенд: `models/GuestSession.ts`, `controllers/guestController.ts`, `routes/guest.ts`, `schemas/guest.schema.ts`, монтирование в `app.ts`; опционально поле `guestId` в `User`/`AnalyticsEvent`.
  - Фронт: всё из A + `src/features/guest/api/guest.api.ts` (создание сессии), проброс `guestId` при регистрации.
- **Pros:** Единый серверный источник атрибуции; UTM/ref переживают смену устройства; реферальный код можно валидировать; сквозная аналитика от гостя до регистрации.
- **Cons:** Больше работы (модель + эндпоинт); нужна очистка протухших guest-сессий (TTL); риск роста БД.
- **Problems after adding this:** рост коллекции GuestSession без очистки; гонки при повторном создании сессии; привязка guestId→User при регистрации (нужно прокинуть в authController).
- **Staging blind spots:** TTL/очистка не видны на малом объёме; deep-link vs web парсинг UTM.
- **Prod risk:** medium
- **Reversibility:** medium (новая модель + эндпоинт)

### Option C — Лендинг + UTM/ref только в analytics-событиях (без отдельной сессии)
- **Approach:** Лендинг как в A, но UTM/ref не хранятся отдельно — сразу отправляются в `POST /api/analytics/events` событием `landing_viewed` с `properties: { utm_source, ..., ref }`.
- **Files / systems:** фронт из A (без store для UTM, вместо него — отправка события); бэкенд без изменений.
- **Pros:** Проще B, нет новой модели; UTM попадает в аналитику сразу.
- **Cons:** Нет «сессии» — нельзя связать последующие действия гостя с UTM; реферальный код не валидируется; атрибуция фрагментирована.
- **Problems after adding this:** сложно построить сквозную воронку «UTM → регистрация»; дублирование UTM в каждом событии; нет guestId для дедупликации.
- **Staging blind spots:** реальная воронка атрибуции не видна без трафика.
- **Prod risk:** low
- **Reversibility:** easy

---

## Comparison

| Criterion | A (localStorage) | B (GuestSession) | C (analytics-only) |
| --- | --- | --- | --- |
| Correctness / fit | Средняя | Высокая | Средняя |
| Blast radius | Низкий | Средний | Низкий |
| Staging blind spots | web vs native UTM | TTL/очистка, гонки | воронка атрибуции |
| Rollback | Easy | Medium | Easy |
| Effort | Низкий | Высокий | Низкий |

## Recommended
- **Pick:** Option A для первого экрана (лендинг + UTM/ref в localStorage), с последующим переходом на B (GuestSession) на этапе регистрации.
- **Why:** Первый экран — это чисто фронтенд-задача; A даёт быстрый результат без backend-изменений, а серверную гостевую сессию логично добавить вместе с этапом регистрации (когда появится привязка guestId→User).
- **If you pick another:** B — сразу серверная атрибуция, но больше работы уже на первом экране; C — проще, но нет сквозной атрибуции.

## Open questions
1. **Реферальный код:** какой параметр в URL (`ref`, `referral`, `invite`)? Валидировать ли против модели `Invite`?
2. **Куда ведут кнопки:** «Загрузить резюме» и «У меня нет резюме» — на какие маршруты (заглушки) на этом этапе?
3. **Гостевая сессия:** нужен ли серверный `guestId` уже сейчас, или достаточно localStorage до этапа регистрации?
4. **Deep-link (native):** UTM приходят через query-string или Expo Linking deep-link?

## Next step
Дождаться выбора варианта (A / B / C) и ответов на открытые вопросы. Исходный код в Plan mode не меняется.
