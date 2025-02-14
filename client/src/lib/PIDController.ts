export class PIDController {
  private kp: number;
  private ki: number;
  private kd: number;
  private previousError: number;
  private integral: number;
  private lastTime: number;

  constructor(kp = 0.5, ki = 0.2, kd = 0.1) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.previousError = 0;
    this.integral = 0;
    this.lastTime = Date.now();
  }

  compute(setpoint: number, currentValue: number): number {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    const error = setpoint - currentValue;
    this.integral += error * deltaTime;
    const derivative = (error - this.previousError) / deltaTime;

    const output = 
      this.kp * error + 
      this.ki * this.integral + 
      this.kd * derivative;

    this.previousError = error;

    // Clamp output to reasonable playback rate range (0.5x to 2x)
    return Math.max(0.5, Math.min(2, 1 + output));
  }

  reset() {
    this.previousError = 0;
    this.integral = 0;
    this.lastTime = Date.now();
  }
}
