import path from 'path';
import { Readable } from 'stream';

const YANDEX_DISK_API_URL = 'https://cloud-api.yandex.net/v1/disk';

function getYandexAuthorizationHeaderValue(): string {
  const raw = process.env.YANDEX_DISK_TOKEN;
  const token = (raw ?? '').replace(/\r|\n/g, '').trim();
  if (!token) {
    throw new Error('YANDEX_DISK_TOKEN не задан в переменных окружения (.env)');
  }

  // Allow passing full header value in env (e.g. "OAuth <token>" or "Bearer <token>")
  // to avoid ambiguity and simplify debugging.
  const lower = token.toLowerCase();
  if (lower.startsWith('oauth ') || lower.startsWith('bearer ')) return token;

  return `OAuth ${token}`;
}

async function createFolder(
  remoteDirPath: string,
  authHeaderValue: string
): Promise<void> {
  const normalized = remoteDirPath.startsWith('/')
    ? remoteDirPath
    : `/${remoteDirPath}`;
  const url = new URL(`${YANDEX_DISK_API_URL}/resources`);
  url.searchParams.set('path', normalized);

  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Authorization: authHeaderValue,
      Accept: 'application/json',
    },
  });

  // 201 Created — ok
  // 409 Conflict — already exists (or cannot create)
  if (res.status === 201 || res.status === 409) return;

  const text = await res.text().catch(() => '');
  throw new Error(
    `Yandex Disk create folder failed: ${res.status} ${res.statusText} ${text}`
  );
}

async function ensureDirectoriesForFile(
  remoteFilePath: string,
  authHeaderValue: string
): Promise<void> {
  const normalized = remoteFilePath.startsWith('/')
    ? remoteFilePath
    : `/${remoteFilePath}`;
  const dir = path.posix.dirname(normalized);
  if (!dir || dir === '/' || dir === '.') return;

  const parts = dir.split('/').filter(Boolean);
  let current = '';
  for (const part of parts) {
    current += `/${part}`;
    await createFolder(current, authHeaderValue);
  }
}

async function getUploadHref(
  remoteFilePath: string,
  authHeaderValue: string
): Promise<string> {
  const normalized = remoteFilePath.startsWith('/')
    ? remoteFilePath
    : `/${remoteFilePath}`;
  const url = new URL(`${YANDEX_DISK_API_URL}/resources/upload`);
  url.searchParams.set('path', normalized);
  url.searchParams.set('overwrite', 'true');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: authHeaderValue,
      Accept: 'application/json',
    },
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ' Проверь, что токен OAuth выдан для Яндекс.Диска и имеет права на запись (например cloud_api:disk.write).'
        : '';
    throw new Error(
      `Yandex Disk get upload url failed: ${res.status} ${res.statusText} ${text}${hint}`
    );
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Yandex Disk get upload url returned invalid JSON: ${text}`);
  }

  const href = json?.href;
  if (typeof href !== 'string' || href.length === 0) {
    throw new Error(`Yandex Disk get upload url missing href: ${text}`);
  }

  return href;
}

async function getDownloadHref(
  remoteFilePath: string,
  authHeaderValue: string
): Promise<string> {
  const normalized = remoteFilePath.startsWith('/')
    ? remoteFilePath
    : `/${remoteFilePath}`;
  const url = new URL(`${YANDEX_DISK_API_URL}/resources/download`);
  url.searchParams.set('path', normalized);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: authHeaderValue,
      Accept: 'application/json',
    },
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ' Проверь, что токен OAuth выдан для Яндекс.Диска и имеет права на чтение/запись (cloud_api:disk.read/cloud_api:disk.write).'
        : '';
    throw new Error(
      `Yandex Disk get download url failed: ${res.status} ${res.statusText} ${text}${hint}`
    );
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Yandex Disk get download url returned invalid JSON: ${text}`
    );
  }

  const href = json?.href;
  if (typeof href !== 'string' || href.length === 0) {
    throw new Error(`Yandex Disk get download url missing href: ${text}`);
  }

  return href;
}

export async function uploadToYandexDisk(
  data: Buffer,
  remotePath: string,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  const authHeaderValue = getYandexAuthorizationHeaderValue();

  // Disk API не создаёт промежуточные папки автоматически — создаём их заранее
  await ensureDirectoriesForFile(remotePath, authHeaderValue);

  const href = await getUploadHref(remotePath, authHeaderValue);
  const res = await fetch(href, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: data,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Yandex Disk upload failed: ${res.status} ${res.statusText} ${text}`
    );
  }

  return remotePath;
}

export async function downloadFromYandexDisk(remotePath: string): Promise<{
  stream: Readable;
  contentType: string;
  contentLength?: number;
}> {
  const authHeaderValue = getYandexAuthorizationHeaderValue();
  const href = await getDownloadHref(remotePath, authHeaderValue);

  const res = await fetch(href, { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Yandex Disk download failed: ${res.status} ${res.statusText} ${text}`
    );
  }

  if (!res.body) {
    throw new Error('Yandex Disk download failed: empty response body');
  }

  const contentType =
    res.headers.get('content-type') || 'application/octet-stream';
  const contentLengthHeader = res.headers.get('content-length');
  const contentLength = contentLengthHeader
    ? Number(contentLengthHeader)
    : undefined;

  // node-fetch/web fetch returns a Web ReadableStream; convert for Express
  const stream = Readable.fromWeb(res.body as any) as unknown as Readable;

  return { stream, contentType, contentLength };
}

export function getAvatarPath(userId: string, originalName: string): string {
  const ext = path.extname(originalName) || '.jpg';
  return `/avatars/${userId}/avatar${ext}`;
}

/** Путь аватарки на Диске: /avatars/<userId>/avatar.<ext> */
export function isStoredAvatarPath(value: string): boolean {
  return /^\/avatars\/[a-fA-F0-9]{24}\/avatar\.[A-Za-z0-9]{1,8}$/.test(
    value.trim()
  );
}


