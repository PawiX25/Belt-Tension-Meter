const frequencyDisplay = document.getElementById('frequency-display');
const statusMessage = document.getElementById('status-message');
const startBtn = document.getElementById('start-btn');
const gaugeIndicator = document.getElementById('gauge-indicator');
const algorithmSelect = document.getElementById('algorithm-select');

let audioCtx, analyser, micStream, running = false;
let dataArray;
let smoothedFreq = 0;
let loopId;

const REFRESH_MS = 75;
const TARGET_HZ = 85;
const TARGET_MIN = 80;
const TARGET_MAX = 90;
const GAUGE_MIN_HZ = 70;
const GAUGE_MAX_HZ = 100;

const AUTO_SAMPLE_SIZE = 2048;
const AUTO_MIN_HZ = 50;
const AUTO_MAX_HZ = 150;
const AUTO_RMS_THRESHOLD = 0.015;

const FFT_SIZE = 8192;
const FFT_MIN_HZ = 70;
const FFT_MAX_HZ = 120;
const FFT_RMS_THRESHOLD = 0.01;
const SMOOTHING_FACTOR = 0.85;

startBtn.onclick = async () => {
    running ? stop() : await start();
};

algorithmSelect.onchange = () => {
    if (running) {
        stop();
    }
};

async function start() {
    try {
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
    } catch (err) {
        alert('Microphone access was denied. Please allow microphone access in your browser settings.');
        console.error(err);
        return;
    }

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();

    const selectedAlgorithm = algorithmSelect.value;

    if (selectedAlgorithm === 'fft') {
        analyser.fftSize = FFT_SIZE;
        dataArray = new Float32Array(analyser.frequencyBinCount);
    } else {
        analyser.fftSize = AUTO_SAMPLE_SIZE * 2;
        dataArray = new Float32Array(analyser.fftSize);
    }

    const source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);

    running = true;
    startBtn.textContent = 'Stop Listening';
    startBtn.classList.add('listening');
    algorithmSelect.disabled = true;
    statusMessage.textContent = 'Pluck the belt...';
    statusMessage.className = '';

    smoothedFreq = 0;

    loop();
}

function stop() {
    running = false;
    if (loopId) {
        cancelAnimationFrame(loopId);
        clearTimeout(loopId);
        loopId = null;
    }
    if (audioCtx) {
        audioCtx.close();
    }
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
    }
    startBtn.textContent = 'Start Listening';
    startBtn.classList.remove('listening');
    algorithmSelect.disabled = false;
    statusMessage.textContent = 'Click "Start" to begin';
    statusMessage.className = '';
    frequencyDisplay.textContent = '-- Hz';
    gaugeIndicator.style.left = '0%';
}

function loop() {
    if (!running) return;

    const selectedAlgorithm = algorithmSelect.value;

    if (selectedAlgorithm === 'fft') {
        const timeDomainData = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(timeDomainData);
        const rms = Math.hypot(...timeDomainData) / Math.sqrt(timeDomainData.length);

        if (rms > FFT_RMS_THRESHOLD) {
            const freq = findFundamentalFFT(audioCtx.sampleRate);
            if (freq) {
                if (smoothedFreq === 0) {
                    smoothedFreq = freq;
                } else {
                    smoothedFreq = (freq * (1 - SMOOTHING_FACTOR)) + (smoothedFreq * SMOOTHING_FACTOR);
                }
                render(smoothedFreq);
            }
        }
        loopId = requestAnimationFrame(loop);

    } else {
        analyser.getFloatTimeDomainData(dataArray);
        const rms = Math.hypot(...dataArray) / Math.sqrt(dataArray.length);

        if (rms > AUTO_RMS_THRESHOLD) {
            const freq = findFundamentalAutocorrelation(dataArray, audioCtx.sampleRate);
            if (freq) {
                render(freq);
            }
        }
        loopId = setTimeout(loop, REFRESH_MS);
    }
}

function findFundamentalAutocorrelation(buf, sampleRate) {
    const minSamples = Math.floor(sampleRate / AUTO_MAX_HZ);
    const maxSamples = Math.floor(sampleRate / AUTO_MIN_HZ);
    let bestLag = -1;
    let maxCorr = 0;

    for (let lag = minSamples; lag <= maxSamples; lag++) {
        let corr = 0;
        for (let i = 0; i < buf.length - lag; i++) {
            corr += buf[i] * buf[i + lag];
        }
        if (corr > maxCorr) {
            maxCorr = corr;
            bestLag = lag;
        }
    }
    return bestLag !== -1 ? sampleRate / bestLag : null;
}

function findFundamentalFFT(sampleRate) {
    analyser.getFloatFrequencyData(dataArray);

    const binWidth = sampleRate / analyser.fftSize;
    let peakIndex = -1;
    let maxPower = -Infinity;

    const minBin = Math.floor(FFT_MIN_HZ / binWidth);
    const maxBin = Math.ceil(FFT_MAX_HZ / binWidth);

    for (let i = minBin; i <= maxBin; i++) {
        if (dataArray[i] > maxPower) {
            maxPower = dataArray[i];
            peakIndex = i;
        }
    }

    return peakIndex !== -1 ? peakIndex * binWidth : null;
}

function render(freq) {
    frequencyDisplay.textContent = freq.toFixed(1) + ' Hz';

    if (freq >= TARGET_MIN && freq <= TARGET_MAX) {
        if (Math.abs(freq - TARGET_HZ) <= 1) {
            statusMessage.textContent = 'Ideal!';
            statusMessage.className = 'status-ideal';
        } else {
            statusMessage.textContent = 'Good';
            statusMessage.className = 'status-good';
        }
    } else if (freq < TARGET_MIN) {
        statusMessage.textContent = 'Too Loose';
        statusMessage.className = 'status-loose';
    } else {
        statusMessage.textContent = 'Too Tight';
        statusMessage.className = 'status-tight';
    }

    const clampedFreq = Math.max(GAUGE_MIN_HZ, Math.min(GAUGE_MAX_HZ, freq));
    const percent = ((clampedFreq - GAUGE_MIN_HZ) / (GAUGE_MAX_HZ - GAUGE_MIN_HZ)) * 100;
    gaugeIndicator.style.left = percent.toFixed(2) + '%';
}
