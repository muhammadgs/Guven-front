// audioRecorder.js - YENİ VERSİYA (yeni ID-lərə uyğun)
class AudioRecorder {
    constructor() {
        console.log('🎤 AudioRecorder constructor çağırıldı');

        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioBlob = null;
        this.maxRecordingTime = 300000; // 5 dəqiqə (5 * 60 * 1000)
        this.timerInterval = null;
        this.recordingStartTime = null;
        this.hasAudioData = false;
        this.audioContext = null;
        this.analyser = null;
        this.canvasContext = null;

        // ✅ ƏSAS FİKS: setTimeout ilə initialize et
        setTimeout(() => {
            this.initialize();
        }, 500);
    }

    initialize() {
        console.log('🔧 AudioRecorder initialize edilir');

        // ✅ YENİ ID-LƏRİ İSTİFADƏ ET
        this.recordBtn = document.getElementById('startRecordingBtn');
        this.stopBtn = document.getElementById('stopRecordingBtn');
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

        // Hidden inputlar
        this.audioDataInput = document.getElementById('audioData');
        this.audioFilenameInput = document.getElementById('audioFilename');

        console.log('🔍 AudioRecorder elementləri axtarılır:', {
            startRecordingBtn: !!this.recordBtn,
            stopRecordingBtn: !!this.stopBtn,
            saveRecordingBtn: !!this.saveBtn,
            cancelRecordingBtn: !!this.cancelBtn,
            audioData: !!this.audioDataInput,
            audioFilename: !!this.audioFilenameInput
        });

        // ✅ ƏSAS FİKS: Elementləri yoxla
        if (!this.recordBtn) {
            console.error('❌ Audio record button tapılmadı!');
            console.error('   Axtarılan ID: startRecordingBtn');
            console.error('   HTML-də bu element olmalıdır:');
            console.error('   <button type="button" id="startRecordingBtn">Səs Qeydinə Başla</button>');
            return;
        }

        console.log('✅ AudioRecorder elementləri tapıldı');

        // Canvas context init
        if (this.audioVisualizer) {
            this.canvasContext = this.audioVisualizer.getContext('2d');
        }

        // Notification service fallback
        this.initNotificationService();

        // Event listener-lər əlavə et
        this.setupEventListeners();

        console.log('✅ AudioRecorder hazırdır');
    }

    initNotificationService() {
        if (!window.notificationService) {
            window.notificationService = {
                showSuccess: function(msg) {
                    console.log('✅ Success:', msg);
                    if (typeof Swal !== 'undefined') {
                        Swal.fire('Uğurlu!', msg, 'success');
                    } else {
                        alert('✅ ' + msg);
                    }
                },
                showError: function(msg) {
                    console.log('❌ Error:', msg);
                    if (typeof Swal !== 'undefined') {
                        Swal.fire('Xəta!', msg, 'error');
                    } else {
                        alert('❌ ' + msg);
                    }
                },
                showInfo: function(msg) {
                    console.log('ℹ️ Info:', msg);
                    if (typeof Swal !== 'undefined') {
                        Swal.fire('Məlumat', msg, 'info');
                    } else {
                        alert('ℹ️ ' + msg);
                    }
                },
                showWarning: function(msg) {
                    console.log('⚠️ Warning:', msg);
                    if (typeof Swal !== 'undefined') {
                        Swal.fire('Xəbərdarlıq', msg, 'warning');
                    } else {
                        alert('⚠️ ' + msg);
                    }
                }
            };
        }
    }

