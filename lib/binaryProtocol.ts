/**
 * Military Pass - Binary Protocol for Efficient Communication
 * =========================================================
 * Enterprise-grade binary protocol for ultra-low latency:
 * 
 * ✅ Compact binary encoding
 * ✅ Efficient serialization
 * ✅ Version compatibility
 * ✅ Error detection
 * ✅ Compression support
 * ✅ TypeScript with full type safety
 */

export interface BinaryMessage {
  magic: number;        // 0x4D504244 (MPBD)
  version: number;      // Protocol version
  type: number;         // Message type
  flags: number;        // Flags (quality, compression, etc.)
  timestamp: number;    // Timestamp
  embedding?: Float32Array;  // 512-dim face embedding
  frameData?: Uint8Array;    // Compressed frame data
  audioData?: Uint8Array;    // Compressed audio data
  metadata?: Uint8Array;    // Additional metadata
}

export enum MessageType {
  FRAME_REQUEST = 0x01,
  FRAME_RESPONSE = 0x02,
  VOICE_REQUEST = 0x03,
  VOICE_RESPONSE = 0x04,
  HEARTBEAT = 0x05,
  ERROR = 0x06,
}

export enum MessageFlags {
  NONE = 0x00,
  COMPRESSED = 0x01,
  FAST_QUALITY = 0x02,
  BALANCED_QUALITY = 0x04,
  ULTRA_QUALITY = 0x08,
  ENHANCE_ENABLED = 0x10,
  ALIGN_SKIN_ENABLED = 0x20,
}

export class BinaryProtocol {
  public static readonly MAGIC = 0x4D504244; // MPBD
  public static readonly VERSION = 0x01;
  public static readonly HEADER_SIZE = 16; // bytes
  
  /**
   * Encode message to binary format
   */
  static encode(message: BinaryMessage): Uint8Array {
    // Calculate total size
    const embeddingSize = message.embedding ? message.embedding.length * 4 : 0;
    const frameDataSize = message.frameData ? message.frameData.length : 0;
    const audioDataSize = message.audioData ? message.audioData.length : 0;
    const metadataSize = message.metadata ? message.metadata.length : 0;
    
    const totalSize = this.HEADER_SIZE + embeddingSize + frameDataSize + audioDataSize + metadataSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    
    let offset = 0;
    
    // Header (16 bytes)
    view.setUint32(offset, this.MAGIC, true); // Magic number (little-endian)
    offset += 4;
    view.setUint8(offset, this.VERSION); // Version
    offset += 1;
    view.setUint8(offset, message.type); // Message type
    offset += 1;
    view.setUint16(offset, message.flags, true); // Flags
    offset += 2;
    view.setUint32(offset, message.timestamp, true); // Timestamp
    offset += 4;
    view.setUint32(offset, embeddingSize, true); // Embedding size
    offset += 4;
    
    // Embedding (2048 bytes if present)
    if (message.embedding && embeddingSize > 0) {
      const embeddingView = new Float32Array(buffer, offset, message.embedding.length);
      embeddingView.set(message.embedding);
      offset += embeddingSize;
    }
    
    // Frame data (variable)
    if (message.frameData && frameDataSize > 0) {
      uint8View.set(message.frameData, offset);
      offset += frameDataSize;
    }
    
    // Audio data (variable)
    if (message.audioData && audioDataSize > 0) {
      uint8View.set(message.audioData, offset);
      offset += audioDataSize;
    }
    
    // Metadata (variable)
    if (message.metadata && metadataSize > 0) {
      uint8View.set(message.metadata, offset);
      offset += metadataSize;
    }
    
    return uint8View;
  }
  
  /**
   * Decode message from binary format
   */
  static decode(buffer: Uint8Array): BinaryMessage {
    const view = new DataView(buffer.buffer);
    let offset = 0;
    
    // Header (16 bytes)
    const magic = view.getUint32(offset, true);
    offset += 4;
    
    if (magic !== this.MAGIC) {
      throw new Error(`Invalid magic number: 0x${magic.toString(16)}`);
    }
    
    const version = view.getUint8(offset);
    offset += 1;
    
    if (version !== this.VERSION) {
      throw new Error(`Unsupported version: ${version}`);
    }
    
    const type = view.getUint8(offset);
    offset += 1;
    
    const flags = view.getUint16(offset, true);
    offset += 2;
    
    const timestamp = view.getUint32(offset, true);
    offset += 4;
    
    const embeddingSize = view.getUint32(offset, true);
    offset += 4;
    
    // Embedding
    let embedding: Float32Array | undefined;
    if (embeddingSize > 0) {
      embedding = new Float32Array(buffer.buffer, offset, embeddingSize / 4);
      offset += embeddingSize;
    }
    
    // Frame data
    let frameData: Uint8Array | undefined;
    if (offset < buffer.length) {
      const remaining = buffer.length - offset;
      frameData = buffer.slice(offset, offset + remaining);
    }
    
    return {
      magic,
      version,
      type,
      flags,
      timestamp,
      embedding,
      frameData,
    };
  }
  
  /**
   * Create frame request message
   */
  static createFrameRequest(
    frameData: Uint8Array,
    embedding: Float32Array,
    quality: 'fast' | 'balanced' | 'ultra' = 'balanced',
    enhance: boolean = true,
    alignSkin: boolean = true
  ): Uint8Array {
    const flags = this._getQualityFlags(quality, enhance, alignSkin);
    
    const message: BinaryMessage = {
      magic: this.MAGIC,
      version: this.VERSION,
      type: MessageType.FRAME_REQUEST,
      flags,
      timestamp: Date.now(),
      embedding,
      frameData,
    };
    
    return this.encode(message);
  }
  
