// hihat - showcase
// 16th note hi-hat pattern
clock(120)
  .seq("c4*4")
  .trig
  .hihat({ decay: 0.03, tone: 0.7 })
  .out()
