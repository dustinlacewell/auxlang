/**
 * Registration manifest: importing this file populates the realm registry.
 * The module library (`lib/`) is plain `defmod` source, evaluated at root
 * scope through the same path as a patch-defined module (load-lib.ts). The
 * TypeScript imports are the bridge modules exempt from the tick subset
 * (module/tick-subset/exempt.ts). This is the ONE permitted side-effect
 * import — it is NOT a barrel (no re-exports of internal helpers).
 */

import "./clock";
import "./counter";
import "./seq";
import { libSources } from "./lib-sources";
import { loadLib } from "./load-lib";

loadLib(libSources());
