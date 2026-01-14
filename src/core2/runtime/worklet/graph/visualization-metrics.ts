/**
 * Visualization metrics accumulation for audio devices.
 * Accumulates RMS and peak values over time windows.
 */

export interface NodeMetrics {
	rms: number;
	peak: number;
}

export interface SequencerMetrics {
	beatIndex: number;
	isActive: boolean;
	charStart: number;
	charEnd: number;
}

const WINDOW_SIZE = 2048;

interface Accumulator {
	sumSquares: number;
	peak: number;
	samples: number;
}

export class MetricsAccumulator {
	private accumulators = new Map<string, Accumulator>();

	accumulate(nodeId: string, value: number): void {
		const acc = this.accumulators.get(nodeId) || { sumSquares: 0, peak: 0, samples: 0 };

		acc.sumSquares += value * value;
		acc.peak = Math.max(acc.peak, Math.abs(value));
		acc.samples++;

		this.accumulators.set(nodeId, acc);
	}

	collect(): Map<string, NodeMetrics> {
		const metrics = new Map<string, NodeMetrics>();

		for (const [nodeId, acc] of this.accumulators) {
			if (acc.samples >= WINDOW_SIZE) {
				metrics.set(nodeId, {
					rms: Math.sqrt(acc.sumSquares / acc.samples),
					peak: acc.peak,
				});
			}
		}

		return metrics;
	}

	reset(): void {
		for (const [nodeId, acc] of this.accumulators) {
			if (acc.samples >= WINDOW_SIZE) {
				this.accumulators.delete(nodeId);
			}
		}
	}
}
