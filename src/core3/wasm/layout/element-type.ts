/**
 * A typed array element's size in linear memory
 * (module/front/types/element-type.ts names the types).
 */

import type { ElementType } from "../../module/front/types/element-type";

export const ELEMENT_BYTES: Readonly<Record<ElementType, number>> = {
	f64: 8,
	f32: 4,
	i32: 4,
	u32: 4,
	i16: 2,
	u16: 2,
	i8: 1,
	u8: 1,
	u8c: 1,
};
