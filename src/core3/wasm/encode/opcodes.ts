/**
 * The WebAssembly instruction and type bytes the backend emits (core spec,
 * MVP plus the saturating truncation). One table, so every emitter names an
 * instruction the same way.
 */

export const OP = {
	unreachable: 0x00,
	block: 0x02,
	loop: 0x03,
	if: 0x04,
	else: 0x05,
	end: 0x0b,
	br: 0x0c,
	brIf: 0x0d,
	return: 0x0f,
	call: 0x10,
	drop: 0x1a,
	select: 0x1b,
	localGet: 0x20,
	localSet: 0x21,
	localTee: 0x22,
	i32Load: 0x28,
	f32Load: 0x2a,
	f64Load: 0x2b,
	i32Load8S: 0x2c,
	i32Load8U: 0x2d,
	i32Load16S: 0x2e,
	i32Load16U: 0x2f,
	i32Store: 0x36,
	f32Store: 0x38,
	f64Store: 0x39,
	i32Store8: 0x3a,
	i32Store16: 0x3b,
	i32Const: 0x41,
	f64Const: 0x44,
	i32Eqz: 0x45,
	i32Eq: 0x46,
	i32Ne: 0x47,
	i32LtS: 0x48,
	i32LtU: 0x49,
	i32GtS: 0x4a,
	i32LeS: 0x4c,
	i32GeS: 0x4e,
	f64Eq: 0x61,
	f64Ne: 0x62,
	f64Lt: 0x63,
	f64Gt: 0x64,
	f64Le: 0x65,
	f64Ge: 0x66,
	i32Clz: 0x67,
	i32Add: 0x6a,
	i32Sub: 0x6b,
	i32Mul: 0x6c,
	i32RemS: 0x6f,
	i32And: 0x71,
	i32Or: 0x72,
	i32Xor: 0x73,
	i32Shl: 0x74,
	i32ShrS: 0x75,
	i32ShrU: 0x76,
	f64Abs: 0x99,
	f64Neg: 0x9a,
	f64Ceil: 0x9b,
	f64Floor: 0x9c,
	f64Trunc: 0x9d,
	f64Nearest: 0x9e,
	f64Sqrt: 0x9f,
	f64Add: 0xa0,
	f64Sub: 0xa1,
	f64Mul: 0xa2,
	f64Div: 0xa3,
	f64Min: 0xa4,
	f64Max: 0xa5,
	f64Copysign: 0xa6,
	i32TruncF64S: 0xaa,
	i32TruncF64U: 0xab,
	f32DemoteF64: 0xb6,
	f64ConvertI32S: 0xb7,
	f64ConvertI32U: 0xb8,
	f64PromoteF32: 0xbb,
	/** Prefix of the saturating truncations; `i32.trunc_sat_f64_s` is sub-opcode 2. */
	prefixFC: 0xfc,
} as const;

export const TRUNC_SAT_F64_S = 2;
export const TRUNC_SAT_F64_U = 3;

/** Value types. */
export const I32 = 0x7f;
export const F64 = 0x7c;

/** The empty block type. */
export const VOID_BLOCK = 0x40;
