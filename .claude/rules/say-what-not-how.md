# Say What, Not How

**Always applicable** — regardless of project size, scope, or expected lifespan.

---

Write code that expresses **what** it does, not **how** it does it. The implementation should read like a high-level description of the strategy.

## Distillation Through Delegation

- Break chunky functions and classes into smaller, focused parts
- Each encapsulation should have: a purpose, a strategy, and an implementation
- Delegate implementation details to subordinate encapsulations
- What remains should be the "salts" of the strategy - the minimal steps that differentiate this approach from alternatives

## Finding the Right Level of Abstraction

- Don't over-abstract: "draw the owl" in one step is too coarse
- Don't under-abstract: exposing all atomic implementation steps is too fine
- Aim for the minimal number of steps that actually convey the strategy

```ts
// Too abstract (useless)
function processOrder() {
  doTheOrderProcessing()
}

// Too detailed (hard to understand strategy)
function processOrder() {
  const items = db.query('SELECT * FROM cart...')
  for (const item of items) { ... } // 50 lines of implementation
}

// Just right (expressive strategy)
function processOrder(cart: Cart, payment: PaymentProcessor, inventory: Inventory) {
  const items = cart.getItems()
  const validated = inventory.validateAvailability(items)
  const charged = payment.charge(validated.total)
  return inventory.fulfill(validated, charged)
}
```

## Checklist

- [ ] Does this code say **what** it does, or is it drowning in **how**?
- [ ] Are implementation details delegated to focused subordinate components?
- [ ] Is the level of abstraction appropriate — not too coarse, not too fine?
