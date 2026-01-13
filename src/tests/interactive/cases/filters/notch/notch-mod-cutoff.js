// notch - modulated cutoff
// Phaser-like effect with sweeping notch
saw(110).notch({ cutoff: sin(0.2, 300, 1500), resonance: 0.7 }).out()
