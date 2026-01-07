# Repository Organization Philosophy

## One Concept Per File

Each file should contain exactly one concept. If a file has multiple exports that aren't tightly coupled, split them.

**Signs a file needs splitting:**
- Multiple exported functions/classes that don't call each other
- Type guards living with the types they guard
- Helper functions alongside main logic
- File has "and" in its mental description ("device creation and type guards and helpers")

**Example - before:**
```
device.ts  # device(), createDescriptor(), isDescriptor(), isOutputRef(), inputs()
```

**Example - after:**
```
descriptor/
├── device.ts        # device(), createDescriptor()
├── is-descriptor.ts # isDescriptor()
├── is-output-ref.ts # isOutputRef()
└── inputs.ts        # inputs() helper
```

## No Barrel Files

Never create `index.ts` files that re-export from other files. Import directly from the source file.

**Why:** Barrels hide where things actually live, make refactoring harder, and cause bundling issues.

**Bad:**
```typescript
import { device, isDescriptor } from "./descriptor";  // from index.ts barrel
```

**Good:**
```typescript
import { device } from "./descriptor/device";
import { isDescriptor } from "./descriptor/is-descriptor";
```

## Prefer Deep Trees Over Wide Files

When you have many of something, make a subdirectory. Don't fear depth.

```
devices/
├── oscillators/
│   ├── saw.ts
│   ├── sine.ts
│   └── square.ts
├── filters/
│   ├── lpf.ts
│   └── hpf.ts
└── modulators/
    ├── lfo.ts
    └── env.ts
```

## Recursive Decomposition

When a file grows, decompose it into a folder:

```
checkout.ts (growing large)
↓
checkout/
├── checkout.ts           # Main orchestration
├── types.ts              # Types for checkout flow
├── cart-summary.ts       # Cart totaling logic
└── payment-processing.ts # Payment handling
```

## Import Conventions

- Use `@/` alias for `src/` imports when configured
- External packages first, blank line, then local imports
- Import from actual source files, not barrels
