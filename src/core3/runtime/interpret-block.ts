/**
 * The reference driver: the interpreted sample walk (interpret-sample.ts)
 * run once per sample of the block, with the buffer flip before each sample
 * and the out-node tap sum after it.
 */

import type { Driver, DriverPlan } from "./driver";
import { interpretSample } from "./interpret-sample";

export function interpretBlock(plan: DriverPlan): Driver {
	const walk = interpretSample(plan.runs);
	const tapsL = plan.tapsL;
	const tapsR = plan.tapsR;
	return (bufs, outL, outR, offset, n, count, sr) => {
		for (let k = 0; k < n; k++) {
			const flip = bufs.prv;
			bufs.prv = bufs.cur;
			bufs.cur = flip;
			const cur = flip;
			walk(cur, bufs.prv, sr, (count + k) / sr);
			let sumL = 0;
			let sumR = 0;
			for (let j = 0; j < tapsL.length; j++) {
				sumL += cur[tapsL[j] as number] as number;
				sumR += cur[tapsR[j] as number] as number;
			}
			outL[offset + k] = sumL;
			outR[offset + k] = sumR;
		}
	};
}
