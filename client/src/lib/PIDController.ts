export class PIDController {
  private kp: number;
  private ki: number;
  private kd: number;
  private previousError: number;
  private integral: number;
  private lastTime: number;
  private tuningWindow: { error: number; time: number }[] = [];
  private readonly windowSize = 50; // Number of samples to use for auto-tuning
  private lastTuneTime: number;
  private readonly tuneInterval = 10000; // Auto-tune every 10 seconds

  constructor(kp = 0.5, ki = 0.2, kd = 0.1) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.previousError = 0;
    this.integral = 0;
    this.lastTime = Date.now();
    this.lastTuneTime = this.lastTime;
  }

  compute(setpoint: number, currentValue: number): number {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    const error = setpoint - currentValue;
    this.integral += error * deltaTime;
    const derivative = (error - this.previousError) / deltaTime;

    // Store error for auto-tuning
    this.tuningWindow.push({ error, time: currentTime });
    if (this.tuningWindow.length > this.windowSize) {
      this.tuningWindow.shift();
    }

    // Auto-tune periodically
    if (currentTime - this.lastTuneTime > this.tuneInterval) {
      this.autoTune();
      this.lastTuneTime = currentTime;
    }

    const output = 
      this.kp * error + 
      this.ki * this.integral + 
      this.kd * derivative;

    this.previousError = error;

    // Clamp output to reasonable playback rate range (0.5x to 2x)
    return Math.max(0.5, Math.min(2, 1 + output));
  }

  private autoTune() {
    if (this.tuningWindow.length < this.windowSize) return;

    // Calculate performance metrics
    const errors = this.tuningWindow.map(sample => Math.abs(sample.error));
    const meanError = errors.reduce((a, b) => a + b) / errors.length;
    const variance = errors.reduce((a, b) => a + Math.pow(b - meanError, 2), 0) / errors.length;

    // Adjust gains based on performance
    if (meanError > 0.5) {
      // Large average error - increase proportional gain
      this.kp *= 1.1;
    } else if (meanError < 0.1) {
      // Small average error - reduce proportional gain
      this.kp *= 0.9;
    }

    if (variance > 0.25) {
      // High variance - increase derivative gain for stability
      this.kd *= 1.1;
      // Reduce integral gain to prevent oscillation
      this.ki *= 0.9;
    } else if (variance < 0.05) {
      // Low variance - can reduce derivative gain
      this.kd *= 0.9;
      // Increase integral gain for better steady-state tracking
      this.ki *= 1.1;
    }

    // Clamp gains to reasonable ranges
    this.kp = Math.max(0.1, Math.min(2.0, this.kp));
    this.ki = Math.max(0.05, Math.min(1.0, this.ki));
    this.kd = Math.max(0.05, Math.min(1.0, this.kd));

    console.log('PID Auto-tuned:', {
      kp: this.kp,
      ki: this.ki,
      kd: this.kd,
      meanError,
      variance
    });
  }

  reset() {
    this.previousError = 0;
    this.integral = 0;
    this.lastTime = Date.now();
    this.tuningWindow = [];
    this.lastTuneTime = this.lastTime;
  }
}