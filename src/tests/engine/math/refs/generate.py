"""
Reference values for auxlang's math tests (src/tests/engine/math/accuracy.test.ts).

For each function: a fixed-seed sweep of double inputs (dense in the main
range, log-spread across the whole double range, and the hard spots: near
zero, subnormals, near overflow, near the poles and the reduction worst
case). For each input, the true value from mpmath at high precision, stored
as the nearest double `hi` and the remainder in ulps of hi (`err`), so the
test measures its error to a fraction of an ulp.

    python src/tests/engine/math/refs/generate.py          (needs mpmath)
    python src/tests/engine/math/refs/generate.py 20000    (a denser sweep, written elsewhere)

Each file: {"name": ..., "arity": 1|2, "cases": [[x, (y,) hi, err], ...]}.
Non-finite results are strings ("Infinity", "-Infinity", "NaN"); -0 is "-0".
"""

import json
import math
import os
import random
import sys

import mpmath
from mpmath import mp, mpf

HERE = os.path.dirname(os.path.abspath(__file__))
TINY = 5e-324
MAX = 1.7976931348623157e308


def ulp(v):
    a = abs(v)
    if a == 0 or math.isinf(a):
        return TINY
    e = math.frexp(a)[1] - 1
    return max(2.0 ** (e - 52), TINY)


def encode(v):
    if math.isnan(v):
        return "NaN"
    if math.isinf(v):
        return "Infinity" if v > 0 else "-Infinity"
    if v == 0 and math.copysign(1, v) < 0:
        return "-0"
    return v


def nearest(ref):
    """The double nearest to the mpf `ref`, rounding subnormals once."""
    if ref == 0:
        return 0.0
    a = abs(ref)
    if a < mpf(2) ** -1022:
        units = mpmath.nint(a / mpf(2) ** -1074)
        v = float(units) * TINY
    else:
        v = float(a)
    return v if ref > 0 else -v


def reference(fn, args):
    with mp.workprec(precision_for(args)):
        try:
            ref = fn(*[mpf(a) for a in args])
        except (ValueError, ZeroDivisionError):
            return None
        if isinstance(ref, mpmath.mpc):
            return None
        hi = nearest(ref)
        if math.isinf(hi):
            return [encode(hi), 0]
        err = float((ref - mpf(hi)) / mpf(ulp(hi)))
        return [encode(hi), round(err, 4)]


def precision_for(args):
    # Enough bits to reduce a trig argument as large as the largest double.
    biggest = max((abs(a) for a in args if a != 0 and math.isfinite(a)), default=1.0)
    return 256 + max(0, math.frexp(biggest)[1])


# ---------------------------------------------------------------- inputs


def uniform(rng, n, lo, hi):
    return [rng.uniform(lo, hi) for _ in range(n)]


def log_spread(rng, n, lo, hi, signs=(1,)):
    out = []
    for _ in range(n):
        v = 2.0 ** rng.uniform(math.log2(lo), math.log2(hi))
        out.append(v * rng.choice(signs))
    return out


def near(values, steps=8):
    out = []
    for v in values:
        x = v
        for _ in range(steps):
            out.append(x)
            x = math.nextafter(x, math.inf)
        x = v
        for _ in range(steps):
            x = math.nextafter(x, -math.inf)
            out.append(x)
    return out


def finite(xs):
    return [x for x in xs if math.isfinite(x)]


SUBNORMALS = [TINY, 2 * TINY, 1e-310, 2.2250738585072009e-308, 2.2250738585072014e-308]
BOTH = (1, -1)


