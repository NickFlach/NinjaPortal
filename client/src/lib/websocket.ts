import CryptoJS from 'crypto-js';

interface SecureChannel {
  channelId: string;
  encryptionKey: string;
}

class SecureWebSocket {
  private ws: WebSocket;
  private channel?: SecureChannel;
  private messageHandlers: ((data: any) => void)[] = [];
  private closeHandlers: (() => void)[] = [];
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(url: string) {
    // Generate a development quantum key
    const quantumKey = this.generateDevQuantumKey();

    // Create WebSocket with quantum key header
    const wsUrl = new URL(url);
    this.ws = new WebSocket(wsUrl.toString());

    // Set up message handling
    this.ws.addEventListener('message', this.handleMessage);
    this.ws.addEventListener('close', this.handleClose);

    // Add quantum key to connection
    if (this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.addEventListener('open', () => {
        this.send({
          type: 'quantum_key',
          key: quantumKey
        });
      });
    }
  }

  private generateDevQuantumKey(): string {
    // In development, generate a simple key
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'channel_established') {
        this.channel = {
          channelId: message.channelId,
          encryptionKey: message.encryptionKey
        };
        return;
      }

      let data: any;
      if (this.channel && message.data) {
        // Decrypt message if we have a secure channel
        const decrypted = CryptoJS.AES.decrypt(
          message.data,
          this.channel.encryptionKey
        );
        data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      } else {
        data = message;
      }

      // Notify all message handlers
      this.messageHandlers.forEach(handler => handler(data));
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  private handleClose = () => {
    this.closeHandlers.forEach(handler => handler());

    // Attempt reconnection if not at max attempts
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        // Recreate the WebSocket with the same URL
        const url = this.ws.url;
        this.ws = new WebSocket(url);
        this.ws.addEventListener('message', this.handleMessage);
        this.ws.addEventListener('close', this.handleClose);
      }, delay);
    }
  };

  public send(message: any) {
    if (this.channel) {
      // Encrypt message if we have a secure channel
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(message),
        this.channel.encryptionKey
      ).toString();

      this.ws.send(JSON.stringify({
        channelId: this.channel.channelId,
        data: encrypted
      }));
    } else {
      // Fall back to unencrypted in development
      this.ws.send(JSON.stringify(message));
    }
  }

  public onMessage(callback: (data: any) => void) {
    this.messageHandlers.push(callback);
  }

  public onClose(callback: () => void) {
    this.closeHandlers.push(callback);
  }

  public close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.ws.close();
  }

  public get readyState() {
    return this.ws.readyState;
  }
}

export default SecureWebSocket;