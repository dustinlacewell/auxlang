# Punctual Feature Catalog

Based on Signal.purs and REFERENCE.md

## 1. Language Syntax

### Basic Syntax
| Syntax | Description |
|--------|-------------|
| `-- comment` | Line comment |
| `1.5` | Number literal |
| `[a, b, c]` | Combinatorial list (cross-product) |
| `{a, b, c}` | Pairwise list (zip) |
| `f x` | Function application |
| `x + y` | Infix operators |
| `\x -> expr` | Lambda functions |
| `if c then a else b` | Conditionals |
| `1..10` | Range notation |
| `1,3..10` | Range with step |

### Output Targets
| Syntax | Description |
|--------|-------------|
| `expr >> video` | Send to video output |
| `expr >> audio` | Send to audio output (stereo) |
| `expr >> left` | Send to left channel |
| `expr >> right` | Send to right channel |
| `expr >> red` | Set red channel |
| `expr >> green` | Set green channel |
| `expr >> blue` | Set blue channel |
| `expr >> alpha` | Set alpha channel |
| `expr >> hsv` | Output as HSV |
| `expr >> rgb` | Output as RGB |

### Blending Modes
| Syntax | Description |
|--------|-------------|
| `expr >> add >> video` | Additive blend |
| `expr >> mul >> video` | Multiplicative blend |
| `expr >> blend >> video` | Alpha blend |

## 2. Coordinates & Fragment Variables

### Cartesian Coordinates
| Signal | Range | Description |
|--------|-------|-------------|
| `fx` | -1 to 1 | Fragment x coordinate |
| `fy` | -1 to 1 | Fragment y coordinate |
| `fxy` | [-1,1], [-1,1] | Fragment x,y pair |

### Polar Coordinates
| Signal | Range | Description |
|--------|-------|-------------|
| `fr` | 0+ | Distance from center |
| `ft` | -pi to pi | Angle from center |
| `frt` | [r, t] | Polar coordinate pair |

### Aspect & Pixels
| Signal | Description |
|--------|-------------|
| `aspect` | Width/height ratio |
| `px` | Pixel x coordinate |
| `py` | Pixel y coordinate |
| `pxy` | Pixel coordinate pair |

## 3. Time Signals

| Signal | Description |
|--------|-------------|
| `time` | Time in seconds since program start |
| `beat` | Time in beats (affected by cps) |
| `etime` | Time in seconds since eval |
| `ebeat` | Beats since eval |
| `cps` | Current cycles per second |

## 4. Audio Analysis

### FFT Analysis
| Signal | Description |
|--------|-------------|
| `fft` | Full FFT spectrum |
| `ifft` | Inverse FFT |
| `lo` | Low frequency energy |
| `mid` | Mid frequency energy |
| `hi` | High frequency energy |
| `ilo` | Integrated low |
| `imid` | Integrated mid |
| `ihi` | Integrated high |

### Audio Input
| Signal | Description |
|--------|-------------|
| `ain n offset` | Audio input channels |

## 5. Oscillators

### Audio Rate Oscillators
| Function | Description |
|----------|-------------|
| `osc f` | Sine oscillator (bipolar) |
| `tri f` | Triangle wave |
| `saw f` | Sawtooth wave |
| `sqr f` | Square wave |

### LFOs (Low Frequency)
| Function | Range | Description |
|----------|-------|-------------|
| `lftri f` | 0-1 | Unipolar triangle |
| `lfsaw f` | 0-1 | Unipolar sawtooth |
| `lfsqr f` | 0-1 | Unipolar square |

## 6. Math Functions

### Unary Math
| Function | Description |
|----------|-------------|
| `abs x` | Absolute value |
| `acos x` | Arc cosine |
| `acosh x` | Hyperbolic arc cosine |
| `asin x` | Arc sine |
| `asinh x` | Hyperbolic arc sine |
| `atan x` | Arc tangent |
| `atanh x` | Hyperbolic arc tangent |
| `cbrt x` | Cube root |
| `ceil x` | Ceiling |
| `cos x` | Cosine |
| `cosh x` | Hyperbolic cosine |
| `exp x` | e^x |
| `floor x` | Floor |
| `log x` | Natural log |
| `log2 x` | Log base 2 |
| `log10 x` | Log base 10 |
| `round x` | Round |
| `sign x` | Sign (-1, 0, 1) |
| `sin x` | Sine |
| `sinh x` | Hyperbolic sine |
| `sqrt x` | Square root |
| `tan x` | Tangent |
| `tanh x` | Hyperbolic tangent |
| `trunc x` | Truncate |
| `fract x` | Fractional part |

### Binary Operations
| Operator | Description |
|----------|-------------|
| `+` | Addition |
| `-` | Subtraction |
| `*` | Multiplication |
| `/` | Division |
| `%` | Modulo |
| `**` | Power |
| `==` | Equal |
| `/=` | Not equal |
| `>` | Greater than |
| `>=` | Greater or equal |
| `<` | Less than |
| `<=` | Less or equal |
| `max a b` | Maximum |
| `min a b` | Minimum |
| `gate thresh x` | Gate (0 if below threshold) |
| `clip lo hi x` | Clamp to range |
| `between lo hi x` | 1 if in range, else 0 |
| `smoothstep lo hi x` | Smooth interpolation |

### Range Conversion
| Function | Description |
|----------|-------------|
| `bipolar x` | Convert 0-1 to -1 to 1 |
| `unipolar x` | Convert -1..1 to 0-1 |
| `linlin [inLo, inHi] [outLo, outHi] x` | Linear mapping |

