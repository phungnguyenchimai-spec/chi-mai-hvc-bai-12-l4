import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

const DATA_DIR = path.join(__dirname, 'data');
const ACTIVE_LINK_FILE = path.join(DATA_DIR, 'active-video-link.json');
const SHARED_CONFIG_TS_FILE = path.join(__dirname, 'src', 'config', 'lessonVideoConfig.ts');

function writeSharedLessonConfigTs(config: {
  sourceType: 'youtube' | 'gdrive' | 'default';
  title: string;
  videoId: string;
  originalUrl: string;
  embedUrl: string;
  useInKhoiDong: boolean;
  updatedAt: number;
}) {
  const tsContent = `import { VideoSourceType } from '../types';

export interface SharedLessonVideoConfig {
  sourceType: VideoSourceType;
  title: string;
  videoId: string;
  originalUrl: string;
  embedUrl: string;
  useInKhoiDong: boolean;
  updatedAt: number;
}

/**
 * Nguồn cấu hình video dùng chung cho toàn bộ ứng dụng khi triển khai GitHub -> Vercel.
 * Khi giáo viên lưu video YouTube hoặc Google Drive từ giao diện trong môi trường thiết kế (AI Studio),
 * tệp này sẽ được cập nhật trực tiếp để đồng bộ cho mọi thiết bị (máy tính, điện thoại, ẩn danh) sau khi deploy.
 */
export const SHARED_LESSON_VIDEO_CONFIG: SharedLessonVideoConfig = {
  sourceType: ${JSON.stringify(config.sourceType)},
  title: ${JSON.stringify(config.title)},
  videoId: ${JSON.stringify(config.videoId)},
  originalUrl: ${JSON.stringify(config.originalUrl)},
  embedUrl: ${JSON.stringify(config.embedUrl)},
  useInKhoiDong: ${JSON.stringify(config.useInKhoiDong)},
  updatedAt: ${JSON.stringify(config.updatedAt)},
};
`;
  writeFileSync(SHARED_CONFIG_TS_FILE, tsContent, 'utf-8');
  const verifiedContent = readFileSync(SHARED_CONFIG_TS_FILE, 'utf-8');
  if (
    !verifiedContent.includes(`sourceType: ${JSON.stringify(config.sourceType)}`) ||
    !verifiedContent.includes(`embedUrl: ${JSON.stringify(config.embedUrl)}`) ||
    !verifiedContent.includes(`videoId: ${JSON.stringify(config.videoId)}`)
  ) {
    throw new Error('Không thể xác minh nội dung đã ghi vào src/config/lessonVideoConfig.ts');
  }
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

interface SavedExternalVideoLink {
  sourceType: 'youtube' | 'gdrive';
  originalUrl: string;
  externalId: string;
  embedUrl: string;
  filename: string;
  timestamp: number;
  useInKhoiDong?: boolean;
  accessible?: boolean;
  accessMessage?: string;
}

function readSharedConfigTsFallback(): SavedExternalVideoLink | null {
  try {
    if (!existsSync(SHARED_CONFIG_TS_FILE)) return null;
    const raw = readFileSync(SHARED_CONFIG_TS_FILE, 'utf-8');
    const sourceMatch = raw.match(/sourceType:\s*["'](youtube|gdrive)["']/);
    if (!sourceMatch) return null;

    const titleMatch = raw.match(/title:\s*["']([^"']*)["']/);
    const idMatch = raw.match(/videoId:\s*["']([^"']*)["']/);
    const origMatch = raw.match(/originalUrl:\s*["']([^"']*)["']/);
    const embedMatch = raw.match(/embedUrl:\s*["']([^"']*)["']/);
    const useMatch = raw.match(/useInKhoiDong:\s*(true|false)/);
    const tsMatch = raw.match(/updatedAt:\s*(\d+)/);

    const embedUrl = embedMatch?.[1] || '';
    const externalId = idMatch?.[1] || '';
    if (!embedUrl && !externalId) return null;

    return {
      sourceType: sourceMatch[1] as 'youtube' | 'gdrive',
      originalUrl: origMatch?.[1] || embedUrl,
      externalId,
      embedUrl,
      filename: titleMatch?.[1] || 'Video bài học trực tuyến',
      timestamp: tsMatch ? Number(tsMatch[1]) : Date.now(),
      useInKhoiDong: useMatch ? useMatch[1] !== 'false' : true,
      accessible: true,
    };
  } catch (err) {
    console.warn('Could not read shared config ts fallback:', err);
    return null;
  }
}

function readSavedExternalLink(): SavedExternalVideoLink | null {
  let jsonLink: SavedExternalVideoLink | null = null;
  try {
    if (existsSync(ACTIVE_LINK_FILE)) {
      const raw = readFileSync(ACTIVE_LINK_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.sourceType === 'youtube' || parsed.sourceType === 'gdrive') && parsed.embedUrl) {
        jsonLink = parsed as SavedExternalVideoLink;
      }
    }
  } catch (err) {
    console.warn('Could not read active video link file:', err);
  }

  const tsLink = readSharedConfigTsFallback();
  if (tsLink && (!jsonLink || (tsLink.timestamp || 0) >= (jsonLink.timestamp || 0))) {
    return tsLink;
  }
  return jsonLink;
}

// Endpoint: GET /api/active-lesson-video
// Trả về liên kết video (YouTube / Google Drive) đã lưu để đồng bộ nhiều thiết bị, hoặc video mẫu mặc định
app.get('/api/active-lesson-video', (_req, res) => {
  try {
    const savedLink = readSavedExternalLink();
    if (savedLink) {
      return res.json({
        exists: true,
        isUploaded: true,
        isDefault: false,
        sourceType: savedLink.sourceType,
        url: savedLink.embedUrl,
        embedUrl: savedLink.embedUrl,
        originalUrl: savedLink.originalUrl,
        externalId: savedLink.externalId,
        filename: savedLink.filename,
        duration: 0,
        sizeBytes: 0,
        timestamp: savedLink.timestamp,
        useInKhoiDong: savedLink.useInKhoiDong !== false,
        accessible: savedLink.accessible ?? true,
        accessMessage: savedLink.accessMessage,
      });
    }

    const defaultPath = path.join(__dirname, 'public', 'video', 'default-lesson-hcm.webm');
    if (existsSync(defaultPath)) {
      const stat = statSync(defaultPath);
      return res.json({
        exists: true,
        isDefault: true,
        isUploaded: false,
        sourceType: 'default',
        url: `/video/default-lesson-hcm.webm?t=${stat.mtimeMs}`,
        filename: 'KhamPha_TPHCM_HD720p.webm',
        duration: 18.6,
        sizeBytes: stat.size,
        timestamp: stat.mtimeMs,
      });
    }

    return res.json({ exists: false });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Lỗi đọc thông tin video bài học' });
  }
});

// Endpoint: POST /api/lesson-video-link
// Chỉ lưu đường dẫn và metadata nhỏ gọn của YouTube hoặc Google Drive vào cấu hình dùng chung
app.post('/api/lesson-video-link', (req, res) => {
  try {
    const { sourceType, originalUrl, externalId, embedUrl, filename, timestamp, useInKhoiDong, accessible, accessMessage } = req.body || {};

    if (sourceType !== 'youtube' && sourceType !== 'gdrive') {
      return res.status(400).json({ error: 'Loại nguồn liên kết không hợp lệ.' });
    }
    if (!embedUrl || typeof embedUrl !== 'string' || !externalId || typeof externalId !== 'string') {
      return res.status(400).json({ error: 'Thiếu đường dẫn nhúng hoặc mã video hợp lệ.' });
    }

    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    const nowTs = typeof timestamp === 'number' ? timestamp : Date.now();
    const resolvedTitle = String(
      filename || (sourceType === 'youtube' ? `YouTube (${externalId})` : `Google Drive (${externalId})`)
    );

    const cleanEmbedUrl =
      sourceType === 'youtube'
        ? `https://www.youtube.com/embed/${String(externalId)}`
        : String(embedUrl);

    const payload: SavedExternalVideoLink = {
      sourceType,
      originalUrl: String(originalUrl || cleanEmbedUrl),
      externalId: String(externalId),
      embedUrl: cleanEmbedUrl,
      filename: resolvedTitle,
      timestamp: nowTs,
      useInKhoiDong: useInKhoiDong !== false,
      accessible: accessible !== false,
      accessMessage: accessMessage ? String(accessMessage) : undefined,
    };

    writeFileSync(ACTIVE_LINK_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    writeSharedLessonConfigTs({
      sourceType,
      title: resolvedTitle,
      videoId: payload.externalId,
      originalUrl: payload.originalUrl,
      embedUrl: payload.embedUrl,
      useInKhoiDong: payload.useInKhoiDong !== false,
      updatedAt: nowTs,
    });

    return res.json({ success: true, savedInSharedConfig: true, verifiedOnDisk: true, data: payload });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      savedInSharedConfig: false,
      verifiedOnDisk: false,
      error: err?.message || 'Không thể lưu đường dẫn video vào src/config/lessonVideoConfig.ts',
    });
  }
});

// Endpoint: DELETE /api/lesson-video-link
app.delete('/api/lesson-video-link', (_req, res) => {
  try {
    let deleted = false;
    if (existsSync(ACTIVE_LINK_FILE)) {
      unlinkSync(ACTIVE_LINK_FILE);
      deleted = true;
    }
    writeSharedLessonConfigTs({
      sourceType: 'default',
      title: 'KhamPha_TPHCM_HD720p.webm',
      videoId: '',
      originalUrl: '',
      embedUrl: '/video/default-lesson-hcm.webm',
      useInKhoiDong: true,
      updatedAt: 0,
    });
    // Dọn dẹp nếu còn tệp tải lên cũ từ phiên bản trước
    const legacyCandidates = ['uploaded-lesson-video.mp4', 'uploaded-lesson-video.webm'];
    for (const name of legacyCandidates) {
      const p = path.join(__dirname, 'public', 'video', name);
      if (existsSync(p)) {
        unlinkSync(p);
        deleted = true;
      }
    }
    return res.json({ success: true, deleted });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Không thể xóa liên kết video' });
  }
});

// Endpoint: POST /api/check-video-link
// Kiểm tra khả năng truy cập thực tế của liên kết YouTube hoặc Google Drive (không dùng API Key)
app.post('/api/check-video-link', async (req, res) => {
  try {
    const { provider, id } = req.body || {};
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ accessible: false, message: 'Thiếu mã định danh video.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    if (provider === 'youtube') {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`;
        const resp = await fetch(oembedUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (resp.ok) {
          const data: any = await resp.json();
          return res.json({
            accessible: true,
            title: data?.title || `Video YouTube (${id})`,
            author: data?.author_name || '',
            message: 'Video YouTube hợp lệ (Công khai / Không công khai) và cho phép nhúng phát trực tiếp.',
          });
        }

        if (resp.status === 401 || resp.status === 403) {
          return res.json({
            accessible: false,
            reason: 'restricted',
            message: 'Video YouTube này đang ở chế độ Riêng tư (Private) hoặc đã tắt quyền nhúng trên website khác. Hãy chuyển sang Công khai hoặc Không công khai và bật "Cho phép nhúng".',
          });
        }

        if (resp.status === 404) {
          return res.json({
            accessible: false,
            reason: 'not_found',
            message: 'Không tìm thấy video YouTube với đường dẫn này. Vui lòng kiểm tra lại liên kết.',
          });
        }

        return res.json({
          accessible: true,
          warning: true,
          message: `YouTube phản hồi mã trạng thái ${resp.status}. Đang tải trình phát nhúng để kiểm tra trực tiếp.`,
        });
      } catch {
        clearTimeout(timeout);
        return res.json({
          accessible: true,
          warning: true,
          message: 'Không thể kiểm tra trước từ máy chủ; đang nạp trực tiếp qua trình phát nhúng YouTube.',
        });
      }
    }

    if (provider === 'gdrive') {
      try {
        const viewUrl = `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
        const resp = await fetch(viewUrl, {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);

        const location = resp.headers.get('location') || '';
        if (resp.status >= 300 && resp.status < 400 && location.includes('accounts.google.com')) {
          return res.json({
            accessible: false,
            reason: 'permission_required',
            message: 'Video Google Drive này đang ở chế độ hạn chế (yêu cầu đăng nhập). Vui lòng mở quyền chia sẻ "Bất kỳ ai có đường liên kết" ở vai trò "Người xem".',
          });
        }

        if (resp.status === 401 || resp.status === 403) {
          return res.json({
            accessible: false,
            reason: 'permission_required',
            message: 'Không có quyền truy cập tệp Google Drive này. Hãy cấp quyền "Bất kỳ ai có đường liên kết" -> "Người xem".',
          });
        }

        if (resp.status === 404) {
          return res.json({
            accessible: false,
            reason: 'not_found',
            message: 'Không tìm thấy tệp video trên Google Drive. Vui lòng kiểm tra lại đường dẫn chia sẻ.',
          });
        }

        const html = await resp.text();
        const isRestrictedHtml =
          html.includes('accounts.google.com/ServiceLogin') ||
          html.includes('You need access') ||
          html.includes('Request access') ||
          html.includes('Bạn cần có quyền truy cập');

        if (isRestrictedHtml) {
          return res.json({
            accessible: false,
            reason: 'permission_required',
            message: 'Video Google Drive chưa được cấp quyền xem công khai. Hãy chọn Chia sẻ -> Bất kỳ ai có đường liên kết -> Người xem.',
          });
        }

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let extractedTitle = titleMatch ? titleMatch[1].replace(/\s*-\s*Google Drive\s*$/i, '').trim() : '';
        if (extractedTitle.toLowerCase().includes('google drive') || extractedTitle.toLowerCase().includes('sign in')) {
          extractedTitle = '';
        }

        return res.json({
          accessible: true,
          title: extractedTitle || `Video Google Drive (${id.slice(0, 8)}...)`,
          message: 'Tệp Google Drive có thể truy cập và sẵn sàng phát trong trình phát nhúng.',
        });
      } catch {
        clearTimeout(timeout);
        return res.json({
          accessible: true,
          warning: true,
          message: 'Đã nhận diện mã tệp Google Drive. Nếu khung phát bên dưới báo cần quyền truy cập, Thầy/Cô hãy chuyển quyền chia sẻ sang "Bất kỳ ai có đường liên kết".',
        });
      }
    }

    clearTimeout(timeout);
    return res.status(400).json({ accessible: false, message: 'Nguồn video không được hỗ trợ kiểm tra.' });
  } catch (err: any) {
    return res.status(500).json({ accessible: false, message: err?.message || 'Lỗi kiểm tra liên kết' });
  }
});

// App Status API
app.get('/api/status', (_req, res) => {
  res.json({
    appName: 'Bài 12A: Thực hành đa phương tiện',
    targetGrade: 'Lớp 4',
    environment: process.env.NODE_ENV || 'development',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
