/**
 * The typed array constructor of each element type (element-type.ts): what
 * a lane's array reads back as when memory is decoded into a state.
 */

import type { ElementType } from "./element-type";

type ArrayCtor = new (buffer: ArrayBuffer) => ArrayBufferView;

export const ELEMENT_ARRAYS: Readonly<Record<ElementType, ArrayCtor>> = {
	f64: Float64Array,
	f32: Float32Array,
	i32: Int32Array,
	u32: Uint32Array,
	i16: Int16Array,
	u16: Uint16Array,
	i8: Int8Array,
	u8: Uint8Array,
	u8c: Uint8ClampedArray,
};
