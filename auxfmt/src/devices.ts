/**
 * Device registry for auxfmt.
 *
 * Defines positional args order and preferred style for each device.
 * Note: Default input typically comes from the chain, not positional args.
 */

export type ArgStyle = "positional" | "setters" | "config";

export interface DeviceConfig {
	/** Positional args in order (excludes default input which comes from chain) */
	args: string[];
	/** Preferred formatting style */
	style: ArgStyle;
}

/**
 * Registry of all devices and their configurations.
 *
 * args: ordered list of parameter names for positional style
 *       (default input comes from chain, not listed here)
 * style: preferred formatting style
 *   - "positional": .lpf(800, 0.5)
 *   - "setters": .lpf().cutoff(800).resonance(0.5)
 *   - "config": .delay({ time: 0.2, feedback: 0.5 })
 */
export const devices: Record<string, DeviceConfig> = {
	// Oscillators (sources - freq is the main param)
	saw: { args: ["freq"], style: "positional" },
	sin: { args: ["freq"], style: "positional" },
	tri: { args: ["freq"], style: "positional" },
	sqr: { args: ["freq"], style: "positional" },
	noise: { args: [], style: "positional" },
	lfo: { args: ["freq", "min", "max"], style: "positional" },

	// Drums (trig is the main param)
	kick: { args: ["trig"], style: "positional" },
	snare: { args: ["trig"], style: "positional" },
	hihat: { args: ["trig"], style: "positional" },
	clap: { args: ["trig"], style: "positional" },

	// Filters (input from chain)
	lpf: { args: ["cutoff", "resonance"], style: "positional" },
	hpf: { args: ["cutoff", "resonance"], style: "positional" },
	bpf: { args: ["cutoff", "resonance"], style: "positional" },
	notch: { args: ["cutoff", "resonance"], style: "positional" },

	// Envelopes (gate is the main param, rest are config)
	adsr: { args: ["attack", "decay", "sustain", "release"], style: "config" },
	ad: { args: ["attack", "decay"], style: "positional" },
	ar: { args: ["attack", "release"], style: "positional" },

	// Effects (input from chain, use config for clarity)
	delay: { args: ["time", "feedback", "mix"], style: "config" },
	reverb: { args: ["room", "damp", "mix"], style: "config" },
	tape: { args: ["time", "feedback", "mix"], style: "config" },

	// Utilities (input from chain)
	gain: { args: ["level"], style: "positional" },
	mix: { args: ["a", "b", "mix"], style: "positional" },
	pan: { args: ["pan"], style: "positional" },
	slew: { args: ["rise", "fall"], style: "positional" },
	sah: { args: ["trig"], style: "positional" },
	quantize: { args: ["scale", "root", "octave"], style: "config" },

	// Math (input from chain)
	scale: { args: ["min", "max"], style: "positional" },
	add: { args: ["amount"], style: "positional" },
	mult: { args: ["amount"], style: "positional" },
	clip: { args: ["min", "max"], style: "positional" },

	// Timing
	clock: { args: ["bpm"], style: "positional" },
	seq: { args: ["pattern"], style: "positional" },
	clockDiv: { args: ["divisor"], style: "positional" },
	clockMult: { args: ["multiplier"], style: "positional" },
	counter: { args: ["max"], style: "positional" },

	// Poly
	poly: { args: ["voices"], style: "positional" },
	voices: { args: ["count"], style: "positional" },
	spread: { args: ["width"], style: "positional" },
	sum: { args: [], style: "positional" },

	// Output
	out: { args: [], style: "positional" },
};

/** Check if a name is a known device */
export function isDevice(name: string): boolean {
	return name in devices;
}

/** Get device config, or undefined if not a device */
export function getDevice(name: string): DeviceConfig | undefined {
	return devices[name];
}

/** Check if a name is a known param for a device */
export function isDeviceParam(deviceName: string, paramName: string): boolean {
	const device = devices[deviceName];
	return device?.args.includes(paramName) ?? false;
}