def trig_inputs(rng, n):
    pio2 = [k * math.pi / 2 for k in range(-12, 13)]
    return finite(
        uniform(rng, n, -2 * math.pi, 2 * math.pi)
        + log_spread(rng, n // 2, 1e-9, 1e6, BOTH)
        + log_spread(rng, n // 4, 1e6, MAX, BOTH)
        + near(pio2, 3)
        + [6381956970095103 * 2.0**797, -6381956970095103 * 2.0**797, 1e22, 1e300, MAX, 1647099.0, 1647100.0]
        + SUBNORMALS
        + [1e-8, 7.4e-9, 0.785398, 0.7853981633974483]
    )


def inputs(name, rng, n):
    if name in ("sin", "cos", "tan"):
        return [(x,) for x in trig_inputs(rng, n)]
    if name in ("asin", "acos"):
        xs = uniform(rng, n, -1, 1) + [s * (1 - 2.0**-k) for k in range(1, 53) for s in BOTH]
        xs += [s * x for s in BOTH for x in [0.5, 0.975, 2.0**-27, 2.0**-57, 1e-300] + SUBNORMALS]
        return [(x,) for x in xs]
    if name == "atan":
        xs = uniform(rng, n, -4, 4) + log_spread(rng, n // 2, 1e-12, 1e70, BOTH)
        xs += near([0.4375, 0.6875, 1.1875, 2.4375, 2.0**66], 2) + SUBNORMALS
        return [(x,) for x in xs]
    if name == "atan2":
        pairs = []
        for _ in range(n):
            y = rng.choice(BOTH) * 2.0 ** rng.uniform(-40, 40)
            x = rng.choice(BOTH) * 2.0 ** rng.uniform(-40, 40)
            pairs.append((y, x))
        for _ in range(n // 4):
            pairs.append((rng.uniform(-10, 10), rng.uniform(-10, 10)))
        pairs += [(1e-300, -1.0), (1.0, 1e-300), (1e300, 1e-300), (-1e-300, -1e300), (1.0, -1.0), (TINY, -TINY)]
        return pairs
    if name == "exp":
        xs = uniform(rng, n, -745.2, 709.8) + log_spread(rng, n // 3, 1e-12, 1, BOTH)
        xs += near([709.782712893384, -745.1332191019411, -708.39, 0.34657359, 1.0397207708], 3)
        return [(x,) for x in xs]
    if name == "expm1":
        xs = uniform(rng, n, -40, 709.78) + log_spread(rng, n // 2, 1e-18, 1, BOTH)
        xs += near([0.34657359, 1.0397207708, 38.816, 56 * math.log(2)], 2)
        return [(x,) for x in xs]
    if name == "exp2":
        xs = uniform(rng, n, -1075, 1024) + uniform(rng, n // 2, -2, 2) + log_spread(rng, n // 4, 1e-12, 1, BOTH)
        xs += near([1023.0, -1022.0, -1074.0, 0.5], 2)
        return [(x,) for x in finite(xs)]
    if name in ("log", "log2", "log10"):
        xs = log_spread(rng, n, TINY, MAX) + uniform(rng, n // 2, 0.5, 2)
        xs += [1 + s * 2.0**-k for k in range(1, 53) for s in BOTH] + SUBNORMALS + near([math.sqrt(2), math.sqrt(0.5)], 3)
        return [(x,) for x in xs if x > 0 and x != 1]
    if name == "log1p":
        xs = uniform(rng, n, -0.99, 4) + log_spread(rng, n // 2, 1e-20, 1, BOTH) + log_spread(rng, n // 4, 1, 1e300)
        xs += [-1 + 2.0**-k for k in range(1, 53)] + [math.sqrt(2) - 1, -0.2928932188134524]
        return [(x,) for x in xs if x > -1 and x != 0]
    if name == "pow":
        pairs = []
        for _ in range(n):
            pairs.append((2.0 ** rng.uniform(-30, 30), rng.uniform(-40, 40)))
        for _ in range(n // 4):
            pairs.append((rng.uniform(0, 10), rng.uniform(-300, 300)))
        for _ in range(n // 4):
            pairs.append((-(2.0 ** rng.uniform(-10, 10)), float(rng.randint(-60, 60))))
        for _ in range(n // 8):
            pairs.append((1 + rng.uniform(-1e-6, 1e-6), rng.uniform(-3e9, 3e9)))
        for _ in range(n // 8):
            x = 2.0 ** rng.uniform(-1000, 1000)
            pairs.append((x, rng.uniform(-1074, 1023) / math.log2(x)))
        pairs += [(10.0, -0.05), (10.0, 308.25), (0.5, 1074.0), (0.5, 1075.0), (TINY, 0.5), (MAX, 0.5), (3.0, 0.5)]
        return [p for p in pairs if p[1] != 0]
    if name in ("sinh", "cosh"):
        xs = uniform(rng, n, -711, 711) + uniform(rng, n // 2, -3, 3) + log_spread(rng, n // 4, 1e-12, 1, BOTH)
        xs += near([709.78, 710.4758, 0.6931, 1.0], 2)
        return [(x,) for x in xs]
    if name == "tanh":
        xs = uniform(rng, n, -25, 25) + log_spread(rng, n // 2, 1e-20, 1, BOTH) + near([0.5493, 0.2554, 20.0], 2) + SUBNORMALS
        return [(x,) for x in xs]
    if name == "asinh":
        xs = log_spread(rng, n, 1e-12, 1e300, BOTH) + uniform(rng, n // 2, -4, 4) + near([2.0, 2.0**26, 2.0**-26], 2)
        return [(x,) for x in xs]
    if name == "acosh":
        xs = log_spread(rng, n, 1, 1e300) + [1 + 2.0**-k for k in range(1, 53)] + uniform(rng, n // 2, 1, 3) + near([2.0, 2.0**26], 2)
        return [(x,) for x in xs if x >= 1]
    if name == "atanh":
        xs = uniform(rng, n, -1, 1) + [s * (1 - 2.0**-k) for k in range(1, 53) for s in BOTH] + log_spread(rng, n // 4, 1e-20, 0.5, BOTH)
        return [(x,) for x in xs if abs(x) < 1]
    if name == "cbrt":
        xs = log_spread(rng, n, TINY, MAX, BOTH) + uniform(rng, n // 2, -10, 10) + SUBNORMALS + [27.0, -8.0, 1e300, MAX]
        return [(x,) for x in xs if x != 0]
    if name == "hypot":
        pairs = []
        for _ in range(n):
            pairs.append((rng.choice(BOTH) * 2.0 ** rng.uniform(-60, 60), rng.choice(BOTH) * 2.0 ** rng.uniform(-60, 60)))
        for _ in range(n // 4):
            pairs.append((rng.uniform(-10, 10), rng.uniform(-10, 10)))
        for _ in range(n // 8):
            pairs.append((2.0 ** rng.uniform(-1074, 1023), 2.0 ** rng.uniform(-1074, 1023)))
        pairs += [(1e300, 1e300), (1e-300, 1e-300), (TINY, TINY), (3.0, 4.0), (MAX, 1.0), (MAX, MAX / 2)]
        return pairs
    raise KeyError(name)


def signed_cbrt(x):
    return mpmath.cbrt(x) if x >= 0 else -mpmath.cbrt(-x)


FUNCTIONS = {
    "sin": mpmath.sin,
    "cos": mpmath.cos,
    "tan": mpmath.tan,
    "asin": mpmath.asin,
    "acos": mpmath.acos,
    "atan": mpmath.atan,
    "atan2": mpmath.atan2,
    "exp": mpmath.exp,
    "expm1": mpmath.expm1,
    "exp2": lambda y: mpmath.power(2, y),
    "log": mpmath.log,
    "log2": lambda x: mpmath.log(x, 2),
    "log10": mpmath.log10,
    "log1p": mpmath.log1p,
    "pow": mpmath.power,
    "sinh": mpmath.sinh,
    "cosh": mpmath.cosh,
    "tanh": mpmath.tanh,
    "asinh": mpmath.asinh,
    "acosh": mpmath.acosh,
    "atanh": mpmath.atanh,
    "cbrt": signed_cbrt,
    "hypot": mpmath.hypot,
}


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 600
    out_dir = HERE if n == 600 else os.path.join(HERE, "..", "..", "..", "..", "..", "math-refs-dense")
    os.makedirs(out_dir, exist_ok=True)
    for name, fn in FUNCTIONS.items():
        rng = random.Random(f"auxlang-math-{name}")
        cases = []
        for args in inputs(name, rng, n):
            got = reference(fn, args)
            if got is not None:
                cases.append([*args, *got])
        doc = {"name": name, "arity": len(cases[0]) - 2, "cases": cases}
        with open(os.path.join(out_dir, f"{name}.json"), "w", newline="\n") as f:
            json.dump(doc, f, separators=(",", ":"))
            f.write("\n")
        print(name, len(cases))


if __name__ == "__main__":
    main()
