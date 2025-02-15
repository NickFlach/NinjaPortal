export class PIDController {
  private kp: number;
  private ki: number;
  private kd: number;
  private previousError: number;
  private integral: number;
  private derivative: number;
  private lastTime: number;
  private tuningWindow: { error: number; time: number }[] = [];
  private readonly windowSize = 50; // Number of samples to use for auto-tuning
  private lastTuneTime: number;
  private readonly tuneInterval = 10000; // Auto-tune every 10 seconds
  private readonly maxIntegral = 1.0; // Prevent integral windup

  constructor(kp = 0.1, ki = 0.05, kd = 0.02) { // Reduced default gains
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.previousError = 0;
    this.integral = 0;
    this.derivative = 0;
    this.lastTime = Date.now();
    this.lastTuneTime = this.lastTime;
  }

  compute(setpoint: number, currentValue: number): number {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Clamp input values
    setpoint = Math.max(-2, Math.min(2, setpoint));
    currentValue = Math.max(-2, Math.min(2, currentValue));

    const error = setpoint - currentValue;

    // Anti-windup: only integrate if within bounds
    const newIntegral = this.integral + error * deltaTime;
    if (Math.abs(newIntegral) <= this.maxIntegral) {
      this.integral = newIntegral;
    }

    // Derivative with low-pass filter
    const alpha = 0.1; // Filter coefficient
    this.derivative = deltaTime === 0 ? 0 : 
      alpha * (error - this.previousError) / deltaTime + 
      (1 - alpha) * this.derivative;

    // Store error for auto-tuning
    this.tuningWindow.push({ error, time: currentTime });
    if (this.tuningWindow.length > this.windowSize) {
      this.tuningWindow.shift();
    }

    // Auto-tune periodically with more conservative adjustments
    if (currentTime - this.lastTuneTime > this.tuneInterval) {
      this.autoTune();
      this.lastTuneTime = currentTime;
    }

    // Calculate output with improved clamping
    const output = 
      this.kp * error + 
      this.ki * this.integral + 
      this.kd * this.derivative;

    // Clamp output to reasonable range
    const clampedOutput = Math.tanh(output);

    this.previousError = error;

    return clampedOutput;
  }

  getTerms() {
    return {
      integral: this.integral,
      derivative: this.derivative
    };
  }

  private autoTune() {
    if (this.tuningWindow.length < this.windowSize) return;

    // Calculate performance metrics
    const errors = this.tuningWindow.map(sample => Math.abs(sample.error));
    const meanError = errors.reduce((a, b) => a + b) / errors.length;
    const variance = errors.reduce((a, b) => a + Math.pow(b - meanError, 2), 0) / errors.length;

    // More conservative gain adjustments
    if (meanError > 0.5) {
      // Large average error - increase proportional gain slightly
      this.kp *= 1.05;
    } else if (meanError < 0.1) {
      // Small average error - reduce proportional gain slightly
      this.kp *= 0.95;
    }

    if (variance > 0.25) {
      // High variance - increase derivative gain for stability
      this.kd *= 1.05;
      // Reduce integral gain to prevent oscillation
      this.ki *= 0.95;
    } else if (variance < 0.05) {
      // Low variance - can reduce derivative gain
      this.kd *= 0.95;
      // Increase integral gain for better steady-state tracking
      this.ki *= 1.05;
    }

    // Stricter gain limits
    this.kp = Math.max(0.01, Math.min(0.5, this.kp));
    this.ki = Math.max(0.005, Math.min(0.2, this.ki));
    this.kd = Math.max(0.005, Math.min(0.2, this.kd));

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
    this.derivative = 0;
    this.lastTime = Date.now();
    this.tuningWindow = [];
    this.lastTuneTime = this.lastTime;
  }
}