# Strudel Feature Catalog

## 1. Mini Notation (krill.pegjs)

### Structural Elements
| Syntax | Name | Description |
|--------|------|-------------|
| `a b c` | Sequence | Events in sequence within a cycle |
| `[a b]` | Sub-cycle | Subdivide time evenly |
| `a,b` | Stack | Layer sounds simultaneously |
| `a\|b` | Random choice | Choose one randomly each cycle |
| `<a b>` | Slow sequence | One per cycle (slowcat) |
| `{a b,c d e}` | Polymeter | Different length patterns aligned |
| `{a b}%4` | Polymeter with steps | Specify steps per cycle |
| `a.b.c` | Feet/subdivisions | Alternative to `[a b c]` |

### Operators
| Syntax | Name | Description |
|--------|------|-------------|
| `a*n` | Fast | Speed up n times |
| `a/n` | Slow | Slow down n times |
| `a!n` | Replicate | Repeat n times |
| `a?` | Degrade | Randomly drop (~50%) |
| `a?0.2` | Degrade by | Drop with probability |
| `a@n` | Weight | Duration weight |
| `a:n` | Tail | Sample index / note attribute |
| `a(p,s)` | Euclidean | Bjorklund rhythm |
| `a(p,s,r)` | Euclidean rotated | With rotation |
| `a..b` | Range | Number range |

### Values
| Type | Examples |
|------|----------|
| Notes | `c`, `c#4`, `eb3`, `60` (midi) |
| Samples | `bd`, `sd:2`, `hh` |
| Numbers | `0.5`, `1`, `-1` |
| Rest | `~` |

## 2. Pattern Operations (pattern.mjs)

### Core Pattern Combinators
| Function | Description |
|----------|-------------|
| `stack(...pats)` | Layer patterns simultaneously |
| `cat(...pats)` / `slowcat` | One pattern per cycle |
| `fastcat(...pats)` / `seq` | All patterns in one cycle |
| `sequence(...pats)` | Same as fastcat |
| `polymeter(...pats)` | Align by steps |
| `stepcat(...pats)` | Concatenate by step count |
| `arrange([n, pat], ...)` | Arrange over multiple cycles |

### Time Manipulation
| Function | Description |
|----------|-------------|
| `fast(n)` / `density(n)` | Speed up by factor |
| `slow(n)` / `sparsity(n)` | Slow down by factor |
| `early(n)` | Shift earlier in time |
| `late(n)` | Shift later in time |
| `hurry(n)` | Fast + speed (pitch) |
| `rev` | Reverse within cycle |
| `palindrome` | Alternate forward/backward |
| `iter(n)` | Rotate subdivisions each cycle |
| `iterBack(n)` | Rotate backwards |
| `chunk(n, f)` | Apply f to rotating chunk |
| `repeatCycles(n)` | Repeat each cycle n times |
| `zoom(start, end)` | Focus on portion of cycle |
| `linger(t)` | Loop portion of pattern |
| `ribbon(offset, len)` | Loop a section of time |

### Structure Manipulation
| Function | Description |
|----------|-------------|
| `struct(pat)` | Apply rhythmic structure |
| `mask(pat)` | Silence where 0/false |
| `euclid(p, s, r)` | Euclidean rhythm |
| `compress(b, e)` | Compress into time span |
| `fastGap(n)` | Fast with gap |
| `focus(b, e)` | Similar to zoom |
| `ply(n)` | Repeat each event n times |
| `segment(n)` | Sample at n points per cycle |
| `bite(n, pat)` | Slice and rearrange |
| `chop(n)` | Cut sample into n parts |
| `striate(n)` | Progressive sample slicing |
| `slice(n, pat)` | Slice by pattern |
| `splice(n, pat)` | Slice with time-stretch |
| `reset(pat)` | Reset on trigger |
| `restart(pat)` | Restart from cycle 0 |

