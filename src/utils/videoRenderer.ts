import { Scene, TransitionEffect } from '../types';

export type RenderStep = 1 | 2 | 3 | 4 | 5;

export interface RenderProgress {
  step: RenderStep;
  stepName: string;
  percent: number;
  currentSceneIndex: number;
  totalScenes: number;
  statusText: string;
}

export interface RenderResult {
  blob: Blob;
  url: string;
  duration: number;
  sizeBytes: number;
  mimeType: string;
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 1280;
  private height: number = 720;
  private isCancelled: boolean = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Không thể khởi tạo Canvas 2D để dựng video.');
    this.ctx = ctx;

    // Draw an initial dark background so canvas stream is never blank
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public cancel() {
    this.isCancelled = true;
  }

  /**
   * Render an individual scene into its own standalone WebM video with dynamic camera motion,
   * real narration audio, and optional gentle background music with auto-ducking.
   */
  public async renderSingleSceneVideo(
    scene: Scene,
    sceneIndex: number = 0,
    totalScenes: number = 5,
    durationSeconds?: number,
    onProgress?: (percent: number) => void,
    bgMusicOptions?: { url?: string; volume?: number; enabled?: boolean }
  ): Promise<{ blob: Blob; url: string; duration: number; sizeBytes: number; posterUrl: string }> {
    this.isCancelled = false;

    // 1. Preload image, video, and audio buffer
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.warn('AudioContext resume warning:', e);
      }
    }
    const audioDestination = audioCtx.createMediaStreamDestination();

    const [img, videoElem, audioBuffer, bgBuffer] = await Promise.all([
      this.loadImageWithFallback(scene),
      (scene.renderedVideoUrl || (scene.mediaType === 'video' && scene.videoUrl))
        ? this.loadVideo(scene.renderedVideoUrl || scene.videoUrl)
        : Promise.resolve(null),
      this.loadAudioBuffer(audioCtx, scene.audioBlobUrl, scene.sceneNumber),
      bgMusicOptions?.enabled && bgMusicOptions?.url ? this.loadAudioBuffer(audioCtx, bgMusicOptions.url) : Promise.resolve(null),
    ]);

    if (this.isCancelled) {
      try { audioCtx.close(); } catch (e) {}
      throw new Error('Đã hủy tạo video.');
    }

    // Determine actual scene duration so speech is never cut off
    // Formula: Scene duration = Audio duration + 1.5s hold frame buffer
    const finalDurationSeconds = audioBuffer
      ? Math.max(durationSeconds || 6, audioBuffer.duration + 1.5)
      : (durationSeconds || scene.duration || 8);

    // Setup carrier to guarantee audio stream is active
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0.0001;
    const silentOsc = audioCtx.createOscillator();
    silentOsc.connect(silentGain);
    silentGain.connect(audioDestination);
    silentOsc.start();

    // Setup Background Music Node with auto-ducking
    let bgGainNode: GainNode | null = null;
    let bgSourceNode: AudioBufferSourceNode | null = null;
    const normalBgVol = Math.max(0.01, Math.min(bgMusicOptions?.volume ?? 0.12, 0.5));

    if (bgBuffer && bgMusicOptions?.enabled) {
      bgSourceNode = audioCtx.createBufferSource();
      bgSourceNode.buffer = bgBuffer;
      bgSourceNode.loop = true;

      bgGainNode = audioCtx.createGain();
      bgGainNode.gain.setValueAtTime(normalBgVol, audioCtx.currentTime);

      bgSourceNode.connect(bgGainNode);
      bgGainNode.connect(audioDestination);
      bgSourceNode.start();
    }

    // Setup Narration Node
    if (audioBuffer) {
      const narrationSource = audioCtx.createBufferSource();
      narrationSource.buffer = audioBuffer;

      const narrationGain = audioCtx.createGain();
      narrationGain.gain.value = Math.max(0, Math.min(scene.audioVolume ?? 1.0, 1.0));

      narrationSource.connect(narrationGain);
      narrationGain.connect(audioDestination);

      // Start narration after a brief 0.3s pause for natural transition
      const narrationStartTime = audioCtx.currentTime + 0.3;
      narrationSource.start(narrationStartTime);

      // Apply smooth auto-ducking to background music
      if (bgGainNode) {
        const duckVol = normalBgVol * 0.25; // Duck to 25% during speech
        bgGainNode.gain.setValueAtTime(normalBgVol, audioCtx.currentTime);
        bgGainNode.gain.linearRampToValueAtTime(duckVol, narrationStartTime);
        const speechEndTime = narrationStartTime + audioBuffer.duration;
        bgGainNode.gain.setValueAtTime(duckVol, speechEndTime);
        bgGainNode.gain.linearRampToValueAtTime(normalBgVol, speechEndTime + 0.8);
      }
    }

    // 3. Draw initial frame & capture poster
    this.renderSceneFrame({
      scene,
      img,
      videoElem,
      sceneIndex,
      totalScenes,
      sceneProgress: 0,
      transition: 'fade',
    });
    const posterUrl = this.canvas.toDataURL('image/jpeg', 0.85);

    // 4. Capture canvas stream & start MediaRecorder
    const canvasStream = this.canvas.captureStream(30);
    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ];
    const combinedStream = new MediaStream(combinedTracks);
    const mimeType = this.getSupportedMimeType();

    const mediaRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
    const recordedChunks: Blob[] = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.start(100);

    const fps = 30;
    const totalFrames = Math.round(finalDurationSeconds * fps);
    const frameInterval = 1000 / fps;

    if (scene.mediaType === 'video' && videoElem) {
      try {
        videoElem.currentTime = scene.clipStart || 0;
        videoElem.muted = true;
        await videoElem.play().catch(() => {});
      } catch (e) {}
    }

    // 5. Render frames in exact real time for wall-clock audio sync
    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        if (videoElem) try { videoElem.pause(); } catch (e) {}
        try { mediaRecorder.stop(); audioCtx.close(); } catch (e) {}
        throw new Error('Đã hủy dựng video.');
      }

      const sceneProgress = frame / totalFrames;
      this.renderSceneFrame({
        scene,
        img,
        videoElem,
        sceneIndex,
        totalScenes,
        sceneProgress,
        transition: 'fade',
      });

      if (onProgress && frame % 10 === 0) {
        onProgress(Math.round(sceneProgress * 100));
      }

      // Exactly real-time for pristine audio recording sync
      await new Promise(r => setTimeout(r, frameInterval));
    }

    if (scene.mediaType === 'video' && videoElem) {
      try { videoElem.pause(); } catch (e) {}
    }

    // 6. Finalize WebM Blob
    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        try {
          silentOsc.stop();
          if (bgSourceNode) bgSourceNode.stop();
          audioCtx.close();
        } catch (e) {}

        const finalMime = mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: finalMime });

        if (blob.size === 0) {
          reject(new Error('Tệp video tạo ra rỗng (0 bytes). Trình duyệt không thể ghi luồng WebM.'));
          return;
        }

        const url = URL.createObjectURL(blob);
        if (onProgress) onProgress(100);

        resolve({
          blob,
          url,
          duration: finalDurationSeconds,
          sizeBytes: blob.size,
          posterUrl,
        });
      };

      mediaRecorder.onerror = () => reject(new Error('Lỗi MediaRecorder'));

      try {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
          mediaRecorder.stop();
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Render the complete full video combining all scenes in order with transitions,
   * natural voice narrations, and gentle background music with auto-ducking.
   */
  public async renderVideo(
    scenes: Scene[],
    onProgress: (p: RenderProgress) => void,
    exportSpeedMultiplier: number = 1.0,
    bgMusicOptions?: { url?: string; volume?: number; enabled?: boolean }
  ): Promise<RenderResult> {
    this.isCancelled = false;

    if (!scenes || scenes.length === 0) {
      throw new Error('Danh sách phân cảnh trống, không thể tạo video.');
    }

    // Validation: check for missing media
    const missingScenes: number[] = [];
    scenes.forEach((s, idx) => {
      const hasImg = s.imageUrl && s.imageUrl.trim().length > 0;
      const hasVid = s.videoUrl && s.videoUrl.trim().length > 0;
      if (!hasImg && !hasVid) {
        missingScenes.push(idx + 1);
      }
    });

    if (missingScenes.length > 0) {
      throw new Error(
        `Chưa thể dựng video vì các phân cảnh sau chưa có học liệu minh họa (ảnh hoặc video): Cảnh ${missingScenes.join(', ')}. Vui lòng bổ sung học liệu trước.`
      );
    }

    // ==========================================
    // BƯỚC 1: ĐANG CHUẨN BỊ HỌC LIỆU
    // ==========================================
    onProgress({
      step: 1,
      stepName: 'Đang chuẩn bị học liệu',
      percent: 5,
      currentSceneIndex: 0,
      totalScenes: scenes.length,
      statusText: 'Đang chuẩn bị học liệu (kiểm tra và nạp trước ảnh, video tư liệu)...',
    });

    const [loadedImages, loadedVideos] = await Promise.all([
      Promise.all(scenes.map(scene => this.loadImageWithFallback(scene))),
      Promise.all(
        scenes.map(scene =>
          (scene.renderedVideoUrl || (scene.mediaType === 'video' && scene.videoUrl))
            ? this.loadVideo(scene.renderedVideoUrl || scene.videoUrl)
            : Promise.resolve(null)
        )
      ),
    ]);

    if (this.isCancelled) throw new Error('Đã hủy quá trình dựng video.');

    onProgress({
      step: 1,
      stepName: 'Đang chuẩn bị học liệu',
      percent: 15,
      currentSceneIndex: 0,
      totalScenes: scenes.length,
      statusText: 'Học liệu hình ảnh và video tư liệu đã sẵn sàng!',
    });

    // ==========================================
    // BƯỚC 3: ĐANG GHÉP ÂM THANH & NHẠC NỀN
    // ==========================================
    onProgress({
      step: 3,
      stepName: 'Đang ghép âm thanh',
      percent: 20,
      currentSceneIndex: 0,
      totalScenes: scenes.length,
      statusText: 'Đang khởi tạo bộ hòa âm Web Audio API, thuyết minh và nhạc nền...',
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.warn('AudioContext resume warning:', e);
      }
    }

    const audioDestination = audioCtx.createMediaStreamDestination();

    // Load narration audio buffers for each scene with local audio fallback
    const audioBuffers: (AudioBuffer | null)[] = await Promise.all(
      scenes.map(async (scene, idx) => this.loadAudioBuffer(audioCtx, scene.audioBlobUrl, scene.sceneNumber || idx + 1))
    );

    // Load gentle background music
    let bgBuffer: AudioBuffer | null = null;
    if (bgMusicOptions?.enabled && bgMusicOptions?.url) {
      bgBuffer = await this.loadAudioBuffer(audioCtx, bgMusicOptions.url);
    }

    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0.0001;
    const silentOsc = audioCtx.createOscillator();
    silentOsc.connect(silentGain);
    silentGain.connect(audioDestination);
    silentOsc.start();

    // Start background music loop with ducking gain
    let bgGainNode: GainNode | null = null;
    let bgSourceNode: AudioBufferSourceNode | null = null;
    const normalBgVol = Math.max(0.01, Math.min(bgMusicOptions?.volume ?? 0.12, 0.5));

    if (bgBuffer && bgMusicOptions?.enabled) {
      bgSourceNode = audioCtx.createBufferSource();
      bgSourceNode.buffer = bgBuffer;
      bgSourceNode.loop = true;

      bgGainNode = audioCtx.createGain();
      bgGainNode.gain.setValueAtTime(normalBgVol, audioCtx.currentTime);

      bgSourceNode.connect(bgGainNode);
      bgGainNode.connect(audioDestination);
      bgSourceNode.start();
    }

    // ==========================================
    // BƯỚC 4: KHỞI TẠO LUỒNG MEDIARECORDER
    // ==========================================
    onProgress({
      step: 4,
      stepName: 'Đang kết xuất video',
      percent: 25,
      currentSceneIndex: 0,
      totalScenes: scenes.length,
      statusText: 'Đang thiết lập luồng mã hóa video MediaRecorder...',
    });

    this.renderSceneFrame({
      scene: scenes[0],
      img: loadedImages[0],
      videoElem: loadedVideos[0],
      sceneIndex: 0,
      totalScenes: scenes.length,
      sceneProgress: 0,
      transition: 'fade',
    });

    const canvasStream = this.canvas.captureStream(30);
    const audioTracks = audioDestination.stream.getAudioTracks();
    const combinedTracks = [
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ];
    const combinedStream = new MediaStream(combinedTracks);
    const mimeType = this.getSupportedMimeType();

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
    } catch (e: any) {
      throw new Error(`Trình duyệt không hỗ trợ MediaRecorder với định dạng ${mimeType}: ${e.message}`);
    }

    const recordedChunks: Blob[] = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.start(200);

    // ==========================================
    // BƯỚC 2: ĐANG DỰNG PHÂN CẢNH (Frame by frame)
    // ==========================================
    // Dynamic duration based on real audio buffer duration so speech is never truncated
    // Formula: Scene duration = Audio duration + 1.5s hold frame buffer
    const sceneDurations = scenes.map((scene, idx) => {
      const buf = audioBuffers[idx];
      if (buf && buf.duration > 0) {
        return Math.max(scene.duration || 12, buf.duration + 1.5);
      }
      return scene.duration || 12;
    });
    const totalDurationSec = sceneDurations.reduce((a, b) => a + b, 0);

    let currentTime = 0;
    const fps = 30;
    const frameInterval = 1000 / fps;

    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
      if (this.isCancelled) {
        if (bgSourceNode) try { bgSourceNode.stop(); } catch (e) {}
        try { mediaRecorder.stop(); audioCtx.close(); } catch (e) {}
        throw new Error('Đã hủy quá trình xuất video.');
      }

      const scene = scenes[sceneIndex];
      const img = loadedImages[sceneIndex];
      const videoElem = loadedVideos[sceneIndex];
      const duration = sceneDurations[sceneIndex];
      const totalFrames = Math.round(duration * fps);
      const audioBuf = audioBuffers[sceneIndex];

      onProgress({
        step: 2,
        stepName: 'Đang dựng phân cảnh',
        percent: Math.min(85, Math.round(25 + (currentTime / totalDurationSec) * 60)),
        currentSceneIndex: sceneIndex,
        totalScenes: scenes.length,
        statusText: `Đang dựng Cảnh ${sceneIndex + 1}/${scenes.length} (${scene.mediaType === 'video' ? 'Video tư liệu' : 'Hình ảnh'}): ${scene.title}...`,
      });

      // Play narration audio with custom volume and auto-duck background music
      if (audioBuf) {
        try {
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuf;

          const narrGain = audioCtx.createGain();
          narrGain.gain.value = Math.max(0, Math.min(scene.audioVolume ?? 1.0, 1.0));

          source.connect(narrGain);
          narrGain.connect(audioDestination);

          const sceneStartTime = audioCtx.currentTime + 0.3;
          source.start(sceneStartTime);

          // Duck background music during speech
          if (bgGainNode) {
            const duckVol = normalBgVol * 0.25;
            bgGainNode.gain.setValueAtTime(normalBgVol, audioCtx.currentTime);
            bgGainNode.gain.linearRampToValueAtTime(duckVol, sceneStartTime);
            const sceneSpeechEnd = sceneStartTime + audioBuf.duration;
            bgGainNode.gain.setValueAtTime(duckVol, sceneSpeechEnd);
            bgGainNode.gain.linearRampToValueAtTime(normalBgVol, sceneSpeechEnd + 0.8);
          }
        } catch (err) {
          console.warn('Audio playback error during render:', err);
        }
      }

      if (scene.mediaType === 'video' && videoElem) {
        try {
          videoElem.currentTime = scene.clipStart || 0;
          videoElem.muted = true;
          await videoElem.play().catch(() => {});
        } catch (e) {
          console.warn('Video element play error:', e);
        }
      }

      for (let frame = 0; frame < totalFrames; frame++) {
        if (this.isCancelled) {
          if (videoElem) try { videoElem.pause(); } catch (e) {}
          if (bgSourceNode) try { bgSourceNode.stop(); } catch (e) {}
          try { mediaRecorder.stop(); audioCtx.close(); } catch (e) {}
          throw new Error('Đã hủy quá trình xuất video.');
        }

        const sceneProgress = frame / totalFrames;
        const overallProgress = (currentTime + (frame / fps)) / totalDurationSec;

        this.renderSceneFrame({
          scene,
          img,
          videoElem,
          sceneIndex,
          totalScenes: scenes.length,
          sceneProgress,
          transition: scene.transition || 'fade',
        });

        if (frame % 15 === 0) {
          onProgress({
            step: 2,
            stepName: 'Đang dựng phân cảnh',
            percent: Math.min(85, Math.round(25 + overallProgress * 60)),
            currentSceneIndex: sceneIndex,
            totalScenes: scenes.length,
            statusText: `Đang dựng Cảnh ${sceneIndex + 1}/${scenes.length}: ${scene.title} (${Math.round(sceneProgress * 100)}%)...`,
          });
        }

        // Run at 1.0x real-time speed for exact sync with Web Audio API stream
        await new Promise(r => setTimeout(r, frameInterval / Math.min(exportSpeedMultiplier, 1.0)));
      }

      if (scene.mediaType === 'video' && videoElem) {
        try {
          videoElem.pause();
        } catch (e) {}
      }

      currentTime += duration;
    }

    // ==========================================
    // BƯỚC 4: KẾT XUẤT VÀ ĐÓNG GÓI VIDEO
    // ==========================================
    onProgress({
      step: 4,
      stepName: 'Đang kết xuất video',
      percent: 92,
      currentSceneIndex: scenes.length - 1,
      totalScenes: scenes.length,
      statusText: 'Đang kết xuất luồng dữ liệu và hoàn tất tệp video WebM...',
    });

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        try {
          silentOsc.stop();
          if (bgSourceNode) bgSourceNode.stop();
          audioCtx.close();
        } catch (e) {}

        const finalMime = mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: finalMime });

        if (blob.size === 0) {
          reject(new Error('Tệp video tạo ra rỗng (0 bytes). Trình duyệt không thể ghi luồng video WebM.'));
          return;
        }

        const url = URL.createObjectURL(blob);

        onProgress({
          step: 5,
          stepName: 'Hoàn thành – Có thể xem và tải video',
          percent: 100,
          currentSceneIndex: scenes.length,
          totalScenes: scenes.length,
          statusText: 'Đã hoàn thành! Video WebM hoàn chỉnh đã được tạo và sẵn sàng phát lại.',
        });

        resolve({
          blob,
          url,
          duration: totalDurationSec,
          sizeBytes: blob.size,
          mimeType: finalMime,
        });
      };

      mediaRecorder.onerror = e => {
        reject(new Error(`Lỗi kết xuất MediaRecorder: ${(e as any)?.error?.message || 'Không xác định'}`));
      };

      try {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData();
          mediaRecorder.stop();
        }
      } catch (err: any) {
        reject(err);
      }
    });
  }

  private getSupportedMimeType(): string {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return 'video/webm';
  }

  private renderSceneFrame(params: {
    scene: Scene;
    img: HTMLImageElement | null;
    videoElem: HTMLVideoElement | null;
    sceneIndex: number;
    totalScenes: number;
    sceneProgress: number; // 0 to 1
    transition: TransitionEffect;
  }) {
    const { scene, img, videoElem, sceneIndex, totalScenes, sceneProgress } = params;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    let drawnMedia = false;

    // A. Render Video Clip if videoElem has loaded
    if (videoElem && videoElem.readyState >= 1) {
      try {
        const vW = videoElem.videoWidth || 1280;
        const vH = videoElem.videoHeight || 720;
        const vRatio = vW / vH;
        const canvasRatio = w / h;
        let drawW = w;
        let drawH = h;
        let offsetX = 0;
        let offsetY = 0;

        if (vRatio > canvasRatio) {
          drawH = h;
          drawW = h * vRatio;
          offsetX = (w - drawW) / 2;
        } else {
          drawW = w;
          drawH = w / vRatio;
          offsetY = (h - drawH) / 2;
        }

        // Fade in during first 15% of scene
        if (sceneProgress < 0.15 && sceneIndex > 0) {
          ctx.globalAlpha = sceneProgress / 0.15;
        } else {
          ctx.globalAlpha = 1.0;
        }

        ctx.drawImage(videoElem, offsetX, offsetY, drawW, drawH);
        drawnMedia = true;
      } catch (err) {
        drawnMedia = false;
      }
    }

    // B. Render Photo with dynamic Ken Burns Camera Motion (Pan, Zoom In/Out, Tilt)
    if (!drawnMedia && img && img.complete && img.naturalWidth > 0) {
      const motionIdx = sceneIndex % 5;
      let zoomScale = 1.0;
      let panOffsetX = 0;
      let panOffsetY = 0;

      if (motionIdx === 0) {
        // Scene 1: Smooth Zoom In + Pan Right
        zoomScale = 1.05 + sceneProgress * 0.16;
        panOffsetX = (sceneProgress - 0.5) * 60;
        panOffsetY = 0;
      } else if (motionIdx === 1) {
        // Scene 2: Tilt Up + Zoom In
        zoomScale = 1.08 + sceneProgress * 0.14;
        panOffsetX = 0;
        panOffsetY = (0.5 - sceneProgress) * 50;
      } else if (motionIdx === 2) {
        // Scene 3: Zoom Out + Pan Left
        zoomScale = 1.20 - sceneProgress * 0.14;
        panOffsetX = (0.5 - sceneProgress) * 60;
        panOffsetY = 0;
      } else if (motionIdx === 3) {
        // Scene 4: Diagonal Pan & Center Zoom
        zoomScale = 1.06 + sceneProgress * 0.15;
        panOffsetX = (sceneProgress - 0.5) * 45;
        panOffsetY = (sceneProgress - 0.5) * 30;
      } else {
        // Scene 5: Panoramic Zoom Out
        zoomScale = 1.22 - sceneProgress * 0.16;
        panOffsetX = (0.5 - sceneProgress) * 50;
        panOffsetY = (0.5 - sceneProgress) * 30;
      }

      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = w / h;
      let drawW = w;
      let drawH = h;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        drawH = h;
        drawW = h * imgRatio;
        offsetX = (w - drawW) / 2;
      } else {
        drawW = w;
        drawH = w / imgRatio;
        offsetY = (h - drawH) / 2;
      }

      ctx.translate(w / 2 + panOffsetX, h / 2 + panOffsetY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-w / 2, -h / 2);

      if (sceneProgress < 0.12 && sceneIndex > 0) {
        ctx.globalAlpha = sceneProgress / 0.12;
      } else {
        ctx.globalAlpha = 1.0;
      }

      try {
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        drawnMedia = true;
      } catch (e) {
        drawnMedia = false;
      }
    }

    // C. Stylized educational backdrop if media cannot be drawn
    if (!drawnMedia) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      for (let i = 0; i < w; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 120, h);
        ctx.stroke();
      }
    }

    ctx.restore();

    // 2. High-contrast Scrim overlay for subtitles (WCAG AA compliant)
    const scrimGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
    scrimGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    scrimGrad.addColorStop(0.3, 'rgba(15, 23, 42, 0.6)');
    scrimGrad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);

    // Top subtle vignette for header badges
    const topGrad = ctx.createLinearGradient(0, 0, 0, 110);
    topGrad.addColorStop(0, 'rgba(15, 23, 42, 0.7)');
    topGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, 110);

    // 3. Top Zone: Lesson Title & Scene Indicator Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 20px "Outfit", "Plus Jakarta Sans", sans-serif';
    ctx.fillText('BÀI 12A: THỰC HÀNH ĐA PHƯƠNG TIỆN', 40, 48);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    const mediaBadge = scene.mediaType === 'video' ? '🎬 Video tư liệu' : '🎥 Phim hoạt cảnh';
    ctx.fillText(`Cảnh ${sceneIndex + 1} / ${totalScenes} • ${mediaBadge} • Tin học Lớp 4`, 40, 74);

    // Top Right: Source citation & license
    const citeSource = scene.mediaType === 'video' ? (scene.videoSource || scene.sourceCitation) : (scene.imageSource || scene.sourceCitation);
    const citeLicense = scene.mediaType === 'video' ? (scene.videoLicense || 'Tư liệu') : (scene.imageLicense || 'Tư liệu');
    const citeText = `Nguồn: ${citeSource || 'Tư liệu TP.HCM'} (${citeLicense || 'CC BY-SA'})`;
    ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const textWidth = ctx.measureText(citeText).width;
    ctx.fillText(citeText, w - textWidth - 40, 48);

    // 4. Bottom Zone: Educational Lower-Third Subtitle Card
    const cardX = 40;
    const cardY = h - 180;
    const cardW = w - 80;
    const cardH = 140;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Scene Title inside lower-third
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px "Outfit", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${sceneIndex + 1}. ${scene.title}`, cardX + 24, cardY + 38);

    // Narration text with word wrapping
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
    this.wrapText(ctx, scene.narration, cardX + 24, cardY + 70, cardW - 48, 26, 2);
    ctx.restore();

    // 5. Scene Progress Bar at the very bottom
    const pbarH = 6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, h - pbarH, w, pbarH);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, h - pbarH, w * sceneProgress, pbarH);
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 3
  ) {
    if (!text) return;
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    let lineCount = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        lineCount++;
        if (lineCount >= maxLines - 1 && n < words.length - 1) {
          line += '...';
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private loadImageWithFallback(scene: Scene): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
      const sceneNum = Math.max(1, Math.min(5, scene.sceneNumber || 1));
      let src = scene.imageUrl;
      if (!src || src.includes('wikimedia.org')) {
        src = `/images/scene-${sceneNum}.jpg`;
      }

      const img = new Image();
      if (!src.startsWith('/')) {
        img.crossOrigin = 'anonymous';
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Try local asset if external timed out
          if (src !== `/images/scene-${sceneNum}.jpg`) {
            const localImg = new Image();
            localImg.onload = () => resolve(localImg);
            localImg.onerror = () => resolve(this.createFallbackImage(scene.title));
            localImg.src = `/images/scene-${sceneNum}.jpg`;
          } else {
            resolve(this.createFallbackImage(scene.title));
          }
        }
      }, 2500);

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(img);
        }
      };

      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          if (src !== `/images/scene-${sceneNum}.jpg`) {
            const localImg = new Image();
            localImg.onload = () => resolve(localImg);
            localImg.onerror = () => resolve(this.createFallbackImage(scene.title));
            localImg.src = `/images/scene-${sceneNum}.jpg`;
          } else {
            resolve(this.createFallbackImage(scene.title));
          }
        }
      };

      img.src = src;
    });
  }

  private createFallbackImage(title: string): HTMLImageElement {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 1280, 720);
      g.addColorStop(0, '#0c4a6e');
      g.addColorStop(0.5, '#0369a1');
      g.addColorStop(1, '#0284c7');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1280, 720);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 640, 360);

      ctx.font = '22px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('Học liệu minh họa TP. Hồ Chí Minh · Tin học Lớp 4', 640, 420);
    }
    const img = new Image();
    img.src = c.toDataURL('image/jpeg');
    return img;
  }

  private loadVideo(src?: string): Promise<HTMLVideoElement | null> {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.playsInline = true;

      let resolved = false;
      const handleDone = () => {
        if (!resolved) {
          resolved = true;
          resolve(video);
        }
      };

      video.onloadeddata = handleDone;
      video.oncanplay = handleDone;
      video.onerror = () => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      };

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(video.readyState >= 1 ? video : null);
        }
      }, 2500);

      video.src = src;
    });
  }

  private async loadAudioBuffer(audioCtx: AudioContext, src?: string, fallbackSceneNum?: number): Promise<AudioBuffer | null> {
    const targets = [src];
    if (fallbackSceneNum) {
      targets.push(`/audio/scene-${fallbackSceneNum}.mp3`);
    }

    for (const url of targets) {
      if (!url || !url.trim()) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (buffer && buffer.duration > 0) {
          return buffer;
        }
      } catch (e) {
        // try next target
      }
    }
    return null;
  }
}

