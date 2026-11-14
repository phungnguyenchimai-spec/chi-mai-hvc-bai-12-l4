import subprocess, struct, math, os, time

t0 = time.time()
W, H = 1376, 768

print("1. Loading source images...")
p_base = subprocess.run(['ffmpeg', '-i', 'public/images/scene-1.jpg', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
base_rgb = bytearray(p_base.stdout)

p_speak = subprocess.run(['ffmpeg', '-i', 'public/images/scene-1-speaking.jpg', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
speak_rgb = bytearray(p_speak.stdout)

print("2. Extracting and analyzing audio speech envelope...")
subprocess.run(['ffmpeg', '-y', '-i', 'public/audio/scene-1.mp3', '-ar', '16000', '-ac', '1', '/tmp/scene1_mono.wav'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
with open('/tmp/scene1_mono.wav', 'rb') as f:
    wav_bytes = f.read()

pcm = struct.unpack(f'<{(len(wav_bytes)-44)//2}h', wav_bytes[44:])

fps = 25
total_duration = 18.607
total_frames = int(round(total_duration * fps))
samples_per_frame = 16000 / fps

raw_rms = []
for f in range(total_frames):
    s_idx = int(round(f * samples_per_frame))
    sum_sq = 0.0
    cnt = 0
    for i in range(int(samples_per_frame)):
        if s_idx + i < len(pcm):
            v = pcm[s_idx + i] / 32768.0
            sum_sq += v * v
            cnt += 1
    rms = math.sqrt(sum_sq / cnt) if cnt > 0 else 0.0
    raw_rms.append(rms)

max_rms = max(raw_rms) if raw_rms else 1.0

print("3. Synthesizing smooth mouth opening trajectory...")
threshold = 0.024
weights = []
current_w = 0.0

for f in range(total_frames):
    t = f / fps
    rms = raw_rms[f]
    
    # Precise pause detection from audio text timestamps
    is_pause = (1.30 <= t <= 1.65) or (7.45 <= t <= 8.40) or (13.45 <= t <= 14.40) or (t >= 16.65)
    
    if is_pause or rms < threshold:
        target = 0.0
    else:
        norm = min(1.0, (rms - threshold) / (max_rms - threshold))
        # Natural syllabic wave (vowel expansion and consonant soft closure at 3.6 Hz)
        syllable = 0.5 + 0.5 * math.sin(t * 2.0 * math.pi * 3.6)
        # Target opening between 0.18 and 0.58 (moderate, pleasing, natural)
        target = 0.20 + 0.25 * norm + 0.15 * syllable * (0.6 + 0.4 * norm)
        target = min(0.60, target)
        
    # Asymmetric filter: responsive ease-in, gentle ease-out
    if target > current_w:
        current_w = current_w * 0.52 + target * 0.48
    else:
        current_w = current_w * 0.74 + target * 0.26
        
    if current_w < 0.035:
        current_w = 0.0
        
    weights.append(current_w)

# 3-tap Gaussian smoothing across frames
smoothed = [weights[0]]
for i in range(1, len(weights) - 1):
    sm = 0.2 * weights[i-1] + 0.6 * weights[i] + 0.2 * weights[i+1]
    if sm < 0.03:
        sm = 0.0
    smoothed.append(sm)
smoothed.append(weights[-1])
weights = smoothed

print("4. Precomputing feathered mouth ellipse mask (929 px)...")
mask_dict = []
for y in range(198, 233):
    for x in range(668, 725):
        dx = (x - 696) / 23.0
        dy = (y - 215) / 13.0
        dist = math.sqrt(dx*dx + dy*dy)
        if dist < 0.60:
            m = 1.0
        elif dist < 1.0:
            m = 0.5 * (1.0 + math.cos((dist - 0.60) / 0.40 * math.pi))
        else:
            continue
        idx = (y * W + x) * 3
        mask_dict.append((idx, m, base_rgb[idx], base_rgb[idx+1], base_rgb[idx+2], speak_rgb[idx], speak_rgb[idx+1], speak_rgb[idx+2]))

print("5. Encoding WebM HD 720p (VP9 yuv420p + Opus)...")
output_path = 'public/video/scene-1.webm'
cmd = [
    'ffmpeg', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
    '-i', 'public/audio/scene-1.mp3',
    '-vf', 'scale=1280:720:flags=lanczos',
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libvpx-vp9', '-b:v', '1800k', '-crf', '26',
    '-c:a', 'libopus', '-b:a', '96k',
    '-t', str(total_duration),
    output_path
]

proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

frame_buf = bytearray(base_rgb)
for f in range(total_frames):
    w = weights[f]
    if w == 0.0:
        proc.stdin.write(base_rgb)
    else:
        for idx, m, b0, b1, b2, s0, s1, s2 in mask_dict:
            alpha = w * m
            inv = 1.0 - alpha
            frame_buf[idx] = int(b0 * inv + s0 * alpha + 0.5)
            frame_buf[idx+1] = int(b1 * inv + s1 * alpha + 0.5)
            frame_buf[idx+2] = int(b2 * inv + s2 * alpha + 0.5)
        proc.stdin.write(frame_buf)

proc.stdin.close()
proc.wait()

print(f"DONE in {round(time.time() - t0, 1)}s. Video written to {output_path}")
