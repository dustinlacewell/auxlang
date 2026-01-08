/**
 * Comb filter with lowpass feedback.
 * Core building block of Freeverb - creates the reverb tail.
 */
export class CombFilter {
  private buffer: StaticArray<f32>;
  private bufferSize: i32;
  private index: i32 = 0;
  private filterStore: f32 = 0;

  constructor(size: i32) {
    this.bufferSize = size;
    this.buffer = new StaticArray<f32>(size);
    for (let i = 0; i < size; i++) {
      unchecked(this.buffer[i] = 0);
    }
  }

  @inline
  process(input: f32, feedback: f32, damp: f32): f32 {
    const output = unchecked(this.buffer[this.index]);

    // Lowpass filter in feedback path
    this.filterStore = output * (1 - damp) + this.filterStore * damp;

    // Write new sample with feedback
    unchecked(this.buffer[this.index] = input + this.filterStore * feedback);

    // Advance index with wrap
    this.index++;
    if (this.index >= this.bufferSize) {
      this.index = 0;
    }

    return output;
  }

  clear(): void {
    for (let i = 0; i < this.bufferSize; i++) {
      unchecked(this.buffer[i] = 0);
    }
    this.filterStore = 0;
  }
}
