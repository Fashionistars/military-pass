/**
 * Military Pass — Audio Worklet Processor
 * ======================================
 * Modern AudioWorklet implementation for real-time voice transformation.
 * Replaces deprecated ScriptProcessorNode for better performance and future compatibility.
 */

class AudioWorkletProcessor extends AudioWorkletProcessor {
  private sampleRate: number = 16000;
  private chunkSamples: number = 3200; // 200ms at 16kHz
  private buffer: Float32Array | null = null;
  private bufferIndex: number = 0;

  constructor(options: AudioWorkletNodeOptions) {
    super(options);
    
    if (options.processorOptions) {
      this.sampleRate = options.processorOptions.sampleRate || 16000;
      this.chunkSamples = Math.floor(this.sampleRate * 0.2); // 200ms chunks
    }
    
    this.buffer = new Float32Array(this.chunkSamples);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || input.length === 0 || !output || output.length === 0) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    // Copy input to buffer
    for (let i = 0; i < inputChannel.length; i++) {
      if (this.bufferIndex < this.chunkSamples) {
        this.buffer![this.bufferIndex++] = inputChannel[i];
      }
      
      // Pass through to output (for monitoring)
      if (outputChannel) {
        outputChannel[i] = inputChannel[i];
      }
    }

    // When buffer is full, send to main thread for processing
    if (this.bufferIndex >= this.chunkSamples) {
      const chunk = new Float32Array(this.buffer!);
      this.bufferIndex = 0;
      
      // Convert to base64 and send to main thread
      const b64 = this._float32ToBase64(chunk);
      this.port.postMessage({ type: 'audio_chunk', data: b64 });
    }

    return true;
  }

  private _float32ToBase64(float32: Float32Array): string {
    const bytes = new Uint8Array(float32.buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

registerProcessor('audio-worklet-processor', AudioWorkletProcessor);
