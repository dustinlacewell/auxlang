/**
 * Worklet bundle entry. Vite bundles this file (loaded via `?worker&url` +
 * `audioWorklet.addModule` in ../audio.ts). Importing the module manifest
 * ships every module's code in the worklet bundle — the registry is populated
 * by side effect, nothing crosses the boundary as strings except user lambdas.
 */

import "../../modules/all";
import "./processor";
