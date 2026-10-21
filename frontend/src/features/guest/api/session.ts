import { create, isAxiosError } from 'axios';
import { API_BASE_URL, apiClient } from '@/shared/config/api';
import { useGuestSessionStore } from '../store/guest-session.store';
import { guestStorage } from '../lib/guest-storage';
import i18n from '@/shared/config/i18n';

const client = create({
  baseURL: `${API_BASE_URL}/guest/session`,
  timeout: 15000,
});
let ready: string | null = null;
let inFlight: Promise<string> | null = null;
export async function ensureServerGuest(): Promise<string> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const session = await useGuestSessionStore.getState().ensure();
    const key = session.guestId!;
    if (ready !== key) {
      try {
        const { data } = await client.post(
          '',
          { utm: session.utm, language: i18n.language.split('-')[0] },
          { headers: { 'X-Guest-Id': key } }
        );
        const current = useGuestSessionStore.getState().session;
        if (current?.guestId === key) {
          const updated = { ...current, retentionDays: data.retentionDays };
          await guestStorage.set(updated);
          useGuestSessionStore.setState({ session: updated });
        }
        ready = key;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 410) {
          useGuestSessionStore.getState().clear();
          ready = null;
        }
        throw error;
      }
    }
    return key;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
export async function linkGuestToAccount(userId: string) {
  const session = await useGuestSessionStore.getState().ensure();
  if (session.linkedUserId && session.linkedUserId !== userId) {
    useGuestSessionStore.getState().clear();
  }
  const key = await ensureServerGuest();
  await apiClient.post(
    '/guest/session/claim',
    {},
    { headers: { 'X-Guest-Id': key } }
  );
  const current = useGuestSessionStore.getState().session;
  if (current?.guestId === key) {
    const updated = { ...current, linkedUserId: userId };
    await guestStorage.set(updated);
    useGuestSessionStore.setState({ session: updated });
  }
}
export async function readGuestDraft(authenticated: boolean) {
  const key = await ensureServerGuest();
  const response = authenticated
    ? await apiClient.get('/guest/session/draft', {
        headers: { 'X-Guest-Id': key },
      })
    : await client.get('/draft', { headers: { 'X-Guest-Id': key } });
  if (authenticated && !response.data.draft) {
    return (
      await apiClient.get('/guest/session/saved-draft', {
        headers: { 'X-Guest-Id': key },
      })
    ).data.draft;
  }
  return response.data.draft;
}
export async function saveGuestDraft(
  draft: unknown,
  authenticated: boolean,
  expectedGuestId?: string | null
) {
  const key = expectedGuestId ?? (await ensureServerGuest());
  if (useGuestSessionStore.getState().session?.guestId !== key) return;
  if (authenticated)
    await apiClient.put('/guest/session/draft', draft, {
      headers: { 'X-Guest-Id': key },
    });
  else await client.put('/draft', draft, { headers: { 'X-Guest-Id': key } });
}
