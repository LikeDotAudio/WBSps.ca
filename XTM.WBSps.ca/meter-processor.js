/*! Copyright (c) 2026 Ward-Beck Systems (Ward-Beck.ca). All rights reserved. */
/**
 * Ward-Beck Systems Precision Audio Visualizer
 * Real-Time AudioWorkletProcessor for Sub-Millisecond Metering & Ballistics
 * Replaces deprecated ScriptProcessorNode with dedicated audio-thread processing.
 */
class WbsMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufSize = 1024;
    this.bufL = new Float32Array(this.bufSize);
    this.bufR = new Float32Array(this.bufSize);
    this.idx = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const ch0 = input[0];
      const ch1 = input.length > 1 ? input[1] : ch0;
      const len = ch0.length;

      for (let i = 0; i < len; i++) {
        this.bufL[this.idx] = ch0[i];
        this.bufR[this.idx] = ch1[i];
        this.idx++;
        if (this.idx >= this.bufSize) {
          // Transfer 1024-sample audio block to main thread for ballistics integration
          this.port.postMessage({
            ch0: this.bufL.slice(),
            ch1: this.bufR.slice()
          });
          this.idx = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('wbs-meter-processor', WbsMeterProcessor);