## 7. Coordinate Transforms

### Polar/Cartesian Conversion
| Function | Description |
|----------|-------------|
| `rtxy rt` | Polar to Cartesian |
| `rtx rt` | Polar to X |
| `rty rt` | Polar to Y |
| `xyrt xy` | Cartesian to Polar |
| `xyr xy` | Cartesian to R |
| `xyt xy` | Cartesian to Theta |

### Distance Functions
| Function | Description |
|----------|-------------|
| `point xy` | Distance from point |
| `dist xy` | Same as point |
| `prox xy` | Proximity (inverse distance) |

### Spatial Transforms
| Function | Description |
|----------|-------------|
| `setfx x expr` | Set fragment X |
| `setfy y expr` | Set fragment Y |
| `setfxy xy expr` | Set fragment XY |
| `zoom z expr` | Zoom uniformly |
| `zoomxy [zx, zy] expr` | Zoom X and Y |
| `zoomx zx expr` | Zoom X only |
| `zoomy zy expr` | Zoom Y only |
| `move [dx, dy] expr` | Translate |
| `tile n expr` | Tile uniformly |
| `tilexy [nx, ny] expr` | Tile X and Y |
| `tilex nx expr` | Tile X only |
| `tiley ny expr` | Tile Y only |
| `spin angle expr` | Rotate |

## 8. Visual Primitives

### Shapes
| Function | Description |
|----------|-------------|
| `circle [x, y] r` | Circle at position with radius |
| `rect [x, y] [w, h]` | Rectangle |
| `point xy` | Point (inverse distance) |
| `vline x w` | Vertical line |
| `hline y w` | Horizontal line |

### Lines & Connections
| Function | Description |
|----------|-------------|
| `line [x1,y1] [x2,y2] w` | Line segment |
| `iline [x1,y1] [x2,y2] w` | Infinite line |
| `chain [x1,y1,x2,y2,...] w` | Connected line segments |
| `lines [x1,y1,x2,y2,...] w` | Disconnected lines |
| `ilines [...] w` | Infinite lines |
| `mesh [x1,y1,x2,y2,...] w` | Connect all points |

## 9. Video/Image Sources

| Signal | Description |
|--------|-------------|
| `fb` | Feedback (previous frame) |
| `cam` | Webcam RGB |
| `cama` | Webcam RGBA |
| `img "url"` | Image RGB |
| `imga "url"` | Image RGBA |
| `vid "url"` | Video RGB |
| `vida "url"` | Video RGBA |

## 10. Color Functions

### Color Space Conversion
| Function | Description |
|----------|-------------|
| `rgbhsv rgb` | RGB to HSV |
| `hsvrgb hsv` | HSV to RGB |
| `rgbh rgb` | Extract hue |
| `rgbs rgb` | Extract saturation |
| `rgbv rgb` | Extract value |
| `rgbr rgb` | Extract red |
| `rgbg rgb` | Extract green |
| `rgbb rgb` | Extract blue |
| `hsvr hsv` | HSV to red |
| `hsvg hsv` | HSV to green |
| `hsvb hsv` | HSV to blue |

## 11. Audio Processing

### Filters
| Function | Description |
|----------|-------------|
| `lpf [freq, q] x` | Lowpass filter |
| `hpf [freq, q] x` | Highpass filter |
| `bpf [freq, q] x` | Bandpass filter |

### Delay
| Function | Description |
|----------|-------------|
| `delay maxTime delayTime x` | Audio delay |

### Unit Conversion
| Function | Description |
|----------|-------------|
| `midicps midi` | MIDI to frequency |
| `cpsmidi freq` | Frequency to MIDI |
| `dbamp db` | dB to amplitude |
| `ampdb amp` | Amplitude to dB |

## 12. Multichannel Operations

### Channel Manipulation
| Function | Description |
|----------|-------------|
| `mono x` | Mix to mono |
| `rep n x` | Replicate n channels |
| `splay n x` | Spread to n channels |
| `++` (append) | Concatenate channels |
| `zip` | Interleave channels |

### Panning/Spreading
| Function | Description |
|----------|-------------|
| `pan n position x` | Pan to n channels |
| `btw n position x` | Between channels |
| `spr mat vec` | Spread across matrix |

## 13. Sequencing

| Function | Description |
|----------|-------------|
| `seq [a, b, c, ...]` | Step through list per beat |
| `early t x` | Shift earlier in time |
| `late t x` | Shift later in time |
| `slow n x` | Slow down by factor |
| `fast n x` | Speed up by factor |

## 14. Mixing/Interpolation

| Function | Description |
|----------|-------------|
| `mix a b t` | Linear interpolation |

## 15. Random

| Signal | Description |
|--------|-------------|
| `rnd` | Random value per fragment |

## 16. Constants

| Signal | Description |
|--------|-------------|
| `pi` | Pi (3.14159...) |

## 17. MultiMode Semantics

Punctual has two modes for combining multi-channel signals:

### Combinatorial `[a, b]`
- Cross-product of channels
- `[1, 2] + [10, 20]` = `[11, 21, 12, 22]`

### Pairwise `{a, b}`
- Zip channels together
- `{1, 2} + {10, 20}` = `{11, 22}`

This affects all binary operations and is a key part of Punctual's expressiveness.

## 18. Program Structure

Multiple statements separated by `;`:
```
osc 110 >> audio;
circle 0 (lo * 0.5) >> video
```

Multiple outputs combine additively by default or with explicit blend modes.