### Value Operations
| Function | Description |
|----------|-------------|
| `add(n)` | Add to values |
| `sub(n)` | Subtract from values |
| `mul(n)` | Multiply values |
| `div(n)` | Divide values |
| `mod(n)` | Modulo |
| `pow(n)` | Power |
| `set(pat)` | Replace values |
| `keepif(pat)` | Keep if true |
| `round` | Round to integer |
| `floor` | Floor values |
| `ceil` | Ceiling values |
| `range(min, max)` | Scale 0-1 to range |
| `rangex(min, max)` | Exponential range |
| `range2(min, max)` | Scale -1..1 to range |

### Conditional/Higher Order
| Function | Description |
|----------|-------------|
| `every(n, f)` / `firstOf` | Apply f every n cycles |
| `lastOf(n, f)` | Apply f on last of n cycles |
| `when(pat, f)` | Apply f when pat is true |
| `layer(...fs)` | Apply multiple functions |
| `superimpose(...fs)` | Layer original with transformed |
| `off(t, f)` | Delay transformed version |
| `jux(f)` | Stereo: original L, f(pat) R |
| `juxBy(n, f)` | jux with stereo width |
| `within(start, end, f)` | Apply f to portion |
| `outside(n, f)` | Apply f at larger scale |
| `inside(n, f)` | Apply f at smaller scale |

### Echo/Delay Operations
| Function | Description |
|----------|-------------|
| `echo(times, time, feedback)` | Repeat with decay |
| `echoWith(times, time, f)` | Repeat with function |
| `stut(times, feedback, time)` | Legacy echo |

### Randomness
| Function | Description |
|----------|-------------|
| `rand` | Random 0-1 signal |
| `irand(n)` | Random integer 0 to n-1 |
| `choose(...vals)` | Random from list |
| `wchoose(...)` | Weighted random |
| `degradeBy(n)` | Drop events by probability |
| `degrade` | 50% dropout |
| `sometimesBy(n, f)` | Apply f n% of time |
| `sometimes(f)` | 50% apply f |
| `often(f)` | 75% apply f |
| `rarely(f)` | 25% apply f |
| `almostNever(f)` | 10% apply f |
| `almostAlways(f)` | 90% apply f |
| `shuffle(n)` | Shuffle n subdivisions |
| `scramble(n)` | Random permutation |

### Continuous Signals
| Signal | Description |
|--------|-------------|
| `sine` | Sine wave 0-1 |
| `sine2` | Sine wave -1 to 1 |
| `cosine` / `cosine2` | Cosine wave |
| `saw` / `saw2` | Sawtooth |
| `tri` / `tri2` | Triangle |
| `square` / `square2` | Square wave |
| `perlin` | Perlin noise |
| `rand` | Random per cycle |
| `time` | Current time |

### Arpeggiation
| Function | Description |
|----------|-------------|
| `arp(pat)` | Arpeggiate chord by indices |
| `arpWith(f)` | Custom arpeggiator |

## 3. Audio Controls (controls.mjs)

### Sound Selection
| Control | Description |
|---------|-------------|
| `s(name)` / `sound` | Select sample/synth |
| `n(i)` | Sample index |
| `note(n)` | Note name/midi |
| `bank(name)` | Sample bank |

### Amplitude Envelope
| Control | Description |
|---------|-------------|
| `attack` / `att` | Attack time |
| `decay` / `dec` | Decay time |
| `sustain` / `sus` | Sustain level |
| `release` / `rel` | Release time |
| `hold` | Hold time |

### Gain/Volume
| Control | Description |
|---------|-------------|
| `gain` | Exponential gain |
| `amp` | Linear amplitude |
| `velocity` | Velocity 0-1 |
| `postgain` | Post-FX gain |

### Filters
| Control | Description |
|---------|-------------|
| `lpf` / `cutoff` / `lp` | Lowpass frequency |
| `lpq` / `resonance` | LP resonance |
| `lpenv` / `lpe` | LP envelope depth |
| `lpattack` / `lpa` | LP env attack |
| `lpdecay` / `lpd` | LP env decay |
| `lpsustain` / `lps` | LP env sustain |
| `lprelease` / `lpr` | LP env release |
| `hpf` / `hp` | Highpass frequency |
| `hpq` | HP resonance |
| `hpenv` / `hpe` | HP envelope depth |
| `bpf` / `bp` | Bandpass frequency |
| `bpq` / `bandq` | BP Q factor |
| `ftype` | Filter type |
| `drive` | Filter overdrive |

