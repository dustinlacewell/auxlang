/**
 * Allpass filter.
 * Adds diffusion to the reverb - smears transients without changing frequency balance.
 */
export class AllpassFilter {
  private buffer: StaticArray<f32>;
  private bufferSize: i32;
  private index: i32 = 0;

  constructor(size: i32) {
    this.bufferSize = size;
    this.buffer = new StaticArray<f32>(size);
    for (let i = 0; i < size; i++) {
      unchecked(this.buffer[i] = 0);
    }
  }

  @inline
  process(input: f32, feedback: f32 = 0.5): f32 {
    const buffered = unchecked(this.buffer[this.index]);
    const output = buffered - input;

    unchecked(this.buffer[this.index] = input + buffered * feedback);

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
  }
}
