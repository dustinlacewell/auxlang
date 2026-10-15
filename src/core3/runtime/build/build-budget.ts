/**
 * The estimated cost (step-costs.ts) of build steps the worklet spends per
 * block while the old engine plays (worklet/live-host.ts). The estimates
 * are near measured time, so a block spends about 0.4 ms on the build,
 * under the 0.5 ms build-block target. Measured: the build fits beside a
 * block's render without an overrun.
 */

export const BUILD_BUDGET = 400;
