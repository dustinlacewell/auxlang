/**
 * The pure library functions a shape-C tick or setup may call by name,
 * without listing them as a same-file helper: the names `load-lib.ts`'s
 * `LIB_SCOPE` gives a library file beyond `defmod` and the port builders
 * (`units/pitch.ts`). `helper-closure.ts` treats a free name found here as
 * resolved, and carries its definition into the module's `helpers`.
 */

import { hzToSemis, semisToHz } from "../units/pitch";

export const LIBRARY_FUNCTIONS: Readonly<Record<string, (...args: never[]) => unknown>> = {
	semisToHz,
	hzToSemis,
};
