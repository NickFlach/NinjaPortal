import { EventEmitter } from 'events';
import type { 
  DimensionalState, 
  ParadoxState, 
  DimensionCreatedEvent,
  DimensionalReflection 
} from '../types/dimension';

class DimensionalBalancer extends EventEmitter {
  private dimensions: Map<number, DimensionalState> = new Map();
  private equilibriumThreshold: number = 0.001;
  private baseEnergy: number = 1.0;

  constructor() {
    super();
    // Initialize primary dimension
    this.dimensions.set(1, {
      dimension: 1,
      energy: this.baseEnergy,
      equilibrium: 1.0,
      reflections: new Map()
    });
  }

  /**
   * Creates a digital twin across dimensions
   */
  public createReflection(sourceId: string, initialState: number): DimensionalReflection {
    try {
      const reflections: DimensionalReflection = {};

      // Create reflections across all dimensions using Array.from for compatibility
      Array.from(this.dimensions.entries()).forEach(([dimId, dimension]) => {
        const reflectedEnergy = this.calculateReflectedEnergy(
          initialState,
          dimension.energy
        );

        dimension.reflections.set(sourceId, reflectedEnergy);
        reflections[dimId] = reflectedEnergy;

        // Update dimension's equilibrium
        this.updateEquilibrium(dimension);
      });

      return reflections;
    } catch (error) {
      console.error('Error creating reflection:', error);
      throw new Error('Failed to create dimensional reflection');
    }
  }

  /**
   * Calculates reflected energy in a dimension
   */
  private calculateReflectedEnergy(sourceEnergy: number, dimensionalEnergy: number): number {
    try {
      // Using quantum interference pattern simulation
      const phaseShift = Math.sin(sourceEnergy * dimensionalEnergy);
      return sourceEnergy * (1 + phaseShift) / 2;
    } catch (error) {
      console.error('Error calculating reflected energy:', error);
      throw new Error('Failed to calculate reflected energy');
    }
  }

  /**
   * Updates equilibrium state of a dimension
   */
  private updateEquilibrium(dimension: DimensionalState): void {
    try {
      const totalEnergy = Array.from(dimension.reflections.values())
        .reduce((sum, energy) => sum + energy, 0);

      dimension.equilibrium = Math.abs(totalEnergy - dimension.energy);

      // Check for equilibrium state
      if (dimension.equilibrium <= this.equilibriumThreshold) {
        this.handleEquilibrium(dimension);
      }
    } catch (error) {
      console.error('Error updating equilibrium:', error);
      throw new Error('Failed to update equilibrium');
    }
  }

  /**
   * Handles reaching equilibrium by creating new dimension
   */
  private handleEquilibrium(dimension: DimensionalState): void {
    try {
      const paradox: ParadoxState = {
        sourceEnergy: dimension.energy,
        targetEquilibrium: 0,
        dimensionalShift: this.dimensions.size + 1
      };

      // Create new dimension through paradox
      const newDimension: DimensionalState = {
        dimension: paradox.dimensionalShift,
        energy: this.calculateParadoxEnergy(paradox),
        equilibrium: 1.0,
        reflections: new Map()
      };

      this.dimensions.set(newDimension.dimension, newDimension);

      // Emit dimension creation event with JSON-safe data
      const event: DimensionCreatedEvent = {
        dimensionId: newDimension.dimension,
        energy: newDimension.energy,
        source: dimension.dimension
      };

      this.emit('dimensionCreated', event);
    } catch (error) {
      console.error('Error handling equilibrium:', error);
      throw new Error('Failed to handle equilibrium');
    }
  }

  /**
   * Calculates new dimension's energy through paradox
   */
  private calculateParadoxEnergy(paradox: ParadoxState): number {
    try {
      // Energy calculation using dimensional shift
      const shiftFactor = Math.log(paradox.dimensionalShift + 1);
      const baseEnergy = paradox.sourceEnergy * shiftFactor;

      // Add quantum uncertainty
      const uncertainty = Math.random() * 0.1;
      return baseEnergy * (1 + uncertainty);
    } catch (error) {
      console.error('Error calculating paradox energy:', error);
      throw new Error('Failed to calculate paradox energy');
    }
  }

  /**
   * Gets current state of all dimensions
   */
  public getDimensionalState(): Array<{
    dimension: number;
    energy: number;
    equilibrium: number;
    reflectionCount: number;
  }> {
    try {
      return Array.from(this.dimensions.values()).map(dim => ({
        dimension: dim.dimension,
        energy: dim.energy,
        equilibrium: dim.equilibrium,
        reflectionCount: dim.reflections.size
      }));
    } catch (error) {
      console.error('Error getting dimensional state:', error);
      throw new Error('Failed to get dimensional state');
    }
  }
}

export const dimensionalBalancer = new DimensionalBalancer();