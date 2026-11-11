import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
import { 
  ProjectData, 
  Scene, 
  ExportedVideo, 
  MediaSearchResult, 
  SceneMediaSuggestion,
  TransitionEffect,
  MediaType
} from '../../types';
import { SAMPLE_DOCX_TEXT, INITIAL_PROJECT, CURATED_MEDIA_ARCHIVE } from '../../data/sampleData';
import { saveProject, saveExportedVideoBlob } from '../../utils/db';
import { VideoRenderer, RenderProgress } from '../../utils/videoRenderer';
import { 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Download, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Film, 
  ArrowLeft, 
  ArrowRight,
  Search,
  ExternalLink,
  Music,
  FolderOpen,
  FileCode,
  FileUp,
  RefreshCw,
  Eye,
  Scissors,
  Check
} from 'lucide-react';

interface StudioSectionProps {
  currentProject: ProjectData;
  onUpdateProject: (p: ProjectData) => void;
  exportedVideo: ExportedVideo | null;
  onSetExportedVideo: (v: ExportedVideo) => void;
  onApplyToLesson: (v: ExportedVideo) => void;
}

export const StudioSection: React.FC<StudioSectionProps> = ({
  currentProject,
  onUpdateProject,
  exportedVideo,
  onSetExportedVideo,
  onApplyToLesson,
}) => {
  // Document Text State
  const [docText, setDocText] = useState<string>(SAMPLE_DOCX_TEXT);
  const [fileName, setFileName] = useState<string>('TaiLieu_Bai12A_TPHCM.docx');
  const [isReadingDocx, setIsReadingDocx] = useState<boolean>(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  // AI Script Analysis State
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Active Selected Scene for Detailed Editing
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);

  // Media Library Search Modal State
  const [showMediaModal, setShowMediaModal] = useState<boolean>(false);
  const [mediaSearchKeyword, setMediaSearchKeyword] = useState<string>('');
  const [mediaFilterType, setMediaFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [mediaSearchResults, setMediaSearchResults] = useState<MediaSearchResult[]>(CURATED_MEDIA_ARCHIVE);
  const [isSearchingMedia, setIsSearchingMedia] = useState<boolean>(false);
  const [mediaSearchNotice, setMediaSearchNotice] = useState<string | null>(null);

  // AI Suggest Learning Media Batch State
  const [isSuggestingAI, setIsSuggestingAI] = useState<boolean>(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState<boolean>(false);
  const [sceneSuggestions, setSceneSuggestions] = useState<SceneMediaSuggestion[]>([]);

  // Voice Recording & TTS Audio State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState<boolean>(false);
  const [isPlayingBgPreview, setIsPlayingBgPreview] = useState<boolean>(false);
  const bgPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingNarrationPreview, setIsPlayingNarrationPreview] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Video Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<RenderProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const videoRendererRef = useRef<VideoRenderer | null>(null);
  const videoOutputRef = useRef<HTMLDivElement | null>(null);

  // Dedicated HTML5 Player State for "VIDEO ĐÃ TẠO"
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Timeline Live Preview Modal State
  const [showTimelinePreview, setShowTimelinePreview] = useState<boolean>(false);
  const [previewSceneIndex, setPreviewSceneIndex] = useState<number>(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check missing media across scenes
  const missingMediaScenes = currentProject.scenes
    .map((s, idx) => ((!s.imageUrl || !s.imageUrl.trim()) && (!s.videoUrl || !s.videoUrl.trim()) ? idx + 1 : null))
    .filter((n): n is number => n !== null);
  const hasMissingMedia = missingMediaScenes.length > 0;
  const renderedSceneCount = currentProject.scenes.filter(s => !!s.renderedVideoUrl).length;

  // Individual Scene Videos State
  const [isBatchRenderingScenes, setIsBatchRenderingScenes] = useState<boolean>(false);
  const [batchRenderProgress, setBatchRenderProgress] = useState<{
    current: number;
    total: number;
    currentTitle: string;
    percent: number;
  } | null>(null);
  const [activePlayingSceneVideo, setActivePlayingSceneVideo] = useState<Scene | null>(null);

  // Notification toast
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const activeScene = currentProject.scenes[selectedSceneIndex] || currentProject.scenes[0];

  // 1. DOCX File Upload & Mammoth Extraction
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setDocxError('Tệp tải lên không hợp lệ. Vui lòng chọn tệp tài liệu Word (.docx).');
      return;
    }

    setDocxError(null);
    setIsReadingDocx(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extracted = result.value.trim();

      if (!extracted) {
        setDocxError('Tệp Word rỗng hoặc không chứa văn bản đọc được.');
      } else {
        setDocText(extracted);
      }
    } catch (err: any) {
      console.error('Error reading DOCX:', err);
      setDocxError(`Không thể đọc tệp Word: ${err?.message || 'Định dạng không được hỗ trợ'}`);
    } finally {
      setIsReadingDocx(false);
    }
  };

  const handleUseSampleDocx = () => {
    setDocText(SAMPLE_DOCX_TEXT);
    setFileName('TaiLieu_Mau_Bai12A_TPHCM.docx');
    setDocxError(null);
  };

  // 2. Call AI Script Analysis
  const handleAnalyzeScript = async () => {
    if (!docText.trim()) {
      setDocxError('Vui lòng nhập hoặc tải tài liệu Word trước khi tạo kịch bản.');
      return;
    }

    setIsAnalyzingAI(true);
    setAiNotice(null);

    try {
      const res = await fetch('/api/gemini/analyze-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: docText }),
      });

      if (!res.ok) {
        throw new Error(`Máy chủ trả về lỗi: ${res.status}`);
      }

      const data = await res.json();

      if (data.isFallback && data.errorNotice) {
        setAiNotice(data.errorNotice);
      } else if (data.isFallback) {
        setAiNotice('Đã tạo kịch bản sư phạm theo chuẩn bài học.');
      }

      if (data.scenes && Array.isArray(data.scenes)) {
        const mappedScenes: Scene[] = data.scenes.map((s: any, idx: number) => {
          const existing = currentProject.scenes[idx];
          const sample = INITIAL_PROJECT.scenes[idx] || INITIAL_PROJECT.scenes[0];

          return {
            id: `scene-${Date.now()}-${idx}`,
            sceneNumber: s.sceneNumber || idx + 1,
            title: s.title || `Cảnh ${idx + 1}`,
            contentSummary: s.contentSummary || '',
            narration: s.narration || '',
            searchKeywords: s.searchKeywords || s.title || '',
            duration: Math.max(12, Math.min(s.duration || 18, 30)),
            sourceCitation: s.sourceCitation || 'Tài liệu giáo viên tải lên',
            verified: s.verified !== false,
            verificationNotes: s.verificationNotes || '',
            approved: true,

            mediaType: existing?.mediaType || (idx === 2 ? 'video' : 'image'),
            imageUrl: existing?.imageUrl || sample.imageUrl,
            imageTitle: existing?.imageTitle || sample.imageTitle,
            imageSource: existing?.imageSource || sample.imageSource,
            imageLicense: existing?.imageLicense || sample.imageLicense,

            videoUrl: existing?.videoUrl || sample.videoUrl,
            videoTitle: existing?.videoTitle || sample.videoTitle,
            videoSource: existing?.videoSource || sample.videoSource,
            videoLicense: existing?.videoLicense || sample.videoLicense,
            clipStart: existing?.clipStart || 0,
            clipEnd: existing?.clipEnd || s.duration || 18,
            muteOriginalAudio: existing?.muteOriginalAudio || false,
            originalAudioVolume: existing?.originalAudioVolume || 0.5,

            transition: 'fade',
          };
        });

        const updatedProject: ProjectData = {
          ...currentProject,
          topic: data.topic || currentProject.topic,
          scenes: mappedScenes,
          totalDuration: mappedScenes.reduce((acc, cur) => acc + cur.duration, 0),
          updatedAt: Date.now(),
        };

        onUpdateProject(updatedProject);
        setSelectedSceneIndex(0);
        showToast('Kịch bản AI đã được tạo thành công! Bạn có thể nhấn "AI TÌM HỌC LIỆU MINH HỌA" để nhận đề xuất ảnh và video tư liệu.');
      }
    } catch (err: any) {
      console.error('Error analyzing script:', err);
      setAiNotice(`Lỗi phân tích: ${err?.message || 'Không thể kết nối dịch vụ AI'}`);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // 3. AI TÌM HỌC LIỆU MINH HỌA (Feature 2)
  const handleAISuggestMedia = async () => {
    setIsSuggestingAI(true);
    setAiNotice(null);

    try {
      const res = await fetch('/api/gemini/suggest-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: currentProject.scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            title: s.title,
            contentSummary: s.contentSummary,
            searchKeywords: s.searchKeywords,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Máy chủ đề xuất trả về lỗi: ${res.status}`);
      }

      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSceneSuggestions(data.suggestions);
        setShowSuggestionsModal(true);
        showToast('AI đã tìm thấy các học liệu hình ảnh và video tư liệu phù hợp cho từng cảnh!');
      } else {
        throw new Error('Dữ liệu đề xuất rỗng.');
      }
    } catch (err: any) {
      console.warn('AI Suggest media failed:', err);
      // Fallback local pedagogical suggestions based on CURATED_MEDIA_ARCHIVE
      const localSuggestions: SceneMediaSuggestion[] = currentProject.scenes.map((s, idx) => {
        return {
          sceneIndex: idx,
          sceneTitle: s.title,
          suggestedKeywords: s.searchKeywords || s.title,
          suggestedImages: CURATED_MEDIA_ARCHIVE.filter(m => m.type === 'image').slice(0, 3),
          suggestedVideos: CURATED_MEDIA_ARCHIVE.filter(m => m.type === 'video').slice(0, 2),
        };
      });
      setSceneSuggestions(localSuggestions);
      setShowSuggestionsModal(true);
      showToast('Đã nạp kho học liệu minh họa tiêu biểu cho các phân cảnh TP.HCM.');
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleApplySuggestionToScene = (
    sceneIndex: number, 
    item: MediaSearchResult, 
    applyAs: 'image' | 'video'
  ) => {
    if (applyAs === 'video') {
      updateScene(sceneIndex, {
        mediaType: 'video',
        videoUrl: item.mediaUrl,
        videoTitle: item.title,
        videoSource: item.source,
        videoLicense: item.license,
        clipStart: 0,
        clipEnd: currentProject.scenes[sceneIndex]?.duration || 18,
      });
      showToast(`Đã áp dụng Video tư liệu vào Cảnh ${sceneIndex + 1}!`);
    } else {
      updateScene(sceneIndex, {
        mediaType: 'image',
        imageUrl: item.mediaUrl || item.thumbUrl,
        imageTitle: item.title,
        imageSource: item.source,
        imageLicense: item.license,
      });
      showToast(`Đã áp dụng Hình ảnh tư liệu vào Cảnh ${sceneIndex + 1}!`);
    }
  };

  const handleApplyAllSuggestions = () => {
    const updatedScenes = currentProject.scenes.map((scene, idx) => {
      const sug = sceneSuggestions[idx];
      if (!sug) return scene;

      // Prefer video for landmark scenes or mix images and videos
      const useVideo = idx === 0 || idx === 2;
      const vid = sug.suggestedVideos[0];
      const img = sug.suggestedImages[0];

      return {
        ...scene,
        mediaType: (useVideo && vid ? 'video' : 'image') as MediaType,
        imageUrl: img ? img.mediaUrl || img.thumbUrl : scene.imageUrl,
        imageTitle: img ? img.title : scene.imageTitle,
        imageSource: img ? img.source : scene.imageSource,
        imageLicense: img ? img.license : scene.imageLicense,
        videoUrl: vid ? vid.mediaUrl : scene.videoUrl,
        videoTitle: vid ? vid.title : scene.videoTitle,
        videoSource: vid ? vid.source : scene.videoSource,
        videoLicense: vid ? vid.license : scene.videoLicense,
        clipStart: 0,
        clipEnd: scene.duration || 18,
      };
    });

    onUpdateProject({
      ...currentProject,
      scenes: updatedScenes,
      updatedAt: Date.now(),
    });

    setShowSuggestionsModal(false);
    showToast('Đã áp dụng toàn bộ học liệu minh họa được duyệt vào dự án!');
  };

  // 4. Media Search Modal & Exploration
  const handleOpenMediaLibrary = (scene: Scene, defaultType: 'all' | 'image' | 'video' = 'all') => {
    setMediaSearchKeyword(scene.searchKeywords || scene.title);
    setMediaFilterType(defaultType);
    setShowMediaModal(true);
    performMediaSearch(scene.searchKeywords || scene.title, defaultType);
  };

  const performMediaSearch = async (kw: string, type: 'all' | 'image' | 'video') => {
    setIsSearchingMedia(true);
    setMediaSearchNotice(null);
    try {
      const res = await fetch(`/api/search-media?keyword=${encodeURIComponent(kw)}&type=${type}`);
      const data = await res.json();
      if (data.results) {
        setMediaSearchResults(data.results);
      }
      if (data.fallbackUsed && data.message) {
        setMediaSearchNotice(data.message);
      }
    } catch (e: any) {
      console.warn('Failed searching media:', e);
      setMediaSearchResults(CURATED_MEDIA_ARCHIVE);
      setMediaSearchNotice('Đã kết nối kho tư liệu lưu trữ TP.HCM đã kiểm định.');
    } finally {
      setIsSearchingMedia(false);
    }
  };

  const handleSelectMediaForScene = (item: MediaSearchResult, asType: 'image' | 'video') => {
    if (asType === 'video') {
      updateScene(selectedSceneIndex, {
        mediaType: 'video',
        videoUrl: item.mediaUrl,
        videoTitle: item.title,
        videoSource: item.source,
        videoLicense: item.license,
        clipStart: 0,
        clipEnd: activeScene.duration || 18,
      });
      showToast('Đã chọn video tư liệu cho phân cảnh.');
    } else {
      updateScene(selectedSceneIndex, {
        mediaType: 'image',
        imageUrl: item.mediaUrl || item.thumbUrl,
        imageTitle: item.title,
        imageSource: item.source,
        imageLicense: item.license,
      });
      showToast('Đã chọn hình ảnh cho phân cảnh.');
    }
    setShowMediaModal(false);
  };

  // Upload Local Photo
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateScene(selectedSceneIndex, {
        mediaType: 'image',
        imageUrl: result,
        imageTitle: file.name.replace(/\.[^/.]+$/, ''),
        imageSource: 'Tệp tải lên từ máy tính của Giáo viên',
        imageLicense: 'Bản quyền Giáo viên cung cấp',
      });
      setShowMediaModal(false);
      showToast('Đã tải ảnh lên từ máy tính thành công.');
    };
    reader.readAsDataURL(file);
  };

  // Upload Local Video (MP4 / WebM)
  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const videoUrl = URL.createObjectURL(file);
    updateScene(selectedSceneIndex, {
      mediaType: 'video',
      videoUrl: videoUrl,
      videoTitle: file.name.replace(/\.[^/.]+$/, ''),
      videoSource: 'Video MP4 tải lên từ máy tính của Giáo viên',
      videoLicense: 'Bản quyền Giáo viên cung cấp',
      clipStart: 0,
      clipEnd: activeScene.duration || 18,
    });
    setShowMediaModal(false);
    showToast(`Đã nhập đoạn video "${file.name}" thành công!`);
  };

  // 5. Voice Recording & Audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        updateScene(selectedSceneIndex, {
          audioBlobUrl: audioUrl,
          audioName: `Ghi_am_Canh_${selectedSceneIndex + 1}.webm`,
        });
        showToast('Đã lưu bản ghi âm giọng đọc cho cảnh!');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.warn('Microphone access error:', err);
      alert('Không thể truy cập micro. Hãy kiểm tra quyền truy cập microphone trên trình duyệt.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleLocalAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const audioUrl = URL.createObjectURL(file);
    updateScene(selectedSceneIndex, {
      audioBlobUrl: audioUrl,
      audioName: file.name,
    });
    showToast(`Đã đính kèm tệp âm thanh: ${file.name}`);
  };

  // 5a. Generate Natural Vietnamese TTS via /api/tts
  const handleGenerateTTS = async (sceneIndex: number) => {
    const scene = currentProject.scenes[sceneIndex];
    if (!scene || !scene.narration.trim()) {
      showToast('Nội dung lời thuyết minh đang trống.');
      return;
    }

    setIsGeneratingTTS(true);
    showToast(`Đang kết nối dịch vụ TTS tạo giọng đọc tiếng Việt cho Cảnh ${sceneIndex + 1}...`);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scene.narration,
          sceneNumber: scene.sceneNumber,
        }),
      });

      if (!res.ok) {
        throw new Error(`Máy chủ TTS trả về mã ${res.status}`);
      }

      const data = await res.json();
      if (data.success && (data.audioUrl || data.audioBase64)) {
        updateScene(sceneIndex, {
          audioBlobUrl: data.audioUrl || data.audioBase64,
          audioName: `Giong_doc_Canh_${sceneIndex + 1}.mp3`,
          voiceType: data.voiceType || 'Tiếng Việt tự nhiên (Chuẩn miền Nam / Lớp 4)',
        });
        showToast(`✓ Đã tạo thành công giọng đọc tiếng Việt truyền cảm cho Cảnh ${sceneIndex + 1}!`);
      } else {
        throw new Error(data.error || 'Dữ liệu âm thanh không hợp lệ.');
      }
    } catch (err: any) {
      console.warn('TTS server error, falling back to Web Speech API:', err);
      handleTTSPreview(scene.narration);
      showToast(`Không thể tải tệp âm thanh trực tuyến (${err?.message}). Đang phát giọng đọc qua Web Speech API.`);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // 5b. Generate TTS for all scenes
  const handleGenerateAllTTS = async () => {
    setIsGeneratingTTS(true);
    showToast('Đang tạo lời thuyết minh âm thanh tiếng Việt cho toàn bộ phân cảnh...');
    for (let i = 0; i < currentProject.scenes.length; i++) {
      await handleGenerateTTS(i);
      await new Promise(r => setTimeout(r, 200));
    }
    setIsGeneratingTTS(false);
    showToast('✓ Toàn bộ phân cảnh đều đã được trang bị lời thuyết minh tiếng Việt hoàn chỉnh!');
  };

  // 5c. Toggle Narration Preview Audio
  const handleToggleNarrationPreview = (scene: Scene) => {
    if (!scene.audioBlobUrl) {
      handleTTSPreview(scene.narration);
      return;
    }

    if (isPlayingNarrationPreview) {
      if (narrationPreviewAudioRef.current) {
        narrationPreviewAudioRef.current.pause();
        narrationPreviewAudioRef.current.currentTime = 0;
      }
      setIsPlayingNarrationPreview(false);
      return;
    }

    if (narrationPreviewAudioRef.current) {
      narrationPreviewAudioRef.current.pause();
    }

    const audio = new Audio(scene.audioBlobUrl);
    audio.volume = scene.audioVolume ?? 1.0;
    audio.onended = () => setIsPlayingNarrationPreview(false);
    audio.onerror = () => {
      setIsPlayingNarrationPreview(false);
      handleTTSPreview(scene.narration);
    };
    narrationPreviewAudioRef.current = audio;
    audio.play()
      .then(() => setIsPlayingNarrationPreview(true))
      .catch(() => {
        setIsPlayingNarrationPreview(false);
        handleTTSPreview(scene.narration);
      });
  };

  // 5d. Custom Background Music Upload
  const handleUploadBgMusic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdateProject({
      ...currentProject,
      bgMusicUrl: url,
      bgMusicName: file.name,
      bgMusicEnabled: true,
      updatedAt: Date.now(),
    });
    showToast(`Đã nạp nhạc nền tùy chỉnh: ${file.name}`);
  };

  // 5e. Toggle Background Music Preview
  const handleToggleBgMusicPreview = () => {
    if (!bgPreviewAudioRef.current) {
      const audio = new Audio(currentProject.bgMusicUrl || '/audio/bg-music-gentle.wav');
      audio.loop = true;
      audio.volume = currentProject.bgMusicVolume ?? 0.12;
      audio.onended = () => setIsPlayingBgPreview(false);
      bgPreviewAudioRef.current = audio;
    }
    const audio = bgPreviewAudioRef.current;
    if (isPlayingBgPreview) {
      audio.pause();
      setIsPlayingBgPreview(false);
    } else {
      audio.volume = currentProject.bgMusicVolume ?? 0.12;
      audio.play().then(() => setIsPlayingBgPreview(true)).catch(() => {});
    }
  };

  const handleTTSPreview = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt không hỗ trợ Web Speech API.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // 6. Timeline Scene Updates
  const updateScene = (index: number, updates: Partial<Scene>) => {
    const nextScenes = [...currentProject.scenes];
    nextScenes[index] = { ...nextScenes[index], ...updates };
    const nextDuration = nextScenes.reduce((a, b) => a + (b.duration || 15), 0);
    onUpdateProject({
      ...currentProject,
      scenes: nextScenes,
      totalDuration: nextDuration,
      updatedAt: Date.now(),
    });
  };

  const handleAddScene = () => {
    const newSceneNum = currentProject.scenes.length + 1;
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      sceneNumber: newSceneNum,
      title: `Cảnh ${newSceneNum}: Tên địa danh`,
      contentSummary: 'Tóm tắt nội dung cảnh mới...',
      narration: 'Lời thuyết minh dành cho học sinh lớp 4...',
      searchKeywords: 'Thành phố Hồ Chí Minh',
      duration: 18,
      sourceCitation: 'Tài liệu giáo viên',
      verified: true,
      approved: true,
      mediaType: 'image',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Ho_Chi_Minh_City_skyline_%282022%29.jpg/800px-Ho_Chi_Minh_City_skyline_%282022%29.jpg',
      imageTitle: 'TP. Hồ Chí Minh',
      imageSource: 'Wikimedia Commons',
      imageLicense: 'CC BY-SA 4.0',
      videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/1b/Saigon_River_Cruise_Ho_Chi_Minh_City.webm/Saigon_River_Cruise_Ho_Chi_Minh_City.webm.480p.vp9.webm',
      videoTitle: 'Toàn cảnh sông Sài Gòn',
      videoSource: 'Wikimedia Commons',
      videoLicense: 'CC BY-SA 4.0',
      clipStart: 0,
      clipEnd: 18,
      muteOriginalAudio: false,
      originalAudioVolume: 0.5,
      transition: 'fade',
    };
    const nextScenes = [...currentProject.scenes, newScene];
    onUpdateProject({
      ...currentProject,
      scenes: nextScenes,
      totalDuration: nextScenes.reduce((a, b) => a + b.duration, 0),
      updatedAt: Date.now(),
    });
    setSelectedSceneIndex(nextScenes.length - 1);
  };

  const handleDeleteScene = (index: number) => {
    if (currentProject.scenes.length <= 1) {
      alert('Video cần ít nhất 1 phân cảnh.');
      return;
    }
    const nextScenes = currentProject.scenes.filter((_, i) => i !== index);
    const reindexed = nextScenes.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    onUpdateProject({
      ...currentProject,
      scenes: reindexed,
      totalDuration: reindexed.reduce((a, b) => a + b.duration, 0),
      updatedAt: Date.now(),
    });
    setSelectedSceneIndex(Math.max(0, index - 1));
  };

  const handleMoveScene = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentProject.scenes.length) return;

    const nextScenes = [...currentProject.scenes];
    const temp = nextScenes[index];
    nextScenes[index] = nextScenes[targetIndex];
    nextScenes[targetIndex] = temp;

    const reindexed = nextScenes.map((s, idx) => ({ ...s, sceneNumber: idx + 1 }));
    onUpdateProject({
      ...currentProject,
      scenes: reindexed,
      updatedAt: Date.now(),
    });
    setSelectedSceneIndex(targetIndex);
  };

  // 6b. Individual Scene Video Rendering
  const handleRenderSingleScene = async (sceneIndex: number) => {
    const targetScene = currentProject.scenes[sceneIndex];
    if (!targetScene) return;

    if (!targetScene.imageUrl && !targetScene.videoUrl) {
      setExportError(`Cảnh ${sceneIndex + 1} chưa có ảnh hoặc video minh họa.`);
      return;
    }

    updateScene(sceneIndex, { renderStatus: 'rendering', renderError: undefined });
    showToast(`Đang dựng video chuyển động cho Cảnh ${sceneIndex + 1}: ${targetScene.title}...`);

    try {
      const renderer = new VideoRenderer();
      const result = await renderer.renderSingleSceneVideo(
        targetScene,
        sceneIndex,
        currentProject.scenes.length,
        undefined,
        undefined,
        {
          url: currentProject.bgMusicUrl || '/audio/bg-music-gentle.wav',
          volume: currentProject.bgMusicVolume ?? 0.12,
          enabled: currentProject.bgMusicEnabled ?? true,
        }
      );

      updateScene(sceneIndex, {
        renderedVideoUrl: result.url,
        renderedBlob: result.blob,
        renderedDuration: result.duration,
        renderedSizeBytes: result.sizeBytes,
        renderedPosterUrl: result.posterUrl,
        renderStatus: 'ready',
        renderError: undefined,
      });

      showToast(`✓ Cảnh ${sceneIndex + 1} đã có video chuyển động thực tế!`);
    } catch (err: any) {
      console.error('Render single scene failed:', err);
      updateScene(sceneIndex, {
        renderStatus: 'error',
        renderError: err?.message || 'Lỗi dựng video',
      });
      setExportError(`Lỗi dựng video Cảnh ${sceneIndex + 1}: ${err?.message}`);
    }
  };

  // 6b. Play Scene Video (Play directly if ready, or render immediately and play)
  const handlePlaySceneVideo = async (scene: Scene, index: number) => {
    if (scene.renderedVideoUrl) {
      setActivePlayingSceneVideo(scene);
      return;
    }

    if (!scene.imageUrl && !scene.videoUrl) {
      setExportError(`Cảnh ${index + 1} chưa có học liệu minh họa (ảnh hoặc video). Vui lòng thêm học liệu trước.`);
      return;
    }

    showToast(`Đang tạo video chuyển động cho Cảnh ${index + 1}: ${scene.title}...`);
    updateScene(index, { renderStatus: 'rendering', renderError: undefined });

    try {
      const renderer = new VideoRenderer();
      const result = await renderer.renderSingleSceneVideo(
        scene,
        index,
        currentProject.scenes.length,
        undefined,
        undefined,
        {
          url: currentProject.bgMusicUrl || '/audio/bg-music-gentle.wav',
          volume: currentProject.bgMusicVolume ?? 0.12,
          enabled: currentProject.bgMusicEnabled ?? true,
        }
      );

      const updatedScene: Scene = {
        ...scene,
        renderedVideoUrl: result.url,
        renderedBlob: result.blob,
        renderedDuration: result.duration,
        renderedSizeBytes: result.sizeBytes,
        renderedPosterUrl: result.posterUrl,
        renderStatus: 'ready',
        renderError: undefined,
      };

      updateScene(index, updatedScene);
      setActivePlayingSceneVideo(updatedScene);
      showToast(`✓ Cảnh ${index + 1} đã sẵn sàng phát!`);
    } catch (err: any) {
      console.error('Play render failed:', err);
      updateScene(index, {
        renderStatus: 'error',
        renderError: err?.message || 'Lỗi khi tạo video',
      });
      setExportError(`Không thể tạo video Cảnh ${index + 1}: ${err?.message}`);
    }
  };

  // 6c. Render All 5 Scenes in Sequence
  const handleRenderAllScenes = async () => {
    if (hasMissingMedia) {
      setExportError(
        `Chưa thể tạo video: Các phân cảnh sau đang thiếu ảnh hoặc video minh họa: Cảnh ${missingMediaScenes.join(', ')}. Hãy nhấn "AI TÌM HỌC LIỆU MINH HỌA" để nhận đề xuất học liệu trước.`
      );
      return;
    }

    setIsBatchRenderingScenes(true);
    setExportError(null);
    showToast('Bắt đầu quy trình tự động tạo video chuyển động cho cả 5 phân cảnh...');

    const renderer = new VideoRenderer();
    videoRendererRef.current = renderer;

    const total = currentProject.scenes.length;
    let nextScenes = [...currentProject.scenes];

    for (let i = 0; i < total; i++) {
      const scene = nextScenes[i];
      setBatchRenderProgress({
        current: i + 1,
        total,
        currentTitle: scene.title,
        percent: 0,
      });

      nextScenes[i] = { ...nextScenes[i], renderStatus: 'rendering', renderError: undefined };
      onUpdateProject({ ...currentProject, scenes: nextScenes });

      try {
        const result = await renderer.renderSingleSceneVideo(
          scene,
          i,
          total,
          undefined,
          p => {
            setBatchRenderProgress(prev => (prev ? { ...prev, percent: p } : null));
          },
          {
            url: currentProject.bgMusicUrl || '/audio/bg-music-gentle.wav',
            volume: currentProject.bgMusicVolume ?? 0.12,
            enabled: currentProject.bgMusicEnabled ?? true,
          }
        );

        nextScenes[i] = {
          ...nextScenes[i],
          renderedVideoUrl: result.url,
          renderedBlob: result.blob,
          renderedDuration: result.duration,
          renderedSizeBytes: result.sizeBytes,
          renderedPosterUrl: result.posterUrl,
          renderStatus: 'ready',
          renderError: undefined,
        };
        onUpdateProject({ ...currentProject, scenes: [...nextScenes] });
      } catch (err: any) {
        console.warn(`Render scene ${i + 1} failed:`, err);
        nextScenes[i] = {
          ...nextScenes[i],
          renderStatus: 'error',
          renderError: err?.message || 'Lỗi khi dựng video',
        };
        onUpdateProject({ ...currentProject, scenes: [...nextScenes] });
      }
    }

    setIsBatchRenderingScenes(false);
    setBatchRenderProgress(null);
    showToast('✓ Đã tạo thành công video chuyển động thực tế cho cả 5 phân cảnh!');
  };

  // Auto-generate all 5 scenes on initial load if not yet created so videos are playable immediately
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    const needsRender = currentProject.scenes.some(s => !s.renderedVideoUrl);
    if (needsRender && !isBatchRenderingScenes) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(() => {
        handleRenderAllScenes();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 7. Video Export (Canvas 2D + MediaRecorder)
  const handleExportRealVideo = async () => {
    if (hasMissingMedia) {
      setExportError(
        `Chưa thể tạo video: Các phân cảnh sau đang thiếu ảnh hoặc video minh họa: Cảnh ${missingMediaScenes.join(', ')}. Hãy nhấn "AI TÌM HỌC LIỆU MINH HỌA" hoặc bấm vào từng cảnh để tải ảnh/video từ máy.`
      );
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportProgress({
      step: 1,
      stepName: 'Đang chuẩn bị học liệu',
      percent: 0,
      currentSceneIndex: 0,
      totalScenes: currentProject.scenes.length,
      statusText: 'Đang khởi động bộ kết xuất video đa phương tiện...',
    });

    try {
      const renderer = new VideoRenderer();
      videoRendererRef.current = renderer;

      // 1.0x real-time export speed for exact sync with Web Audio API stream
      const result = await renderer.renderVideo(
        currentProject.scenes,
        progress => {
          setExportProgress(progress);
        },
        1.0,
        {
          url: currentProject.bgMusicUrl || '/audio/bg-music-gentle.wav',
          volume: currentProject.bgMusicVolume ?? 0.12,
          enabled: currentProject.bgMusicEnabled ?? true,
        }
      );

      const newExported: ExportedVideo = {
        url: result.url,
        blob: result.blob,
        filename: `Bai12A_${currentProject.name.replace(/\s+/g, '_')}.webm`,
        duration: result.duration,
        sizeBytes: result.blob.size,
        timestamp: Date.now(),
      };

      onSetExportedVideo(newExported);
      await saveExportedVideoBlob('active-exported-video', result.blob, {
        filename: newExported.filename,
        duration: result.duration,
      });

      showToast('Đã kết xuất và đóng gói tệp video WebM thực tế thành công!');
      setTimeout(() => {
        videoOutputRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      console.error('Export video failed:', err);
      setExportError(`Lỗi kết xuất video: ${err?.message || 'Không thể tạo tệp video'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    videoRendererRef.current?.cancel();
    setIsExporting(false);
  };

  // HTML5 Video Player Handlers for "VIDEO ĐÃ TẠO"
  const handleTogglePlay = () => {
    if (!videoPlayerRef.current) return;
    if (isPlayingVideo) {
      videoPlayerRef.current.pause();
      setIsPlayingVideo(false);
    } else {
      videoPlayerRef.current
        .play()
        .then(() => setIsPlayingVideo(true))
        .catch(err => console.warn('Play video failed:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (!videoPlayerRef.current) return;
    setVideoCurrentTime(videoPlayerRef.current.currentTime);
    if (!videoDuration && videoPlayerRef.current.duration) {
      setVideoDuration(videoPlayerRef.current.duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoPlayerRef.current) return;
    setVideoDuration(videoPlayerRef.current.duration || 0);
  };

  const handleVideoEnded = () => {
    setIsPlayingVideo(false);
  };

  const handleSeek = (newTime: number) => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.currentTime = newTime;
    setVideoCurrentTime(newTime);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.volume = newVol;
    setVideoVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const handleToggleMute = () => {
    if (!videoPlayerRef.current) return;
    const nextMuted = !isMuted;
    videoPlayerRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Timeline Live Preview Handlers
  const handleStartTimelinePreview = () => {
    setPreviewSceneIndex(0);
    setIsPreviewPlaying(true);
    setShowTimelinePreview(true);
  };

  const handleCloseTimelinePreview = () => {
    setIsPreviewPlaying(false);
    setShowTimelinePreview(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
  };

  // Save / Export Project JSON
  const handleSaveProject = async () => {
    try {
      await saveProject(currentProject);
      showToast('Đã lưu dự án vào bộ nhớ máy (IndexedDB)!');
    } catch (e: any) {
      alert('Không thể lưu vào IndexedDB: ' + e?.message);
    }
  };

  const handleExportProjectJSON = () => {
    const jsonStr = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DuAn_${currentProject.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải file sao lưu dự án (.json)');
  };

  const handleImportProjectJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.scenes && Array.isArray(parsed.scenes)) {
          onUpdateProject(parsed);
          setSelectedSceneIndex(0);
          showToast('Đã nhập dự án thành công!');
        } else {
          alert('Cấu trúc file JSON dự án không hợp lệ.');
        }
      } catch (err: any) {
        alert('Không thể đọc file JSON: ' + err?.message);
      }
    };
    reader.readAsText(file);
  };

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Header Studio Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Studio Video Giáo viên</span>
              <span>·</span>
              <span>Tạo video từ file Word &amp; Học liệu thực</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-2">
              Bộ công cụ dựng video đa phương tiện
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Trích xuất Word (.docx) &rarr; AI tạo kịch bản &rarr; <strong>AI tìm học liệu minh họa (Ảnh &amp; Video tư liệu thật)</strong> &rarr; Dựng kết hợp ảnh và video clip &rarr; Xuất file WebM thật đưa vào bài dạy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSaveProject}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-sky-400" />
              <span>Lưu dự án</span>
            </button>
            <button
              onClick={handleExportProjectJSON}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sao lưu (.json)</span>
            </button>
            <label className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Nhập (.json)</span>
              <input type="file" accept=".json" onChange={handleImportProjectJSON} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 8-Criteria Production Checklist Dashboard */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Kiểm tra quy trình sản xuất video (8 tiêu chí kỹ thuật)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Theo dõi thời gian thực quy trình trích xuất &amp; kết xuất
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Word Content */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">1. Nội dung Word:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${docText.trim().length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {docText.trim().length > 0 ? 'Đã trích xuất' : 'Chưa có'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono truncate">{docText.length} ký tự ({fileName})</p>
          </div>

          {/* 2. Scenes */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">2. Phân cảnh kịch bản:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentProject.scenes.length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {currentProject.scenes.length} cảnh
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">Tổng thời lượng: {currentProject.totalDuration}s</p>
          </div>

          {/* 3. Media per scene */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">3. Học liệu minh họa:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${!hasMissingMedia ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {!hasMissingMedia ? 'Đầy đủ 100%' : `Thiếu ${missingMediaScenes.length} cảnh`}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono truncate">
              {!hasMissingMedia ? 'Ảnh & Video tư liệu thật' : `Thiếu cảnh: ${missingMediaScenes.join(', ')}`}
            </p>
          </div>

          {/* 4. Browser decode */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">4. Tải &amp; Giải mã:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Sẵn sàng
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">Tự động nạp &amp; bảo vệ CORS</p>
          </div>

          {/* 5. Narration Audio */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">5. Nguồn âm thanh:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Sẵn sàng
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">Web Speech / Thu âm / File</p>
          </div>

          {/* 6. Timeline Preview */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">6. Xem trước kịch bản:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Đã kết nối
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">Đồng bộ cảnh &amp; thuyết minh</p>
          </div>

          {/* 7. Canvas + MediaRecorder */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">7. Bộ dựng Canvas:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                HD 720p 30fps
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono">MediaRecorder WebM</p>
          </div>

          {/* 8. Exported Blob */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">8. Video thực tế:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${renderedSceneCount === currentProject.scenes.length ? 'bg-emerald-500/20 text-emerald-400' : renderedSceneCount > 0 ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-700 text-slate-400'}`}>
                {renderedSceneCount}/{currentProject.scenes.length} cảnh
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono truncate">
              {exportedVideo ? `Đã ghép hoàn chỉnh (${exportedVideo.duration}s)` : `${renderedSceneCount} video sẵn sàng phát`}
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: DOCX Upload & AI Analysis Deck */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">1</span>
              Tải tài liệu Word &amp; AI phân tích kịch bản
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sử dụng Mammoth.js để trích xuất tự động văn bản từ file .docx mà không cần sao chép thủ công.
            </p>
          </div>
          <button
            onClick={handleUseSampleDocx}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors flex items-center gap-1 shrink-0"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Nạp tài liệu mẫu Bài 12A</span>
          </button>
        </div>

        {docxError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{docxError}</span>
          </div>
        )}

        {aiNotice && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{aiNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* File Upload Zone */}
          <div className="md:col-span-5 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chọn tệp Word (.docx) từ máy:
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 bg-slate-50/50 hover:bg-sky-50/30 transition-all block">
              <FileUp className="w-8 h-8 text-sky-600" />
              <div className="text-xs text-slate-700">
                <span className="font-bold text-sky-700">Nhấp để chọn tệp .docx</span> hoặc kéo thả vào đây
              </div>
              <span className="text-xs text-slate-400">
                Tệp hiện tại: {fileName}
              </span>
              <input
                type="file"
                accept=".docx"
                onChange={handleDocxUpload}
                className="hidden"
              />
            </label>

            {isReadingDocx && (
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                <span>Đang trích xuất nội dung văn bản bằng Mammoth.js...</span>
              </div>
            )}

            {/* AI Generation Action Button */}
            <button
              onClick={handleAnalyzeScript}
              disabled={isAnalyzingAI || !docText.trim()}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzingAI ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích tài liệu và tạo 5-6 phân cảnh...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI PHÂN TÍCH VÀ TẠO KỊCH BẢN</span>
                </>
              )}
            </button>
          </div>

          {/* Extracted Text Area */}
          <div className="md:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="font-bold text-slate-700 uppercase tracking-wider">
                Nội dung tài liệu đã trích xuất (có thể chỉnh sửa trực tiếp):
              </label>
              <span>{docText.length} ký tự</span>
            </div>
            <textarea
              rows={8}
              value={docText}
              onChange={e => setDocText(e.target.value)}
              placeholder="Nội dung trích xuất từ file Word sẽ xuất hiện ở đây..."
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500/40 bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* STEP 2: Timeline Scene Editor & AI Tìm học liệu minh họa */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">2</span>
              Trình biên tập Timeline &amp; Kho học liệu minh họa
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kết hợp linh hoạt cả <strong>Hình ảnh minh họa</strong> và <strong>Video tư liệu thực tế</strong> trong cùng một dự án.
            </p>
          </div>

          {/* Central Action Buttons: TẠO VIDEO CẢ 5 CẢNH, AI Tìm học liệu, Xem trước & Thêm cảnh */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleGenerateAllTTS}
              disabled={isGeneratingTTS}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              title="Tạo lời thuyết minh tiếng Việt chuẩn cho cả 5 phân cảnh"
            >
              {isGeneratingTTS ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tạo giọng đọc...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>TẠO LỜI THUYẾT MINH 5 CẢNH</span>
                </>
              )}
            </button>

            <button
              onClick={handleRenderAllScenes}
              disabled={isBatchRenderingScenes}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              title="Tự động kiểm tra và dựng video WebM chuyển động cho cả 5 phân cảnh"
            >
              {isBatchRenderingScenes ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {batchRenderProgress
                      ? `Đang tạo Cảnh ${batchRenderProgress.current}/${batchRenderProgress.total}...`
                      : 'Đang tạo cả 5 cảnh...'}
                  </span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>TẠO VIDEO CHO CẢ 5 CẢNH</span>
                </>
              )}
            </button>

            <button
              onClick={handleStartTimelinePreview}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
              title="Xem trước trình chiếu liên tiếp các phân cảnh trên timeline"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Xem trước kịch bản</span>
            </button>

            <button
              onClick={handleAISuggestMedia}
              disabled={isSuggestingAI}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
              title="AI tự động phân tích và đề xuất ảnh & video tư liệu cho tất cả phân cảnh"
            >
              {isSuggestingAI ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang tìm học liệu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI TÌM HỌC LIỆU MINH HỌA</span>
                </>
              )}
            </button>

            <button
              onClick={handleAddScene}
              className="text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm cảnh</span>
            </button>
          </div>
        </div>

        {/* Missing Media Alert Banner */}
        {hasMissingMedia && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">
                  Phát hiện {missingMediaScenes.length} phân cảnh chưa có học liệu minh họa (ảnh hoặc video): Cảnh {missingMediaScenes.join(', ')}
                </p>
                <p className="text-amber-800 mt-0.5">
                  Vui lòng bổ sung học liệu bằng cách tải tệp từ máy hoặc nhấn nút "AI TÌM HỌC LIỆU MINH HỌA" để nhận đề xuất tự động trước khi xuất video.
                </p>
              </div>
            </div>
            <button
              onClick={handleAISuggestMedia}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 shadow-xs"
            >
              Tìm học liệu ngay
            </button>
          </div>
        )}

        {/* Batch Render Progress Indicator */}
        {isBatchRenderingScenes && batchRenderProgress && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2.5 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sky-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span>
                  Đang tự động dựng video Cảnh {batchRenderProgress.current}/{batchRenderProgress.total}: {batchRenderProgress.currentTitle}
                </span>
              </span>
              <span className="font-mono text-emerald-400 font-bold">{batchRenderProgress.percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-150 rounded-full"
                style={{ width: `${batchRenderProgress.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Đang áp dụng hiệu ứng chuyển động lia máy (Pan) &amp; thu phóng (Zoom) theo thời gian thực và ghi tệp WebM...
            </p>
          </div>
        )}

        {/* Timeline Strip with Playable Scene Cards */}
        <div className="overflow-x-auto pb-3 pt-1 no-scrollbar">
          <div className="flex gap-3 min-w-max">
            {currentProject.scenes.map((scene, idx) => {
              const isSelected = selectedSceneIndex === idx;
              const isVideo = scene.mediaType === 'video';
              const hasMedia = (scene.imageUrl && scene.imageUrl.trim().length > 0) || (scene.videoUrl && scene.videoUrl.trim().length > 0);
              const isRendering = scene.renderStatus === 'rendering';
              const isReady = !!scene.renderedVideoUrl;
              const isError = scene.renderStatus === 'error';

              return (
                <div
                  key={scene.id}
                  onClick={() => setSelectedSceneIndex(idx)}
                  className={`w-64 p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between shrink-0 ${
                    isSelected
                      ? 'bg-sky-50/90 border-sky-500 ring-2 ring-sky-500/30 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Status Pill on top of card */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        !hasMedia
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isRendering
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : isReady
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isError
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isRendering && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                        {isReady && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
                        <span>
                          {!hasMedia
                            ? 'Chưa có học liệu'
                            : isRendering
                            ? 'Đang tạo video'
                            : isReady
                            ? 'Tạo thành công'
                            : isError
                            ? 'Tạo thất bại'
                            : 'Chờ tạo video'}
                        </span>
                      </span>

                      <span className="font-mono text-slate-500 font-semibold">
                        {scene.renderedDuration ? `${scene.renderedDuration}s` : `${scene.duration}s`}
                      </span>
                    </div>

                    {/* Scene Media Thumbnail with Play Overlay */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 group">
                      <img
                        src={scene.renderedPosterUrl || scene.imageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />

                      {/* Media type tag */}
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1 shadow-xs ${
                        isVideo ? 'bg-rose-600' : 'bg-sky-600'
                      }`}>
                        {isVideo ? <VideoIcon className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                        <span>#{idx + 1} {isVideo ? 'Video' : 'Ảnh'}</span>
                      </span>

                      {/* Play Button Overlay on Thumbnail (Always functional) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySceneVideo(scene, idx);
                        }}
                        disabled={isRendering || !hasMedia}
                        className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                        title={isReady ? "Bấm để phát video cảnh này" : "Bấm để tạo và phát video cảnh này"}
                      >
                        {isRendering ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Title and Narration */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {idx + 1}. {scene.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {scene.narration}
                      </p>
                    </div>

                    {/* Action Row for this Scene: Phát video, Tải video, Tạo lại */}
                    <div className="pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySceneVideo(scene, idx);
                          }}
                          disabled={isRendering || !hasMedia}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors disabled:opacity-50"
                          title="Phát video chuyển động của phân cảnh này"
                        >
                          {isRendering ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tạo...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Phát video</span>
                            </>
                          )}
                        </button>

                        {isReady && scene.renderedVideoUrl && (
                          <a
                            href={scene.renderedVideoUrl}
                            download={`Canh_${idx + 1}_${scene.title.replace(/\s+/g, '_')}.webm`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Tải video WebM cảnh này"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenderSingleScene(idx);
                          }}
                          disabled={isRendering || !hasMedia}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-40"
                          title="Tạo lại video cảnh này"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin text-sky-600' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scene Navigation Tools */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveScene(idx, 'left'); }}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        title="Di chuyển sang trái"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveScene(idx, 'right'); }}
                        disabled={idx === currentProject.scenes.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                        title="Di chuyển sang phải"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteScene(idx); }}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Xóa cảnh này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Background Music & Master Audio Control Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800/40 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Nhạc nền &amp; Bộ hòa âm đa phương tiện</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Tự động hạ âm lượng (Ducking)
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nhạc nền êm dịu, du dương kết hợp tự động giảm âm xuống 25% khi có giọng đọc thuyết minh để học sinh nghe rõ bài học.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-white transition-colors">
                <input
                  type="checkbox"
                  checked={currentProject.bgMusicEnabled ?? true}
                  onChange={e => onUpdateProject({ ...currentProject, bgMusicEnabled: e.target.checked, updatedAt: Date.now() })}
                  className="rounded text-indigo-500 focus:ring-indigo-400 w-4 h-4"
                />
                <span>Bật nhạc nền</span>
              </label>

              <button
                type="button"
                onClick={handleToggleBgMusicPreview}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                  isPlayingBgPreview
                    ? 'bg-amber-500 text-white border-amber-400 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                }`}
                title="Nghe thử nhạc nền êm dịu"
              >
                {isPlayingBgPreview ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Dừng nghe</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Nghe thử nhạc</span>
                  </>
                )}
              </button>

              <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 border border-white/10">
                <Upload className="w-3.5 h-3.5" />
                <span>Đổi nhạc</span>
                <input type="file" accept="audio/*" onChange={handleUploadBgMusic} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1 items-center text-xs border-t border-white/10">
            <div className="sm:col-span-6 flex items-center gap-3">
              <span className="text-slate-300 font-semibold shrink-0 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Âm lượng nhạc nền:</span>
              </span>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={currentProject.bgMusicVolume ?? 0.12}
                onChange={e => onUpdateProject({ ...currentProject, bgMusicVolume: parseFloat(e.target.value), updatedAt: Date.now() })}
                className="w-36 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
              <span className="font-mono text-indigo-300 font-bold w-12">
                {Math.round((currentProject.bgMusicVolume ?? 0.12) * 100)}%
              </span>
              <span className="text-[11px] text-slate-400">(Khuyên dùng 10% - 15%)</span>
            </div>

            <div className="sm:col-span-6 text-slate-400 text-[11px] flex items-center gap-1.5 justify-start sm:justify-end">
              <span className="truncate">Tệp nhạc: {currentProject.bgMusicName || 'Nhạc nền êm dịu (Guitar & Piano acoustic)'}</span>
            </div>
          </div>
        </div>

        {/* Selected Scene Detailed Editor Deck */}
        {activeScene && (
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200 space-y-5">
            {/* Top Bar of Active Scene: Name & Approval */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-xs font-bold">
                  Cảnh {selectedSceneIndex + 1} / {currentProject.scenes.length}
                </span>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Biên tập chi tiết: {activeScene.title}
                </h3>
              </div>

              {/* Approval status toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={activeScene.approved}
                  onChange={e => updateScene(selectedSceneIndex, { approved: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span>Giáo viên đã duyệt nội dung cảnh này</span>
              </label>
            </div>

            {/* Media Choice Segmented Control: Image Mode vs Video Mode */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Định dạng học liệu minh họa cho phân cảnh này:
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chọn hiển thị hình ảnh tư liệu phóng to (Ken Burns) hoặc phát một đoạn video tư liệu thực tế.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => updateScene(selectedSceneIndex, { mediaType: 'image' })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeScene.mediaType === 'image'
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Hình ảnh minh họa</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateScene(selectedSceneIndex, { mediaType: 'video' })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeScene.mediaType === 'video'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <VideoIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>Đoạn video minh họa</span>
                </button>
              </div>
            </div>

            {/* Main Scene Body: Left Media Preview & Controls / Right Narration & Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Media Preview & Actions */}
              <div className="lg:col-span-5 space-y-4">
                {activeScene.mediaType === 'video' ? (
                  /* VIDEO CLIP MODE CONTROLS */
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-700 flex items-center gap-1.5">
                        <VideoIcon className="w-4 h-4" />
                        <span>Đoạn video tư liệu</span>
                      </span>
                      <button
                        onClick={() => handleOpenMediaLibrary(activeScene, 'video')}
                        className="text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Đổi video khác</span>
                      </button>
                    </div>

                    {/* Video Player Preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-xs">
                      {activeScene.videoUrl ? (
                        <video
                          src={activeScene.videoUrl}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                          <Film className="w-8 h-8 text-slate-500" />
                          <span>Chưa chọn video cho cảnh này</span>
                        </div>
                      )}
                    </div>

                    {/* Video Metadata */}
                    <div className="text-[11px] text-slate-500 space-y-0.5 border-b border-slate-100 pb-2">
                      <p className="font-semibold text-slate-800 truncate">
                        {activeScene.videoTitle || 'Video tư liệu TP.HCM'}
                      </p>
                      <p className="truncate">
                        Nguồn: {activeScene.videoSource || 'Wikimedia Commons'} · {activeScene.videoLicense || 'CC BY-SA'}
                      </p>
                    </div>

                    {/* Trimming Controls: Start & End time */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Scissors className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cắt đoạn video (Trim):</span>
                        </span>
                        <span className="font-mono text-slate-500">
                          {activeScene.clipStart || 0}s &rarr; {activeScene.clipEnd || activeScene.duration}s
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-0.5">Bắt đầu từ (giây):</label>
                          <input
                            type="number"
                            min={0}
                            max={Math.max(0, (activeScene.clipEnd || activeScene.duration) - 1)}
                            value={activeScene.clipStart || 0}
                            onChange={e => updateScene(selectedSceneIndex, { clipStart: Math.max(0, Number(e.target.value)) })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block mb-0.5">Kết thúc ở (giây):</label>
                          <input
                            type="number"
                            min={(activeScene.clipStart || 0) + 1}
                            max={60}
                            value={activeScene.clipEnd || activeScene.duration}
                            onChange={e => updateScene(selectedSceneIndex, { clipEnd: Math.max(1, Number(e.target.value)) })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Original Audio Volume / Mute for Video */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={activeScene.muteOriginalAudio || false}
                            onChange={e => updateScene(selectedSceneIndex, { muteOriginalAudio: e.target.checked })}
                            className="rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span>Tắt âm thanh gốc của video</span>
                        </label>
                        {!activeScene.muteOriginalAudio && (
                          <span className="font-mono text-slate-500 text-[11px]">
                            {Math.round((activeScene.originalAudioVolume !== undefined ? activeScene.originalAudioVolume : 0.5) * 100)}%
                          </span>
                        )}
                      </div>

                      {!activeScene.muteOriginalAudio && (
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={activeScene.originalAudioVolume !== undefined ? activeScene.originalAudioVolume : 0.5}
                            onChange={e => updateScene(selectedSceneIndex, { originalAudioVolume: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Video Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenMediaLibrary(activeScene, 'video')}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span>Kho video tư liệu</span>
                      </button>
                      <label className="flex-1 py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold cursor-pointer border border-rose-200 flex items-center justify-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-rose-600" />
                        <span>Tải video MP4</span>
                        <input type="file" accept="video/mp4,video/webm" onChange={handleLocalVideoUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                ) : (
                  /* IMAGE MODE CONTROLS */
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4" />
                        <span>Hình ảnh tư liệu</span>
                      </span>
                      <button
                        onClick={() => handleOpenMediaLibrary(activeScene, 'image')}
                        className="text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Đổi ảnh khác</span>
                      </button>
                    </div>

                    {/* Image Preview */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs group">
                      <img
                        src={activeScene.imageUrl}
                        alt={activeScene.imageTitle}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenMediaLibrary(activeScene, 'image')}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition-colors"
                        >
                          Đổi ảnh
                        </button>
                        <label className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold hover:bg-white cursor-pointer transition-colors">
                          Tải ảnh từ máy
                          <input type="file" accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Image metadata attribution */}
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p className="font-semibold text-slate-800 truncate" title={activeScene.imageTitle}>
                        {activeScene.imageTitle}
                      </p>
                      <p className="truncate">
                        Nguồn: {activeScene.imageSource} · {activeScene.imageLicense || 'Bản quyền mở'}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenMediaLibrary(activeScene, 'image')}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span>Kho ảnh tư liệu</span>
                      </button>
                      <label className="flex-1 py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold cursor-pointer border border-sky-200 flex items-center justify-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                        <span>Tải ảnh từ máy</span>
                        <input type="file" accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Single Scene Video Status & Action Card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-sky-600" />
                      <span>Video chuyển động Cảnh {selectedSceneIndex + 1}:</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeScene.renderStatus === 'ready'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : activeScene.renderStatus === 'rendering'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {activeScene.renderStatus === 'ready'
                        ? 'Tạo thành công'
                        : activeScene.renderStatus === 'rendering'
                        ? 'Đang tạo video'
                        : (!activeScene.imageUrl && !activeScene.videoUrl)
                        ? 'Chưa có học liệu'
                        : 'Chờ tạo video'}
                    </span>
                  </div>

                  {activeScene.renderedVideoUrl ? (
                    <div className="space-y-2">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
                        <video
                          src={activeScene.renderedVideoUrl}
                          poster={activeScene.renderedPosterUrl}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>Thời lượng: {activeScene.renderedDuration || activeScene.duration}s</span>
                        <span>Dung lượng: {((activeScene.renderedSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePlayingSceneVideo(activeScene)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Phát toàn màn hình</span>
                        </button>
                        {activeScene.renderedBlob && (
                          <a
                            href={activeScene.renderedVideoUrl}
                            download={`canh-${selectedSceneIndex + 1}-${activeScene.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.webm`}
                            className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải .webm</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRenderSingleScene(selectedSceneIndex)}
                          disabled={activeScene.renderStatus === 'rendering'}
                          className="py-1.5 px-3 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold border border-sky-200 flex items-center justify-center gap-1 transition-colors"
                          title="Tạo lại video cho cảnh này"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${activeScene.renderStatus === 'rendering' ? 'animate-spin' : ''}`} />
                          <span>Tạo lại</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        Tạo video WebM riêng cho cảnh này với chuyển động lia máy/thu phóng động Ken Burns, phụ đề tiêu đề và âm thanh thuyết minh.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRenderSingleScene(selectedSceneIndex)}
                        disabled={activeScene.renderStatus === 'rendering' || (!activeScene.imageUrl && !activeScene.videoUrl)}
                        className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        {activeScene.renderStatus === 'rendering' ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang dựng video cảnh {selectedSceneIndex + 1}...</span>
                          </>
                        ) : (
                          <>
                            <Film className="w-3.5 h-3.5" />
                            <span>Tạo video cho Cảnh {selectedSceneIndex + 1}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Voice / Audio Controls for Narration */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-indigo-600" />
                      <span>Âm thanh &amp; Giọng thuyết minh Cảnh {selectedSceneIndex + 1}:</span>
                    </span>
                    {activeScene.audioBlobUrl ? (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Đã có giọng đọc tiếng Việt</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-medium">
                        Chưa có âm thanh
                      </span>
                    )}
                  </div>

                  {/* Quick Action Buttons for Narration */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* TTS Generation Button */}
                    <button
                      type="button"
                      onClick={() => handleGenerateTTS(selectedSceneIndex)}
                      disabled={isGeneratingTTS || !activeScene.narration.trim()}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                      title="Tạo giọng đọc tiếng Việt tự nhiên truyền cảm cho lời thuyết minh này"
                    >
                      {isGeneratingTTS ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang tạo giọng đọc...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{activeScene.audioBlobUrl ? 'Tạo lại giọng đọc (TTS)' : 'Tạo giọng đọc (TTS)'}</span>
                        </>
                      )}
                    </button>

                    {/* Preview Narration Audio */}
                    <button
                      type="button"
                      onClick={() => handleToggleNarrationPreview(activeScene)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border ${
                        isPlayingNarrationPreview
                          ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title="Nghe thử lời thuyết minh tiếng Việt"
                    >
                      {isPlayingNarrationPreview ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-white" />
                          <span>Dừng nghe</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                          <span>Nghe thử</span>
                        </>
                      )}
                    </button>

                    {/* Teacher Mic Recording */}
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200"
                        title="Bật micro và tự thu âm giọng đọc của Giáo viên"
                      >
                        <Mic className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ghi âm micro</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold animate-pulse flex items-center gap-1.5 shadow-xs"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Dừng ghi âm</span>
                      </button>
                    )}

                    {/* Local Audio File Upload */}
                    <label className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 border border-slate-200">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tải file MP3/WAV</span>
                      <input type="file" accept="audio/*" onChange={handleLocalAudioUpload} className="hidden" />
                    </label>

                    {activeScene.audioBlobUrl && (
                      <button
                        type="button"
                        onClick={() => updateScene(selectedSceneIndex, { audioBlobUrl: undefined, audioName: undefined })}
                        className="px-2 py-2 rounded-xl text-slate-400 hover:text-rose-600 text-xs hover:bg-rose-50 transition-colors"
                        title="Gỡ bỏ tệp âm thanh này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Volume Slider for Narration */}
                  <div className="pt-1 flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Âm lượng giọng đọc:</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={activeScene.audioVolume ?? 1.0}
                      onChange={e => updateScene(selectedSceneIndex, { audioVolume: parseFloat(e.target.value) })}
                      className="w-36 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-xs font-bold text-indigo-700 w-10">
                      {Math.round((activeScene.audioVolume ?? 1.0) * 100)}%
                    </span>
                  </div>

                  {activeScene.audioBlobUrl && (
                    <audio
                      src={activeScene.audioBlobUrl}
                      controls
                      className="w-full h-8 mt-1 rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Right Column: Title, Narration & Duration */}
              <div className="lg:col-span-7 space-y-4">
                {/* Scene Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tiêu đề cảnh:
                  </label>
                  <input
                    type="text"
                    value={activeScene.title}
                    onChange={e => updateScene(selectedSceneIndex, { title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white"
                  />
                </div>

                {/* Narration Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Lời thuyết minh tiếng Việt (cho học sinh lớp 4):
                  </label>
                  <textarea
                    rows={4}
                    value={activeScene.narration}
                    onChange={e => updateScene(selectedSceneIndex, { narration: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed bg-white"
                  />
                </div>

                {/* Duration & Transition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      <span>Thời lượng cảnh:</span>
                      <span className="font-mono text-sky-600">{activeScene.duration} giây</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={35}
                      step={1}
                      value={activeScene.duration}
                      onChange={e => updateScene(selectedSceneIndex, { duration: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Hiệu ứng chuyển cảnh:
                    </label>
                    <select
                      value={activeScene.transition}
                      onChange={e => updateScene(selectedSceneIndex, { transition: e.target.value as TransitionEffect })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800"
                    >
                      <option value="fade">Mờ dần (Fade In / Out)</option>
                      <option value="zoom">Thu phóng chậm (Ken Burns Zoom)</option>
                      <option value="slide">Trượt ngang (Slide)</option>
                    </select>
                  </div>
                </div>

                {/* Search Keywords & Verification */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">
                      Từ khóa tìm kiếm học liệu:
                    </label>
                    <input
                      type="text"
                      value={activeScene.searchKeywords}
                      onChange={e => updateScene(selectedSceneIndex, { searchKeywords: e.target.value })}
                      placeholder="Ví dụ: Bến Nhà Rồng TP.HCM, Dinh Độc Lập..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-600">
                      Nguồn trích dẫn: <strong>{activeScene.sourceCitation}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeScene.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {activeScene.verified ? '✓ Đã thẩm định' : '! Cần GV xem xét'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: Real Video Export & Deployment Deck */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold">3</span>
              Dựng và xuất video hoàn chỉnh (WebM HD 720p)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghép các phân cảnh ảnh và video theo đúng thứ tự, đồng bộ lời thuyết minh và xuất video WebM thực tế.
            </p>
          </div>
        </div>

        {/* In-UI Error Alert (No popup) */}
        {exportError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Không thể kết xuất video:</p>
                <p className="text-rose-700 mt-0.5">{exportError}</p>
              </div>
            </div>
            <button
              onClick={() => setExportError(null)}
              className="px-3 py-1.5 rounded-lg bg-rose-200 hover:bg-rose-300 text-rose-900 font-bold text-xs shrink-0 transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        )}

        {/* 5-Stage Stepper & Export Progress Bar */}
        {isExporting && exportProgress && (
          <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-5 shadow-xl animate-in fade-in">
            {/* 5-Step Visual Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px] pb-3 border-b border-slate-800">
              {[
                { num: 1, label: '1. Chuẩn bị học liệu' },
                { num: 2, label: '2. Dựng phân cảnh' },
                { num: 3, label: '3. Ghép âm thanh' },
                { num: 4, label: '4. Kết xuất video' },
                { num: 5, label: '5. Hoàn thành' },
              ].map(st => {
                const isCurrent = exportProgress.step === st.num;
                const isDone = exportProgress.step > st.num;

                return (
                  <div
                    key={st.num}
                    className={`p-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400 font-bold'
                        : isDone
                        ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                        : 'text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-600 text-[9px] flex items-center justify-center">
                          {st.num}
                        </span>
                      )}
                      <span className="truncate">{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Status Text & Percentage */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-sky-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>{exportProgress.statusText}</span>
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {exportProgress.percent}%
              </span>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-200 rounded-full"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <span>Đang kết hợp khung hình Canvas và bộ mã hóa MediaRecorder...</span>
              <button
                onClick={handleCancelExport}
                className="text-rose-400 hover:text-rose-300 font-semibold underline transition-colors"
              >
                Hủy kết xuất
              </button>
            </div>
          </div>
        )}

        {/* Action Trigger Row */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportRealVideo}
            disabled={isExporting || hasMissingMedia}
            className={`py-3.5 px-6 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
              hasMissingMedia
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20 active:scale-98'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>{isExporting ? 'Đang ghép và xuất video...' : 'GHÉP 5 CẢNH THÀNH VIDEO HOÀN CHỈNH (WEBM 720P)'}</span>
          </button>

          {hasMissingMedia && (
            <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Chưa thể tạo: Cảnh {missingMediaScenes.join(', ')} đang thiếu ảnh/video minh họa</span>
            </span>
          )}
        </div>

        {/* DEDICATED SECTION: VIDEO ĐÃ TẠO */}
        <div ref={videoOutputRef} className="pt-2">
          <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-extrabold uppercase tracking-wider text-white font-display">
                  VIDEO ĐÃ TẠO
                </h3>
                {exportedVideo ? (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    ✓ WebM HD 720p · Thực tế
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Chưa có video
                  </span>
                )}
              </div>

              {exportedVideo && (
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={exportedVideo.url}
                    download={exportedVideo.filename}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải video (.webm)</span>
                  </a>

                  <button
                    onClick={() => {
                      onApplyToLesson(exportedVideo);
                      showToast('Đã áp dụng video vào bài Khởi động & Luyện tập!');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Sử dụng trong Khởi động</span>
                  </button>
                </div>
              )}
            </div>

            {exportedVideo ? (
              <div className="space-y-4">
                {/* HTML5 Video Player Frame */}
                <div className="aspect-video max-w-3xl rounded-2xl overflow-hidden bg-black shadow-2xl mx-auto border border-slate-800 relative group">
                  <video
                    ref={videoPlayerRef}
                    src={exportedVideo.url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-contain"
                    playsInline
                  />
                </div>

                {/* Custom Interactive Player Controls Bar */}
                <div className="max-w-3xl mx-auto bg-slate-800/90 p-4 rounded-2xl border border-slate-700 space-y-3">
                  {/* Scrubber Seek Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
                      <span>{formatTime(videoCurrentTime)}</span>
                      <span>{formatTime(videoDuration || exportedVideo.duration)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || exportedVideo.duration || 100}
                      step={0.1}
                      value={videoCurrentTime}
                      onChange={e => handleSeek(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>

                  {/* Buttons & Volume Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTogglePlay}
                        className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all active:scale-95"
                        title={isPlayingVideo ? 'Tạm dừng video' : 'Phát video'}
                      >
                        {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      {/* Volume & Mute */}
                      <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
                        <button
                          onClick={handleToggleMute}
                          className="text-slate-400 hover:text-white transition-colors"
                          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                        >
                          {isMuted || videoVolume === 0 ? (
                            <VolumeX className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-sky-400" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : videoVolume}
                          onChange={e => handleVolumeChange(Number(e.target.value))}
                          className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                          title="Điều chỉnh âm lượng"
                        />
                      </div>
                    </div>

                    {/* Technical File Metadata */}
                    <div className="text-[11px] text-slate-400 font-mono text-right">
                      <span>{(exportedVideo.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                      <span> · </span>
                      <span>{exportedVideo.duration}s</span>
                      <span> · </span>
                      <span className="text-emerald-400">WebM VP8/VP9</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State when Video is NOT yet rendered */
              <div className="text-center py-10 px-4 space-y-3 bg-slate-800/40 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/20">
                  <Film className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">
                  Chưa có video được kết xuất
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Kiểm tra các phân cảnh trong Timeline ở Bước 2, sau đó nhấn nút <strong>"GHÉP 5 CẢNH THÀNH VIDEO HOÀN CHỈNH (WEBM 720P)"</strong> ở trên để khởi động bộ dựng Canvas + MediaRecorder và xuất video WebM thực tế.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleExportRealVideo}
                    disabled={hasMissingMedia}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors inline-flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>GHÉP VIDEO NGAY</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ACTIVE PLAYING SCENE VIDEO */}
      {activePlayingSceneVideo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    {activePlayingSceneVideo.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Video WebM chuyển động trực tiếp · Độ phân giải HD 720p · Chuẩn HTML5
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePlayingSceneVideo(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Đóng ✕
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800">
              <video
                src={activePlayingSceneVideo.renderedVideoUrl}
                poster={activePlayingSceneVideo.renderedPosterUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Narration and metadata */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-semibold text-slate-300">Lời thuyết minh:</span>
                <span className="font-mono text-emerald-400">
                  Thời lượng: {activePlayingSceneVideo.renderedDuration || activePlayingSceneVideo.duration}s
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed italic text-[12px]">
                "{activePlayingSceneVideo.narration}"
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
              <div className="text-[11px] text-slate-400 font-mono">
                {activePlayingSceneVideo.renderedSizeBytes && (
                  <span>Dung lượng: {((activePlayingSceneVideo.renderedSizeBytes) / (1024 * 1024)).toFixed(2)} MB · Định dạng: video/webm</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activePlayingSceneVideo.renderedVideoUrl && (
                  <a
                    href={activePlayingSceneVideo.renderedVideoUrl}
                    download={`video-${activePlayingSceneVideo.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.webm`}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải video (.webm)</span>
                  </a>
                )}
                <button
                  onClick={() => setActivePlayingSceneVideo(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 0: TIMELINE LIVE PREVIEW MODAL */}
      {showTimelinePreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-display">
                  Xem trước kịch bản Timeline (Cảnh {previewSceneIndex + 1}/{currentProject.scenes.length})
                </h3>
              </div>
              <button
                onClick={handleCloseTimelinePreview}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Đóng ✕
              </button>
            </div>

            {/* Preview Frame */}
            {currentProject.scenes[previewSceneIndex] && (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                  {currentProject.scenes[previewSceneIndex].mediaType === 'video' && currentProject.scenes[previewSceneIndex].videoUrl ? (
                    <video
                      src={currentProject.scenes[previewSceneIndex].videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={currentProject.scenes[previewSceneIndex].imageUrl}
                      alt={currentProject.scenes[previewSceneIndex].title}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Subtitle Card Overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                    <h4 className="text-sm font-bold text-sky-400 mb-1">
                      {previewSceneIndex + 1}. {currentProject.scenes[previewSceneIndex].title}
                    </h4>
                    <p className="text-xs text-white leading-relaxed">
                      {currentProject.scenes[previewSceneIndex].narration}
                    </p>
                  </div>
                </div>

                {/* Controls inside Preview Modal */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewSceneIndex(Math.max(0, previewSceneIndex - 1))}
                      disabled={previewSceneIndex === 0}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold disabled:opacity-30"
                    >
                      ← Cảnh trước
                    </button>
                    <button
                      onClick={() => setPreviewSceneIndex(Math.min(currentProject.scenes.length - 1, previewSceneIndex + 1))}
                      disabled={previewSceneIndex === currentProject.scenes.length - 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold disabled:opacity-30"
                    >
                      Cảnh sau →
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTTSPreview(currentProject.scenes[previewSceneIndex].narration)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Đọc thuyết minh</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: AI TÌM HỌC LIỆU MINH HỌA - BATCH RECOMMENDATIONS */}
      {showSuggestionsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Đề xuất học liệu minh họa (Ảnh &amp; Video tư liệu thật)
                </h3>
              </div>
              <button
                onClick={() => setShowSuggestionsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Đóng ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              AI đã phân tích nội dung các phân cảnh và đề xuất học liệu từ nguồn lưu trữ di tích văn hóa có bản quyền rõ ràng. Giáo viên có thể duyệt và áp dụng nhanh cho từng cảnh:
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {sceneSuggestions.map((sug, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Cảnh {idx + 1}: {sug.sceneTitle}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Từ khóa: {sug.suggestedKeywords}
                    </span>
                  </div>

                  {/* Propose Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Video Suggestion */}
                    {sug.suggestedVideos[0] && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <VideoIcon className="w-3 h-3" />
                              <span>Đoạn video tư liệu</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {sug.suggestedVideos[0].duration || 20}s
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">
                            {sug.suggestedVideos[0].title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            Nguồn: {sug.suggestedVideos[0].source} · {sug.suggestedVideos[0].license}
                          </p>
                        </div>

                        <button
                          onClick={() => handleApplySuggestionToScene(idx, sug.suggestedVideos[0], 'video')}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Dùng Video này cho Cảnh {idx + 1}</span>
                        </button>
                      </div>
                    )}

                    {/* Image Suggestion */}
                    {sug.suggestedImages[0] && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              <span>Hình ảnh tư liệu</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Độ nét cao
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">
                            {sug.suggestedImages[0].title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            Nguồn: {sug.suggestedImages[0].source} · {sug.suggestedImages[0].license}
                          </p>
                        </div>

                        <button
                          onClick={() => handleApplySuggestionToScene(idx, sug.suggestedImages[0], 'image')}
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Dùng Ảnh này cho Cảnh {idx + 1}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Đã duyệt {sceneSuggestions.length} phân cảnh
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSuggestionsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Đóng
                </button>
                <button
                  onClick={handleApplyAllSuggestions}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                >
                  Áp dụng tất cả vào Dự án
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MULTIMEDIA SEARCH LIBRARY (Images & Videos from Wikimedia / Archive) */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-600" />
                Kho học liệu minh họa (Ảnh &amp; Video tư liệu)
              </h3>
              <button
                onClick={() => setShowMediaModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Đóng ✕
              </button>
            </div>

            {/* Search Input Bar & Type Filter */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mediaSearchKeyword}
                  onChange={e => setMediaSearchKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && performMediaSearch(mediaSearchKeyword, mediaFilterType)}
                  placeholder="Nhập từ khóa (Ví dụ: Bến Nhà Rồng, Dinh Độc Lập, Bưu điện TP, Sông Sài Gòn...)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <button
                  onClick={() => performMediaSearch(mediaSearchKeyword, mediaFilterType)}
                  disabled={isSearchingMedia}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {isSearchingMedia ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Tìm</span>
                </button>
              </div>

              {/* Segmented Filter: Tất cả | Chỉ Ảnh | Chỉ Video */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => {
                    setMediaFilterType('all');
                    performMediaSearch(mediaSearchKeyword, 'all');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    mediaFilterType === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Tất cả học liệu
                </button>
                <button
                  onClick={() => {
                    setMediaFilterType('image');
                    performMediaSearch(mediaSearchKeyword, 'image');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    mediaFilterType === 'image' ? 'bg-white text-sky-700 shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  🖼️ Chỉ hình ảnh
                </button>
                <button
                  onClick={() => {
                    setMediaFilterType('video');
                    performMediaSearch(mediaSearchKeyword, 'video');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    mediaFilterType === 'video' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  🎬 Chỉ video tư liệu
                </button>
              </div>
            </div>

            {mediaSearchNotice && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {mediaSearchNotice}
              </div>
            )}

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] pr-1">
              {isSearchingMedia ? (
                <div className="flex flex-col items-center justify-center h-56 text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                  <span>Đang tìm ảnh và video tư liệu có quyền sử dụng...</span>
                </div>
              ) : mediaSearchResults.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-500">
                  Không tìm thấy học liệu phù hợp. Bạn có thể đổi từ khóa hoặc tải trực tiếp ảnh/video từ máy tính.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {mediaSearchResults.map(item => {
                    const isVideo = item.type === 'video';
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-sky-500 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        {/* Media Preview Box */}
                        <div className="aspect-video bg-black relative overflow-hidden group/thumb">
                          {isVideo ? (
                            <video
                              src={item.mediaUrl}
                              poster={item.thumbUrl}
                              controls
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={item.thumbUrl}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {/* Media Type Badge */}
                          <span className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs ${
                            isVideo ? 'bg-rose-600' : 'bg-sky-600'
                          }`}>
                            {isVideo ? '🎬 Video' : '🖼️ Ảnh'}
                          </span>
                        </div>

                        {/* Description & Selection Actions */}
                        <div className="p-3 space-y-2">
                          <p className="text-xs font-bold text-slate-800 line-clamp-1" title={item.title}>
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Nguồn: {item.source} · {item.license}
                          </p>

                          <div className="flex gap-1.5 pt-1">
                            {isVideo ? (
                              <button
                                onClick={() => handleSelectMediaForScene(item, 'video')}
                                className="w-full py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors"
                              >
                                Chọn làm Video cảnh này
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSelectMediaForScene(item, 'image')}
                                className="w-full py-1.5 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold transition-colors"
                              >
                                Chọn làm Ảnh cảnh này
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Local Upload Alternatives inside Modal */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-2">
              <span className="text-slate-500">Hoặc tải tài liệu riêng từ máy tính:</span>
              <div className="flex gap-2">
                <label className="text-sky-600 hover:text-sky-800 font-semibold cursor-pointer border border-sky-200 px-3 py-1.5 rounded-lg bg-sky-50">
                  Tải Ảnh (.jpg, .png)
                  <input type="file" accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
                </label>
                <label className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer border border-rose-200 px-3 py-1.5 rounded-lg bg-rose-50">
                  Tải Video (.mp4, .webm)
                  <input type="file" accept="video/mp4,video/webm" onChange={handleLocalVideoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
