export type ResumeSourceType = 'file' | 'text' | 'linkedin';

export type JobLocationPreference = 'home' | 'abroad';

export interface ResumeUploadForm {
  sourceType: ResumeSourceType;
  /** Имя выбранного файла (для sourceType === 'file'). */
  fileName: string | null;
  /** Размер файла в байтах (для sourceType === 'file'). */
  fileSize: number | null;
  /** Текст резюме (для sourceType === 'text'). */
  resumeText: string;
  /** Ссылка на LinkedIn (для sourceType === 'linkedin'). */
  linkedinUrl: string;
  /** «Чего хотите?» — новая работа в своей стране / за рубежом. */
  jobLocation: JobLocationPreference | null;
  /** «Где ищете?» — страна или «любая». */
  targetCountry: string;
  /** Желаемая роль (необязательно). */
  desiredRole: string;
  /** Согласие на обработку персональных данных. */
  consent: boolean;
}

export const EMPTY_RESUME_FORM: ResumeUploadForm = {
  sourceType: 'file',
  fileName: null,
  fileSize: null,
  resumeText: '',
  linkedinUrl: '',
  jobLocation: null,
  targetCountry: '',
  desiredRole: '',
  consent: false,
};

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 МБ

export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'docx'] as const;