  /**
   * Create frame response message
   */
  static createFrameResponse(
    frameData: Uint8Array,
    latencyMs: number,
    quality: string
  ): Uint8Array {
    const flags = this._getQualityFlags(quality as any, false, false);
    
    const message: BinaryMessage = {
      magic: this.MAGIC,
      version: this.VERSION,
      type: MessageType.FRAME_RESPONSE,
      flags,
      timestamp: Date.now(),
      frameData,
    };
    
    return this.encode(message);
  }
  
  /**
   * Create voice request message
   */
  static createVoiceRequest(
    audioData: Uint8Array,
    preset: string = 'operative'
  ): Uint8Array {
    const message: BinaryMessage = {
      magic: this.MAGIC,
      version: this.VERSION,
      type: MessageType.VOICE_REQUEST,
      flags: MessageFlags.NONE,
      timestamp: Date.now(),
      audioData,
    };
    
    return this.encode(message);
  }
  
  /**
   * Create voice response message
   */
  static createVoiceResponse(
    audioData: Uint8Array,
    latencyMs: number,
    preset: string
  ): Uint8Array {
    const message: BinaryMessage = {
      magic: this.MAGIC,
      version: this.VERSION,
      type: MessageType.VOICE_RESPONSE,
      flags: MessageFlags.NONE,
      timestamp: Date.now(),
      audioData,
    };
    
    return this.encode(message);
  }
  
  /**
   * Create heartbeat message
   */
  static createHeartbeat(): Uint8Array {
    const message: BinaryMessage = {
      magic: this.MAGIC,
      version: this.VERSION,
      type: MessageType.HEARTBEAT,
      flags: MessageFlags.NONE,
      timestamp: Date.now(),
    };
    
    return this.encode(message);
  }
  
  /**
   * Create error message
   */
  static createError(errorCode: number, errorMessage: string): Uint8Array {
    const encoder = new TextEncoder();
    const metadata = encoder.encode(errorMessage);
    
    const message: BinaryMessage = {
      magic: this.MAGIC,
      version: this.VERSION,
      type: MessageType.ERROR,
      flags: MessageFlags.NONE,
      timestamp: Date.now(),
      metadata,
    };
    
    return this.encode(message);
  }
  
  /**
   * Get quality flags
   */
  private static _getQualityFlags(
    quality: 'fast' | 'balanced' | 'ultra',
    enhance: boolean,
    alignSkin: boolean
  ): number {
    let flags = MessageFlags.NONE;
    
    switch (quality) {
      case 'fast':
        flags |= MessageFlags.FAST_QUALITY;
        break;
      case 'balanced':
        flags |= MessageFlags.BALANCED_QUALITY;
        break;
      case 'ultra':
        flags |= MessageFlags.ULTRA_QUALITY;
        break;
    }
    
    if (enhance) {
      flags |= MessageFlags.ENHANCE_ENABLED;
    }
    
    if (alignSkin) {
      flags |= MessageFlags.ALIGN_SKIN_ENABLED;
    }
    
    return flags;
  }
  
  /**
   * Parse quality flags
   */
  static parseQualityFlags(flags: number): {
    quality: 'fast' | 'balanced' | 'ultra';
    enhance: boolean;
    alignSkin: boolean;
    compressed: boolean;
  } {
    let quality: 'fast' | 'balanced' | 'ultra' = 'balanced';
    
    if (flags & MessageFlags.FAST_QUALITY) {
      quality = 'fast';
    } else if (flags & MessageFlags.ULTRA_QUALITY) {
      quality = 'ultra';
    }
    
    return {
      quality,
      enhance: (flags & MessageFlags.ENHANCE_ENABLED) !== 0,
      alignSkin: (flags & MessageFlags.ALIGN_SKIN_ENABLED) !== 0,
      compressed: (flags & MessageFlags.COMPRESSED) !== 0,
    };
  }
  
  /**
   * Compress data using simple RLE (Run-Length Encoding)
   */
  static compress(data: Uint8Array): Uint8Array {
    const compressed: number[] = [];
    let count = 1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i] === data[i - 1] && count < 255) {
        count++;
      } else {
        compressed.push(data[i - 1], count);
        count = 1;
      }
    }
    
    compressed.push(data[data.length - 1], count);
    
    return new Uint8Array(compressed);
  }
  
  /**
   * Decompress RLE data
   */
  static decompress(data: Uint8Array): Uint8Array {
    const decompressed: number[] = [];
    
    for (let i = 0; i < data.length; i += 2) {
      const value = data[i];
      const count = data[i + 1];
      
      for (let j = 0; j < count; j++) {
        decompressed.push(value);
      }
    }
    
    return new Uint8Array(decompressed);
  }
  
  /**
   * Calculate message size reduction
   */
  static calculateSizeReduction(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }
}

/**
 * Binary protocol validator
 */
export class BinaryProtocolValidator {
  /**
   * Validate message structure
   */
  static validate(message: BinaryMessage): boolean {
    // Check magic number
    if (message.magic !== BinaryProtocol.MAGIC) {
      return false;
    }
    
    // Check version
    if (message.version !== BinaryProtocol.VERSION) {
      return false;
    }
    
    // Check message type
    if (message.type < 0x01 || message.type > 0x06) {
      return false;
    }
    
    // Check embedding size
    if (message.embedding && message.embedding.length !== 512) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate message size
   */
  static validateSize(buffer: Uint8Array, maxSize: number = 1024 * 1024): boolean {
    return buffer.length <= maxSize;
  }
  
  /**
   * Validate timestamp
   */
  static validateTimestamp(timestamp: number, maxAge: number = 60000): boolean {
    const now = Date.now();
    const age = now - timestamp;
    return age >= 0 && age <= maxAge;
  }
}