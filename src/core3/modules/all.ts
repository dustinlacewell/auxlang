/**
 * Registration manifest: importing this file runs every module file's
 * `defineModule` side-effect, populating the registry. This is the ONE permitted
 * side-effect import — it is NOT a barrel (no re-exports of internal helpers).
 */

import "./clock";
import "./seq";
import "./patsig";
import "./patstep";
import "./osc";
import "./svf";
import "./env";
import "./mul";
import "./add";
import "./sub";
import "./div";
import "./cmp";
import "./clip";
import "./abs";
import "./mod";
import "./scale";
import "./slew";
import "./sah";
import "./noise";
import "./z1";
import "./delay";
import "./pan";
import "./mix";
import "./out";
import "./quantize";
import "./drums/kick";
import "./drums/snare";
import "./drums/hihat";
import "./drums/clap";
