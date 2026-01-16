/**
 * AudioWorkletProcessor: audio-processor
 *
 * Off-main-thread audio pipeline for V3.
 * - Input: Float32 mono @ AudioContext sampleRate
 * - Output: PCM16 mono @ targetSampleRate (default 16000)
 * - Chunking: chunkMs (default 100ms)
 *
 * Posts messages:
 *   { type: 'chunk', pcm16: ArrayBuffer, sampleRate: number }
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetSampleRate = Number(opts.targetSampleRate || 16000);
    this.chunkMs = Number(opts.chunkMs || 100);

    this.inSampleRate = sampleRate; // AudioWorklet global
    this.ratio = this.inSampleRate / this.targetSampleRate;

    // Number of output samples per chunk (e.g. 16000 * 0.1 = 1600)
    this.chunkSamples = Math.max(1, Math.round((this.targetSampleRate * this.chunkMs) / 1000));

    this.outBuffer = new Int16Array(this.chunkSamples);
    this.outIndex = 0;

    // Resampler state
    this._srcPos = 0;
    this._lastSample = 0;
  }

  _floatToInt16(x) {
    const clamped = Math.max(-1, Math.min(1, x));
    return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const channel = input[0]; // mono

    // Linear resampling from inSampleRate to targetSampleRate.
    // We maintain a fractional source position across calls.
    let srcPos = this._srcPos;
    let last = this._lastSample;
    const ratio = this.ratio;

    while (srcPos < channel.length) {
      const i0 = Math.floor(srcPos);
      const i1 = Math.min(i0 + 1, channel.length - 1);
      const frac = srcPos - i0;

      const s0 = i0 >= 0 ? channel[i0] : last;
      const s1 = channel[i1];
      const sample = s0 + (s1 - s0) * frac;

      this.outBuffer[this.outIndex++] = this._floatToInt16(sample);

      if (this.outIndex >= this.outBuffer.length) {
        // Transfer a copy to avoid reusing the same underlying buffer.
        const payload = new Int16Array(this.outBuffer);
        this.port.postMessage(
          { type: 'chunk', pcm16: payload.buffer, sampleRate: this.targetSampleRate },
          [payload.buffer]
        );
        this.outIndex = 0;
      }

      srcPos += ratio;
    }

    // Persist state
    this._srcPos = srcPos - channel.length;
    this._lastSample = channel[channel.length - 1] || last;

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);