    setupEventListeners() {
        console.log('🎯 AudioRecorder event listener-lər əlavə edilir');

        // ✅ YENİ ID-LƏR İLƏ EVENT LISTENER-LƏR
        this.recordBtn.addEventListener('click', () => {
            console.log('🎤 Record button click edildi');
            this.startRecording();
        });

        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => {
                console.log('⏹️ Stop button click edildi');
                this.stopRecording();
            });
        }

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                console.log('💾 Save button click edildi');
                this.saveRecording();
            });
        }

        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                console.log('🗑️ Cancel button click edildi');
                this.cancelRecording();
            });
        }

        console.log('✅ AudioRecorder event listener-lər əlavə edildi');
    }

    async startRecording() {
        try {
            console.log('🎤 Recording başladılır...');

            // Microfon icazəsini yoxla
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            // AudioContext yarat (visualizer üçün)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);

            // Analyser yarat (visualizer üçün)
            if (this.audioVisualizer) {
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;
                source.connect(this.analyser);
                this.startVisualizer();
            }

            // MediaRecorder yarat
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];

            // Data toplama
            this.mediaRecorder.addEventListener('dataavailable', event => {
                this.audioChunks.push(event.data);
            });

            // Qeyd bitdikdə
            this.mediaRecorder.addEventListener('stop', () => {
                this.audioBlob = new Blob(this.audioChunks, {
                    type: 'audio/webm'
                });

                // WAV formatına çevir
                this.convertToWav().then(() => {
                    this.updateUIAfterRecording();
                    this.showPreview();

                    // Stream-i dayandır
                    stream.getTracks().forEach(track => track.stop());

                    // AudioContext dayandır
                    if (this.audioContext) {
                        this.audioContext.close();
                        this.audioContext = null;
                    }

                    // Visualizer dayandır
                    this.stopVisualizer();

                    console.log('✅ Recording tamamlandı');
                    this.showNotification('success', 'Səs qeydi tamamlandı');
                });
            });

            // Başlat
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.hasAudioData = true;

            // UI yenilə
            this.updateUIWhileRecording();

            // Timer başlat
            this.startTimer();

            // Maksimum müddət
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                    this.showNotification('info', 'Maksimum qeyd müddəti (5 dəqiqə) bitdi');
                }
            }, this.maxRecordingTime);

            console.log('🎤 Recording başladı');

        } catch (error) {
            console.error('❌ Recording başladılarkən xəta:', error);
            this.showNotification('error', 'Mikrofon icazəsi alına bilmədi: ' + error.message);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            console.log('⏹️ Recording dayandırıldı');
        }
    }

    startTimer() {
        if (!this.timerDisplay) return;

        // Recording status və timer göstər
        if (this.recordingStatus) {
            this.recordingStatus.innerHTML = '<i class="fas fa-circle text-danger"></i><span>Qeyd edilir...</span>';
        }
        if (this.recordingTimer) {
            this.recordingTimer.style.display = 'flex';
        }

        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;

            if (this.timerDisplay) {
                this.timerDisplay.textContent =
                    `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Recording status və timer gizlət
        if (this.recordingStatus) {
            this.recordingStatus.innerHTML = '<i class="fas fa-circle text-success"></i><span>Qeyd tamamlandı</span>';
        }
        if (this.recordingTimer) {
            this.recordingTimer.style.display = 'none';
        }
        if (this.timerDisplay) {
            this.timerDisplay.textContent = '00:00';
        }
    }

    startVisualizer() {
        if (!this.canvasContext || !this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const canvas = this.audioVisualizer;
        const ctx = this.canvasContext;

        const draw = () => {
            if (!this.isRecording) return;

            requestAnimationFrame(draw);

            this.analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgb(240, 240, 240)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();
    }

    stopVisualizer() {
        if (!this.canvasContext) return;

        const canvas = this.audioVisualizer;
        const ctx = this.canvasContext;

        ctx.fillStyle = 'rgb(240, 240, 240)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    updateUIWhileRecording() {
        if (this.recordBtn) this.recordBtn.disabled = true;
        if (this.stopBtn) this.stopBtn.disabled = false;
        if (this.saveBtn) this.saveBtn.disabled = true;
        if (this.cancelBtn) this.cancelBtn.disabled = true;
    }

    updateUIAfterRecording() {
        if (this.recordBtn) this.recordBtn.disabled = false;
        if (this.stopBtn) this.stopBtn.disabled = true;
        if (this.saveBtn) this.saveBtn.disabled = false;
        if (this.cancelBtn) this.cancelBtn.disabled = false;
    }

    showPreview() {
        if (!this.audioBlob || !this.recordedAudio || !this.audioPreview) return;

        const audioURL = URL.createObjectURL(this.audioBlob);
        this.recordedAudio.src = audioURL;

        // Audio duration
        this.recordedAudio.onloadedmetadata = () => {
            const duration = this.recordedAudio.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);

            if (this.audioDuration) {
                this.audioDuration.textContent = `Müddət: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Audio size
            const sizeInKB = (this.audioBlob.size / 1024).toFixed(1);
            if (this.audioSize) {
                this.audioSize.textContent = `Ölçü: ${sizeInKB} KB`;
            }
        };

        this.audioPreview.style.display = 'block';
    }

    hidePreview() {
        if (this.audioPreview) {
            this.audioPreview.style.display = 'none';
        }
    }

    async convertToWav() {
        try {
            if (!this.audioBlob) return;

            // WebM blob-u arrayBuffer-a çevir
            const arrayBuffer = await this.audioBlob.arrayBuffer();

            // AudioContext yarat
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 44100
            });

            // ArrayBuffer-dan AudioBuffer yarat
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // WAV-ə çevir
            const wavBlob = this.encodeWAV(audioBuffer);
            this.audioBlob = wavBlob;

            console.log('✅ Audio WAV formatına çevrildi');

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

        // Buffer uzunluğunu hesabla
        const bufferLength = audioBuffer.length * numChannels * bytesPerSample;
        const buffer = new ArrayBuffer(44 + bufferLength);
        const view = new DataView(buffer);

        // WAV header yaz
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

        // Audio data yaz
        let offset = 44;
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

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
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    saveRecording() {
        if (!this.audioBlob) {
            this.showNotification('info', 'Saxlanılacaq səs qeydi yoxdur');
            return;
        }

        try {
            // Blob-u Base64-ə çevir
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result.split(',')[1];

                // Hidden input-lara yaz
                if (this.audioDataInput) {
                    this.audioDataInput.value = base64Data;
                }

                if (this.audioFilenameInput) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    this.audioFilenameInput.value = `ses-qeydi-${timestamp}.wav`;
                }

                console.log('💾 Recording saxlandı');
                this.showNotification('success', 'Səs qeydi saxlandı! Task yaratdığınız zaman avtomatik əlavə olunacaq.');

                // Save button disable et
                if (this.saveBtn) {
                    this.saveBtn.disabled = true;
                }
            };

            reader.onerror = (error) => {
                console.error('❌ Base64 convert xətası:', error);
                this.showNotification('error', 'Səs qeydi saxlanıla bilmədi');
            };

            reader.readAsDataURL(this.audioBlob);

        } catch (error) {
            console.error('❌ Recording save xətası:', error);
            this.showNotification('error', 'Səs qeydi saxlanıla bilmədi: ' + error.message);
        }
    }

    cancelRecording() {
        if (!confirm('Səs qeydini ləğv etmək istədiyinizə əminsiniz?')) {
            return;
        }

        this.audioBlob = null;
        this.audioChunks = [];
        this.hasAudioData = false;

        // UI yenilə
        this.updateUIAfterRecording();
        this.hidePreview();
        this.stopTimer();
        this.stopVisualizer();

        // Hidden input-ları təmizlə
        if (this.audioDataInput) this.audioDataInput.value = '';
        if (this.audioFilenameInput) this.audioFilenameInput.value = '';

        // Recording status reset et
        if (this.recordingStatus) {
            this.recordingStatus.innerHTML = '<i class="fas fa-circle text-muted"></i><span>Səs qeydi hazırdır</span>';
        }

        // Butonları reset et
        if (this.recordBtn) this.recordBtn.disabled = false;
        if (this.stopBtn) this.stopBtn.disabled = true;
        if (this.saveBtn) {
            this.saveBtn.disabled = true;
            this.saveBtn.textContent = '<i class="fas fa-save"></i> Saxla';
        }
        if (this.cancelBtn) this.cancelBtn.disabled = true;

        console.log('🗑️ Recording ləğv edildi');
        this.showNotification('success', 'Səs qeydi ləğv edildi');
    }

    resetRecording() {
        this.cancelRecording();
    }

    // Audio məlumatlarını base64 formatında almaq
    getAudioData() {
        return new Promise((resolve, reject) => {
            if (!this.audioBlob || !this.hasAudioData) {
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                // Base64 məlumatını almaq
                const base64Data = reader.result.split(',')[1];
                resolve({
                    base64: base64Data,
                    filename: `ses-qeydi-${Date.now()}.wav`,
                    blob: this.audioBlob,
                    hasData: true
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(this.audioBlob);
        });
    }

    showNotification(type, message) {
        if (window.notificationService) {
            switch(type) {
                case 'success':
                    window.notificationService.showSuccess(message);
                    break;
                case 'error':
                    window.notificationService.showError(message);
                    break;
                case 'info':
                    window.notificationService.showInfo(message);
                    break;
                case 'warning':
                    window.notificationService.showWarning(message);
                    break;
            }
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }
}

// Global instance yarat
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎤 DOM loaded, AudioRecorder (YENİ VERSİYA) başladılır...');

    try {
        // Notification service fallback
        if (!window.notificationService) {
            window.notificationService = {
                showSuccess: function(msg) {
                    console.log('✅ Success:', msg);
                    alert('✅ ' + msg);
                },
                showError: function(msg) {
                    console.log('❌ Error:', msg);
                    alert('❌ ' + msg);
                },
                showInfo: function(msg) {
                    console.log('ℹ️ Info:', msg);
                    alert('ℹ️ ' + msg);
                },
                showWarning: function(msg) {
                    console.log('⚠️ Warning:', msg);
                    alert('⚠️ ' + msg);
                }
            };
        }

        // Elementləri yoxla
        const recordBtn = document.getElementById('startRecordingBtn');
        if (!recordBtn) {
            console.log('⚠️ Audio record button hələ yoxdur, 1 saniyə gözləyib yenidən yoxlayacaq');

            // 1 saniyə gözlə və yenidən yoxla
            setTimeout(() => {
                console.log('🔄 AudioRecorder (YENİ) yenidən yoxlanılır...');
                if (!window.audioRecorder) {
                    window.audioRecorder = new AudioRecorder();
                }
            }, 1000);

            return;
        }

        // Global instance yarat
        if (!window.audioRecorder) {
            window.audioRecorder = new AudioRecorder();
            console.log('✅ AudioRecorder (YENİ) global instance yaradıldı');
        } else {
            console.log('ℹ️ AudioRecorder artıq mövcuddur');
        }

    } catch (error) {
        console.error('❌ AudioRecorder başladılarkən xəta:', error);
    }
});

// Node.js üçün export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioRecorder };
}