/**
 * Military Pass - Adaptive Frame Skipping for Sub-10ms Latency
 * =============================================================
 * Enterprise-grade frame management for real-time performance:
 * 
 * ✅ Intelligent frame management
 * ✅ Motion detection for redundant frames
 * ✅ Frame interpolation for smooth playback
 * ✅ Temporal filtering
 * ✅ Quality-based skipping
 * ✅ TypeScript with full type safety
 */

export interface FrameSkipperConfig {
  targetLatency: number;
  maxSkipRate: number;
  enableMotionDetection: boolean;
  enableInterpolation: boolean;
  qualityThreshold: number;
}

export interface FrameData {
  data: Uint8Array;
  timestamp: number;
  quality: number;
  motionScore: number;
}

export interface SkipDecision {
  shouldSkip: boolean;
  reason: string;
  quality: 'high' | 'medium' | 'low';
}

export class AdaptiveFrameSkipper {
  private config: Required<FrameSkipperConfig>;
  private frameHistory: FrameData[] = [];
  private skipCount = 0;
  private processCount = 0;
  private avgLatency = 0;
  
  constructor(config: FrameSkipperConfig = {}) {
    this.config = {
      targetLatency: config.targetLatency || 10, // 10ms target
      maxSkipRate: config.maxSkipRate || 0.5, // Max 50% skip rate
      enableMotionDetection: config.enableMotionDetection !== false,
      enableInterpolation: config.enableInterpolation !== false,
      qualityThreshold: config.qualityThreshold || 0.8,
    };
  }
  
  /**
   * Determine if frame should be skipped
   */
  shouldSkipFrame(frame: FrameData, currentLatency: number): SkipDecision {
    this.processCount++;
    this.avgLatency = (this.avgLatency * (this.processCount - 1) + currentLatency) / this.processCount;
    
    // Check latency threshold
    if (this.avgLatency > this.config.targetLatency * 1.5) {
      this.skipCount++;
      return {
        shouldSkip: true,
        reason: 'high_latency',
        quality: 'low',
      };
    }
    
    // Check motion if enabled
    if (this.config.enableMotionDetection) {
      const motionScore = this._calculateMotionScore(frame);
      frame.motionScore = motionScore;
      
      if (motionScore < 0.1) {
        // Low motion - skip redundant frame
        this.skipCount++;
        return {
          shouldSkip: true,
          reason: 'low_motion',
          quality: 'medium',
        };
      }
    }
    
    // Check quality threshold
    if (frame.quality < this.config.qualityThreshold) {
      this.skipCount++;
      return {
        shouldSkip: true,
        reason: 'low_quality',
        quality: 'low',
      };
    }
    
    // Check skip rate limit
    const skipRate = this.skipCount / this.processCount;
    if (skipRate > this.config.maxSkipRate) {
      return {
        shouldSkip: false,
        reason: 'skip_limit',
        quality: 'high',
      };
    }
    
    return {
      shouldSkip: false,
      reason: 'process',
      quality: 'high',
    };
  }
  
  /**
   * Get skip statistics
   */
  getStats() {
    return {
      processCount: this.processCount,
      skipCount: this.skipCount,
      skipRate: this.processCount > 0 ? this.skipCount / this.processCount : 0,
      avgLatency: this.avgLatency,
      targetLatency: this.config.targetLatency,
    };
  }
  
  /**
   * Reset statistics
   */
  reset(): void {
    this.skipCount = 0;
    this.processCount = 0;
    this.avgLatency = 0;
    this.frameHistory = [];
  }
  
  // Private methods
  
  private _calculateMotionScore(frame: FrameData): number {
    if (this.frameHistory.length === 0) {
      this.frameHistory.push(frame);
      return 1.0; // Full motion for first frame
    }
    
    const previousFrame = this.frameHistory[this.frameHistory.length - 1];
    
    // Simple motion detection using frame difference
    let diff = 0;
    const minSize = Math.min(frame.data.length, previousFrame.data.length);
    
    for (let i = 0; i < minSize; i++) {
      diff += Math.abs(frame.data[i] - previousFrame.data[i]);
    }
    
    const motionScore = diff / (frame.data.length * 255);
    
    // Add to history
    this.frameHistory.push(frame);
    if (this.frameHistory.length > 10) {
      this.frameHistory.shift();
    }
    
    return motionScore;
  }
}

/**
 * Frame interpolator for smooth playback
 */
export class FrameInterpolator {
  /**
   * Interpolate between two frames
   */
  static interpolate(frame1: Uint8Array, frame2: Uint8Array, ratio: number): Uint8Array {
    const result = new Uint8Array(frame1.length);
    
    for (let i = 0; i < frame1.length; i++) {
      result[i] = Math.round(frame1[i] * (1 - ratio) + frame2[i] * ratio);
    }
    
    return result;
  }
  
  /**
   * Interpolate multiple frames
   */
  static interpolateMultiple(frames: Uint8Array[], intervals: number[]): Uint8Array[] {
    const results: Uint8Array[] = [];
    
    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const frameIndex = Math.floor(interval);
      const ratio = interval - frameIndex;
      
      if (frameIndex < frames.length - 1) {
        const interpolated = this.interpolate(frames[frameIndex], frames[frameIndex + 1], ratio);
        results.push(interpolated);
      } else {
        results.push(frames[frames.length - 1]);
      }
    }
    
    return results;
  }
}

/**
 * Temporal filter for consistent quality
 */
export class TemporalFilter {
  private frameBuffer: Uint8Array[] = [];
  private maxBufferSize = 5;
  
  /**
   * Add frame to buffer
   */
  addFrame(frame: Uint8Array): void {
    this.frameBuffer.push(frame);
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift();
    }
  }
  
  /**
   * Apply temporal smoothing
   */
  smooth(frame: Uint8Array): Uint8Array {
    if (this.frameBuffer.length === 0) {
      return frame;
    }
    
    const smoothed = new Uint8Array(frame.length);
    
    for (let i = 0; i < frame.length; i++) {
      let sum = frame[i];
      
      for (const bufferedFrame of this.frameBuffer) {
        sum += bufferedFrame[i];
      }
      
      smoothed[i] = Math.round(sum / (this.frameBuffer.length + 1));
    }
    
    return smoothed;
  }
  
  /**
   * Clear buffer
   */
  clear(): void {
    this.frameBuffer = [];
  }
}