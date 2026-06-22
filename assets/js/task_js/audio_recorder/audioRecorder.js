// audioRecorder.js - redesigned voice recorder UI
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.audioBlob = null;
        this.maxRecordingTime = 300000;
        this.timerInterval = null;
        this.recordingStartTime = null;
        this.pausedAt = null;
        this.totalPausedTime = 0;
        this.hasAudioData = false;
        this.audioContext = null;
        this.analyser = null;
        this.canvasContext = null;
        this.visualizerFrame = null;
        this.visualizerBars = [];
        this.stopPromise = null;
        this.activeStream = null;

        setTimeout(() => this.initialize(), 500);
    }

    initialize() {
        this.voiceShell = document.querySelector('.nt-voice-shell');
        this.recordingUi = document.querySelector('.nt-voice-recording-ui');
        this.recordBtn = document.getElementById('startRecordingBtn');
        this.stopBtn = document.getElementById('stopRecordingBtn');
        this.pauseBtn = document.getElementById('pauseRecordingBtn');
        this.saveBtn = document.getElementById('saveRecordingBtn');
        this.cancelBtn = document.getElementById('cancelRecordingBtn');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordingTimer = document.getElementById('recordingTimer');
        this.audioPreview = document.getElementById('audioPreview');
        this.recordedAudio = document.getElementById('recordedAudio');
        this.audioDuration = document.getElementById('audioDuration');
        this.audioSize = document.getElementById('audioSize');
        this.audioVisualizer = document.getElementById('audioVisualizer');
        this.audioDataInput = document.getElementById('audioData');
        this.audioFilenameInput = document.getElementById('audioFilename');

        if (!this.recordBtn) {
            console.error('❌ Audio record button tapılmadı: startRecordingBtn');
            return;
        }

        if (this.audioVisualizer) {
            this.canvasContext = this.audioVisualizer.getContext('2d');
            this.drawIdleWaveform();
        }

        this.initNotificationService();
        this.setupEventListeners();
        this.setVoiceState('idle');
    }

    initNotificationService() {
        if (!window.notificationService) {
            window.notificationService = {
                showSuccess: msg => (typeof Swal !== 'undefined' ? Swal.fire('Uğurlu!', msg, 'success') : alert('✅ ' + msg)),
                showError: msg => (typeof Swal !== 'undefined' ? Swal.fire('Xəta!', msg, 'error') : alert('❌ ' + msg)),
                showInfo: msg => (typeof Swal !== 'undefined' ? Swal.fire('Məlumat', msg, 'info') : alert('ℹ️ ' + msg)),
                showWarning: msg => (typeof Swal !== 'undefined' ? Swal.fire('Xəbərdarlıq', msg, 'warning') : alert('⚠️ ' + msg))
            };
        }
    }

    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn?.addEventListener('click', () => this.stopRecording());
        this.pauseBtn?.addEventListener('click', () => this.togglePauseRecording());
        this.saveBtn?.addEventListener('click', () => this.saveRecording());
        this.cancelBtn?.addEventListener('click', () => this.cancelRecording());
    }

    setVoiceState(state) {
        if (this.voiceShell) this.voiceShell.dataset.state = state;
        const isIdle = state === 'idle';
        const isActive = ['recording', 'paused', 'stopped', 'saved'].includes(state);

        if (this.recordBtn) {
            this.recordBtn.hidden = !isIdle;
            this.recordBtn.disabled = !isIdle;
        }
        if (this.recordingUi) this.recordingUi.hidden = !isActive;
        if (this.stopBtn) this.stopBtn.disabled = !['recording', 'paused'].includes(state);
        if (this.pauseBtn) this.pauseBtn.disabled = !['recording', 'paused'].includes(state);
        if (this.saveBtn) this.saveBtn.disabled = !['recording', 'paused', 'stopped'].includes(state);
        if (this.cancelBtn) this.cancelBtn.disabled = isIdle;

        if (this.pauseBtn) {
            this.pauseBtn.innerHTML = state === 'paused' ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
            this.pauseBtn.setAttribute('aria-label', state === 'paused' ? 'Davam etdir' : 'Pauza');
        }

        const statuses = {
            idle: ['text-muted', 'Səs qeydi hazırdır'],
            recording: ['text-danger', 'Qeyd edilir...'],
            paused: ['text-primary', 'Pauzada'],
            stopped: ['text-success', 'Səs qeydi tamamlandı'],
            saved: ['text-success', 'Səs qeydi əlavə edildi']
        };
        const [iconClass, label] = statuses[state] || statuses.idle;
        if (this.recordingStatus) {
            this.recordingStatus.innerHTML = `<i class="fas fa-circle ${iconClass}"></i><span>${label}</span>`;
        }
        if (this.recordingTimer) {
            this.recordingTimer.style.display = ['recording', 'paused'].includes(state) ? 'flex' : 'none';
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
            });
            this.activeStream = stream;
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            if (this.audioVisualizer) {
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                this.analyser.smoothingTimeConstant = 0.82;
                source.connect(this.analyser);
            }

            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            this.audioChunks = [];
            this.audioBlob = null;
            this.stopPromise = null;
            this.mediaRecorder.addEventListener('dataavailable', event => {
                if (event.data && event.data.size > 0) this.audioChunks.push(event.data);
            });
            this.mediaRecorder.addEventListener('stop', () => this.handleRecordingStop());

            this.mediaRecorder.start();
            this.isRecording = true;
            this.isPaused = false;
            this.recordingStartTime = Date.now();
            this.pausedAt = null;
            this.totalPausedTime = 0;
            this.hasAudioData = true;
            this.hidePreview();
            this.setVoiceState('recording');
            this.startTimer();
            this.startVisualizer();

            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                    this.showNotification('info', 'Maksimum qeyd müddəti (5 dəqiqə) bitdi');
                }
            }, this.maxRecordingTime);
        } catch (error) {
            console.error('❌ Recording başladılarkən xəta:', error);
            this.isRecording = false;
            this.isPaused = false;
            this.setVoiceState('idle');
            this.showNotification('error', 'Mikrofon icazəsi alına bilmədi: ' + error.message);
        }
    }

    stopRecording() {
        if (this.stopPromise) return this.stopPromise;
        if (!this.mediaRecorder || !this.isRecording) return Promise.resolve();
        this.stopPromise = new Promise(resolve => { this._resolveStop = resolve; });
        if (this.isPaused) this.resumeRecording(false);
        this.isRecording = false;
        this.isPaused = false;
        this.stopTimer(false);
        this.setVoiceState('stopped');
        this.mediaRecorder.stop();
        return this.stopPromise;
    }

    async handleRecordingStop() {
        this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.convertToWav();
        this.showPreview();
        this.cleanupMedia();
        this.stopVisualizer(true);
        this.setVoiceState('stopped');
        this.showNotification('success', 'Səs qeydi tamamlandı');
        if (this._resolveStop) this._resolveStop();
        this._resolveStop = null;
    }

    pauseRecording() {
        if (!this.mediaRecorder || !this.isRecording || this.isPaused) return;
        if (this.mediaRecorder.state === 'recording' && this.mediaRecorder.pause) this.mediaRecorder.pause();
        this.isPaused = true;
        this.pausedAt = Date.now();
        this.stopTimer(true);
        this.setVoiceState('paused');
        this.drawIdleWaveform();
    }

    resumeRecording(updateState = true) {
        if (!this.mediaRecorder || !this.isRecording || !this.isPaused) return;
        if (this.pausedAt) this.totalPausedTime += Date.now() - this.pausedAt;
        this.pausedAt = null;
        if (this.mediaRecorder.state === 'paused' && this.mediaRecorder.resume) this.mediaRecorder.resume();
        this.isPaused = false;
        if (updateState) {
            this.setVoiceState('recording');
            this.startTimer();
            this.startVisualizer();
        }
    }

    togglePauseRecording() {
        this.isPaused ? this.resumeRecording() : this.pauseRecording();
    }

    startTimer() {
        if (!this.timerDisplay) return;
        if (this.timerInterval) clearInterval(this.timerInterval);
        const tick = () => {
            if (!this.recordingStartTime) return;
            const elapsed = Date.now() - this.recordingStartTime - this.totalPausedTime;
            const seconds = Math.max(0, Math.floor(elapsed / 1000));
            this.timerDisplay.textContent = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        };
        tick();
        this.timerInterval = setInterval(tick, 500);
    }

    stopTimer(keepDisplay = false) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (!keepDisplay && this.timerDisplay) this.timerDisplay.textContent = '00:00';
    }

    startVisualizer() {
        if (!this.canvasContext || !this.analyser) return;
        cancelAnimationFrame(this.visualizerFrame);
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const barCount = 32;
        if (this.visualizerBars.length !== barCount) this.visualizerBars = Array(barCount).fill(10);

        const draw = () => {
            if (!this.isRecording || this.isPaused) return;
            this.visualizerFrame = requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(dataArray);
            this.drawWaveformBars(dataArray, barCount, bufferLength);
        };
        draw();
    }

    drawWaveformBars(dataArray, barCount, bufferLength) {
        const canvas = this.audioVisualizer;
        const ctx = this.canvasContext;
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        const gap = 8;
        const barWidth = Math.max(6, (width - gap * (barCount - 1)) / barCount);
        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#14c8ff');
        gradient.addColorStop(1, '#078ee8');
        ctx.fillStyle = gradient;

        for (let i = 0; i < barCount; i++) {
            const start = Math.floor((i / barCount) * bufferLength);
            const end = Math.floor(((i + 1) / barCount) * bufferLength);
            let total = 0;
            for (let j = start; j < end; j++) total += dataArray[j] || 0;
            const average = total / Math.max(1, end - start);
            const target = Math.max(12, (average / 255) * (height * 0.82));
            this.visualizerBars[i] += (target - this.visualizerBars[i]) * 0.28;
            const x = i * (barWidth + gap);
            const h = this.visualizerBars[i];
            this.roundRect(ctx, x, centerY - h / 2, barWidth, h, barWidth / 2);
        }
    }

    drawIdleWaveform() {
        if (!this.canvasContext || !this.audioVisualizer) return;
        const canvas = this.audioVisualizer;
        const ctx = this.canvasContext;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 32;
        const gap = 8;
        const barWidth = Math.max(6, (canvas.width - gap * (bars - 1)) / bars);
        ctx.fillStyle = 'rgba(9, 174, 234, 0.28)';
        for (let i = 0; i < bars; i++) {
            const h = 10 + (i % 4) * 2;
            this.roundRect(ctx, i * (barWidth + gap), canvas.height / 2 - h / 2, barWidth, h, barWidth / 2);
        }
    }

    roundRect(ctx, x, y, width, height, radius) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, radius);
            ctx.fill();
            return;
        }
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.fill();
    }

    stopVisualizer(showIdle = false) {
        cancelAnimationFrame(this.visualizerFrame);
        this.visualizerFrame = null;
        if (showIdle) this.drawIdleWaveform();
    }

    cleanupMedia() {
        this.activeStream?.getTracks().forEach(track => track.stop());
        this.activeStream = null;
        if (this.audioContext) this.audioContext.close();
        this.audioContext = null;
        this.analyser = null;
    }

    showPreview() {
        if (!this.audioBlob || !this.recordedAudio || !this.audioPreview) return;
        this.recordedAudio.src = URL.createObjectURL(this.audioBlob);
        this.recordedAudio.onloadedmetadata = () => {
            const duration = this.recordedAudio.duration || 0;
            if (this.audioDuration) this.audioDuration.textContent = `Müddət: ${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`;
            if (this.audioSize) this.audioSize.textContent = `Ölçü: ${(this.audioBlob.size / 1024).toFixed(1)} KB`;
        };
        this.audioPreview.style.display = 'block';
    }

    hidePreview() { if (this.audioPreview) this.audioPreview.style.display = 'none'; }

    async convertToWav() {
        try {
            if (!this.audioBlob) return;
            const arrayBuffer = await this.audioBlob.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            this.audioBlob = this.encodeWAV(audioBuffer);
            audioContext.close();
        } catch (error) {
            console.error('❌ Audio convert edilərkən xəta:', error);
        }
    }

    encodeWAV(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const bufferLength = audioBuffer.length * numChannels * bytesPerSample;
        const buffer = new ArrayBuffer(44 + bufferLength);
        const view = new DataView(buffer);
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + bufferLength, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, bufferLength, true);
        let offset = 44;
        const channels = Array.from({ length: numChannels }, (_, i) => audioBuffer.getChannelData(i));
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        return new Blob([view], { type: 'audio/wav' });
    }

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    }

    async saveRecording() {
        if (this.isRecording) await this.stopRecording();
        if (!this.audioBlob) {
            this.showNotification('info', 'Saxlanılacaq səs qeydi yoxdur');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            if (this.audioDataInput) this.audioDataInput.value = base64Data;
            if (this.audioFilenameInput) this.audioFilenameInput.value = `ses-qeydi-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
            this.hasAudioData = true;
            this.setVoiceState('saved');
            this.showNotification('success', 'Səs qeydi saxlandı! Task yaratdığınız zaman avtomatik əlavə olunacaq.');
        };
        reader.onerror = error => {
            console.error('❌ Base64 convert xətası:', error);
            this.showNotification('error', 'Səs qeydi saxlanıla bilmədi');
        };
        reader.readAsDataURL(this.audioBlob);
    }

    cancelRecording() {
        if (this.isRecording) this.stopRecording();
        this.audioBlob = null;
        this.audioChunks = [];
        this.hasAudioData = false;
        if (this.audioDataInput) this.audioDataInput.value = '';
        if (this.audioFilenameInput) this.audioFilenameInput.value = '';
        this.hidePreview();
        this.stopTimer(false);
        this.stopVisualizer(false);
        this.drawIdleWaveform();
        this.setVoiceState('idle');
    }

    resetRecording() { this.cancelRecording(); }

    getAudioData() {
        return new Promise((resolve, reject) => {
            if (!this.audioBlob || !this.hasAudioData) return resolve(null);
            const reader = new FileReader();
            reader.onloadend = () => resolve({
                base64: reader.result.split(',')[1],
                filename: `ses-qeydi-${Date.now()}.wav`,
                blob: this.audioBlob,
                hasData: true
            });
            reader.onerror = reject;
            reader.readAsDataURL(this.audioBlob);
        });
    }

    showNotification(type, message) {
        const service = window.notificationService;
        if (!service) return console.log(`${type.toUpperCase()}: ${message}`);
        const method = { success: 'showSuccess', error: 'showError', info: 'showInfo', warning: 'showWarning' }[type];
        service[method]?.(message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (!window.audioRecorder) window.audioRecorder = new AudioRecorder();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioRecorder };
}
