import { PIDController } from './PIDController';

export interface CascadeMetrics {
  entropyError: number;
  freeEnergyError: number;
  entropyOutput: number;
  freeEnergyOutput: number;
  entropyIntegral: number;
  freeEnergyIntegral: number;
  entropyDerivative: number;
  freeEnergyDerivative: number;
}

export class CascadeController {
  private innerLoop: PIDController; // Controls entropy
  private outerLoop: PIDController; // Controls free energy
  private lastEntropySetpoint: number = 0;
  private lastMetrics: CascadeMetrics = {
    entropyError: 0,
    freeEnergyError: 0,
    entropyOutput: 0,
    freeEnergyOutput: 0,
    entropyIntegral: 0,
    freeEnergyIntegral: 0,
    entropyDerivative: 0,
    freeEnergyDerivative: 0
  };

  constructor(
    innerLoopParams = { kp: 0.5, ki: 0.2, kd: 0.1 },
    outerLoopParams = { kp: 0.3, ki: 0.1, kd: 0.05 }
  ) {
    this.innerLoop = new PIDController(
      innerLoopParams.kp,
      innerLoopParams.ki,
      innerLoopParams.kd
    );
    this.outerLoop = new PIDController(
      outerLoopParams.kp,
      outerLoopParams.ki,
      outerLoopParams.kd
    );
  }

  compute(
    targetFreeEnergy: number,
    currentFreeEnergy: number,
    currentEntropy: number
  ): { playbackRate: number; metrics: CascadeMetrics } {
    // Outer loop computes target entropy based on free energy error
    const entropySetpoint = this.outerLoop.compute(targetFreeEnergy, currentFreeEnergy);
    
    // Inner loop controls network entropy to match the setpoint
    const playbackRateAdjustment = this.innerLoop.compute(entropySetpoint, currentEntropy);

    // Get individual terms from both controllers
    const innerTerms = this.innerLoop.getTerms();
    const outerTerms = this.outerLoop.getTerms();

    // Update metrics
    this.lastMetrics = {
      entropyError: entropySetpoint - currentEntropy,
      freeEnergyError: targetFreeEnergy - currentFreeEnergy,
      entropyOutput: playbackRateAdjustment,
      freeEnergyOutput: entropySetpoint,
      entropyIntegral: innerTerms.integral,
      freeEnergyIntegral: outerTerms.integral,
      entropyDerivative: innerTerms.derivative,
      freeEnergyDerivative: outerTerms.derivative
    };

    // Convert controller output to playback rate (0.5 to 2.0 range)
    const playbackRate = Math.max(0.5, Math.min(2.0, 1 + playbackRateAdjustment));

    return {
      playbackRate,
      metrics: this.lastMetrics
    };
  }

  reset() {
    this.innerLoop.reset();
    this.outerLoop.reset();
    this.lastEntropySetpoint = 0;
    this.lastMetrics = {
      entropyError: 0,
      freeEnergyError: 0,
      entropyOutput: 0,
      freeEnergyOutput: 0,
      entropyIntegral: 0,
      freeEnergyIntegral: 0,
      entropyDerivative: 0,
      freeEnergyDerivative: 0
    };
  }

  getMetrics(): CascadeMetrics {
    return this.lastMetrics;
  }
}
