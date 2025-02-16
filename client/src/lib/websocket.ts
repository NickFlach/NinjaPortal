import CryptoJS from 'crypto-js';

interface SecureChannel {
  channelId: string;
  encryptionKey: string;
}

class SecureWebSocket {
  private ws: WebSocket;
  private channel?: SecureChannel;
  
  constructor(url: string) {
    // Generate a development quantum key
    const quantumKey = this.generateDevQuantumKey();
    
    // Create WebSocket with quantum key header
    const wsUrl = new URL(url);
    this.ws = new WebSocket(wsUrl.toString());
    
    // Add quantum key to connection
    if (this.ws.readyState === WebSocket.CONNECTING) {
      // For development, send key in the first message after connection
      this.ws.addEventListener('open', () => {
        this.ws.send(JSON.stringify({
          type: 'quantum_key',
          key: quantumKey
        }));
      });
    }
  }
  
  private generateDevQuantumKey(): string {
    // In development, generate a simple key
    return CryptoJS.lib.WordArray.random(32).toString();
  }
  
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
    this.ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'channel_established') {
          this.channel = {
            channelId: message.channelId,
            encryptionKey: message.encryptionKey
          };
          return;
        }
        
        if (this.channel && message.data) {
          // Decrypt message if we have a secure channel
          const decrypted = CryptoJS.AES.decrypt(
            message.data,
            this.channel.encryptionKey
          );
          callback(JSON.parse(decrypted.toString(CryptoJS.enc.Utf8)));
        } else {
          // Handle unencrypted messages in development
          callback(message);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
  }
  
  public onClose(callback: () => void) {
    this.ws.addEventListener('close', callback);
  }
  
  public close() {
    this.ws.close();
  }
}

export default SecureWebSocket;
