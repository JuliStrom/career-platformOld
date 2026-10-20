import {
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type ResumeUploadForm,
} from '../model/types';

export type ResumeValidationError =
  | 'invalidFormat'
  | 'fileTooLarge'
  | 'emptyFile'
  | 'emptyText'
  | 'invalidLinkedinUrl'
  | 'missingJobLocation'
  | 'missingTargetCountry'
  | 'missingConsent';

export interface ResumeValidationResult {
  valid: boolean;
  errors: ResumeValidationError[];
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function validateFileFormat(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

export function validateFileSize(fileSize: number): boolean {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE_BYTES;
}

const LINKEDIN_URL_PATTERN =
  /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[a-zA-Z0-9\-_%]+/i;

export function validateLinkedinUrl(url: string): boolean {
  return LINKEDIN_URL_PATTERN.test(url.trim());
}

/**
 * Полная валидация формы загрузки резюме.
 * Возвращает список ошибок (пустой — форма валидна).
 */
export function validateResumeForm(
  form: ResumeUploadForm
): ResumeValidationResult {
  const errors: ResumeValidationError[] = [];

  if (form.sourceType === 'file') {
    if (!form.fileName) {
      errors.push('emptyFile');
    } else {
      if (!validateFileFormat(form.fileName)) {
        errors.push('invalidFormat');
      }
      if (form.fileSize != null && !validateFileSize(form.fileSize)) {
        errors.push('fileTooLarge');
      }
    }
  } else if (form.sourceType === 'text') {
    if (!form.resumeText.trim()) {
      errors.push('emptyText');
    }
  } else if (form.sourceType === 'linkedin') {
    if (!form.linkedinUrl.trim()) {
      errors.push('invalidLinkedinUrl');
    } else if (!validateLinkedinUrl(form.linkedinUrl)) {
      errors.push('invalidLinkedinUrl');
    }
  }

  if (!form.jobLocation) {
    errors.push('missingJobLocation');
  }

  if (!form.targetCountry.trim()) {
    errors.push('missingTargetCountry');
  }

  if (!form.consent) {
    errors.push('missingConsent');
  }

  return { valid: errors.length === 0, errors };
}
