import { create, isAxiosError } from 'axios';
import { API_BASE_URL, apiClient } from '@/shared/config/api';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type {
  AnalysisAccess,
  AnalysisResponse,
  FullAnalysis,
  ResumeFile,
} from '../model/analysis';
import type { ResumeUploadForm } from '../model/types';

// Guest requests do not refresh or end an unrelated signed-in session.
const guestClient = create({
  baseURL: `${API_BASE_URL}/guest/analyses`,
  timeout: 30000,
});
const headers = (access: AnalysisAccess) => ({
  'X-Analysis-Secret': access.secret,
});

export async function submitAnalysis(
  form: ResumeUploadForm,
  file: ResumeFile | null,
  language: string
) {
  const body = new FormData();
  for (const [key, value] of Object.entries({
    jobLocation: form.jobLocation,
    targetCountry: form.targetCountry,
    desiredRole: form.desiredRole,
    consent: String(form.consent),
    outputLanguage: form.outputLanguage,
    responseLanguage: language.startsWith('en') ? 'en' : 'ru',
  }))
    body.append(key, value || '');
  if (form.sourceType === 'file') {
    if (!file) throw new Error('invalid_file');
    if (Platform.OS === 'web' && file.file)
      body.append('file', file.file, file.name);
    else
      body.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob);
  } else if (form.sourceType === 'text')
    body.append('resumeText', form.resumeText);
  else throw new Error('linkedin_unsupported');
  return (await guestClient.post<AnalysisAccess>('', body)).data;
}
export async function readAnalysis(
  access: AnalysisAccess,
  signal?: AbortSignal
) {
  return (
    await guestClient.get<AnalysisResponse>(`/${access.id}`, {
      headers: headers(access),
      signal,
    })
  ).data;
}
export async function retryAnalysis(access: AnalysisAccess) {
  await guestClient.post(
    `/${access.id}/retry`,
    {},
    { headers: headers(access) }
  );
}
export async function claimAnalysis(access: AnalysisAccess) {
  await apiClient.post(
    `/guest/analyses/${access.id}/claim`,
    {},
    { headers: headers(access) }
  );
}
export async function readFullAnalysis(id: string) {
  return (await apiClient.get<FullAnalysis>(`/guest/analyses/${id}/full`)).data;
}
export async function downloadAnalysis(id: string) {
  if (Platform.OS === 'web') {
    const response = await apiClient.get(
      `/guest/analyses/${id}/full?download=1`,
      { responseType: 'blob' }
    );
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'resume-analysis.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const data = await readFullAnalysis(id);
    const path = `${FileSystem.cacheDirectory}resume-analysis.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    else throw new Error('download_unavailable');
  }
}

export function analysisErrorCode(error: unknown): string {
  if (isAxiosError(error))
    return error.response?.data?.error || 'network_error';
  return error instanceof Error ? error.message : 'processing_failed';
}
