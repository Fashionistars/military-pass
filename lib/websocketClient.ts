/**
 * Military Pass - WebSocket Client for Real-Time Communication
 * ============================================================
 * Enterprise-grade WebSocket implementation for sub-10ms latency:
 * 
 * ✅ Automatic reconnection with exponential backoff
 * ✅ Message queuing and deduplication
 * ✅ Binary protocol support
 * ✅ Connection state management
 * ✅ Performance monitoring
 * ✅ Error handling and recovery
 * ✅ TypeScript with full type safety
 */

import { BinaryProtocol, MessageType } from './binaryProtocol';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableQueuing?: boolean;
  enableBinary?: boolean;
  enableCompression?: boolean;
  heartbeatInterval?: number;
}

export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastError: Error | null;
  lastConnected: number | null;
}

export type ConnectionStateCallback = (state: ConnectionState) => void;
export type MessageCallback = (message: WebSocketMessage) => void;
export type ErrorCallback = (error: Error) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState;
  private messageQueue: WebSocketMessage[] = [];
  private processedMessageIds = new Set<string>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Callbacks
  private stateChangeCallbacks: ConnectionStateCallback[] = [];
  public messageCallbacks: MessageCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  
  // Performance monitoring
  private messageCount = 0;
  private bytesTransferred = 0;
  private connectionStartTime = 0;
  private latencyMeasurements: number[] = [];
  
  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      enableQueuing: config.enableQueuing !== false,
      enableBinary: config.enableBinary || false,
      enableCompression: config.enableCompression || false,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
    
    this.state = {
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
      lastError: null,
      lastConnected: null,
    };
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state.connected || this.state.connecting) {
        resolve();
        return;
      }
      
      this.state.connecting = true;
      this._notifyStateChange();
      
      try {
        this.ws = new WebSocket(this.config.url, this.config.enableBinary ? 'binary' : undefined);
        
        this.ws.onopen = () => {
          this._handleOpen();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this._handleMessage(event);
        };
        
        this.ws.onerror = (event) => {
          this._handleError(new Error('WebSocket error'));
          reject(new Error('WebSocket connection failed'));
        };
        
        this.ws.onclose = (event) => {
          this._handleClose(event);
        };
        
      } catch (error) {
        this.state.connecting = false;
        this._handleError(error as Error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this._clearHeartbeat();
    this._clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.state.connected = false;
    this.state.connecting = false;
    this.state.reconnecting = false;
    this.state.lastConnected = null;
    this._notifyStateChange();
  }
  
  /**
   * Send message through WebSocket
   */
  send(type: string, payload: any, id?: string): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      id: id || this._generateMessageId(),
    };
    
    if (this.state.connected && this.ws) {
      this._sendImmediately(message);
    } else if (this.config.enableQueuing) {
      this.messageQueue.push(message);
      console.log(`[WebSocket] Message queued: ${type} (queue size: ${this.messageQueue.length})`);
    } else {
      console.warn(`[WebSocket] Cannot send message - not connected and queuing disabled`);
    }
  }
  
  /**
   * Send binary data
   */
  sendBinary(data: ArrayBuffer, type: string = 'binary'): void {
    if (this.state.connected && this.ws) {
      this.ws.send(data);
      this.bytesTransferred += data.byteLength;
    } else {
      console.warn(`[WebSocket] Cannot send binary data - not connected`);
    }
  }
  
  /**
   * Register state change callback
   */
  onStateChange(callback: ConnectionStateCallback): void {
    this.stateChangeCallbacks.push(callback);
  }
  
  /**
   * Register message callback
   */
  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.push(callback);
  }
  
  /**
   * Register error callback
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
  
  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }
  
  /**
   * Get performance statistics
   */
  getStats() {
    const avgLatency = this.latencyMeasurements.length > 0
      ? this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length
      : 0;
    
    return {
      messageCount: this.messageCount,
      bytesTransferred: this.bytesTransferred,
      queueSize: this.messageQueue.length,
      avgLatencyMs: avgLatency,
      connectionDuration: this.state.lastConnected 
        ? Date.now() - this.state.lastConnected 
        : 0,
    };
  }
  
  // Private methods
  
  private _handleOpen(): void {
    this.state.connected = true;
    this.state.connecting = false;
    this.state.reconnecting = false;
    this.state.reconnectAttempts = 0;
    this.state.lastError = null;
    this.state.lastConnected = Date.now();
    this.connectionStartTime = Date.now();
    
    this._notifyStateChange();
    this._startHeartbeat();
    this._flushQueue();
    
    console.log('[WebSocket] Connected successfully');
  }
  
  private _handleMessage(event: MessageEvent): void {
    let message: WebSocketMessage;
    
    if (this.config.enableBinary && event.data instanceof ArrayBuffer) {
      // Handle binary message
      message = this._decodeBinaryMessage(event.data);
    } else {
      // Handle text message
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
        return;
      }
    }
    
    // Deduplicate messages
    if (message.id && this.processedMessageIds.has(message.id)) {
      return;
    }
    
    if (message.id) {
      this.processedMessageIds.add(message.id);
      // Keep only last 1000 IDs to prevent memory leak
      if (this.processedMessageIds.size > 1000) {
        const firstId = this.processedMessageIds.values().next().value;
        if (firstId) {
          this.processedMessageIds.delete(firstId);
        }
      }
    }
    
    // Measure latency for round-trip messages
    if (message.type === 'response' && message.payload.requestTimestamp) {
      const latency = Date.now() - message.payload.requestTimestamp;
      this.latencyMeasurements.push(latency);
      if (this.latencyMeasurements.length > 100) {
        this.latencyMeasurements.shift();
      }
    }
    
    this.messageCount++;
    this._notifyMessage(message);
  }
  
  private _handleError(error: Error): void {
    this.state.lastError = error;
    this._notifyError(error);
    console.error('[WebSocket] Error:', error);
  }
  
  private _handleClose(event: CloseEvent): void {
    this.state.connected = false;
    this.state.connecting = false;
    this._clearHeartbeat();
    
    if (event.code !== 1000) {
      console.warn(`[WebSocket] Closed unexpectedly: ${event.code} - ${event.reason}`);
      this._attemptReconnect();
    }
    
    this._notifyStateChange();
  }
  
  private _sendImmediately(message: WebSocketMessage): void {
    if (!this.ws) return;
    
    const data = this.config.enableBinary 
      ? this._encodeBinaryMessage(message)
      : JSON.stringify(message);
    
    this.ws.send(data);
    this.messageCount++;
    this.bytesTransferred += data.toString().length;
  }
  
  private _flushQueue(): void {
    while (this.messageQueue.length > 0 && this.state.connected) {
      const message = this.messageQueue.shift();
      if (message) {
        this._sendImmediately(message);
      }
    }
  }
  
  private _attemptReconnect(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }
    
    this.state.reconnecting = true;
    this.state.reconnectAttempts++;
    this._notifyStateChange();
    
    const delay = this.config.reconnectInterval * Math.pow(2, this.state.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.state.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error);
        this._attemptReconnect();
      });
    }, delay);
  }
  
  private _startHeartbeat(): void {
    this._clearHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.state.connected) {
        this.send('heartbeat', { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }
  
  private _clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  private _clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  private _notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => callback(this.getState()));
  }
  
  private _notifyMessage(message: WebSocketMessage): void {
    this.messageCallbacks.forEach(callback => callback(message));
  }
  
  private _notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
  
  private _generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private _encodeBinaryMessage(message: WebSocketMessage): ArrayBuffer {
    // Use BinaryProtocol for efficient encoding
    if (message.type === 'frame_request' && message.payload) {
      const binaryMessage = BinaryProtocol.createFrameRequest(
        message.payload.frame_b64,
        new Float32Array(message.payload.avatar_embedding),
        message.payload.quality,
        message.payload.enhance,
        message.payload.align_skin
      );
      return binaryMessage.buffer as ArrayBuffer;
    }
    
    // Fallback to simple encoding for other message types
    const text = JSON.stringify(message);
    const encoder = new TextEncoder();
    return encoder.encode(text).buffer;
  }
  
  private _decodeBinaryMessage(data: ArrayBuffer): WebSocketMessage {
    // Try to decode as BinaryProtocol message
    try {
      const uint8Array = new Uint8Array(data);
      const binaryMessage = BinaryProtocol.decode(uint8Array);
      
      // Convert BinaryMessage to WebSocketMessage
      return {
        type: MessageType[binaryMessage.type] || 'unknown',
        payload: {
          timestamp: binaryMessage.timestamp,
          flags: binaryMessage.flags,
          embedding: binaryMessage.embedding,
          frameData: binaryMessage.frameData,
        },
        timestamp: binaryMessage.timestamp,
      };
    } catch (error) {
      // Fallback to JSON decoding
      const decoder = new TextDecoder();
      const text = decoder.decode(data);
      return JSON.parse(text);
    }
  }
}

// Singleton instance for global use
let globalWebSocketClient: WebSocketClient | null = null;

export function getWebSocketClient(config?: WebSocketConfig): WebSocketClient {
  if (!globalWebSocketClient && config) {
    globalWebSocketClient = new WebSocketClient(config);
  }
  return globalWebSocketClient!;
}

export function resetWebSocketClient(): void {
  if (globalWebSocketClient) {
    globalWebSocketClient.disconnect();
    globalWebSocketClient = null;
  }
}