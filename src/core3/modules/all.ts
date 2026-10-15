/**
 * Registration manifest: importing this file populates the realm registry.
 * The module library (`lib/`) is plain `defmod` source, evaluated at root
 * scope through the same path as a patch-defined module (load-lib.ts). The
 * TypeScript imports below are the modules not yet in the library. This is
 * the ONE permitted side-effect import — it is NOT a barrel (no re-exports of
 * internal helpers).
 */

import "./clock";
import "./counter";
import "./seq";
import "./osc";
import "./lfo";
import "./fm";
import "./svf";
import "./env";
import "./add";
import "./sub";
import "./div";
import "./cmp";
import "./clip";
import "./abs";
import "./wrap";
import "./period";
import "./units/pitch-conversions";
import "./units/tempo-conversions";
import "./scale";
import "./slew";
import "./sah";
import "./noise";
import "./z1";
import "./delay";
import "./reverb";
import "./phaser";
import "./shape";
import "./pan";
import "./mix";
import "./out";
import "./quantize";
import "./drums/kick";
import "./drums/snare";
import "./drums/hihat";
import "./drums/clap";
import { libSources } from "./lib-sources";
import { loadLib } from "./load-lib";

loadLib(libSources());
