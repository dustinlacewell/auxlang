# Repository Principles

Universal conventions for organizing TypeScript project source code.

---

## The Core Principle: Domain First, Then Structure

At each level of the directory tree, ask: **"Are these children different *concepts* or different *parts* of the same concept?"**

- **Different concepts** → Organize by domain (what it *is*)
- **Different parts** → Organize by structure (how it's *built*)

This decision applies recursively at every level.

---

## 1. The Organizational Hierarchy

### Top Levels: Domain-Oriented

The root of `src/` reflects what the application *is about*:

```
src/
├── users/          # User management domain
├── orders/         # Order processing domain
├── products/       # Product catalog domain
├── notifications/  # Notification domain
└── ...
```

These are ontological divisions—different concepts the application deals with.

### Within a Domain: Implementation Structure

Inside a domain, organize by how the code is built:

```
src/orders/
├── types.ts              # Domain types (Order, LineItem, etc.)
├── pricing.ts            # Price calculation logic
├── validation.ts         # Order validation rules
└── fulfillment.ts        # Fulfillment workflows
```

### The Boundary: Reusable Components

At the domain boundary, shared implementation pieces get segregated:

```
src/
├── users/                # Domain
├── orders/               # Domain
├── products/             # Domain
├── ui/                   # Shared UI implementation
│   ├── design/           # Reusable primitives (Button, Card, Input)
│   └── components/       # Shared composed components
└── state/                # Shared state management
```

These serve multiple domains, so they live outside any single domain.

---

## 2. Recursive Decomposition

When a file grows, decompose it into a folder with the same name:

```
checkout.ts (200+ lines)
↓
checkout/
├── checkout.ts           # Main orchestration
├── types.ts              # Types for checkout flow
├── cartSummary.ts        # Cart totaling logic
└── paymentProcessing.ts  # Payment handling
```

The same principle applies recursively. Each subfolder can further decompose until you reach leaf files that handle a single responsibility.

### Decomposition Triggers

- File exceeds ~200 lines
- Multiple distinct responsibilities in one file
- Logic that could be tested independently
- Repeated patterns that deserve extraction

---

## 3. Colocation

Keep related code close:

```
orders/checkout/
├── CheckoutForm.tsx       # Component
├── useCheckoutState.ts    # Hook used by CheckoutForm
├── formatCurrency.ts      # Utility used by CheckoutForm
└── types.ts               # Types for checkout
```

Only move code to a shared location when it's actually shared by multiple consumers. Premature abstraction creates indirection without benefit.

---

## 8. The Decision Tree

When adding new code, follow this decision process:

1. **Is this a new domain concept?** → Create a new domain folder at the appropriate level

2. **Is this part of an existing concept?** → Add to that concept's folder

3. **Is this reusable across domains?** → Place in shared infrastructure (`ui/`, `state/`, `lib/`)

4. **Is this implementation detail of one file?** → Keep it in that file until it grows

5. **Has a file grown too large?** → Decompose into a folder with the same name

---

## Summary

The repository structure is fractal:

- **Top levels** organize by domain (what the app is about)
- **Inner levels** organize by structure (how it's built)
- **At each level**, decompose when complexity warrants it
- **Shared code** gets pulled to the boundary between domains
- **Imports** point to actual files, not barrels
- **Colocate** until sharing is required
