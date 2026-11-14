import { VideoSourceType } from '../types';

export interface ParsedVideoLink {
  valid: boolean;
  provider: 'youtube' | 'gdrive' | null;
  id: string;
  embedUrl: string;
  originalUrl: string;
  error?: string;
}

/**
 * Chuẩn hóa URL nhúng YouTube để phát trực tiếp trong iframe (giữ nguyên đường dẫn gốc trong cấu hình).
 */
export function normalizeYouTubeEmbedUrl(url: string, fallbackVideoId?: string): string {
  const trimmed = (url || '').trim();
  const idMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = idMatch?.[1] || (fallbackVideoId && /^[a-zA-Z0-9_-]{11}$/.test(fallbackVideoId) ? fallbackVideoId : '');

  if (!videoId) {
    return trimmed;
  }

  try {
    const base = new URL(`https://www.youtube.com/embed/${videoId}`);
    if (trimmed.includes('?')) {
      const parsedInput = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      parsedInput.searchParams.forEach((value, key) => {
        if (key !== 'v') {
          base.searchParams.set(key, value);
        }
      });
    }
    if (!base.searchParams.has('rel')) base.searchParams.set('rel', '0');
    if (!base.searchParams.has('modestbranding')) base.searchParams.set('modestbranding', '1');
    if (!base.searchParams.has('enablejsapi')) base.searchParams.set('enablejsapi', '1');
    if (!base.searchParams.has('playsinline')) base.searchParams.set('playsinline', '1');
    return base.toString();
  } catch {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&playsinline=1`;
  }
}

/**
 * Extracts YouTube Video ID (11 chars) from standard, short, embed, live, and shorts URLs.
 * Supports public and unlisted YouTube videos.
 */
export function parseYouTubeUrl(input: string): ParsedVideoLink {
  const raw = input.trim();
  if (!raw) {
    return { valid: false, provider: 'youtube', id: '', embedUrl: '', originalUrl: raw, error: 'Vui lòng dán đường dẫn video YouTube.' };
  }

  let candidateUrl = raw;
  if (!/^https?:\/\//i.test(candidateUrl)) {
    candidateUrl = 'https://' + candidateUrl;
  }

  try {
    const parsed = new URL(candidateUrl);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') {
          videoId = parts[1] || '';
        }
      }
    }

    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return {
        valid: true,
        provider: 'youtube',
        id: videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&playsinline=1`,
        originalUrl: raw,
      };
    }
  } catch {
    // Fall through to regex fallback
  }

  // Regex fallback for edge-case URL strings
  const regexMatch = raw.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (regexMatch && regexMatch[1]) {
    const videoId = regexMatch[1];
    return {
      valid: true,
      provider: 'youtube',
      id: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&playsinline=1`,
      originalUrl: raw,
    };
  }

  return {
    valid: false,
    provider: 'youtube',
    id: '',
    embedUrl: '',
    originalUrl: raw,
    error: 'Đường dẫn YouTube không hợp lệ. Vui lòng dán liên kết dạng youtube.com/watch?v=... hoặc youtu.be/...',
  };
}

/**
 * Extracts Google Drive File ID from /file/d/<ID>/view, /open?id=<ID>, /uc?id=<ID>, etc.
 */
export function parseGoogleDriveUrl(input: string): ParsedVideoLink {
  const raw = input.trim();
  if (!raw) {
    return { valid: false, provider: 'gdrive', id: '', embedUrl: '', originalUrl: raw, error: 'Vui lòng dán đường dẫn chia sẻ video Google Drive.' };
  }

  let candidateUrl = raw;
  if (!/^https?:\/\//i.test(candidateUrl)) {
    candidateUrl = 'https://' + candidateUrl;
  }

  let fileId = '';
  try {
    const parsed = new URL(candidateUrl);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('drive.google.com') || host.includes('docs.google.com')) {
      const pathMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
      if (pathMatch && pathMatch[1]) {
        fileId = pathMatch[1];
      } else {
        const paramId = parsed.searchParams.get('id');
        if (paramId && /^[a-zA-Z0-9_-]{15,}$/.test(paramId)) {
          fileId = paramId;
        }
      }
    }
  } catch {
    // Fall through
  }

  if (!fileId) {
    const match = raw.match(/(?:\/file\/d\/|[?&]id=)([a-zA-Z0-9_-]{15,})/);
    if (match && match[1]) {
      fileId = match[1];
    }
  }

  if (fileId) {
    return {
      valid: true,
      provider: 'gdrive',
      id: fileId,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl: raw,
    };
  }

  return {
    valid: false,
    provider: 'gdrive',
    id: '',
    embedUrl: '',
    originalUrl: raw,
    error: 'Không nhận diện được ID tệp Google Drive. Vui lòng dán liên kết dạng drive.google.com/file/d/.../view',
  };
}

export function formatVideoDuration(secs: number | undefined | null): string {
  if (secs === undefined || secs === null || isNaN(secs) || secs <= 0) {
    return 'Theo trình phát gốc';
  }
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0) return 'Phát trực tuyến';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getSourceLabel(sourceType?: VideoSourceType): string {
  switch (sourceType) {
    case 'local':
      return 'Video từ máy tính';
    case 'gdrive':
      return 'Google Drive';
    case 'youtube':
      return 'YouTube';
    default:
      return 'Video mẫu mặc định';
  }
}

export async function checkYouTubeVideoClient(videoId: string): Promise<{
  accessible: boolean;
  warning?: boolean;
  title?: string;
  author?: string;
  message: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`;
    const resp = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      return {
        accessible: true,
        title: data?.title || `Video YouTube (${videoId})`,
        author: data?.author_name || '',
        message: 'Video YouTube hợp lệ (Công khai / Không công khai) và cho phép phát nhúng trực tiếp trong ứng dụng.',
      };
    }

    if (resp.status === 401 || resp.status === 403) {
      return {
        accessible: false,
        message:
          'Video YouTube này đang ở chế độ Riêng tư (Private) hoặc tắt quyền nhúng. Hãy chuyển sang Công khai hoặc Không công khai và bật "Cho phép nhúng".',
      };
    }

    if (resp.status === 404) {
      return {
        accessible: false,
        message: 'Không tìm thấy video YouTube với đường dẫn này. Vui lòng kiểm tra lại.',
      };
    }

    return {
      accessible: true,
      warning: true,
      message: `Đã nhận diện ID YouTube (${videoId}). Nhấn phát ở khung xem trước bên dưới để kiểm tra.`,
    };
  } catch {
    clearTimeout(timer);
    return {
      accessible: true,
      warning: true,
      message: `Đã nhận diện mã video YouTube (${videoId}). Nhấn phát ở khung xem trước bên dưới để xác nhận phát trực tiếp.`,
    };
  }
}

