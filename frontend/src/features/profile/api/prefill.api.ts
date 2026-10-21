import { apiClient } from '@/shared/config/api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { transferGuestAnalyses } from '@/features/guest/api/analysis';
import type { ProfileFormValues } from '../model';

type Values = Partial<
  Pick<
    ProfileFormValues,
    | 'name'
    | 'directions'
    | 'level'
    | 'skills'
    | 'experience'
    | 'workplaces'
    | 'currentCompany'
    | 'currentPosition'
    | 'currentAchievement'
    | 'city'
  >
> & { careerStartDate?: string };
export async function getProfilePrefill() {
  const userId = useAuthStore.getState().user?.id;
  if (userId) {
    // Registration may have opened the form before the background session transfer finished.
    await transferGuestAnalyses(userId);
  }
  return (
    await apiClient.get<{ analysisId: string | null; values: Values }>(
      '/profile/prefill'
    )
  ).data;
}
