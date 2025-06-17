const frequencyDisplay = document.getElementById('frequency-display');
        const statusMessage = document.getElementById('status-message');
        const startBtn = document.getElementById('start-btn');
        const gaugeIndicator = document.getElementById('gauge-indicator');
        let audioCtx, analyser, dataArray, micStream, running = false;
        const SAMPLE_SIZE = 2048;
        const REFRESH_MS = 75;
        const MIN_HZ = 50, MAX_HZ = 150;
        const TARGET_HZ = 85;
        const TARGET_MIN = 80;
        const TARGET_MAX = 90;
        const GAUGE_MIN_HZ = 70;
        const GAUGE_MAX_HZ = 100;
        startBtn.onclick = async () => {
            running ? stop() : await start();
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
            analyser.fftSize = SAMPLE_SIZE * 2;
            dataArray = new Float32Array(analyser.fftSize);
            audioCtx.createMediaStreamSource(micStream).connect(analyser);
            running = true;
            startBtn.textContent = 'Stop Listening';
            startBtn.classList.add('listening');
            statusMessage.textContent = 'Pluck the belt...';
            statusMessage.className = '';
            loop();
        }

        function stop() {
            running = false;
            if (audioCtx) { audioCtx.close(); }
            if (micStream) { micStream.getTracks().forEach(track => track.stop()); }
            startBtn.textContent = 'Start Listening';
            startBtn.classList.remove('listening');
            statusMessage.textContent = 'Click "Start" to begin';
            statusMessage.className = '';
            frequencyDisplay.textContent = '-- Hz';
            gaugeIndicator.style.left = '0%';
        }

        function loop() {
            if (!running) return;

            analyser.getFloatTimeDomainData(dataArray);
            const rms = Math.hypot(...dataArray) / Math.sqrt(dataArray.length);
            if (rms > 0.015) { 
                const freq = findFundamental(dataArray, audioCtx.sampleRate);
                if (freq) {
                    render(freq);
                }
            }
            setTimeout(loop, REFRESH_MS);
        }
        function findFundamental(buf, sampleRate) {
            let maxCorr = 0, bestLag = -1;
            for (let lag = Math.floor(sampleRate / MAX_HZ); lag <= sampleRate / MIN_HZ; lag++) {
                let corr = 0;
                for (let i = 0; i < buf.length - lag; i++) {
                    corr += buf[i] * buf[i + lag];
                }
                if (corr > maxCorr) {
                    maxCorr = corr;
                    bestLag = lag;
                }
            }
            return bestLag > 0 ? sampleRate / bestLag : null;
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
