// audioRecorder.js - modern voice recorder UI
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
        this.elapsedBeforePause = 0;
        this.totalElapsed = 0;
        this.hasAudioData = false;
        this.audioContext = null;
        this.analyser = null;
        this.canvasContext = null;
        this.visualizerFrame = null;
        this.waveformLevels = new Array(32).fill(0.18);
        this.pendingSaveAfterStop = false;
        this.stopPromise = null;
        this.stopPromiseResolve = null;

        setTimeout(() => this.initialize(), 500);
    }

    initialize() {
        this.voiceRecorder = document.getElementById('voiceRecorder');
        this.voiceShell = this.voiceRecorder ? this.voiceRecorder.querySelector('.nt-voice-shell') : null;
        this.recordingUi = this.voiceRecorder ? this.voiceRecorder.querySelector('.nt-voice-recording-ui') : null;
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
            console.error('❌ Audio record button tapılmadı! Axtarılan ID: startRecordingBtn');
            return;
        }

        if (this.audioVisualizer) this.canvasContext = this.audioVisualizer.getContext('2d');
        this.initNotificationService();
        this.setupEventListeners();
        this.setVoiceState('idle');
        this.drawSoftWaveform(true);
        console.log('✅ AudioRecorder hazırdır');
    }

    initNotificationService() {
        if (!window.notificationService) {
            window.notificationService = {
                showSuccess: msg => typeof Swal !== 'undefined' ? Swal.fire('Uğurlu!', msg, 'success') : alert('✅ ' + msg),
                showError: msg => typeof Swal !== 'undefined' ? Swal.fire('Xəta!', msg, 'error') : alert('❌ ' + msg),
                showInfo: msg => typeof Swal !== 'undefined' ? Swal.fire('Məlumat', msg, 'info') : alert('ℹ️ ' + msg),
                showWarning: msg => typeof Swal !== 'undefined' ? Swal.fire('Xəbərdarlıq', msg, 'warning') : alert('⚠️ ' + msg)
            };
        }
    }

    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.startRecording());
        if (this.stopBtn) this.stopBtn.addEventListener('click', () => this.stopRecording());
        if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePauseRecording());
        if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.saveRecording());
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.cancelRecording());
    }

    setVoiceState(state) {
        if (this.voiceShell) this.voiceShell.dataset.state = state;
        if (this.recordBtn) this.recordBtn.hidden = state !== 'idle';
        if (this.recordingUi) this.recordingUi.hidden = state === 'idle';

        const isActive = state === 'recording' || state === 'paused';
        if (this.stopBtn) this.stopBtn.disabled = !isActive;
        if (this.pauseBtn) this.pauseBtn.disabled = !isActive;
        if (this.saveBtn) this.saveBtn.disabled = !(isActive || state === 'stopped');

        if (this.pauseBtn) {
            this.pauseBtn.setAttribute('aria-label', state === 'paused' ? 'Davam et' : 'Pauza');
            this.pauseBtn.innerHTML = state === 'paused' ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        }

        if (this.recordingTimer) this.recordingTimer.style.display = isActive ? 'flex' : 'none';
    }

    setStatus(text, tone = 'ready') {
        if (!this.recordingStatus) return;
        this.recordingStatus.className = `recording-status is-${tone}`;
        this.recordingStatus.innerHTML = `<i class="fas fa-circle"></i><span>${text}</span>`;
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            this.audioChunks = [];
            this.audioBlob = null;
            this.hasAudioData = false;
            this.isPaused = false;
            this.elapsedBeforePause = 0;
            this.totalElapsed = 0;
            if (this.audioDataInput) this.audioDataInput.value = '';
            if (this.audioFilenameInput) this.audioFilenameInput.value = '';
            this.hidePreview();

            this.mediaRecorder.addEventListener('dataavailable', event => { if (event.data && event.data.size) this.audioChunks.push(event.data); });
            this.mediaRecorder.addEventListener('stop', async () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                await this.convertToWav();
                this.hasAudioData = true;
                stream.getTracks().forEach(track => track.stop());
                if (this.audioContext) { await this.audioContext.close(); this.audioContext = null; }
                this.stopVisualizer();
                this.showPreview();
                this.setVoiceState('stopped');
                this.setStatus('Səs qeydi tamamlandı', 'success');
                if (this.stopPromiseResolve) this.stopPromiseResolve();
                if (this.pendingSaveAfterStop) { this.pendingSaveAfterStop = false; this.saveRecording(); }
            });

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.startTimer();
            this.setVoiceState('recording');
            this.setStatus('Qeyd edilir...', 'recording');
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
            this.stopTimer(false);
            this.setVoiceState('idle');
            this.setStatus('Səs qeydi hazırdır', 'ready');
            this.showNotification('error', 'Mikrofon icazəsi alına bilmədi: ' + error.message);
        }
    }

    stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) return Promise.resolve();
        this.stopPromise = new Promise(resolve => { this.stopPromiseResolve = resolve; });
        this.totalElapsed = this.getElapsedTime();
        this.isRecording = false;
        this.isPaused = false;
        this.stopTimer(false);
        if (this.mediaRecorder.state === 'paused' && this.mediaRecorder.resume) this.mediaRecorder.resume();
        if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
        return this.stopPromise;
    }

    pauseRecording() {
        if (!this.mediaRecorder || !this.isRecording || this.isPaused) return;
        if (this.mediaRecorder.pause && this.mediaRecorder.state === 'recording') this.mediaRecorder.pause();
        this.elapsedBeforePause += Date.now() - this.recordingStartTime;
        this.isPaused = true;
        this.stopTimer(true);
        this.setVoiceState('paused');
        this.setStatus('Pauzada', 'paused');
        this.drawSoftWaveform(true);
    }

    resumeRecording() {
        if (!this.mediaRecorder || !this.isRecording || !this.isPaused) return;
        if (this.mediaRecorder.resume && this.mediaRecorder.state === 'paused') this.mediaRecorder.resume();
        this.recordingStartTime = Date.now();
        this.isPaused = false;
        this.startTimer();
        this.setVoiceState('recording');
        this.setStatus('Qeyd edilir...', 'recording');
        this.startVisualizer();
    }

    togglePauseRecording() { this.isPaused ? this.resumeRecording() : this.pauseRecording(); }

    getElapsedTime() { return this.isPaused ? this.elapsedBeforePause : this.elapsedBeforePause + (Date.now() - this.recordingStartTime); }

    startTimer() {
        if (!this.timerDisplay) return;
        clearInterval(this.timerInterval);
        const update = () => {
            const seconds = Math.floor(this.getElapsedTime() / 1000);
            this.timerDisplay.textContent = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        };
        update();
        this.timerInterval = setInterval(update, 250);
    }

    stopTimer(reset = false) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (reset && this.timerDisplay) this.timerDisplay.textContent = '00:00';
    }

    roundedRect(ctx, x, y, width, height, radius) {
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill(); return; }
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath(); ctx.fill();
    }

    drawSoftWaveform(idle = false) {
        if (!this.canvasContext || !this.audioVisualizer) return;
        const canvas = this.audioVisualizer, ctx = this.canvasContext;
        const width = canvas.width, height = canvas.height, centerY = height / 2;
        ctx.clearRect(0, 0, width, height);
        const barCount = this.waveformLevels.length;
        const gap = Math.max(5, width * 0.012);
        const barWidth = Math.max(7, (width - gap * (barCount - 1)) / barCount);
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#08b7ea'); gradient.addColorStop(1, '#049bdc');
        ctx.fillStyle = gradient;
        for (let i = 0; i < barCount; i++) {
            const level = idle ? Math.max(0.12, this.waveformLevels[i] * 0.92) : this.waveformLevels[i];
            const barHeight = Math.max(16, level * (height * 0.86));
            const x = i * (barWidth + gap);
            this.roundedRect(ctx, x, centerY - barHeight / 2, barWidth, barHeight, barWidth / 2);
        }
    }

    startVisualizer() {
        if (!this.canvasContext || !this.analyser) return;
        cancelAnimationFrame(this.visualizerFrame);
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const draw = () => {
            if (!this.isRecording || this.isPaused) return;
            this.analyser.getByteFrequencyData(dataArray);
            for (let i = 0; i < this.waveformLevels.length; i++) {
                const index = Math.floor((i / this.waveformLevels.length) * dataArray.length * 0.82);
                const target = Math.min(1, Math.max(0.16, dataArray[index] / 185));
                this.waveformLevels[i] += (target - this.waveformLevels[i]) * 0.22;
            }
            this.drawSoftWaveform(false);
            this.visualizerFrame = requestAnimationFrame(draw);
        };
        draw();
    }

    stopVisualizer() { cancelAnimationFrame(this.visualizerFrame); this.visualizerFrame = null; this.drawSoftWaveform(true); }

    showPreview() {
        if (!this.audioBlob || !this.recordedAudio || !this.audioPreview) return;
        this.recordedAudio.src = URL.createObjectURL(this.audioBlob);
        this.recordedAudio.onloadedmetadata = () => {
            const duration = this.recordedAudio.duration;
            if (this.audioDuration && Number.isFinite(duration)) this.audioDuration.textContent = `Müddət: ${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`;
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
        } catch (error) { console.error('❌ Audio convert edilərkən xəta:', error); }
    }

    encodeWAV(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels, sampleRate = audioBuffer.sampleRate, bitsPerSample = 16, bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample, byteRate = sampleRate * blockAlign;
        const bufferLength = audioBuffer.length * numChannels * bytesPerSample;
        const buffer = new ArrayBuffer(44 + bufferLength), view = new DataView(buffer);
        this.writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + bufferLength, true); this.writeString(view, 8, 'WAVE'); this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true); this.writeString(view, 36, 'data'); view.setUint32(40, bufferLength, true);
        let offset = 44; const channels = Array.from({ length: numChannels }, (_, i) => audioBuffer.getChannelData(i));
        for (let i = 0; i < audioBuffer.length; i++) for (let channel = 0; channel < numChannels; channel++) { const sample = Math.max(-1, Math.min(1, channels[channel][i])); view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true); offset += 2; }
        return new Blob([view], { type: 'audio/wav' });
    }

    writeString(view, offset, string) { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); }

    async saveRecording() {
        if (this.isRecording) { this.pendingSaveAfterStop = true; await this.stopRecording(); return; }
        if (!this.audioBlob) { this.showNotification('info', 'Saxlanılacaq səs qeydi yoxdur'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            if (this.audioDataInput) this.audioDataInput.value = reader.result.split(',')[1];
            if (this.audioFilenameInput) this.audioFilenameInput.value = `ses-qeydi-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
            this.setVoiceState('saved');
            this.setStatus('Səs qeydi əlavə edildi', 'success');
            this.showNotification('success', 'Səs qeydi saxlandı! Task yaratdığınız zaman avtomatik əlavə olunacaq.');
        };
        reader.onerror = error => { console.error('❌ Base64 convert xətası:', error); this.showNotification('error', 'Səs qeydi saxlanıla bilmədi'); };
        reader.readAsDataURL(this.audioBlob);
    }

    cancelRecording() {
        if (this.isRecording) this.stopRecording();
        this.audioBlob = null; this.audioChunks = []; this.hasAudioData = false; this.isPaused = false; this.elapsedBeforePause = 0;
        this.hidePreview(); this.stopTimer(true); this.stopVisualizer();
        if (this.audioDataInput) this.audioDataInput.value = '';
        if (this.audioFilenameInput) this.audioFilenameInput.value = '';
        this.setVoiceState('idle'); this.setStatus('Səs qeydi hazırdır', 'ready');
    }

    resetRecording() { this.cancelRecording(); }

    getAudioData() {
        return new Promise((resolve, reject) => {
            if (!this.audioBlob || !this.hasAudioData) { resolve(null); return; }
            const reader = new FileReader();
            reader.onloadend = () => resolve({ base64: reader.result.split(',')[1], filename: `ses-qeydi-${Date.now()}.wav`, blob: this.audioBlob, hasData: true });
            reader.onerror = reject; reader.readAsDataURL(this.audioBlob);
        });
    }

    showNotification(type, message) {
        if (window.notificationService) {
            const method = { success: 'showSuccess', error: 'showError', info: 'showInfo', warning: 'showWarning' }[type];
            if (window.notificationService[method]) return window.notificationService[method](message);
        }
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    try {
        if (!window.audioRecorder) window.audioRecorder = new AudioRecorder();
    } catch (error) { console.error('❌ AudioRecorder başladılarkən xəta:', error); }
});

if (typeof module !== 'undefined' && module.exports) module.exports = { AudioRecorder };
