/**
 * WBS XTM Standalone Application Coordinator
 * Handles user interactions, audio device enumeration, Web Audio binding,
 * responsive rendering, and 60 FPS animation loop.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const model = window.xtmModel;
  const audio = window.xtmAudio;
  const stageEl = document.getElementById('visualizerStage');
  const podStageEl = document.getElementById('pod22Stage');
  const view = new window.XtmView(stageEl);
  const podView = new window.Pod22View(podStageEl);

  // Sync initial hardware settings with audio engine
  audio.setReferenceLevel(model.getActiveReferenceLevel());
  audio.setHighPass(model.hp === 1);
  audio.setVuStyle(model.meterStyle);

  model.onChange = (m) => {
    audio.setReferenceLevel(m.getActiveReferenceLevel());
    audio.setHighPass(m.hp === 1);
    audio.setVuStyle(m.meterStyle);
  };

  /* ---------------- UI Element References ---------------- */
  const btnConnectCard = document.getElementById('btnConnectCard');
  const btnConnectSystem = document.getElementById('btnConnectSystem');
  const selectDevice = document.getElementById('selectDevice');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const audioBanner = document.getElementById('audioBanner');
  const bannerMicBtn = document.getElementById('bannerMicBtn');
  const bannerSysBtn = document.getElementById('bannerSysBtn');
  const bannerTestBtn = document.getElementById('bannerTestBtn');

  const btnFlipView = document.getElementById('btnFlipView');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnTestGen = document.getElementById('btnTestGen');
  const selectTestType = document.getElementById('selectTestType');

  const inputGainSlider = document.getElementById('inputGainSlider');
  const inputGainVal = document.getElementById('inputGainVal');

  const chkMonitor = document.getElementById('chkMonitor');
  const monitorVolSlider = document.getElementById('monitorVolSlider');
  const monitorVolVal = document.getElementById('monitorVolVal');

  const selectMeterStyle = document.getElementById('selectMeterStyle');
  const selectLampColor = document.getElementById('selectLampColor');
  const chkHpf = document.getElementById('chkHpf');
  const chkTerm = document.getElementById('chkTerm');

  /* ---------------- Audio Device Enumeration ---------------- */
  async function refreshDeviceList(selectedId = null) {
    const devices = await audio.getAudioInputDevices();
    selectDevice.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'Default Soundcard Input';
    selectDevice.appendChild(defaultOpt);

    devices.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Audio Input ${idx + 1}`;
      if (selectedId && dev.deviceId === selectedId) {
        opt.selected = true;
      }
      selectDevice.appendChild(opt);
    });
  }

  // Initial scan of available audio hardware
  try {
    await refreshDeviceList();
  } catch (_) {}

  // Auto-update when USB sound cards or headsets are plugged in/out
  if (navigator.mediaDevices && navigator.mediaDevices.ondevicechange !== undefined) {
    navigator.mediaDevices.ondevicechange = async () => {
      await refreshDeviceList(audio.activeDeviceId);
    };
  }

  /* ---------------- Sound Card Connection Handlers ---------------- */
  async function handleConnectSoundcard(deviceId = null) {
    try {
      statusText.textContent = 'Requesting soundcard access...';
      statusDot.className = 'status-dot warn';

      await audio.connectSoundCard(deviceId);
      await refreshDeviceList(audio.activeDeviceId);

      statusDot.className = 'status-dot active';
      btnConnectCard.classList.add('btn-active');
      btnConnectSystem.classList.remove('btn-active');
      audioBanner.classList.add('hidden');
    } catch (err) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Access Denied / Error';
      alert('Could not access soundcard: ' + err.message + '\n\nPlease ensure permission is granted in your browser.');
    }
  }

  async function handleConnectSystemAudio() {
    try {
      statusText.textContent = 'Select system audio output...';
      statusDot.className = 'status-dot warn';

      await audio.connectSystemAudio();

      statusDot.className = 'status-dot active';
      btnConnectSystem.classList.add('btn-active');
      btnConnectCard.classList.remove('btn-active');
      audioBanner.classList.add('hidden');
    } catch (err) {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Audio capture cancelled';
      if (err.message && !err.message.includes('Permission denied')) {
        alert('System audio capture note: ' + err.message + '\n\nWhen prompted, be sure to check "Share audio" or "System audio".');
      }
    }
  }

  btnConnectCard.addEventListener('click', () => handleConnectSoundcard(selectDevice.value || null));
  btnConnectSystem.addEventListener('click', handleConnectSystemAudio);

  bannerMicBtn.addEventListener('click', () => handleConnectSoundcard());
  bannerSysBtn.addEventListener('click', handleConnectSystemAudio);
  bannerTestBtn.addEventListener('click', () => {
    audio.startTestGenerator('sine1k');
    audioBanner.classList.add('hidden');
    btnConnectCard.classList.remove('btn-active');
    btnConnectSystem.classList.remove('btn-active');
  });

  selectDevice.addEventListener('change', () => {
    handleConnectSoundcard(selectDevice.value || null);
  });

  /* ---------------- Audio Engine Status Callback ---------------- */
  audio.onStatusChange = (status) => {
    if (status.type === 'soundcard') {
      statusText.textContent = `Listening: ${status.label.substring(0, 26)}`;
      statusDot.className = 'status-dot active';
      btnConnectCard.classList.add('btn-active');
      btnConnectSystem.classList.remove('btn-active');
    } else if (status.type === 'system') {
      statusText.textContent = 'Listening: Computer Output (System Audio)';
      statusDot.className = 'status-dot active';
      btnConnectSystem.classList.add('btn-active');
      btnConnectCard.classList.remove('btn-active');
    } else if (status.type === 'test') {
      statusText.textContent = `Generator: ${status.label}`;
      statusDot.className = 'status-dot active';
    } else if (status.type === 'disconnected') {
      statusText.textContent = 'Disconnected';
      statusDot.className = 'status-dot';
      btnConnectCard.classList.remove('btn-active');
      btnConnectSystem.classList.remove('btn-active');
    }
  };

  /* ---------------- Gain & Monitoring ---------------- */
  inputGainSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audio.setInputTrim(val);
    inputGainVal.textContent = (val > 0 ? '+' : '') + val.toFixed(1) + ' dB';
  });

  chkMonitor.addEventListener('change', (e) => {
    audio.setMonitor(e.target.checked);
  });

  monitorVolSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    audio.setMonitor(chkMonitor.checked, vol);
    monitorVolVal.textContent = Math.round(vol * 100) + '%';
  });

  /* ---------------- Test Signal Generator ---------------- */
  selectTestType.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'none') {
      audio.stopCurrentSource();
      statusText.textContent = 'Disconnected';
      statusDot.className = 'status-dot';
    } else {
      audio.startTestGenerator(val);
    }
  });

  /* ---------------- Hardware Preferences & Tuning ---------------- */
  selectMeterStyle.value = model.meterStyle;
  selectMeterStyle.addEventListener('change', (e) => {
    model.meterStyle = e.target.value;
    audio.setVuStyle(model.meterStyle);
    model.saveEEPROM();
  });

  selectLampColor.value = model.dialLamp;
  selectLampColor.addEventListener('change', (e) => {
    model.dialLamp = e.target.value;
    model.saveEEPROM();
  });

  chkHpf.checked = model.hp === 1;
  chkHpf.addEventListener('change', (e) => {
    model.hp = e.target.checked ? 1 : 0;
    audio.setHighPass(model.hp === 1);
    model.saveEEPROM();
    model.notify();
  });

  chkTerm.checked = model.term === 1;
  chkTerm.addEventListener('change', (e) => {
    model.term = e.target.checked ? 1 : 0;
    model.saveEEPROM();
    model.notify();
  });

  /* ---------------- POD-22 Loudness Meter Controls ---------------- */
  const chkPodHold = document.getElementById('chkPodHold');
  const selectPodDecay = document.getElementById('selectPodDecay');
  const chkPodBright = document.getElementById('chkPodBright');

  if (chkPodHold) {
    chkPodHold.addEventListener('change', (e) => {
      podView.dip.BS1 = e.target.checked ? 1 : 0;
    });
  }

  if (selectPodDecay) {
    selectPodDecay.addEventListener('change', (e) => {
      podView.dip.BS0 = e.target.value === 'type1' ? 1 : 0;
    });
  }

  if (chkPodBright) {
    chkPodBright.addEventListener('change', (e) => {
      podView.dip.BRIGHT = e.target.checked ? 1 : 0;
    });
  }

  /* ---------------- View Mode Flip (Front / Rear) ---------------- */
  btnFlipView.addEventListener('click', () => {
    view.viewMode = view.viewMode === 'front' ? 'rear' : 'front';
    podView.viewMode = view.viewMode;
    btnFlipView.textContent = view.viewMode === 'front' ? '🔄 View Rear Panel' : '🔄 View Front Panel';
  });

  /* ---------------- Fullscreen Mode ---------------- */
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      btnFullscreen.textContent = '⛶ Exit Fullscreen';
    } else {
      document.exitFullscreen().catch(() => {});
      btnFullscreen.textContent = '⛶ Fullscreen Rack';
    }
  });

  /* ---------------- Keyboard Shortcuts ---------------- */
  window.addEventListener('keydown', (e) => {
    // Avoid triggering when focused in an input/select
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const key = e.key.toUpperCase();
    if (key === 'M') {
      model.pressMode();
    } else if (key === 'H') {
      model.holdMode();
    } else if (key === 'S') {
      model.pressSource();
    } else if (key === 'D') {
      model.pressDown();
    } else if (key === 'U') {
      model.pressUp();
    } else if (key === 'P') {
      model.togglePower();
    } else if (key === 'R') {
      btnFlipView.click();
    } else if (key === ' ') {
      e.preventDefault();
      // Space toggles power or generator
      model.togglePower();
    }
  });

  /* ---------------- 60 FPS Render Loop ---------------- */
  function renderLoop() {
    const levels = audio.currentLevels;
    view.render(model, levels);
    podView.render(model, levels);
    requestAnimationFrame(renderLoop);
  }

  // Start rendering
  requestAnimationFrame(renderLoop);
});
