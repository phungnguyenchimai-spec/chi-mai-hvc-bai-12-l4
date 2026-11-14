import { VideoSourceType } from '../types';

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
  sourceType: "default",
  title: "KhamPha_TPHCM_HD720p.webm",
  videoId: "",
  originalUrl: "",
  embedUrl: "/video/default-lesson-hcm.webm",
  useInKhoiDong: true,
  updatedAt: 0,
};