### Effects
| Control | Description |
|---------|-------------|
| `delay` | Delay send |
| `delaytime` / `delayt` | Delay time |
| `delayfeedback` / `delayfb` | Delay feedback |
| `room` | Reverb send |
| `roomsize` / `sz` | Reverb size |
| `distort` / `dist` | Distortion |
| `shape` | Waveshaping |
| `crush` | Bitcrusher depth |
| `coarse` | Sample rate reduction |
| `pan` | Stereo position |
| `tremolo` / `trem` | Tremolo speed |
| `phaser` / `ph` | Phaser rate |
| `chorus` | Chorus amount |

### FM Synthesis
| Control | Description |
|---------|-------------|
| `fm` / `fmi` | FM modulation index |
| `fmh` | FM harmonicity ratio |
| `fmattack` | FM env attack |
| `fmdecay` | FM env decay |
| `fmsustain` | FM env sustain |
| `fmwave` | FM modulator wave |

### Wavetable
| Control | Description |
|---------|-------------|
| `wt` | Wavetable position |
| `warp` | Wavetable warp amount |
| `warpmode` | Warp algorithm |
| `wtenv` | WT position envelope |
| `warpenv` | Warp envelope |

### Sample Playback
| Control | Description |
|---------|-------------|
| `begin` | Sample start point |
| `end` | Sample end point |
| `speed` | Playback speed |
| `unit` | Speed unit (r/c/s) |
| `loop` | Enable looping |
| `loopBegin` / `loopb` | Loop start |
| `loopEnd` / `loope` | Loop end |
| `cut` | Cut group |

### Spatial/Routing
| Control | Description |
|---------|-------------|
| `pan` | Stereo pan |
| `orbit` | Effect bus |
| `channels` / `ch` | Output channels |

### Pulse Width
| Control | Description |
|---------|-------------|
| `pw` | Pulse width |
| `pwrate` | PW LFO rate |
| `pwsweep` | PW LFO depth |

### Ducking (Sidechain)
| Control | Description |
|---------|-------------|
| `duckorbit` / `duck` | Duck target orbit |
| `duckdepth` | Duck amount |
| `duckattack` / `duckatt` | Duck release time |
| `duckonset` / `duckons` | Duck attack time |

## 4. Music Theory (tonal.mjs)

### Scales
| Function | Description |
|----------|-------------|
| `scale(name)` | Apply scale |
| `scaleTranspose(n)` | Transpose in scale |

### Chords
| Function | Description |
|----------|-------------|
| `chord(name)` | Chord name to notes |
| `voicing` | Voice leading |
| `rootNotes` | Root note patterns |

## 5. Visualization (draw package)

### Visualizers
| Type | Description |
|------|-------------|
| `pianoroll` | Piano roll display |
| `spiral` | Spiral visualization |
| `scope` | Waveform scope |
| `pitchwheel` | Pitch visualization |

## 6. Hydra Integration

| Function | Description |
|----------|-------------|
| `h()` | Access Hydra synth |
| Standard Hydra functions | osc, noise, shape, etc. |

Note: Hydra is AGPL licensed, cannot be used.

## 7. Step-wise Operations (Experimental)

| Function | Description |
|----------|-------------|
| `pace(n)` / `steps` | Set steps per cycle |
| `take(n)` | Take n steps |
| `drop(n)` | Drop n steps |
| `expand(n)` | Expand step count |
| `contract(n)` | Contract step count |
| `shrink(n)` | Progressive shrinking |
| `grow(n)` | Progressive growing |
| `tour(...pats)` | Insert through patterns |
| `zip(...pats)` | Zip patterns stepwise |
