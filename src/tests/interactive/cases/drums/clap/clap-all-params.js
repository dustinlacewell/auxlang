// clap - all params
// Bright clap with long decay
clock(60)
  .seq("c4 ~")
  .trig
  .clap({ decay: 0.3, tone: 0.7 })
  .out()
