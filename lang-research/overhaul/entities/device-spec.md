# Entity: DeviceSpec

Source: `src/core2/device/device-spec.ts`

## Definition

```typescript
interface DeviceSpec {
  readonly inputs: Record<string, InputDef>;      // Named inputs with defaults
  readonly config: Record<string, ConfigValue>;   // Static config defaults
  readonly outputs: readonly string[];            // Output names
  readonly defaultInput: string;                  // For chaining
  readonly defaultOutput: string;                 // For chaining
  readonly positionalArgs?: readonly string[];    // Arg parsing order
  readonly process: ProcessFn;                    // Runtime sample processing
  readonly wasmUrl?: string;                      // Optional WASM implementation
  readonly polyphonic?: boolean;                  // Handles poly internally?
  readonly expand?: ExpandFn;                     // Custom expansion hook
}
```

## Key Fields for Poly

### `polyphonic?: boolean`
- Comment: "device handles poly internally instead of being expanded"
- Used for: mix, spread, etc.
- Meaning: Don't duplicate this node when inputs are poly

### `expand?: ExpandFn`
- Signature: `(config, inputs) => WrappedNode | WrappedNode[]`
- Comment: "Custom expansion hook for devices that create multiple nodes"
- Called during: expandPoly pass
- Returns: New nodes to replace original

## Observations

1. **Two mechanisms for poly**:
   - `polyphonic: true` - Device receives poly inputs, handles them
   - `expand` - Device transforms into different nodes entirely

2. **These are independent**:
   - A device can be polyphonic without expand (e.g., mix)
   - A device can have expand without being polyphonic (e.g., chord?)
   - A device can have both (e.g., spread, pan)

3. **expand returns WrappedNode** - Not plain Node
   - This is strange - why wrapped?
   - Creates coupling with wrap module

4. **No voice count** - DeviceSpec doesn't know how many voices it produces
   - expand can return variable number of nodes
   - No static declaration of output poly

## Questions Raised

- What is InputDef? (→ investigate input-def.ts)
- What is ProcessFn? (→ investigate process-fn.ts)
- Why does expand return WrappedNode instead of Node?
- When exactly is expand called?
- What's the relationship between polyphonic and expand?

## Key Insight

**DeviceSpec conflates three concepts:**
1. **Schema** - What inputs/outputs exist
2. **Runtime behavior** - How to process samples
3. **Graph transformation** - How to expand

These might want to be separate.

## Implications for Design

The `expand` function is the key extension point for poly.
But it's:
- Called at a specific time (during expandPoly)
- Expected to return WrappedNode (coupling)
- Not well-defined when polyphonic=true AND expand exists
