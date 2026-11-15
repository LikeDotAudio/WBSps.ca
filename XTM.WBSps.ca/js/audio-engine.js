/**
 * WBS XTM Precision Audio & Ballistics Engine
 * Handles sound card inputs, system output capture, test generator,
 * high-pass filtering, electromechanical VU ballistics, PPM peak dynamics,
 * and stereo phase cross-correlation.
 */

class XtmAudioEngine {
  constructor() {
    this.ctx = null;
    this.sourceNode = null;
    this.stream = null;
    this.isSystemAudio = false;
    this.activeDeviceId = null;
    this.sourceType = 'none'; // 'mic', 'system', 'test'

    // Gain & Filtering
    this.inputGainNode = null;
    this.inputTrimDb = 0; // -24 to +24 dB
    this.hpfNode = null;
    this.hpfEnabled = false;

    // Monitor / Listen Through
    this.monitorGainNode = null;
    this.monitorEnabled = false;
    this.monitorVolume = 0.7;

    // Splitter & Analyser / Processor
    this.splitterNode = null;
    this.processorNode = null;

    // Test Generator
    this.testOsc = null;
    this.testGain = null;
    this.testType = 'none'; // 'sine1k', 'sine400', 'pink', 'sweep'
    this.sweepTimer = null;

    // Physics parameters for VU (ANSI C16.5 electromechanical 2nd-order ODE)
    this.vuStyle = 'simpson'; // 'simpson' or 'sifam'
    this.vuCoeffs = {
      simpson: { f0: 2.1, zeta: 0.65 },
      sifam: { f0: 3.2, zeta: 0.85 }
    };
    this.vuState = [
      { x1: 0, x2: 0, y1: 0, y2: 0, p: 0 }, // Ch A (Left)
      { x1: 0, x2: 0, y1: 0, y2: 0, p: 0 }  // Ch B (Right)
    ];

    // Physics parameters for PPM (IEC 60268-10 Type IIb Nordic / BBC)
    this.ppmAttack = 0.005; // 5ms attack
    this.ppmDecayDbPerSec = 24 / 2.8; // 24 dB in 2.8s
    this.ppmState = [
      { env: 0, q: -0.12, qv: 0 },
      { env: 0, q: -0.12, qv: 0 }
    ];

    // Phase Correlation state (Pearson normalized, 300ms integration)
    this.phaseAlpha = 0.001;
    this.phaseState = { sL2: 0, sR2: 0, sLR: 0, correlation: 1.0, led: 7 };

    // Reference Calibration Level
    this.refLevelDb = 4; // +4 dBu default
    this.domain = 'analog'; // 'analog' (+4 dBu = 0 VU) or 'digital' (-20 dBFS = 0 VU)

    // Current Metering Output (queried by visualizer on animation frame)
    this.currentLevels = {
      vu: [0, 0],       // Deflection fraction: 0.708 = 0 VU, 1.0 = +3 VU
      ppm: [-0.12, -0.12], // Normalized scale: 0 = -12 dB, 1.0 = +12 dB
      vuDb: [-Infinity, -Infinity],
      ppmDb: [-Infinity, -Infinity],
      phaseCorrelation: 1.0,
      phaseLed: -1,     // 0..7
      peak: [false, false],
      hasAudio: false
    };

    // Listeners for device changes & status
    this.onStatusChange = null;
    this.onDevicesChange = null;
  }

