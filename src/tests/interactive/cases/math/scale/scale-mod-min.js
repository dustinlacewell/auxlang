// scale - modulated min
// Rising floor on pitch range
saw(sin(2).scale({ from: -1, to: 1, min: sin(0.1, 100, 300), max: 600 })).out()
