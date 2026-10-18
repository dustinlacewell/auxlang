import type { Example } from "@/ui/editor/examples/example";

/** defmod: a module written in the DSP language; edit it while it plays. */
const liveModule = `tempo(110)

function readAt(buf, pos) {
  const n = buf.length
  const i = Math.floor(pos)
  const a = buf[((i % n) + n) % n]
  const b = buf[(((i + 1) % n) + n) % n]
  return a + (b - a) * (pos - i)
}

defmod("echo", ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  let t = 0.3
  return ({ in: x = 0, time = secs(0.3, 0.05, 1), fb = range(0.5, 0, 0.95) }) => {
    t += (time - t) * 0.001
    const y = x + readAt(buf, w - t * sr) * fb
    buf[w] = y
    w = (w + 1) % buf.length
    return y
  }
})

const s = seq("c4 e4 g4 ~")
s.tri()
  .mul(s.gate.ad(0.005, 0.15))
  .echo({ time: 0.3, fb: 0.5 })
  .gain(0.3)
  .out()
`;

export const liveModuleExample: Example = { name: "write a module (defmod)", source: liveModule };