  /**
   * Initializes or resumes the AudioContext
   */
  async ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.calculateCoefficients();
    return this.ctx;
  }

  /**
   * Calculates ballistic biquad coefficients for the VU movement
   */
  calculateCoefficients() {
    if (!this.ctx) return;
    const fs = this.ctx.sampleRate;
    const cfg = this.vuCoeffs[this.vuStyle] || this.vuCoeffs.simpson;
    const omega0 = 2.0 * Math.PI * cfg.f0 / fs;
    const alpha = omega0 * omega0;
    const beta = 2.0 * cfg.zeta * omega0;
    const a0 = 1.0 + beta + alpha;

    this.vuB0 = alpha / a0;
    this.vuB1 = 2.0 * alpha / a0;
    this.vuB2 = alpha / a0;
    this.vuA1 = 2.0 * (alpha - 1.0) / a0;
    this.vuA2 = (1.0 - beta + alpha) / a0;

    // PPM coefficients
    this.ppmAttCoeff = 1.0 - Math.exp(-1.0 / (this.ppmAttack * fs));
    const tauDecay = (2.8 / (24 / 20 * Math.LN10));
    this.ppmDecCoeff = Math.exp(-1.0 / (tauDecay * fs));

    // Phase integration alpha (300 ms time constant)
    this.phaseAlpha = 1.0 - Math.exp(-1.0 / (0.300 * fs));
  }

  /**
   * Set VU Movement Style: 'simpson' (classic amber 300ms) or 'sifam' (crisp 200ms)
   */
  setVuStyle(style) {
    if (style !== 'simpson' && style !== 'sifam') return;
    this.vuStyle = style;
    this.calculateCoefficients();
  }

  /**
   * Query available audio input hardware devices
   */
  async getAudioInputDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch (e) {
      console.warn('Could not enumerate audio devices:', e);
      return [];
    }
  }

  /**
   * Connect to a Sound Card Input / Microphone
   */
  async connectSoundCard(deviceId = null) {
    await this.ensureContext();
    this.stopCurrentSource();

    const constraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 2
      }
    };
    if (deviceId) {
      constraints.audio.deviceId = { exact: deviceId };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      this.activeDeviceId = deviceId;
      this.isSystemAudio = false;
      this.sourceType = 'mic';
      this.setupAudioGraph(stream);

      // Notify device changes
      const devices = await this.getAudioInputDevices();
      if (this.onDevicesChange) this.onDevicesChange(devices, this.activeDeviceId);
      if (this.onStatusChange) this.onStatusChange({ type: 'soundcard', label: stream.getAudioTracks()[0]?.label || 'Soundcard Input' });
      return true;
    } catch (err) {
      console.error('Error connecting sound card:', err);
      if (this.onStatusChange) this.onStatusChange({ type: 'error', error: err.message });
      throw err;
    }
  }

  /**
   * Connect to System Audio Output ("Listen to whatever is playing")
   * Uses getDisplayMedia to capture computer audio
   */
  async connectSystemAudio() {
    await this.ensureContext();
    this.stopCurrentSource();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Stop unused video track immediately
      stream.getVideoTracks().forEach(track => track.stop());

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track selected. When prompted, ensure "Share audio" is checked.');
      }

      this.stream = stream;
      this.isSystemAudio = true;
      this.activeDeviceId = null;
      this.sourceType = 'system';
      this.setupAudioGraph(stream);

      // Track ends when user stops sharing in browser toolbar
      audioTracks[0].onended = () => {
        this.stopCurrentSource();
        if (this.onStatusChange) this.onStatusChange({ type: 'disconnected', label: 'Audio Stopped' });
      };

      if (this.onStatusChange) this.onStatusChange({ type: 'system', label: audioTracks[0].label || 'Computer System Audio' });
      return true;
    } catch (err) {
      console.error('Error capturing system audio:', err);
      if (this.onStatusChange) this.onStatusChange({ type: 'error', error: err.message });
      throw err;
    }
  }

  /**
   * Built-in Signal Generator for testing and calibration
   */
  startTestGenerator(type = 'sine1k') {
    this.ensureContext();
    this.stopCurrentSource();
    this.sourceType = 'test';
    this.testType = type;

    const ctx = this.ctx;
    this.testGain = ctx.createGain();
    this.testGain.gain.value = 0.5; // -6 dBFS reference

    if (type === 'sine1k' || type === 'sine400') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'sine1k' ? 1000 : 400, ctx.currentTime);
      osc.connect(this.testGain);
      osc.start();
      this.testOsc = osc;
    } else if (type === 'pink') {
      // 5-second buffer of Paul Kellet pink noise
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      }
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      noiseNode.loop = true;
      noiseNode.connect(this.testGain);
      noiseNode.start();
      this.testOsc = noiseNode;
    } else if (type === 'sweep') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(20, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + 8);
      osc.connect(this.testGain);
      osc.start();
      this.testOsc = osc;

      // Repeat sweep every 9s
      this.sweepTimer = setInterval(() => {
        if (this.sourceType === 'test' && this.testType === 'sweep' && this.testOsc) {
          try {
            this.testOsc.frequency.cancelScheduledValues(ctx.currentTime);
            this.testOsc.frequency.setValueAtTime(20, ctx.currentTime);
            this.testOsc.frequency.exponentialRampToValueAtTime(20000, ctx.currentTime + 8);
          } catch (_) {}
        }
      }, 9000);
    }

    this.setupAudioGraph(this.testGain, true);
    if (this.onStatusChange) this.onStatusChange({ type: 'test', label: `Test Generator (${type})` });
  }

  /**
   * Wires the Web Audio processing graph
   */
  setupAudioGraph(sourceObj, isDirectNode = false) {
    const ctx = this.ctx;

    if (isDirectNode) {
      this.sourceNode = sourceObj;
    } else {
      this.sourceNode = ctx.createMediaStreamSource(sourceObj);
    }

    // Input Trim Gain
    this.inputGainNode = ctx.createGain();
    this.updateInputGain();

    // High Pass Filter (Sub-Audible Rumble Rejection at 18 Hz or 80 Hz)
    this.hpfNode = ctx.createBiquadFilter();
    this.hpfNode.type = 'highpass';
    this.hpfNode.frequency.setValueAtTime(80, ctx.currentTime);
    this.hpfNode.Q.setValueAtTime(0.707, ctx.currentTime);
    this.updateHpfState();

    // Listen-Through / Monitor Output
    this.monitorGainNode = ctx.createGain();
    this.updateMonitorState();
    this.monitorGainNode.connect(ctx.destination);

    // Channel Splitter (Left = Ch A, Right = Ch B)
    this.splitterNode = ctx.createChannelSplitter(2);

    // Analysis ScriptProcessor / Worklet Node
    // Using ScriptProcessorNode for universal compatibility with bufferSize=1024
    const bufferSize = 1024;
    this.processorNode = ctx.createScriptProcessor(bufferSize, 2, 2);
    this.processorNode.onaudioprocess = (e) => this.processAudioBlock(e);

    // Connect chain:
    // sourceNode -> inputGainNode -> (hpfNode if on) -> splitter / monitor / processor
    this.sourceNode.connect(this.inputGainNode);
    this.inputGainNode.connect(this.hpfNode);

    this.hpfNode.connect(this.monitorGainNode);
    this.hpfNode.connect(this.processorNode);
    // Connect processor to destination (silent dummy connection required for processor to run)
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0.0;
    this.processorNode.connect(silentGain);
    silentGain.connect(ctx.destination);
  }

  /**
   * Stop current audio stream or test generator
   */
  stopCurrentSource() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this.testOsc) {
      try { this.testOsc.stop(); } catch (_) {}
      this.testOsc.disconnect();
      this.testOsc = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (_) {}
      this.sourceNode = null;
    }
    if (this.processorNode) {
      try { this.processorNode.disconnect(); } catch (_) {}
      this.processorNode = null;
    }
    this.sourceType = 'none';
    this.isSystemAudio = false;

    // Reset levels
    this.currentLevels = {
      vu: [0, 0],
      ppm: [-0.12, -0.12],
      vuDb: [-Infinity, -Infinity],
      ppmDb: [-Infinity, -Infinity],
      phaseCorrelation: 1.0,
      phaseLed: -1,
      peak: [false, false],
      hasAudio: false
    };
  }

  /**
   * Process a live block of audio samples
   */
  processAudioBlock(e) {
    const inputL = e.inputBuffer.getChannelData(0);
    const inputR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inputL;
    const len = inputL.length;

    // Reference Scaling:
    // Standard broadcast alignment: 0 dBFS sine = +24 dBu.
    // Nominally 0 VU = +4 dBu (-20 dBFS).
    // Calibration scales with refLevelDb.
    const calGain = Math.pow(10, (4 - this.refLevelDb) / 20);
    const kAvg = Math.pow(10, -3 / 20) / (2 * Math.SQRT2 / Math.PI); // VU scale factor

    let hasSignal = false;
    let peakA = false, peakB = false;

    // Ballistics integration loops
    for (let i = 0; i < len; i++) {
      const sA = inputL[i] * calGain;
      const sB = inputR[i] * calGain;

      const rA = Math.abs(sA);
      const rB = Math.abs(sB);

      if (rA > 0.0001 || rB > 0.0001) hasSignal = true;

      // 1. VU Ballistics (2nd order ODE)
      // Left / Ch A
      const vuInA = rA * kAvg;
      const ynA = this.vuB0 * vuInA + this.vuB1 * this.vuState[0].x1 + this.vuB2 * this.vuState[0].x2
                  - this.vuA1 * this.vuState[0].y1 - this.vuA2 * this.vuState[0].y2;
      this.vuState[0].x2 = this.vuState[0].x1;
      this.vuState[0].x1 = vuInA;
      this.vuState[0].y2 = this.vuState[0].y1;
      this.vuState[0].y1 = ynA;
      this.vuState[0].p = Math.max(-0.03, Math.min(1.15, ynA));

      // Right / Ch B
      const vuInB = rB * kAvg;
      const ynB = this.vuB0 * vuInB + this.vuB1 * this.vuState[1].x1 + this.vuB2 * this.vuState[1].x2
                  - this.vuA1 * this.vuState[1].y1 - this.vuA2 * this.vuState[1].y2;
      this.vuState[1].x2 = this.vuState[1].x1;
      this.vuState[1].x1 = vuInB;
      this.vuState[1].y2 = this.vuState[1].y1;
      this.vuState[1].y1 = ynB;
      this.vuState[1].p = Math.max(-0.03, Math.min(1.15, ynB));

      // 2. PPM Peak Ballistics (IEC envelope)
      // Left
      const rRMS_A = rA / Math.SQRT2;
      if (rRMS_A > this.ppmState[0].env) {
        this.ppmState[0].env += (rRMS_A - this.ppmState[0].env) * this.ppmAttCoeff;
      } else {
        this.ppmState[0].env *= this.ppmDecCoeff;
      }
      // Right
      const rRMS_B = rB / Math.SQRT2;
      if (rRMS_B > this.ppmState[1].env) {
        this.ppmState[1].env += (rRMS_B - this.ppmState[1].env) * this.ppmAttCoeff;
      } else {
        this.ppmState[1].env *= this.ppmDecCoeff;
      }

      // Check Peak Overload (+10 dB above reference)
      if (rA >= 1.0) peakA = true;
      if (rB >= 1.0) peakB = true;

      // 3. Stereo Phase Correlation (Pearson product-moment)
      this.phaseState.sL2 += this.phaseAlpha * (sA * sA - this.phaseState.sL2);
      this.phaseState.sR2 += this.phaseAlpha * (sB * sB - this.phaseState.sR2);
      this.phaseState.sLR += this.phaseAlpha * (sA * sB - this.phaseState.sLR);
    }

    // Convert PPM envelopes to dB and fraction (-12 to +12 scale)
    const ppmDbA = this.ppmState[0].env > 1e-6 ? 20 * Math.log10(this.ppmState[0].env) : -Infinity;
    const ppmDbB = this.ppmState[1].env > 1e-6 ? 20 * Math.log10(this.ppmState[1].env) : -Infinity;

    const ppmFracA = ppmDbA >= -12 ? (ppmDbA + 12) / 24 : -0.12 * (1 - Math.pow(10, (ppmDbA + 12) / 20));
    const ppmFracB = ppmDbB >= -12 ? (ppmDbB + 12) / 24 : -0.12 * (1 - Math.pow(10, (ppmDbB + 12) / 20));

    // Calculate phase correlation index (-1.0 to +1.0)
    const denom = Math.sqrt(this.phaseState.sL2 * this.phaseState.sR2) + 1e-9;
    const corr = hasSignal ? Math.max(-1.0, Math.min(1.0, this.phaseState.sLR / denom)) : 1.0;
    this.phaseState.correlation = corr;

    // Map correlation to 8 discrete LEDs (0 = -1.0 anti-phase, 7 = +1.0 mono in-phase)
    let pLed = -1;
    if (hasSignal) {
      if (corr <= -0.75) pLed = 0;
      else if (corr <= -0.50) pLed = 1;
      else if (corr <= -0.20) pLed = 2;
      else if (corr <= 0.10)  pLed = 3;
      else if (corr <= 0.40)  pLed = 4;
      else if (corr <= 0.70)  pLed = 5;
      else if (corr <= 0.90)  pLed = 6;
      else pLed = 7;
    }
    this.phaseState.led = pLed;

    // Update published levels
    this.currentLevels = {
      vu: [this.vuState[0].p, this.vuState[1].p],
      ppm: [ppmFracA, ppmFracB],
      vuDb: [this.vuDbOf(this.vuState[0].p), this.vuDbOf(this.vuState[1].p)],
      ppmDb: [ppmDbA, ppmDbB],
      phaseCorrelation: corr,
      phaseLed: pLed,
      peak: [peakA, peakB],
      hasAudio: hasSignal
    };
  }

  vuDbOf(p) {
    return p > 0.005 ? 20 * Math.log10(p) + 3 : -Infinity;
  }

  /**
   * Set High-Pass sub-audible filter (HPO = out, HPI = in)
   */
  setHighPass(enabled) {
    this.hpfEnabled = enabled;
    this.updateHpfState();
  }

  updateHpfState() {
    if (!this.hpfNode || !this.ctx) return;
    if (this.hpfEnabled) {
      this.hpfNode.frequency.setValueAtTime(80, this.ctx.currentTime);
    } else {
      this.hpfNode.frequency.setValueAtTime(5, this.ctx.currentTime);
    }
  }

  /**
   * Set calibration reference level in dBu (+4 dBu default, -60 to +30)
   */
  setReferenceLevel(dBu) {
    this.refLevelDb = dBu;
  }

  /**
   * Input Gain Trim (-24 to +24 dB)
   */
  setInputTrim(db) {
    this.inputTrimDb = db;
    this.updateInputGain();
  }

  updateInputGain() {
    if (!this.inputGainNode || !this.ctx) return;
    const gainVal = Math.pow(10, this.inputTrimDb / 20);
    this.inputGainNode.gain.setValueAtTime(gainVal, this.ctx.currentTime);
  }

  /**
   * Monitor / Listen Through toggle & volume
   */
  setMonitor(enabled, volume = null) {
    this.monitorEnabled = enabled;
    if (volume !== null) this.monitorVolume = volume;
    this.updateMonitorState();
  }

  updateMonitorState() {
    if (!this.monitorGainNode || !this.ctx) return;
    const vol = this.monitorEnabled ? this.monitorVolume : 0.0;
    this.monitorGainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
  }
}

// Global singleton instance
window.xtmAudio = new XtmAudioEngine();
