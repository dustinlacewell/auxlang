import { CombFilter } from "./comb-filter";
import { AllpassFilter } from "./allpass-filter";

/**
 * Freeverb - classic algorithmic reverb.
 *
 * Architecture:
 * - Input is summed to mono and fed to 8 parallel comb filters
 * - Comb outputs are summed and fed through 4 series allpass filters
 * - Stereo spread achieved by slightly different delay times per channel
 *
 * Based on Jezar's public domain Freeverb implementation.
 */

// Freeverb tuning constants (at 44100 Hz) - use f32 for math compatibility
const COMB_TUNING: StaticArray<f32> = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_TUNING: StaticArray<f32> = [556, 441, 341, 225];

// Stereo spread - offset for right channel delay lines
const STEREO_SPREAD: f32 = 23;

// Fixed point scale for sample rate conversion
const BASE_SAMPLE_RATE: f32 = 44100.0;

export class Freeverb {
  // Left channel filters - initialize with placeholders, replaced in constructor
  private combsL: StaticArray<CombFilter> = new StaticArray<CombFilter>(8);
  private allpassesL: StaticArray<AllpassFilter> = new StaticArray<AllpassFilter>(4);

  // Right channel filters
  private combsR: StaticArray<CombFilter> = new StaticArray<CombFilter>(8);
  private allpassesR: StaticArray<AllpassFilter> = new StaticArray<AllpassFilter>(4);

  // Parameters
  private roomSize: f32 = 0.5;
  private damping: f32 = 0.5;
  private mix: f32 = 0.33;
  private width: f32 = 1.0;

  // Derived values
  private wet1: f32 = 0;
  private wet2: f32 = 0;
  private feedback: f32 = 0;
  private damp1: f32 = 0;

  constructor(sampleRate: f32 = 44100.0) {
    const scale: f32 = sampleRate / BASE_SAMPLE_RATE;

    // Create left channel comb filters
    for (let i = 0; i < 8; i++) {
      const size: i32 = <i32>(unchecked(COMB_TUNING[i]) * scale);
      unchecked(this.combsL[i] = new CombFilter(size));
    }

    // Create right channel comb filters (with stereo spread)
    for (let i = 0; i < 8; i++) {
      const size: i32 = <i32>((unchecked(COMB_TUNING[i]) + STEREO_SPREAD) * scale);
      unchecked(this.combsR[i] = new CombFilter(size));
    }

    // Create left channel allpass filters
    for (let i = 0; i < 4; i++) {
      const size: i32 = <i32>(unchecked(ALLPASS_TUNING[i]) * scale);
      unchecked(this.allpassesL[i] = new AllpassFilter(size));
    }

    // Create right channel allpass filters (with stereo spread)
    for (let i = 0; i < 4; i++) {
      const size: i32 = <i32>((unchecked(ALLPASS_TUNING[i]) + STEREO_SPREAD) * scale);
      unchecked(this.allpassesR[i] = new AllpassFilter(size));
    }

    this.updateDerivedValues();
  }

  private updateDerivedValues(): void {
    // Convert room size (0-1) to feedback coefficient (0.7-1.0 range)
    this.feedback = this.roomSize * 0.28 + 0.7;

    // Damping coefficient
    this.damp1 = this.damping;

    // Wet signal stereo spread (based on mix ratio)
    this.wet1 = this.mix * (this.width / 2 + 0.5);
    this.wet2 = this.mix * ((1 - this.width) / 2);
  }

  setRoomSize(value: f32): void {
    this.roomSize = value;
    this.updateDerivedValues();
  }

  setDamping(value: f32): void {
    this.damping = value;
    this.updateDerivedValues();
  }

  setMix(value: f32): void {
    this.mix = value;
    this.updateDerivedValues();
  }

  setWidth(value: f32): void {
    this.width = value;
    this.updateDerivedValues();
  }

  /**
   * Process a single stereo sample.
   * Returns interleaved [left, right].
   */
  @inline
  process(inputL: f32, inputR: f32): StaticArray<f32> {
    // Sum to mono for reverb input (scaled down)
    const input: f32 = (inputL + inputR) * 0.5;

    // Process through parallel comb filters
    let outL: f32 = 0;
    let outR: f32 = 0;

    for (let i = 0; i < 8; i++) {
      outL += unchecked(this.combsL[i]).process(input, this.feedback, this.damp1);
      outR += unchecked(this.combsR[i]).process(input, this.feedback, this.damp1);
    }

    // Scale down comb filter sum (8 filters summed)
    outL *= 0.125;
    outR *= 0.125;

    // Process through series allpass filters
    for (let i = 0; i < 4; i++) {
      outL = unchecked(this.allpassesL[i]).process(outL);
      outR = unchecked(this.allpassesR[i]).process(outR);
    }

    // Mix wet/dry and apply stereo width
    const wetL: f32 = outL * this.wet1 + outR * this.wet2;
    const wetR: f32 = outR * this.wet1 + outL * this.wet2;
    const dry: f32 = 1 - this.mix;

    const result = new StaticArray<f32>(2);
    unchecked(result[0] = wetL + inputL * dry);
    unchecked(result[1] = wetR + inputR * dry);

    return result;
  }

  /**
   * Process a mono sample, return mono output.
   */
  @inline
  processMono(input: f32): f32 {
    // Process through parallel comb filters (left channel only for mono)
    let out: f32 = 0;

    for (let i = 0; i < 8; i++) {
      out += unchecked(this.combsL[i]).process(input, this.feedback, this.damp1);
    }

    // Scale down comb filter sum (8 filters summed)
    out *= 0.125;

    // Process through series allpass filters
    for (let i = 0; i < 4; i++) {
      out = unchecked(this.allpassesL[i]).process(out);
    }

    return out * this.mix + input * (1 - this.mix);
  }

  clear(): void {
    for (let i = 0; i < 8; i++) {
      unchecked(this.combsL[i]).clear();
      unchecked(this.combsR[i]).clear();
    }
    for (let i = 0; i < 4; i++) {
      unchecked(this.allpassesL[i]).clear();
      unchecked(this.allpassesR[i]).clear();
    }
  }
}
