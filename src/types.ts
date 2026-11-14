export type TransitionEffect = 'fade' | 'slide' | 'zoom' | 'crossfade';
export type MediaType = 'image' | 'video';

export interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  contentSummary: string;
  narration: string;
  searchKeywords: string;
  duration: number; // in seconds
  sourceCitation: string;
  verified: boolean;
  verificationNotes?: string;
  approved: boolean;

  // Media choice: 'image' or 'video'
  mediaType: MediaType;

  // Image properties
  imageUrl: string;
  imageTitle: string;
  imageSource: string;
  imageLicense: string;

  // Video clip properties
  videoUrl?: string;
  videoTitle?: string;
  videoSource?: string;
  videoLicense?: string;
  clipStart?: number; // trim start time (seconds, default 0)
  clipEnd?: number; // trim end time (seconds)
  muteOriginalAudio?: boolean; // default false
  originalAudioVolume?: number; // 0.0 to 1.0 (default 0.5)

  author?: string;
  transition: TransitionEffect;
  audioBlobUrl?: string;
  audioName?: string;
  audioVolume?: number; // 0.0 to 1.0 (default 1.0)
  audioDuration?: number;
  voiceName?: string;
  voiceType?: string;
  speedRate?: number; // 0.9, 1.0, 1.1, 1.2 (default 1.0)
  approvedNarrationText?: string; // Single source of truth for approved narration
  isNarrationSynced?: boolean; // True if audio matches current approved narration

  // Individual Scene Rendered Video properties
  renderedVideoUrl?: string;
  renderedBlob?: Blob;
  renderedDuration?: number;
  renderedSizeBytes?: number;
  renderedPosterUrl?: string;
  renderStatus?: 'idle' | 'rendering' | 'ready' | 'error';
  renderError?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  topic: string;
  targetAudience: string;
  scenes: Scene[];
  totalDuration: number;
  bgMusicUrl?: string;
  bgMusicVolume?: number; // 0.0 to 1.0 (default 0.12, 12%)
  bgMusicEnabled?: boolean;
  bgMusicName?: string;
  createdAt: number;
  updatedAt: number;
}

export type VideoSourceType = 'local' | 'gdrive' | 'youtube' | 'default';

export interface ExportedVideo {
  sourceType?: VideoSourceType;
  url: string;
  originalUrl?: string;
  externalId?: string;
  embedUrl?: string;
  blob?: Blob;
  filename: string;
  duration: number;
  sizeBytes: number;
  timestamp: number;
  isUploaded?: boolean;
  isDefault?: boolean;
  storageNote?: string;
  accessible?: boolean;
  accessMessage?: string;
}

export interface MediaSearchResult {
  id: string;
  type: MediaType;
  title: string;
  thumbUrl: string;
  mediaUrl: string;
  source: string;
  originalPageUrl: string;
  license: string;
  author?: string;
  duration?: number; // in seconds for videos
  description?: string;
}

export interface SceneMediaSuggestion {
  sceneIndex: number;
  sceneTitle: string;
  suggestedKeywords: string;
  suggestedImages: MediaSearchResult[];
  suggestedVideos: MediaSearchResult[];
}

export type AppMode = 'classroom' | 'self_study';
export type AppTab = 'khoi_dong' | 'kham_pha' | 'luyen_tap' | 'van_dung' | 'studio';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  videoTimestampHint?: number;
}

export interface Landmark {
  id: string;
  name: string;
  location: string;
  historicalSignificance: string;
  suggestedPrompt: string;
  imageUrl: string;
  category: 'Lịch sử' | 'Kiến trúc di sản' | 'Văn hóa - Du lịch';
}

export interface GroupWorksheet {
  groupName: string;
  landmarkId: string;
  landmarkName: string;
  members: { name: string; role: string }[];
  keyFacts: string;
  presentationScript: string;
  notes: string;
  completed: boolean;
}
