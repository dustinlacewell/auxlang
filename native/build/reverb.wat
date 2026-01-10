(module
 (type $0 (func))
 (type $1 (func (param i32)))
 (type $2 (func (param f32)))
 (type $3 (func (param i32 i32)))
 (type $4 (func (result i32)))
 (type $5 (func (param i32 i32) (result i32)))
 (type $6 (func (param f32) (result f32)))
 (type $7 (func (param i32) (result i32)))
 (type $8 (func (param i32 i32 i32 i32)))
 (type $9 (func (param i32 i32 i64)))
 (type $10 (func (param i32 i32 i32)))
 (type $11 (func (param f32) (result i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (global $assembly/index/reverb (mut i32) (i32.const 0))
 (global $assembly/index/stateBuffer (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/total (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/threshold (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/state (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/visitCount (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/pinSpace (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/iter (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/toSpace (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/white (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/fromSpace (mut i32) (i32.const 0))
 (global $~lib/rt/tlsf/ROOT (mut i32) (i32.const 0))
 (global $~lib/math/rempio2f_y (mut f64) (f64.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 1888))
 (global $~lib/memory/__stack_pointer (mut i32) (i32.const 34696))
 (memory $0 1)
 (data $0 (i32.const 1036) "L")
 (data $0.1 (i32.const 1048) "\04\00\00\000\00\00\00\f1X\9c;G\9fk;\91\a5P<j~\18<t\f9\b8<c7\19>\ce\bbw=\cc\fd\ff=\89\ef\f9<\a1\18\11>\b9\c5\b6=X\a9\d9=")
 (data $1 (i32.const 1116) "L")
 (data $1.1 (i32.const 1128) "\04\00\00\008\00\00\00\'p\12<\ce\a7\cc=\94\a4\83=\c2Z\89=\0f\f1\88=\e7\e4\cd;\9e\b6\12=QUB<t\97\f9=f\02)=4\f1\b7=\abD\91=\85l8<\c49\85;")
 (data $2 (i32.const 1196) ",")
 (data $2.1 (i32.const 1208) "\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data $3 (i32.const 1244) "<")
 (data $3.1 (i32.const 1256) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00s\00t\00a\00t\00i\00c\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $4 (i32.const 1308) "<")
 (data $4.1 (i32.const 1320) "\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $5 (i32.const 1372) "<")
 (data $5.1 (i32.const 1384) "\02\00\00\00 \00\00\00~\00l\00i\00b\00/\00r\00t\00/\00i\00t\00c\00m\00s\00.\00t\00s")
 (data $8 (i32.const 1500) "<")
 (data $8.1 (i32.const 1512) "\02\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e")
 (data $9 (i32.const 1564) ",")
 (data $9.1 (i32.const 1576) "\02\00\00\00\14\00\00\00~\00l\00i\00b\00/\00r\00t\00.\00t\00s")
 (data $11 (i32.const 1644) "<")
 (data $11.1 (i32.const 1656) "\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00t\00l\00s\00f\00.\00t\00s")
 (data $12 (i32.const 1712) ")\15DNn\83\f9\a2\c0\dd4\f5\d1W\'\fcA\90C<\99\95b\dba\c5\bb\de\abcQ\fe")
 (data $13 (i32.const 1756) "<")
 (data $13.1 (i32.const 1768) "\02\00\00\00*\00\00\00O\00b\00j\00e\00c\00t\00 \00a\00l\00r\00e\00a\00d\00y\00 \00p\00i\00n\00n\00e\00d")
 (data $14 (i32.const 1820) "<")
 (data $14.1 (i32.const 1832) "\02\00\00\00(\00\00\00O\00b\00j\00e\00c\00t\00 \00i\00s\00 \00n\00o\00t\00 \00p\00i\00n\00n\00e\00d")
 (data $15 (i32.const 1888) "\t\00\00\00 \00\00\00 \00\00\00 \00\00\00\00\00\00\00$\19")
 (data $15.1 (i32.const 1920) "\04A\00\00$\t")
 (export "init" (func $assembly/index/init))
 (export "process" (func $assembly/index/process))
 (export "set_room" (func $assembly/index/set_room))
 (export "set_damp" (func $assembly/index/set_damp))
 (export "set_mix" (func $assembly/index/set_mix))
 (export "clear" (func $assembly/index/clear))
 (export "get_state_size" (func $assembly/index/get_state_size))
 (export "alloc_state_buffer" (func $assembly/index/alloc_state_buffer))
 (export "serialize_state" (func $assembly/index/serialize_state))
 (export "deserialize_state" (func $assembly/index/deserialize_state))
 (export "__new" (func $~lib/rt/itcms/__new))
 (export "__pin" (func $~lib/rt/itcms/__pin))
 (export "__unpin" (func $~lib/rt/itcms/__unpin))
 (export "__collect" (func $~lib/rt/itcms/__collect))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (start $~start)
 (func $~lib/rt/itcms/visitRoots
  (local $0 i32)
  (local $1 i32)
  global.get $assembly/index/reverb
  local.tee $0
  if
   local.get $0
   call $~lib/rt/itcms/__visit
  end
  global.get $assembly/index/stateBuffer
  local.tee $0
  if
   local.get $0
   call $~lib/rt/itcms/__visit
  end
  i32.const 1520
  call $~lib/rt/itcms/__visit
  i32.const 1216
  call $~lib/rt/itcms/__visit
  i32.const 1328
  call $~lib/rt/itcms/__visit
  i32.const 1776
  call $~lib/rt/itcms/__visit
  i32.const 1840
  call $~lib/rt/itcms/__visit
  i32.const 1056
  call $~lib/rt/itcms/__visit
  i32.const 1136
  call $~lib/rt/itcms/__visit
  global.get $~lib/rt/itcms/pinSpace
  local.tee $1
  i32.load offset=4
  i32.const -4
  i32.and
  local.set $0
  loop $while-continue|0
   local.get $0
   local.get $1
   i32.ne
   if
    local.get $0
    i32.load offset=4
    drop
    local.get $0
    i32.const 20
    i32.add
    call $~lib/rt/__visit_members
    local.get $0
    i32.load offset=4
    i32.const -4
    i32.and
    local.set $0
    br $while-continue|0
   end
  end
 )
 (func $~lib/rt/itcms/Object#makeGray (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  global.get $~lib/rt/itcms/iter
  i32.eq
  if
   local.get $0
   i32.load offset=8
   global.set $~lib/rt/itcms/iter
  end
  block $__inlined_func$~lib/rt/itcms/Object#unlink
   local.get $0
   i32.load offset=4
   i32.const -4
   i32.and
   local.tee $1
   i32.eqz
   if
    local.get $0
    i32.load offset=8
    drop
    br $__inlined_func$~lib/rt/itcms/Object#unlink
   end
   local.get $1
   local.get $0
   i32.load offset=8
   local.tee $2
   i32.store offset=8
   local.get $2
   local.get $1
   local.get $2
   i32.load offset=4
   i32.const 3
   i32.and
   i32.or
   i32.store offset=4
  end
  global.get $~lib/rt/itcms/toSpace
  local.set $2
  local.get $0
  i32.load offset=12
  local.tee $1
  i32.const 2
  i32.le_u
  if (result i32)
   i32.const 1
  else
   local.get $1
   i32.const 1888
   i32.load
   i32.gt_u
   if
    i32.const 1520
    i32.const 1584
    i32.const 21
    i32.const 28
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   i32.const 2
   i32.shl
   i32.const 1892
   i32.add
   i32.load
   i32.const 32
   i32.and
  end
  local.set $3
  local.get $2
  i32.load offset=8
  local.set $1
  local.get $0
  global.get $~lib/rt/itcms/white
  i32.eqz
  i32.const 2
  local.get $3
  select
  local.get $2
  i32.or
  i32.store offset=4
  local.get $0
  local.get $1
  i32.store offset=8
  local.get $1
  local.get $0
  local.get $1
  i32.load offset=4
  i32.const 3
  i32.and
  i32.or
  i32.store offset=4
  local.get $2
  local.get $0
  i32.store offset=8
 )
 (func $~lib/rt/itcms/__visit (param $0 i32)
  local.get $0
  i32.eqz
  if
   return
  end
  global.get $~lib/rt/itcms/white
  local.get $0
  i32.const 20
  i32.sub
  local.tee $0
  i32.load offset=4
  i32.const 3
  i32.and
  i32.eq
  if
   local.get $0
   call $~lib/rt/itcms/Object#makeGray
   global.get $~lib/rt/itcms/visitCount
   i32.const 1
   i32.add
   global.set $~lib/rt/itcms/visitCount
  end
 )
 (func $~lib/rt/tlsf/removeBlock (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  i32.load
  i32.const -4
  i32.and
  local.tee $3
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $3
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   i32.const 1073741820
   local.get $3
   local.get $3
   i32.const 1073741820
   i32.ge_u
   select
   local.tee $3
   i32.clz
   i32.sub
   local.tee $4
   i32.const 7
   i32.sub
   local.set $2
   local.get $3
   local.get $4
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.set $3
  local.get $1
  i32.load offset=8
  local.set $5
  local.get $1
  i32.load offset=4
  local.tee $4
  if
   local.get $4
   local.get $5
   i32.store offset=8
  end
  local.get $5
  if
   local.get $5
   local.get $4
   i32.store offset=4
  end
  local.get $1
  local.get $0
  local.get $2
  i32.const 4
  i32.shl
  local.get $3
  i32.add
  i32.const 2
  i32.shl
  i32.add
  local.tee $1
  i32.load offset=96
  i32.eq
  if
   local.get $1
   local.get $5
   i32.store offset=96
   local.get $5
   i32.eqz
   if
    local.get $0
    local.get $2
    i32.const 2
    i32.shl
    i32.add
    local.tee $1
    i32.load offset=4
    i32.const -2
    local.get $3
    i32.rotl
    i32.and
    local.set $3
    local.get $1
    local.get $3
    i32.store offset=4
    local.get $3
    i32.eqz
    if
     local.get $0
     local.get $0
     i32.load
     i32.const -2
     local.get $2
     i32.rotl
     i32.and
     i32.store
    end
   end
  end
 )
 (func $~lib/rt/tlsf/insertBlock (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $1
  i32.const 4
  i32.add
  local.tee $6
  local.get $1
  i32.load
  local.tee $3
  i32.const -4
  i32.and
  i32.add
  local.tee $4
  i32.load
  local.tee $2
  i32.const 1
  i32.and
  if
   local.get $0
   local.get $4
   call $~lib/rt/tlsf/removeBlock
   local.get $1
   local.get $3
   i32.const 4
   i32.add
   local.get $2
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   i32.store
   local.get $6
   local.get $1
   i32.load
   i32.const -4
   i32.and
   i32.add
   local.tee $4
   i32.load
   local.set $2
  end
  local.get $3
  i32.const 2
  i32.and
  if
   local.get $1
   i32.const 4
   i32.sub
   i32.load
   local.tee $1
   i32.load
   local.set $6
   local.get $0
   local.get $1
   call $~lib/rt/tlsf/removeBlock
   local.get $1
   local.get $6
   i32.const 4
   i32.add
   local.get $3
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   i32.store
  end
  local.get $4
  local.get $2
  i32.const 2
  i32.or
  i32.store
  local.get $4
  i32.const 4
  i32.sub
  local.get $1
  i32.store
  local.get $0
  local.get $3
  i32.const -4
  i32.and
  local.tee $2
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $2
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   i32.const 1073741820
   local.get $2
   local.get $2
   i32.const 1073741820
   i32.ge_u
   select
   local.tee $2
   i32.clz
   i32.sub
   local.tee $3
   i32.const 7
   i32.sub
   local.set $5
   local.get $2
   local.get $3
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.tee $2
  local.get $5
  i32.const 4
  i32.shl
  i32.add
  i32.const 2
  i32.shl
  i32.add
  i32.load offset=96
  local.set $3
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  local.get $3
  i32.store offset=8
  local.get $3
  if
   local.get $3
   local.get $1
   i32.store offset=4
  end
  local.get $0
  local.get $5
  i32.const 4
  i32.shl
  local.get $2
  i32.add
  i32.const 2
  i32.shl
  i32.add
  local.get $1
  i32.store offset=96
  local.get $0
  local.get $0
  i32.load
  i32.const 1
  local.get $5
  i32.shl
  i32.or
  i32.store
  local.get $0
  local.get $5
  i32.const 2
  i32.shl
  i32.add
  local.tee $0
  local.get $0
  i32.load offset=4
  i32.const 1
  local.get $2
  i32.shl
  i32.or
  i32.store offset=4
 )
 (func $~lib/rt/tlsf/addMemory (param $0 i32) (param $1 i32) (param $2 i64)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.set $1
  local.get $0
  i32.load offset=1568
  local.tee $3
  if
   local.get $3
   local.get $1
   i32.const 16
   i32.sub
   local.tee $5
   i32.eq
   if
    local.get $3
    i32.load
    local.set $4
    local.get $5
    local.set $1
   end
  end
  local.get $2
  i32.wrap_i64
  i32.const -16
  i32.and
  local.get $1
  i32.sub
  local.tee $3
  i32.const 20
  i32.lt_u
  if
   return
  end
  local.get $1
  local.get $4
  i32.const 2
  i32.and
  local.get $3
  i32.const 8
  i32.sub
  local.tee $3
  i32.const 1
  i32.or
  i32.or
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 4
  i32.add
  local.get $3
  i32.add
  local.tee $3
  i32.const 2
  i32.store
  local.get $0
  local.get $3
  i32.store offset=1568
  local.get $0
  local.get $1
  call $~lib/rt/tlsf/insertBlock
 )
 (func $~lib/rt/tlsf/initialize
  (local $0 i32)
  (local $1 i32)
  memory.size
  local.tee $1
  i32.const 0
  i32.le_s
  if (result i32)
   i32.const 1
   local.get $1
   i32.sub
   memory.grow
   i32.const 0
   i32.lt_s
  else
   i32.const 0
  end
  if
   unreachable
  end
  i32.const 34704
  i32.const 0
  i32.store
  i32.const 36272
  i32.const 0
  i32.store
  loop $for-loop|0
   local.get $0
   i32.const 23
   i32.lt_u
   if
    local.get $0
    i32.const 2
    i32.shl
    i32.const 34704
    i32.add
    i32.const 0
    i32.store offset=4
    i32.const 0
    local.set $1
    loop $for-loop|1
     local.get $1
     i32.const 16
     i32.lt_u
     if
      local.get $0
      i32.const 4
      i32.shl
      local.get $1
      i32.add
      i32.const 2
      i32.shl
      i32.const 34704
      i32.add
      i32.const 0
      i32.store offset=96
      local.get $1
      i32.const 1
      i32.add
      local.set $1
      br $for-loop|1
     end
    end
    local.get $0
    i32.const 1
    i32.add
    local.set $0
    br $for-loop|0
   end
  end
  i32.const 34704
  i32.const 36276
  memory.size
  i64.extend_i32_s
  i64.const 16
  i64.shl
  call $~lib/rt/tlsf/addMemory
  i32.const 34704
  global.set $~lib/rt/tlsf/ROOT
 )
 (func $~lib/rt/itcms/step (result i32)
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  block $break|0
   block $case2|0
    block $case1|0
     block $case0|0
      global.get $~lib/rt/itcms/state
      br_table $case0|0 $case1|0 $case2|0 $break|0
     end
     i32.const 1
     global.set $~lib/rt/itcms/state
     i32.const 0
     global.set $~lib/rt/itcms/visitCount
     call $~lib/rt/itcms/visitRoots
     global.get $~lib/rt/itcms/toSpace
     global.set $~lib/rt/itcms/iter
     global.get $~lib/rt/itcms/visitCount
     return
    end
    global.get $~lib/rt/itcms/white
    i32.eqz
    local.set $1
    global.get $~lib/rt/itcms/iter
    i32.load offset=4
    i32.const -4
    i32.and
    local.set $0
    loop $while-continue|1
     local.get $0
     global.get $~lib/rt/itcms/toSpace
     i32.ne
     if
      local.get $0
      global.set $~lib/rt/itcms/iter
      local.get $1
      local.get $0
      i32.load offset=4
      local.tee $2
      i32.const 3
      i32.and
      i32.ne
      if
       local.get $0
       local.get $2
       i32.const -4
       i32.and
       local.get $1
       i32.or
       i32.store offset=4
       i32.const 0
       global.set $~lib/rt/itcms/visitCount
       local.get $0
       i32.const 20
       i32.add
       call $~lib/rt/__visit_members
       global.get $~lib/rt/itcms/visitCount
       return
      end
      local.get $0
      i32.load offset=4
      i32.const -4
      i32.and
      local.set $0
      br $while-continue|1
     end
    end
    i32.const 0
    global.set $~lib/rt/itcms/visitCount
    call $~lib/rt/itcms/visitRoots
    global.get $~lib/rt/itcms/toSpace
    global.get $~lib/rt/itcms/iter
    i32.load offset=4
    i32.const -4
    i32.and
    i32.eq
    if
     global.get $~lib/memory/__stack_pointer
     local.set $0
     loop $while-continue|0
      local.get $0
      i32.const 34696
      i32.lt_u
      if
       local.get $0
       i32.load
       call $~lib/rt/itcms/__visit
       local.get $0
       i32.const 4
       i32.add
       local.set $0
       br $while-continue|0
      end
     end
     global.get $~lib/rt/itcms/iter
     i32.load offset=4
     i32.const -4
     i32.and
     local.set $0
     loop $while-continue|2
      local.get $0
      global.get $~lib/rt/itcms/toSpace
      i32.ne
      if
       local.get $1
       local.get $0
       i32.load offset=4
       local.tee $2
       i32.const 3
       i32.and
       i32.ne
       if
        local.get $0
        local.get $2
        i32.const -4
        i32.and
        local.get $1
        i32.or
        i32.store offset=4
        local.get $0
        i32.const 20
        i32.add
        call $~lib/rt/__visit_members
       end
       local.get $0
       i32.load offset=4
       i32.const -4
       i32.and
       local.set $0
       br $while-continue|2
      end
     end
     global.get $~lib/rt/itcms/fromSpace
     local.set $0
     global.get $~lib/rt/itcms/toSpace
     global.set $~lib/rt/itcms/fromSpace
     local.get $0
     global.set $~lib/rt/itcms/toSpace
     local.get $1
     global.set $~lib/rt/itcms/white
     local.get $0
     i32.load offset=4
     i32.const -4
     i32.and
     global.set $~lib/rt/itcms/iter
     i32.const 2
     global.set $~lib/rt/itcms/state
    end
    global.get $~lib/rt/itcms/visitCount
    return
   end
   global.get $~lib/rt/itcms/iter
   local.tee $0
   global.get $~lib/rt/itcms/toSpace
   i32.ne
   if
    local.get $0
    i32.load offset=4
    i32.const -4
    i32.and
    global.set $~lib/rt/itcms/iter
    local.get $0
    i32.const 34696
    i32.lt_u
    if
     local.get $0
     i32.const 0
     i32.store offset=4
     local.get $0
     i32.const 0
     i32.store offset=8
    else
     global.get $~lib/rt/itcms/total
     local.get $0
     i32.load
     i32.const -4
     i32.and
     i32.const 4
     i32.add
     i32.sub
     global.set $~lib/rt/itcms/total
     local.get $0
     i32.const 4
     i32.add
     local.tee $0
     i32.const 34696
     i32.ge_u
     if
      global.get $~lib/rt/tlsf/ROOT
      i32.eqz
      if
       call $~lib/rt/tlsf/initialize
      end
      local.get $0
      i32.const 4
      i32.sub
      local.set $1
      local.get $0
      i32.const 15
      i32.and
      i32.const 1
      local.get $0
      select
      if (result i32)
       i32.const 1
      else
       local.get $1
       i32.load
       i32.const 1
       i32.and
      end
      drop
      local.get $1
      local.get $1
      i32.load
      i32.const 1
      i32.or
      i32.store
      global.get $~lib/rt/tlsf/ROOT
      local.get $1
      call $~lib/rt/tlsf/insertBlock
     end
    end
    i32.const 10
    return
   end
   global.get $~lib/rt/itcms/toSpace
   global.get $~lib/rt/itcms/toSpace
   i32.store offset=4
   global.get $~lib/rt/itcms/toSpace
   global.get $~lib/rt/itcms/toSpace
   i32.store offset=8
   i32.const 0
   global.set $~lib/rt/itcms/state
  end
  i32.const 0
 )
 (func $~lib/rt/tlsf/searchBlock (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $1
  i32.const 256
  i32.lt_u
  if
   local.get $1
   i32.const 4
   i32.shr_u
   local.set $1
  else
   local.get $1
   i32.const 536870910
   i32.lt_u
   if
    local.get $1
    i32.const 1
    i32.const 27
    local.get $1
    i32.clz
    i32.sub
    i32.shl
    i32.add
    i32.const 1
    i32.sub
    local.set $1
   end
   local.get $1
   i32.const 31
   local.get $1
   i32.clz
   i32.sub
   local.tee $2
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
   local.set $1
   local.get $2
   i32.const 7
   i32.sub
   local.set $2
  end
  local.get $0
  local.get $2
  i32.const 2
  i32.shl
  i32.add
  i32.load offset=4
  i32.const -1
  local.get $1
  i32.shl
  i32.and
  local.tee $1
  if (result i32)
   local.get $0
   local.get $1
   i32.ctz
   local.get $2
   i32.const 4
   i32.shl
   i32.add
   i32.const 2
   i32.shl
   i32.add
   i32.load offset=96
  else
   local.get $0
   i32.load
   i32.const -1
   local.get $2
   i32.const 1
   i32.add
   i32.shl
   i32.and
   local.tee $1
   if (result i32)
    local.get $0
    local.get $0
    local.get $1
    i32.ctz
    local.tee $0
    i32.const 2
    i32.shl
    i32.add
    i32.load offset=4
    i32.ctz
    local.get $0
    i32.const 4
    i32.shl
    i32.add
    i32.const 2
    i32.shl
    i32.add
    i32.load offset=96
   else
    i32.const 0
   end
  end
 )
 (func $~lib/rt/itcms/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $0
  i32.const 1073741804
  i32.ge_u
  if
   i32.const 1328
   i32.const 1392
   i32.const 261
   i32.const 31
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/total
  global.get $~lib/rt/itcms/threshold
  i32.ge_u
  if
   block $__inlined_func$~lib/rt/itcms/interrupt$69
    i32.const 2048
    local.set $2
    loop $do-loop|0
     local.get $2
     call $~lib/rt/itcms/step
     i32.sub
     local.set $2
     global.get $~lib/rt/itcms/state
     i32.eqz
     if
      global.get $~lib/rt/itcms/total
      i64.extend_i32_u
      i64.const 200
      i64.mul
      i64.const 100
      i64.div_u
      i32.wrap_i64
      i32.const 1024
      i32.add
      global.set $~lib/rt/itcms/threshold
      br $__inlined_func$~lib/rt/itcms/interrupt$69
     end
     local.get $2
     i32.const 0
     i32.gt_s
     br_if $do-loop|0
    end
    global.get $~lib/rt/itcms/total
    global.get $~lib/rt/itcms/total
    global.get $~lib/rt/itcms/threshold
    i32.sub
    i32.const 1024
    i32.lt_u
    i32.const 10
    i32.shl
    i32.add
    global.set $~lib/rt/itcms/threshold
   end
  end
  global.get $~lib/rt/tlsf/ROOT
  i32.eqz
  if
   call $~lib/rt/tlsf/initialize
  end
  global.get $~lib/rt/tlsf/ROOT
  local.set $3
  local.get $0
  i32.const 16
  i32.add
  local.tee $2
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1328
   i32.const 1664
   i32.const 461
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  local.get $3
  local.get $2
  i32.const 12
  i32.le_u
  if (result i32)
   i32.const 12
  else
   local.get $2
   i32.const 19
   i32.add
   i32.const -16
   i32.and
   i32.const 4
   i32.sub
  end
  local.tee $5
  call $~lib/rt/tlsf/searchBlock
  local.tee $2
  i32.eqz
  if
   memory.size
   local.tee $2
   local.get $5
   i32.const 256
   i32.ge_u
   if (result i32)
    local.get $5
    i32.const 536870910
    i32.lt_u
    if (result i32)
     local.get $5
     i32.const 1
     i32.const 27
     local.get $5
     i32.clz
     i32.sub
     i32.shl
     i32.add
     i32.const 1
     i32.sub
    else
     local.get $5
    end
   else
    local.get $5
   end
   i32.const 4
   local.get $3
   i32.load offset=1568
   local.get $2
   i32.const 16
   i32.shl
   i32.const 4
   i32.sub
   i32.ne
   i32.shl
   i32.add
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $4
   local.get $2
   local.get $4
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $4
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
   local.get $3
   local.get $2
   i32.const 16
   i32.shl
   memory.size
   i64.extend_i32_s
   i64.const 16
   i64.shl
   call $~lib/rt/tlsf/addMemory
   local.get $3
   local.get $5
   call $~lib/rt/tlsf/searchBlock
   local.set $2
  end
  local.get $2
  i32.load
  drop
  local.get $3
  local.get $2
  call $~lib/rt/tlsf/removeBlock
  local.get $2
  i32.load
  local.tee $6
  i32.const -4
  i32.and
  local.get $5
  i32.sub
  local.tee $4
  i32.const 16
  i32.ge_u
  if
   local.get $2
   local.get $5
   local.get $6
   i32.const 2
   i32.and
   i32.or
   i32.store
   local.get $2
   i32.const 4
   i32.add
   local.get $5
   i32.add
   local.tee $5
   local.get $4
   i32.const 4
   i32.sub
   i32.const 1
   i32.or
   i32.store
   local.get $3
   local.get $5
   call $~lib/rt/tlsf/insertBlock
  else
   local.get $2
   local.get $6
   i32.const -2
   i32.and
   i32.store
   local.get $2
   i32.const 4
   i32.add
   local.get $2
   i32.load
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   local.get $3
   i32.load
   i32.const -3
   i32.and
   i32.store
  end
  local.get $2
  local.get $1
  i32.store offset=12
  local.get $2
  local.get $0
  i32.store offset=16
  global.get $~lib/rt/itcms/fromSpace
  local.tee $1
  i32.load offset=8
  local.set $3
  local.get $2
  local.get $1
  global.get $~lib/rt/itcms/white
  i32.or
  i32.store offset=4
  local.get $2
  local.get $3
  i32.store offset=8
  local.get $3
  local.get $2
  local.get $3
  i32.load offset=4
  i32.const 3
  i32.and
  i32.or
  i32.store offset=4
  local.get $1
  local.get $2
  i32.store offset=8
  global.get $~lib/rt/itcms/total
  local.get $2
  i32.load
  i32.const -4
  i32.and
  i32.const 4
  i32.add
  i32.add
  global.set $~lib/rt/itcms/total
  local.get $2
  i32.const 20
  i32.add
  local.tee $1
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
 )
 (func $~lib/rt/itcms/__link (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  i32.eqz
  if
   return
  end
  global.get $~lib/rt/itcms/white
  local.get $1
  i32.const 20
  i32.sub
  local.tee $1
  i32.load offset=4
  i32.const 3
  i32.and
  i32.eq
  if
   local.get $0
   i32.const 20
   i32.sub
   local.tee $0
   i32.load offset=4
   i32.const 3
   i32.and
   local.tee $3
   global.get $~lib/rt/itcms/white
   i32.eqz
   i32.eq
   if
    local.get $0
    local.get $1
    local.get $2
    select
    call $~lib/rt/itcms/Object#makeGray
   else
    global.get $~lib/rt/itcms/state
    i32.const 1
    i32.eq
    local.get $3
    i32.const 3
    i32.eq
    i32.and
    if
     local.get $1
     call $~lib/rt/itcms/Object#makeGray
    end
   end
  end
 )
 (func $assembly/index/init (param $0 f32)
  local.get $0
  call $assembly/dattorro/Dattorro#constructor
  global.set $assembly/index/reverb
 )
 (func $~lib/math/NativeMathf.cos (param $0 f32) (result f32)
  (local $1 f64)
  (local $2 f64)
  (local $3 i32)
  (local $4 i64)
  (local $5 i32)
  (local $6 f64)
  (local $7 i32)
  (local $8 i64)
  (local $9 i64)
  local.get $0
  i32.reinterpret_f32
  local.tee $3
  i32.const 31
  i32.shr_u
  local.set $5
  block $folding-inner0
   local.get $3
   i32.const 2147483647
   i32.and
   local.tee $3
   i32.const 1061752794
   i32.le_u
   if
    local.get $3
    i32.const 964689920
    i32.lt_u
    if
     f32.const 1
     return
    end
    local.get $0
    f64.promote_f32
    local.tee $1
    local.get $1
    f64.mul
    local.tee $1
    local.get $1
    f64.mul
    local.set $2
    br $folding-inner0
   end
   local.get $3
   i32.const 1081824209
   i32.le_u
   if
    local.get $3
    i32.const 1075235811
    i32.gt_u
    if
     local.get $0
     f64.promote_f32
     local.tee $1
     f64.const 3.141592653589793
     f64.add
     local.get $1
     f64.const -3.141592653589793
     f64.add
     local.get $5
     select
     local.tee $1
     local.get $1
     f64.mul
     local.tee $1
     local.get $1
     f64.mul
     local.set $2
     local.get $1
     f64.const -0.499999997251031
     f64.mul
     f64.const 1
     f64.add
     local.get $2
     f64.const 0.04166662332373906
     f64.mul
     f64.add
     local.get $2
     local.get $1
     f64.mul
     local.get $1
     f64.const 2.439044879627741e-05
     f64.mul
     f64.const -0.001388676377460993
     f64.add
     f64.mul
     f64.add
     f32.demote_f64
     f32.neg
     return
    else
     local.get $5
     if (result f64)
      local.get $0
      f64.promote_f32
      f64.const 1.5707963267948966
      f64.add
      local.tee $2
      local.get $2
      f64.mul
      local.tee $1
      local.get $2
      f64.mul
     else
      f64.const 1.5707963267948966
      local.get $0
      f64.promote_f32
      f64.sub
      local.tee $2
      local.get $2
      f64.mul
      local.tee $1
      local.get $2
      f64.mul
     end
     local.set $6
     local.get $2
     local.get $6
     local.get $1
     f64.const 0.008333329385889463
     f64.mul
     f64.const -0.16666666641626524
     f64.add
     f64.mul
     f64.add
     local.get $6
     local.get $1
     local.get $1
     f64.mul
     f64.mul
     local.get $1
     f64.const 2.718311493989822e-06
     f64.mul
     f64.const -1.9839334836096632e-04
     f64.add
     f64.mul
     f64.add
     f32.demote_f64
     return
    end
    unreachable
   end
   local.get $3
   i32.const 1088565717
   i32.le_u
   if
    local.get $3
    i32.const 1085271519
    i32.gt_u
    if
     local.get $0
     f64.promote_f32
     local.tee $1
     f64.const 6.283185307179586
     f64.add
     local.get $1
     f64.const -6.283185307179586
     f64.add
     local.get $5
     select
     local.tee $1
     local.get $1
     f64.mul
     local.tee $1
     local.get $1
     f64.mul
     local.set $2
     br $folding-inner0
    else
     local.get $5
     if (result f64)
      local.get $0
      f32.neg
      f64.promote_f32
      f64.const -4.71238898038469
      f64.add
      local.tee $2
      local.get $2
      f64.mul
      local.tee $1
      local.get $2
      f64.mul
     else
      local.get $0
      f64.promote_f32
      f64.const -4.71238898038469
      f64.add
      local.tee $2
      local.get $2
      f64.mul
      local.tee $1
      local.get $2
      f64.mul
     end
     local.set $6
     local.get $2
     local.get $6
     local.get $1
     f64.const 0.008333329385889463
     f64.mul
     f64.const -0.16666666641626524
     f64.add
     f64.mul
     f64.add
     local.get $6
     local.get $1
     local.get $1
     f64.mul
     f64.mul
     local.get $1
     f64.const 2.718311493989822e-06
     f64.mul
     f64.const -1.9839334836096632e-04
     f64.add
     f64.mul
     f64.add
     f32.demote_f64
     return
    end
    unreachable
   end
   local.get $3
   i32.const 2139095040
   i32.ge_u
   if
    local.get $0
    local.get $0
    f32.sub
    return
   end
   block $~lib/math/rempio2f|inlined.0 (result i32)
    local.get $3
    i32.const 1305022427
    i32.lt_u
    if
     local.get $0
     f64.promote_f32
     local.tee $1
     f64.const 0.6366197723675814
     f64.mul
     f64.nearest
     local.set $2
     local.get $1
     local.get $2
     f64.const 1.5707963109016418
     f64.mul
     f64.sub
     local.get $2
     f64.const 1.5893254773528196e-08
     f64.mul
     f64.sub
     global.set $~lib/math/rempio2f_y
     local.get $2
     i32.trunc_sat_f64_s
     br $~lib/math/rempio2f|inlined.0
    end
    local.get $3
    i32.const 23
    i32.shr_s
    i32.const 152
    i32.sub
    local.tee $7
    i32.const 63
    i32.and
    i64.extend_i32_s
    local.set $8
    local.get $7
    i32.const 6
    i32.shr_s
    i32.const 3
    i32.shl
    i32.const 1712
    i32.add
    local.tee $7
    i64.load offset=8
    local.set $4
    f64.const 8.515303950216386e-20
    local.get $0
    f64.promote_f32
    f64.copysign
    local.get $3
    i32.const 8388607
    i32.and
    i32.const 8388608
    i32.or
    i64.extend_i32_s
    local.tee $9
    local.get $7
    i64.load
    local.get $8
    i64.shl
    local.get $4
    i64.const 64
    local.get $8
    i64.sub
    i64.shr_u
    i64.or
    i64.mul
    local.get $8
    i64.const 32
    i64.gt_u
    if (result i64)
     local.get $4
     local.get $8
     i64.const 32
     i64.sub
     i64.shl
     local.get $7
     i64.load offset=16
     i64.const 96
     local.get $8
     i64.sub
     i64.shr_u
     i64.or
    else
     local.get $4
     i64.const 32
     local.get $8
     i64.sub
     i64.shr_u
    end
    local.get $9
    i64.mul
    i64.const 32
    i64.shr_u
    i64.add
    local.tee $4
    i64.const 2
    i64.shl
    local.tee $8
    f64.convert_i64_s
    f64.mul
    global.set $~lib/math/rempio2f_y
    i32.const 0
    local.get $4
    i64.const 62
    i64.shr_u
    local.get $8
    i64.const 63
    i64.shr_u
    i64.add
    i32.wrap_i64
    local.tee $3
    i32.sub
    local.get $3
    local.get $5
    select
   end
   local.set $3
   global.get $~lib/math/rempio2f_y
   local.set $1
   local.get $3
   i32.const 1
   i32.and
   if (result f32)
    local.get $1
    local.get $1
    local.get $1
    f64.mul
    local.tee $2
    local.get $1
    f64.mul
    local.tee $1
    local.get $2
    f64.const 0.008333329385889463
    f64.mul
    f64.const -0.16666666641626524
    f64.add
    f64.mul
    f64.add
    local.get $1
    local.get $2
    local.get $2
    f64.mul
    f64.mul
    local.get $2
    f64.const 2.718311493989822e-06
    f64.mul
    f64.const -1.9839334836096632e-04
    f64.add
    f64.mul
    f64.add
    f32.demote_f64
   else
    local.get $1
    local.get $1
    f64.mul
    local.tee $1
    local.get $1
    f64.mul
    local.set $2
    local.get $1
    f64.const -0.499999997251031
    f64.mul
    f64.const 1
    f64.add
    local.get $2
    f64.const 0.04166662332373906
    f64.mul
    f64.add
    local.get $2
    local.get $1
    f64.mul
    local.get $1
    f64.const 2.439044879627741e-05
    f64.mul
    f64.const -0.001388676377460993
    f64.add
    f64.mul
    f64.add
    f32.demote_f64
   end
   local.tee $0
   f32.neg
   local.get $0
   local.get $3
   i32.const 1
   i32.add
   i32.const 2
   i32.and
   select
   return
  end
  local.get $1
  f64.const -0.499999997251031
  f64.mul
  f64.const 1
  f64.add
  local.get $2
  f64.const 0.04166662332373906
  f64.mul
  f64.add
  local.get $2
  local.get $1
  f64.mul
  local.get $1
  f64.const 2.439044879627741e-05
  f64.mul
  f64.const -0.001388676377460993
  f64.add
  f64.mul
  f64.add
  f32.demote_f64
 )
 (func $~lib/math/NativeMathf.sin (param $0 f32) (result f32)
  (local $1 f64)
  (local $2 f64)
  (local $3 i32)
  (local $4 f64)
  (local $5 i64)
  (local $6 i32)
  (local $7 i32)
  (local $8 i64)
  (local $9 i64)
  local.get $0
  i32.reinterpret_f32
  local.tee $3
  i32.const 31
  i32.shr_u
  local.set $6
  block $folding-inner0
   local.get $3
   i32.const 2147483647
   i32.and
   local.tee $3
   i32.const 1061752794
   i32.le_u
   if
    local.get $3
    i32.const 964689920
    i32.lt_u
    if
     local.get $0
     return
    end
    local.get $0
    f64.promote_f32
    local.tee $2
    local.get $2
    f64.mul
    local.tee $1
    local.get $2
    f64.mul
    local.set $4
    br $folding-inner0
   end
   local.get $3
   i32.const 1081824209
   i32.le_u
   if
    local.get $3
    i32.const 1075235811
    i32.le_u
    if
     local.get $6
     if (result f32)
      local.get $0
      f64.promote_f32
      f64.const 1.5707963267948966
      f64.add
      local.tee $1
      local.get $1
      f64.mul
      local.tee $1
      local.get $1
      f64.mul
      local.set $2
      local.get $1
      f64.const -0.499999997251031
      f64.mul
      f64.const 1
      f64.add
      local.get $2
      f64.const 0.04166662332373906
      f64.mul
      f64.add
      local.get $2
      local.get $1
      f64.mul
      local.get $1
      f64.const 2.439044879627741e-05
      f64.mul
      f64.const -0.001388676377460993
      f64.add
      f64.mul
      f64.add
      f32.demote_f64
      f32.neg
     else
      local.get $0
      f64.promote_f32
      f64.const -1.5707963267948966
      f64.add
      local.tee $1
      local.get $1
      f64.mul
      local.tee $1
      local.get $1
      f64.mul
      local.set $2
      local.get $1
      f64.const -0.499999997251031
      f64.mul
      f64.const 1
      f64.add
      local.get $2
      f64.const 0.04166662332373906
      f64.mul
      f64.add
      local.get $2
      local.get $1
      f64.mul
      local.get $1
      f64.const 2.439044879627741e-05
      f64.mul
      f64.const -0.001388676377460993
      f64.add
      f64.mul
      f64.add
      f32.demote_f64
     end
     return
    end
    local.get $0
    f64.promote_f32
    local.tee $1
    f64.const 3.141592653589793
    f64.add
    local.get $1
    f64.const -3.141592653589793
    f64.add
    local.get $6
    select
    f64.neg
    local.tee $2
    local.get $2
    f64.mul
    local.tee $1
    local.get $2
    f64.mul
    local.set $4
    br $folding-inner0
   end
   local.get $3
   i32.const 1088565717
   i32.le_u
   if
    local.get $3
    i32.const 1085271519
    i32.le_u
    if
     local.get $6
     if (result f32)
      local.get $0
      f64.promote_f32
      f64.const 4.71238898038469
      f64.add
      local.tee $1
      local.get $1
      f64.mul
      local.tee $1
      local.get $1
      f64.mul
      local.set $2
      local.get $1
      f64.const -0.499999997251031
      f64.mul
      f64.const 1
      f64.add
      local.get $2
      f64.const 0.04166662332373906
      f64.mul
      f64.add
      local.get $2
      local.get $1
      f64.mul
      local.get $1
      f64.const 2.439044879627741e-05
      f64.mul
      f64.const -0.001388676377460993
      f64.add
      f64.mul
      f64.add
      f32.demote_f64
     else
      local.get $0
      f64.promote_f32
      f64.const -4.71238898038469
      f64.add
      local.tee $1
      local.get $1
      f64.mul
      local.tee $1
      local.get $1
      f64.mul
      local.set $2
      local.get $1
      f64.const -0.499999997251031
      f64.mul
      f64.const 1
      f64.add
      local.get $2
      f64.const 0.04166662332373906
      f64.mul
      f64.add
      local.get $2
      local.get $1
      f64.mul
      local.get $1
      f64.const 2.439044879627741e-05
      f64.mul
      f64.const -0.001388676377460993
      f64.add
      f64.mul
      f64.add
      f32.demote_f64
      f32.neg
     end
     return
    end
    local.get $0
    f64.promote_f32
    local.tee $1
    f64.const 6.283185307179586
    f64.add
    local.get $1
    f64.const -6.283185307179586
    f64.add
    local.get $6
    select
    local.tee $2
    local.get $2
    f64.mul
    local.tee $1
    local.get $2
    f64.mul
    local.set $4
    br $folding-inner0
   end
   local.get $3
   i32.const 2139095040
   i32.ge_u
   if
    local.get $0
    local.get $0
    f32.sub
    return
   end
   block $~lib/math/rempio2f|inlined.1 (result i32)
    local.get $3
    i32.const 1305022427
    i32.lt_u
    if
     local.get $0
     f64.promote_f32
     local.tee $1
     f64.const 0.6366197723675814
     f64.mul
     f64.nearest
     local.set $2
     local.get $1
     local.get $2
     f64.const 1.5707963109016418
     f64.mul
     f64.sub
     local.get $2
     f64.const 1.5893254773528196e-08
     f64.mul
     f64.sub
     global.set $~lib/math/rempio2f_y
     local.get $2
     i32.trunc_sat_f64_s
     br $~lib/math/rempio2f|inlined.1
    end
    local.get $3
    i32.const 23
    i32.shr_s
    i32.const 152
    i32.sub
    local.tee $7
    i32.const 63
    i32.and
    i64.extend_i32_s
    local.set $8
    local.get $7
    i32.const 6
    i32.shr_s
    i32.const 3
    i32.shl
    i32.const 1712
    i32.add
    local.tee $7
    i64.load offset=8
    local.set $5
    f64.const 8.515303950216386e-20
    local.get $0
    f64.promote_f32
    f64.copysign
    local.get $3
    i32.const 8388607
    i32.and
    i32.const 8388608
    i32.or
    i64.extend_i32_s
    local.tee $9
    local.get $7
    i64.load
    local.get $8
    i64.shl
    local.get $5
    i64.const 64
    local.get $8
    i64.sub
    i64.shr_u
    i64.or
    i64.mul
    local.get $8
    i64.const 32
    i64.gt_u
    if (result i64)
     local.get $5
     local.get $8
     i64.const 32
     i64.sub
     i64.shl
     local.get $7
     i64.load offset=16
     i64.const 96
     local.get $8
     i64.sub
     i64.shr_u
     i64.or
    else
     local.get $5
     i64.const 32
     local.get $8
     i64.sub
     i64.shr_u
    end
    local.get $9
    i64.mul
    i64.const 32
    i64.shr_u
    i64.add
    local.tee $5
    i64.const 2
    i64.shl
    local.tee $8
    f64.convert_i64_s
    f64.mul
    global.set $~lib/math/rempio2f_y
    i32.const 0
    local.get $5
    i64.const 62
    i64.shr_u
    local.get $8
    i64.const 63
    i64.shr_u
    i64.add
    i32.wrap_i64
    local.tee $3
    i32.sub
    local.get $3
    local.get $6
    select
   end
   local.set $3
   global.get $~lib/math/rempio2f_y
   local.set $1
   local.get $3
   i32.const 1
   i32.and
   if (result f32)
    local.get $1
    local.get $1
    f64.mul
    local.tee $1
    local.get $1
    f64.mul
    local.set $2
    local.get $1
    f64.const -0.499999997251031
    f64.mul
    f64.const 1
    f64.add
    local.get $2
    f64.const 0.04166662332373906
    f64.mul
    f64.add
    local.get $2
    local.get $1
    f64.mul
    local.get $1
    f64.const 2.439044879627741e-05
    f64.mul
    f64.const -0.001388676377460993
    f64.add
    f64.mul
    f64.add
    f32.demote_f64
   else
    local.get $1
    local.get $1
    local.get $1
    f64.mul
    local.tee $2
    local.get $1
    f64.mul
    local.tee $1
    local.get $2
    f64.const 0.008333329385889463
    f64.mul
    f64.const -0.16666666641626524
    f64.add
    f64.mul
    f64.add
    local.get $1
    local.get $2
    local.get $2
    f64.mul
    f64.mul
    local.get $2
    f64.const 2.718311493989822e-06
    f64.mul
    f64.const -1.9839334836096632e-04
    f64.add
    f64.mul
    f64.add
    f32.demote_f64
   end
   local.tee $0
   f32.neg
   local.get $0
   local.get $3
   i32.const 2
   i32.and
   select
   return
  end
  local.get $2
  local.get $4
  local.get $1
  f64.const 0.008333329385889463
  f64.mul
  f64.const -0.16666666641626524
  f64.add
  f64.mul
  f64.add
  local.get $4
  local.get $1
  local.get $1
  f64.mul
  f64.mul
  local.get $1
  f64.const 2.718311493989822e-06
  f64.mul
  f64.const -1.9839334836096632e-04
  f64.add
  f64.mul
  f64.add
  f32.demote_f64
 )
 (func $assembly/index/alloc_state_buffer (param $0 i32) (result i32)
  local.get $0
  call $~lib/staticarray/StaticArray<f32>#constructor
  global.set $assembly/index/stateBuffer
  global.get $assembly/index/stateBuffer
 )
 (func $~lib/rt/itcms/__pin (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  if
   local.get $0
   i32.const 20
   i32.sub
   local.tee $1
   i32.load offset=4
   i32.const 3
   i32.and
   i32.const 3
   i32.eq
   if
    i32.const 1776
    i32.const 1392
    i32.const 338
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
   block $__inlined_func$~lib/rt/itcms/Object#unlink$2
    local.get $1
    i32.load offset=4
    i32.const -4
    i32.and
    local.tee $2
    i32.eqz
    if
     local.get $1
     i32.load offset=8
     drop
     br $__inlined_func$~lib/rt/itcms/Object#unlink$2
    end
    local.get $2
    local.get $1
    i32.load offset=8
    local.tee $3
    i32.store offset=8
    local.get $3
    local.get $2
    local.get $3
    i32.load offset=4
    i32.const 3
    i32.and
    i32.or
    i32.store offset=4
   end
   global.get $~lib/rt/itcms/pinSpace
   local.tee $2
   i32.load offset=8
   local.set $3
   local.get $1
   local.get $2
   i32.const 3
   i32.or
   i32.store offset=4
   local.get $1
   local.get $3
   i32.store offset=8
   local.get $3
   local.get $1
   local.get $3
   i32.load offset=4
   i32.const 3
   i32.and
   i32.or
   i32.store offset=4
   local.get $2
   local.get $1
   i32.store offset=8
  end
  local.get $0
 )
 (func $~lib/rt/itcms/__unpin (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  i32.eqz
  if
   return
  end
  local.get $0
  i32.const 20
  i32.sub
  local.tee $0
  i32.load offset=4
  i32.const 3
  i32.and
  i32.const 3
  i32.ne
  if
   i32.const 1840
   i32.const 1392
   i32.const 352
   i32.const 5
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/state
  i32.const 1
  i32.eq
  if
   local.get $0
   call $~lib/rt/itcms/Object#makeGray
  else
   block $__inlined_func$~lib/rt/itcms/Object#unlink$3
    local.get $0
    i32.load offset=4
    i32.const -4
    i32.and
    local.tee $1
    i32.eqz
    if
     local.get $0
     i32.load offset=8
     drop
     br $__inlined_func$~lib/rt/itcms/Object#unlink$3
    end
    local.get $1
    local.get $0
    i32.load offset=8
    local.tee $2
    i32.store offset=8
    local.get $2
    local.get $1
    local.get $2
    i32.load offset=4
    i32.const 3
    i32.and
    i32.or
    i32.store offset=4
   end
   global.get $~lib/rt/itcms/fromSpace
   local.tee $1
   i32.load offset=8
   local.set $2
   local.get $0
   local.get $1
   global.get $~lib/rt/itcms/white
   i32.or
   i32.store offset=4
   local.get $0
   local.get $2
   i32.store offset=8
   local.get $2
   local.get $0
   local.get $2
   i32.load offset=4
   i32.const 3
   i32.and
   i32.or
   i32.store offset=4
   local.get $1
   local.get $0
   i32.store offset=8
  end
 )
 (func $~lib/rt/itcms/__collect
  global.get $~lib/rt/itcms/state
  i32.const 0
  i32.gt_s
  if
   loop $while-continue|0
    global.get $~lib/rt/itcms/state
    if
     call $~lib/rt/itcms/step
     drop
     br $while-continue|0
    end
   end
  end
  call $~lib/rt/itcms/step
  drop
  loop $while-continue|1
   global.get $~lib/rt/itcms/state
   if
    call $~lib/rt/itcms/step
    drop
    br $while-continue|1
   end
  end
  global.get $~lib/rt/itcms/total
  i64.extend_i32_u
  i64.const 200
  i64.mul
  i64.const 100
  i64.div_u
  i32.wrap_i64
  i32.const 1024
  i32.add
  global.set $~lib/rt/itcms/threshold
 )
 (func $~lib/rt/__visit_members (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  block $folding-inner0
   block $invalid
    block $~lib/staticarray/StaticArray<i32>
     block $~lib/staticarray/StaticArray<assembly/dattorro/DelayLine>
      block $assembly/dattorro/Dattorro
       block $~lib/staticarray/StaticArray<f32>
        block $~lib/string/String
         block $~lib/arraybuffer/ArrayBuffer
          block $~lib/object/Object
           local.get $0
           i32.const 8
           i32.sub
           i32.load
           br_table $~lib/object/Object $~lib/arraybuffer/ArrayBuffer $~lib/string/String $folding-inner0 $~lib/staticarray/StaticArray<f32> $assembly/dattorro/Dattorro $folding-inner0 $~lib/staticarray/StaticArray<assembly/dattorro/DelayLine> $~lib/staticarray/StaticArray<i32> $invalid
          end
          return
         end
         return
        end
        return
       end
       return
      end
      local.get $0
      i32.load
      local.tee $1
      if
       local.get $1
       call $~lib/rt/itcms/__visit
      end
      local.get $0
      i32.load offset=4
      local.tee $1
      if
       local.get $1
       call $~lib/rt/itcms/__visit
      end
      local.get $0
      i32.load offset=36
      local.tee $0
      if
       local.get $0
       call $~lib/rt/itcms/__visit
      end
      return
     end
     local.get $0
     local.get $0
     i32.const 20
     i32.sub
     i32.load offset=16
     i32.add
     local.set $1
     loop $while-continue|0
      local.get $0
      local.get $1
      i32.lt_u
      if
       local.get $0
       i32.load
       local.tee $2
       if
        local.get $2
        call $~lib/rt/itcms/__visit
       end
       local.get $0
       i32.const 4
       i32.add
       local.set $0
       br $while-continue|0
      end
     end
     return
    end
    return
   end
   unreachable
  end
  local.get $0
  i32.load
  local.tee $0
  if
   local.get $0
   call $~lib/rt/itcms/__visit
  end
 )
 (func $~start
  memory.size
  i32.const 16
  i32.shl
  i32.const 34696
  i32.sub
  i32.const 1
  i32.shr_u
  global.set $~lib/rt/itcms/threshold
  i32.const 1444
  i32.const 1440
  i32.store
  i32.const 1448
  i32.const 1440
  i32.store
  i32.const 1440
  global.set $~lib/rt/itcms/pinSpace
  i32.const 1476
  i32.const 1472
  i32.store
  i32.const 1480
  i32.const 1472
  i32.store
  i32.const 1472
  global.set $~lib/rt/itcms/toSpace
  i32.const 1620
  i32.const 1616
  i32.store
  i32.const 1624
  i32.const 1616
  i32.store
  i32.const 1616
  global.set $~lib/rt/itcms/fromSpace
 )
 (func $assembly/dattorro/Dattorro#constructor (param $0 f32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i64.const 0
   i64.store
   global.get $~lib/memory/__stack_pointer
   i64.const 0
   i64.store offset=8
   global.get $~lib/memory/__stack_pointer
   i32.const 84
   i32.const 5
   call $~lib/rt/itcms/__new
   local.tee $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 48
   i32.const 7
   call $~lib/rt/itcms/__new
   local.tee $2
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=8
   local.get $1
   local.get $2
   i32.store
   local.get $1
   local.get $2
   i32.const 0
   call $~lib/rt/itcms/__link
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   i32.const 1
   call $~lib/staticarray/StaticArray<f32>#constructor
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=8
   local.get $1
   local.get $2
   i32.store offset=4
   local.get $1
   local.get $2
   i32.const 0
   call $~lib/rt/itcms/__link
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   i32.const 0
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   i32.const 0
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   i32.const 0
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0
   f32.store offset=20
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0
   f32.store offset=24
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0
   f32.store offset=28
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0
   f32.store offset=32
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 56
   i32.const 8
   call $~lib/rt/itcms/__new
   local.tee $2
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=8
   local.get $1
   local.get $2
   i32.store offset=36
   local.get $1
   local.get $2
   i32.const 0
   call $~lib/rt/itcms/__link
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.9998999834060669
   f32.store offset=40
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.75
   f32.store offset=44
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.625
   f32.store offset=48
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.699999988079071
   f32.store offset=52
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.5
   f32.store offset=56
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.004999999888241291
   f32.store offset=60
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.5
   f32.store offset=64
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.5
   f32.store offset=68
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.699999988079071
   f32.store offset=72
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0.30000001192092896
   f32.store offset=76
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   f32.const 0
   f32.store offset=80
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   local.get $0
   f32.store offset=80
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   local.get $0
   i32.trunc_sat_f32_s
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=12
   local.get $1
   i32.load offset=8
   call $~lib/staticarray/StaticArray<f32>#constructor
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=8
   local.get $1
   local.get $2
   i32.store offset=4
   local.get $1
   local.get $2
   i32.const 0
   call $~lib/rt/itcms/__link
   loop $for-loop|0
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    local.get $6
    local.get $1
    i32.load offset=8
    i32.lt_s
    if
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=8
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.load offset=4
     local.tee $2
     i32.store offset=4
     local.get $2
     local.get $6
     i32.const 2
     i32.shl
     i32.add
     f32.const 0
     f32.store
     local.get $6
     i32.const 1
     i32.add
     local.set $6
     br $for-loop|0
    end
   end
   i32.const 0
   local.set $6
   loop $for-loop|1
    local.get $6
    i32.const 12
    i32.lt_s
    if
     global.get $~lib/memory/__stack_pointer
     i32.const 1056
     i32.store offset=4
     local.get $6
     i32.const 2
     i32.shl
     local.tee $3
     i32.const 1056
     i32.add
     f32.load
     local.get $0
     f32.mul
     i32.trunc_sat_f32_s
     local.set $2
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=12
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.load
     local.tee $4
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     i32.const 12
     i32.sub
     global.set $~lib/memory/__stack_pointer
     global.get $~lib/memory/__stack_pointer
     i32.const 1928
     i32.lt_s
     br_if $folding-inner1
     global.get $~lib/memory/__stack_pointer
     i64.const 0
     i64.store
     global.get $~lib/memory/__stack_pointer
     i32.const 0
     i32.store offset=8
     global.get $~lib/memory/__stack_pointer
     i32.const 20
     i32.const 6
     call $~lib/rt/itcms/__new
     local.tee $7
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     i32.const 0
     i32.store
     local.get $7
     i32.const 0
     i32.const 0
     call $~lib/rt/itcms/__link
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     i32.const 0
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     i32.const 0
     i32.store offset=8
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     i32.const 0
     i32.store offset=12
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     i32.const 0
     i32.store offset=16
     i32.const 1
     local.set $5
     loop $while-continue|0
      local.get $2
      local.get $5
      i32.gt_s
      if
       local.get $5
       i32.const 1
       i32.shl
       local.set $5
       br $while-continue|0
      end
     end
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $5
     call $~lib/staticarray/StaticArray<f32>#constructor
     local.set $8
     global.get $~lib/memory/__stack_pointer
     local.get $8
     i32.store offset=8
     local.get $7
     local.get $8
     i32.store
     local.get $7
     local.get $8
     i32.const 0
     call $~lib/rt/itcms/__link
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     local.get $5
     i32.const 1
     i32.sub
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     local.get $2
     i32.store offset=16
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     i32.const 0
     i32.store offset=12
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=4
     local.get $7
     local.get $2
     i32.const 1
     i32.sub
     i32.store offset=8
     i32.const 0
     local.set $2
     loop $for-loop|10
      local.get $2
      local.get $5
      i32.lt_s
      if
       global.get $~lib/memory/__stack_pointer
       local.get $7
       i32.store offset=8
       global.get $~lib/memory/__stack_pointer
       local.get $7
       i32.load
       local.tee $8
       i32.store offset=4
       local.get $8
       local.get $2
       i32.const 2
       i32.shl
       i32.add
       f32.const 0
       f32.store
       local.get $2
       i32.const 1
       i32.add
       local.set $2
       br $for-loop|10
      end
     end
     global.get $~lib/memory/__stack_pointer
     i32.const 12
     i32.add
     global.set $~lib/memory/__stack_pointer
     global.get $~lib/memory/__stack_pointer
     local.get $7
     i32.store offset=8
     local.get $3
     local.get $4
     i32.add
     local.get $7
     i32.store
     local.get $4
     local.get $7
     i32.const 1
     call $~lib/rt/itcms/__link
     local.get $6
     i32.const 1
     i32.add
     local.set $6
     br $for-loop|1
    end
   end
   i32.const 0
   local.set $6
   loop $for-loop|2
    local.get $6
    i32.const 14
    i32.lt_s
    if
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=8
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.load offset=36
     local.tee $2
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     i32.const 1136
     i32.store offset=8
     local.get $2
     local.get $6
     i32.const 2
     i32.shl
     local.tee $2
     i32.add
     local.get $2
     i32.const 1136
     i32.add
     f32.load
     local.get $0
     f32.mul
     i32.trunc_sat_f32_s
     i32.store
     local.get $6
     i32.const 1
     i32.add
     local.set $6
     br $for-loop|2
    end
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 16
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $1
   return
  end
  i32.const 34720
  i32.const 34768
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/index/process (param $0 f32) (result f32)
  (local $1 i32)
  (local $2 i32)
  (local $3 f64)
  (local $4 f32)
  (local $5 f32)
  (local $6 f32)
  (local $7 f32)
  (local $8 f32)
  (local $9 f32)
  (local $10 f32)
  (local $11 f32)
  (local $12 i32)
  (local $13 f32)
  (local $14 i32)
  (local $15 f32)
  (local $16 i32)
  (local $17 i32)
  (local $18 i32)
  (local $19 i32)
  (local $20 f32)
  (local $21 f64)
  (local $22 f64)
  (local $23 f64)
  (local $24 f32)
  global.get $~lib/memory/__stack_pointer
  i32.const 204
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 1928
  i32.lt_s
  if
   i32.const 34720
   i32.const 34768
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 204
  memory.fill
  global.get $assembly/index/reverb
  i32.eqz
  if
   global.get $~lib/memory/__stack_pointer
   i32.const 204
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $0
   return
  end
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/index/reverb
  local.tee $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=44
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=48
  local.set $7
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=64
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=52
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=56
  local.set $8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  f64.const 1
  local.get $1
  f32.load offset=60
  f64.promote_f32
  f64.sub
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=40
  local.set $9
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=68
  local.set $10
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $10
  local.get $1
  f32.load offset=80
  f32.div
  local.set $10
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=72
  local.set $11
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $11
  local.get $1
  f32.load offset=80
  f32.mul
  f32.const 1e3
  f32.div
  local.set $11
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=4
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $12
  local.get $1
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  local.get $0
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  i32.load offset=12
  local.set $12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $12
  local.get $1
  i32.load offset=16
  i32.sub
  local.set $12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $12
  local.get $1
  i32.load offset=8
  i32.add
  local.set $12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $12
  local.get $1
  i32.load offset=8
  i32.rem_s
  local.set $12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  f32.load offset=20
  local.set $13
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=4
  local.tee $14
  i32.store offset=8
  local.get $14
  local.get $12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $15
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  local.get $13
  local.get $9
  local.get $15
  local.get $1
  f32.load offset=20
  f32.sub
  f32.mul
  f32.add
  f32.store offset=20
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  i32.load offset=12
  i32.const 1
  i32.add
  local.set $12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  local.get $12
  local.get $1
  i32.load offset=8
  i32.rem_s
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $12
  i32.store offset=16
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $1
  f32.load offset=20
  local.set $9
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $14
  i32.store offset=20
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $9
  local.get $6
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.mul
  f32.sub
  local.set $9
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $9
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=4
  local.tee $12
  i32.store offset=24
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=4
  local.tee $14
  i32.store offset=28
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $6
  local.get $9
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  f32.mul
  local.set $9
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $14
  i32.store offset=32
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $9
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $9
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $9
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=8
  local.tee $12
  i32.store offset=36
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=4
  local.tee $14
  i32.store offset=40
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $6
  local.get $9
  f32.mul
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=8
  local.tee $14
  i32.store offset=44
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $6
  local.get $7
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.mul
  f32.sub
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $6
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=12
  local.tee $12
  i32.store offset=48
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=12
  local.tee $14
  i32.store offset=52
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $7
  local.get $6
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  f32.mul
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=8
  local.tee $14
  i32.store offset=56
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $6
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $6
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=12
  local.tee $12
  i32.store offset=60
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $7
  local.get $6
  f32.mul
  local.get $14
  local.get $12
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $7
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $11
  local.get $1
  f32.load offset=32
  f32.const 6.28000020980835
  f32.mul
  call $~lib/math/NativeMathf.cos
  f32.const 1
  f32.add
  f32.mul
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $11
  local.get $1
  f32.load offset=32
  f32.const 6.2846999168396
  f32.mul
  call $~lib/math/NativeMathf.sin
  f32.const 1
  f32.add
  f32.mul
  local.set $9
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=16
  local.tee $12
  i32.store offset=64
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=44
  local.tee $14
  i32.store offset=68
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $7
  local.get $4
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.mul
  f32.add
  local.set $11
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=16
  local.tee $14
  i32.store offset=72
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=4
  local.get $6
  i32.trunc_sat_f32_s
  local.tee $16
  local.get $14
  i32.load offset=12
  i32.add
  i32.const 1
  i32.sub
  local.set $17
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $18
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $18
  local.get $17
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $13
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $18
  i32.store offset=4
  local.get $17
  i32.const 1
  i32.add
  local.tee $17
  i32.const 1
  i32.add
  local.set $19
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $18
  local.get $17
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $15
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $17
  local.get $19
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $20
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $11
  local.get $5
  local.get $15
  local.get $20
  f32.sub
  f64.promote_f32
  f64.const 3
  f64.mul
  local.get $13
  f64.promote_f32
  local.tee $21
  f64.sub
  local.get $17
  local.get $14
  i32.load offset=4
  local.get $19
  i32.const 1
  i32.add
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f64.promote_f32
  local.tee $22
  f64.add
  f64.const 0.5
  f64.mul
  local.get $6
  local.get $16
  f32.convert_i32_s
  f32.sub
  local.tee $11
  f64.promote_f32
  local.tee $23
  f64.mul
  local.get $20
  f64.promote_f32
  f64.const 2
  f64.mul
  local.get $21
  f64.add
  local.get $15
  f64.promote_f32
  local.tee $21
  f64.const 5
  f64.mul
  local.get $22
  f64.add
  f64.const 0.5
  f64.mul
  f64.sub
  f64.add
  local.get $23
  f64.mul
  local.get $20
  local.get $13
  f32.sub
  f32.const 0.5
  f32.mul
  f64.promote_f32
  f64.add
  local.get $23
  f64.mul
  local.get $21
  f64.add
  f32.demote_f64
  f32.mul
  f32.add
  local.set $13
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $13
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=20
  local.tee $12
  i32.store offset=76
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=16
  local.tee $14
  i32.store offset=80
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=4
  local.get $16
  local.get $14
  i32.load offset=12
  i32.add
  i32.const 1
  i32.sub
  local.set $16
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $17
  local.get $16
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $15
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  local.get $16
  i32.const 1
  i32.add
  local.tee $16
  i32.const 1
  i32.add
  local.set $18
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $17
  local.get $16
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $20
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $16
  local.get $18
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $16
  local.get $14
  i32.load offset=4
  local.get $18
  i32.const 1
  i32.add
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $24
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $20
  local.get $6
  f32.sub
  f64.promote_f32
  f64.const 3
  f64.mul
  local.get $15
  f64.promote_f32
  local.tee $21
  f64.sub
  local.get $24
  f64.promote_f32
  local.tee $22
  f64.add
  f64.const 0.5
  f64.mul
  local.get $11
  f64.promote_f32
  local.tee $23
  f64.mul
  local.get $6
  f64.promote_f32
  f64.const 2
  f64.mul
  local.get $21
  f64.add
  local.get $20
  f64.promote_f32
  local.tee $21
  f64.const 5
  f64.mul
  local.get $22
  f64.add
  f64.const 0.5
  f64.mul
  f64.sub
  f64.add
  local.get $23
  f64.mul
  local.get $6
  local.get $15
  f32.sub
  f32.const 0.5
  f32.mul
  f64.promote_f32
  f64.add
  local.get $23
  f64.mul
  local.get $21
  f64.add
  f32.demote_f64
  local.get $5
  local.get $13
  f32.mul
  f32.sub
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  f32.load offset=24
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=20
  local.tee $12
  i32.store offset=84
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=12
  local.get $14
  local.get $12
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $11
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  local.get $6
  local.get $3
  local.get $11
  local.get $1
  f32.load offset=24
  f32.sub
  f64.promote_f32
  f64.mul
  f32.demote_f64
  f32.add
  f32.store offset=24
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=24
  local.tee $12
  i32.store offset=88
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $4
  local.get $1
  f32.load offset=24
  f32.mul
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=24
  local.tee $14
  i32.store offset=92
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $6
  local.get $8
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.mul
  f32.sub
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $6
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=28
  local.tee $12
  i32.store offset=96
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=24
  local.tee $14
  i32.store offset=100
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.get $8
  local.get $6
  f32.mul
  f32.add
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $6
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=32
  local.tee $12
  i32.store offset=104
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=28
  local.tee $14
  i32.store offset=108
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $7
  local.get $4
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.mul
  f32.add
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=32
  local.tee $14
  i32.store offset=112
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=4
  local.get $9
  i32.trunc_sat_f32_s
  local.tee $16
  local.get $14
  i32.load offset=12
  i32.add
  i32.const 1
  i32.sub
  local.set $17
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $18
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $18
  local.get $17
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $7
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $18
  i32.store offset=4
  local.get $17
  i32.const 1
  i32.add
  local.tee $17
  i32.const 1
  i32.add
  local.set $19
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $18
  local.get $17
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $11
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $17
  local.get $19
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $13
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $6
  local.get $5
  local.get $11
  local.get $13
  f32.sub
  f64.promote_f32
  f64.const 3
  f64.mul
  local.get $7
  f64.promote_f32
  local.tee $21
  f64.sub
  local.get $17
  local.get $14
  i32.load offset=4
  local.get $19
  i32.const 1
  i32.add
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f64.promote_f32
  local.tee $22
  f64.add
  f64.const 0.5
  f64.mul
  local.get $9
  local.get $16
  f32.convert_i32_s
  f32.sub
  local.tee $6
  f64.promote_f32
  local.tee $23
  f64.mul
  local.get $13
  f64.promote_f32
  f64.const 2
  f64.mul
  local.get $21
  f64.add
  local.get $11
  f64.promote_f32
  local.tee $21
  f64.const 5
  f64.mul
  local.get $22
  f64.add
  f64.const 0.5
  f64.mul
  f64.sub
  f64.add
  local.get $23
  f64.mul
  local.get $13
  local.get $7
  f32.sub
  f32.const 0.5
  f32.mul
  f64.promote_f32
  f64.add
  local.get $23
  f64.mul
  local.get $21
  f64.add
  f32.demote_f64
  f32.mul
  f32.add
  local.set $7
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $7
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=36
  local.tee $12
  i32.store offset=116
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=32
  local.tee $14
  i32.store offset=120
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=4
  local.get $16
  local.get $14
  i32.load offset=12
  i32.add
  i32.const 1
  i32.sub
  local.set $16
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $17
  local.get $16
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $9
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $17
  i32.store offset=4
  local.get $16
  i32.const 1
  i32.add
  local.tee $16
  i32.const 1
  i32.add
  local.set $18
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $17
  local.get $16
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $11
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $16
  local.get $18
  local.get $14
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $13
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $16
  local.get $14
  i32.load offset=4
  local.get $18
  i32.const 1
  i32.add
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $15
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $11
  local.get $13
  f32.sub
  f64.promote_f32
  f64.const 3
  f64.mul
  local.get $9
  f64.promote_f32
  local.tee $21
  f64.sub
  local.get $15
  f64.promote_f32
  local.tee $22
  f64.add
  f64.const 0.5
  f64.mul
  local.get $6
  f64.promote_f32
  local.tee $23
  f64.mul
  local.get $13
  f64.promote_f32
  f64.const 2
  f64.mul
  local.get $21
  f64.add
  local.get $11
  f64.promote_f32
  local.tee $21
  f64.const 5
  f64.mul
  local.get $22
  f64.add
  f64.const 0.5
  f64.mul
  f64.sub
  f64.add
  local.get $23
  f64.mul
  local.get $13
  local.get $9
  f32.sub
  f32.const 0.5
  f32.mul
  f64.promote_f32
  f64.add
  local.get $23
  f64.mul
  local.get $21
  f64.add
  f32.demote_f64
  local.get $5
  local.get $7
  f32.mul
  f32.sub
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  f32.load offset=28
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=36
  local.tee $12
  i32.store offset=124
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=12
  local.get $14
  local.get $12
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.set $6
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  local.get $5
  local.get $3
  local.get $6
  local.get $1
  f32.load offset=28
  f32.sub
  f64.promote_f32
  f64.mul
  f32.demote_f64
  f32.add
  f32.store offset=28
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=40
  local.tee $12
  i32.store offset=128
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $4
  local.get $1
  f32.load offset=28
  f32.mul
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=40
  local.tee $14
  i32.store offset=132
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $4
  local.get $8
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.mul
  f32.sub
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $4
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=44
  local.tee $12
  i32.store offset=136
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load offset=40
  local.tee $14
  i32.store offset=140
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $14
  i32.store offset=8
  local.get $16
  local.get $14
  i32.load offset=12
  i32.const 2
  i32.shl
  i32.add
  f32.load
  local.get $8
  local.get $4
  f32.mul
  f32.add
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $14
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=8
  i32.const 2
  i32.shl
  i32.add
  local.get $4
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=36
  local.tee $12
  i32.store offset=144
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.const 0
  f32.add
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=36
  local.tee $12
  i32.store offset=148
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=4
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $4
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=40
  local.tee $12
  i32.store offset=152
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=8
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $4
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=44
  local.tee $12
  i32.store offset=156
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=12
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $4
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=20
  local.tee $12
  i32.store offset=160
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=16
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $4
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=24
  local.tee $12
  i32.store offset=164
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=20
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $4
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=28
  local.tee $12
  i32.store offset=168
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=24
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $4
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=20
  local.tee $12
  i32.store offset=172
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=28
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.const 0
  f32.add
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=20
  local.tee $12
  i32.store offset=176
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=32
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $5
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=24
  local.tee $12
  i32.store offset=180
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=36
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $5
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=28
  local.tee $12
  i32.store offset=184
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=40
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $5
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.add
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=36
  local.tee $12
  i32.store offset=188
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=44
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $5
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=40
  local.tee $12
  i32.store offset=192
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=48
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $5
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load
  local.tee $12
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load offset=44
  local.tee $12
  i32.store offset=196
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=36
  local.tee $14
  i32.store offset=4
  local.get $14
  i32.load offset=52
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.load
  local.tee $16
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $14
  local.get $12
  i32.load offset=12
  i32.add
  local.set $14
  global.get $~lib/memory/__stack_pointer
  local.get $12
  i32.store offset=8
  local.get $5
  local.get $16
  local.get $14
  local.get $12
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  f32.load
  f32.sub
  local.set $5
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $1
  local.get $1
  f32.load offset=32
  local.get $10
  f32.add
  f32.store offset=32
  loop $for-loop|0
   local.get $2
   i32.const 12
   i32.lt_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=8
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.load
    local.tee $12
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $12
    local.get $2
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.tee $12
    i32.store offset=200
    global.get $~lib/memory/__stack_pointer
    local.get $12
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $12
    i32.store offset=8
    local.get $12
    i32.load offset=8
    i32.const 1
    i32.add
    local.set $14
    global.get $~lib/memory/__stack_pointer
    local.get $12
    i32.store offset=8
    local.get $12
    local.get $14
    local.get $12
    i32.load offset=4
    i32.and
    i32.store offset=8
    global.get $~lib/memory/__stack_pointer
    local.get $12
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $12
    i32.store offset=8
    local.get $12
    i32.load offset=12
    i32.const 1
    i32.add
    local.set $14
    global.get $~lib/memory/__stack_pointer
    local.get $12
    i32.store offset=8
    local.get $12
    local.get $14
    local.get $12
    i32.load offset=4
    i32.and
    i32.store offset=12
    local.get $2
    i32.const 1
    i32.add
    local.set $2
    br $for-loop|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $4
  local.get $5
  f32.add
  f32.const 0.5
  f32.mul
  f32.const 0.6000000238418579
  f32.mul
  local.get $1
  f32.load offset=76
  f32.mul
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $4
  local.get $0
  f32.const 1
  local.get $1
  f32.load offset=76
  f32.sub
  f32.mul
  f32.add
  local.set $0
  global.get $~lib/memory/__stack_pointer
  i32.const 204
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $assembly/index/set_room (param $0 f32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   global.get $assembly/index/reverb
   if
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/index/reverb
    local.tee $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.sub
    global.set $~lib/memory/__stack_pointer
    global.get $~lib/memory/__stack_pointer
    i32.const 1928
    i32.lt_s
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    i32.const 0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    local.get $1
    local.get $0
    f32.const 0.800000011920929
    f32.mul
    f32.const 0.10000000149011612
    f32.add
    f32.store offset=64
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 34720
  i32.const 34768
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/index/set_damp (param $0 f32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   global.get $assembly/index/reverb
   if
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/index/reverb
    local.tee $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.sub
    global.set $~lib/memory/__stack_pointer
    global.get $~lib/memory/__stack_pointer
    i32.const 1928
    i32.lt_s
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    i32.const 0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    local.get $1
    local.get $0
    f32.const 0.5
    f32.mul
    f32.store offset=60
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 34720
  i32.const 34768
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/index/set_mix (param $0 f32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   global.get $assembly/index/reverb
   if
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/index/reverb
    local.tee $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.sub
    global.set $~lib/memory/__stack_pointer
    global.get $~lib/memory/__stack_pointer
    i32.const 1928
    i32.lt_s
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    i32.const 0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    local.get $1
    local.get $0
    f32.store offset=76
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 34720
  i32.const 34768
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/index/clear
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   global.get $assembly/index/reverb
   if
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/index/reverb
    local.tee $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    i32.const 12
    i32.sub
    global.set $~lib/memory/__stack_pointer
    global.get $~lib/memory/__stack_pointer
    i32.const 1928
    i32.lt_s
    br_if $folding-inner1
    global.get $~lib/memory/__stack_pointer
    i64.const 0
    i64.store
    global.get $~lib/memory/__stack_pointer
    i32.const 0
    i32.store offset=8
    loop $for-loop|0
     local.get $3
     i32.const 12
     i32.lt_s
     if
      global.get $~lib/memory/__stack_pointer
      local.get $0
      i32.store offset=8
      global.get $~lib/memory/__stack_pointer
      local.get $0
      i32.load
      local.tee $2
      i32.store offset=4
      global.get $~lib/memory/__stack_pointer
      local.get $2
      local.get $3
      i32.const 2
      i32.shl
      i32.add
      i32.load
      local.tee $5
      i32.store
      global.get $~lib/memory/__stack_pointer
      i32.const 8
      i32.sub
      global.set $~lib/memory/__stack_pointer
      global.get $~lib/memory/__stack_pointer
      i32.const 1928
      i32.lt_s
      br_if $folding-inner1
      global.get $~lib/memory/__stack_pointer
      i64.const 0
      i64.store
      i32.const 0
      local.set $2
      loop $for-loop|00
       global.get $~lib/memory/__stack_pointer
       local.get $5
       i32.store
       local.get $2
       local.get $5
       i32.load offset=4
       i32.le_s
       if
        global.get $~lib/memory/__stack_pointer
        local.get $5
        i32.store offset=4
        global.get $~lib/memory/__stack_pointer
        local.get $5
        i32.load
        local.tee $4
        i32.store
        local.get $4
        local.get $2
        i32.const 2
        i32.shl
        i32.add
        f32.const 0
        f32.store
        local.get $2
        i32.const 1
        i32.add
        local.set $2
        br $for-loop|00
       end
      end
      global.get $~lib/memory/__stack_pointer
      i32.const 8
      i32.add
      global.set $~lib/memory/__stack_pointer
      local.get $3
      i32.const 1
      i32.add
      local.set $3
      br $for-loop|0
     end
    end
    loop $for-loop|1
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store
     local.get $1
     local.get $0
     i32.load offset=8
     i32.lt_s
     if
      global.get $~lib/memory/__stack_pointer
      local.get $0
      i32.store offset=4
      global.get $~lib/memory/__stack_pointer
      local.get $0
      i32.load offset=4
      local.tee $2
      i32.store
      local.get $2
      local.get $1
      i32.const 2
      i32.shl
      i32.add
      f32.const 0
      f32.store
      local.get $1
      i32.const 1
      i32.add
      local.set $1
      br $for-loop|1
     end
    end
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    local.get $0
    f32.const 0
    f32.store offset=20
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    local.get $0
    f32.const 0
    f32.store offset=24
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    local.get $0
    f32.const 0
    f32.store offset=28
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    local.get $0
    f32.const 0
    f32.store offset=32
    global.get $~lib/memory/__stack_pointer
    i32.const 12
    i32.add
    global.set $~lib/memory/__stack_pointer
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  i32.const 34720
  i32.const 34768
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/index/get_state_size (result i32)
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  block $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store
   global.get $assembly/index/reverb
   i32.eqz
   if
    global.get $~lib/memory/__stack_pointer
    i32.const 4
    i32.add
    global.set $~lib/memory/__stack_pointer
    i32.const 0
    return
   end
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/index/reverb
   local.tee $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   i32.const 12
   i32.sub
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 1928
   i32.lt_s
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   i64.const 0
   i64.store
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=8
   i32.const 5
   i32.add
   local.set $1
   loop $for-loop|0
    local.get $2
    i32.const 12
    i32.lt_s
    if
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.load
     local.tee $3
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $3
     local.get $2
     i32.const 2
     i32.shl
     i32.add
     i32.load
     local.tee $3
     i32.store offset=8
     global.get $~lib/memory/__stack_pointer
     local.get $3
     i32.store
     local.get $3
     i32.load offset=4
     local.get $1
     i32.add
     i32.const 3
     i32.add
     local.set $1
     local.get $2
     i32.const 1
     i32.add
     local.set $2
     br $for-loop|0
    end
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 12
   i32.add
   global.set $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   local.get $1
   return
  end
  i32.const 34720
  i32.const 34768
  i32.const 1
  i32.const 1
  call $~lib/builtins/abort
  unreachable
 )
 (func $assembly/dattorro/Dattorro#serializeState (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 1928
  i32.lt_s
  if
   i32.const 34720
   i32.const 34768
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $1
  local.get $0
  f32.load offset=20
  f32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $1
  local.get $0
  f32.load offset=24
  f32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $1
  local.get $0
  f32.load offset=28
  f32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $1
  local.get $0
  f32.load offset=32
  f32.store offset=12
  i32.const 5
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $1
  local.get $0
  i32.load offset=12
  f32.convert_i32_s
  f32.store offset=16
  loop $for-loop|0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $4
   local.get $0
   i32.load offset=8
   i32.lt_s
   if
    local.get $2
    local.tee $3
    i32.const 1
    i32.add
    local.set $2
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=8
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load offset=4
    local.tee $6
    i32.store offset=4
    local.get $3
    i32.const 2
    i32.shl
    local.get $1
    i32.add
    local.get $6
    local.get $4
    i32.const 2
    i32.shl
    i32.add
    f32.load
    f32.store
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $5
   i32.const 12
   i32.lt_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load
    local.tee $3
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $3
    local.get $5
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.tee $7
    i32.store offset=12
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $7
    i32.store offset=4
    local.get $2
    i32.const 2
    i32.shl
    local.get $1
    i32.add
    local.get $7
    i32.load offset=8
    f32.convert_i32_s
    f32.store
    local.get $2
    i32.const 1
    i32.add
    local.tee $3
    i32.const 1
    i32.add
    local.set $2
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $7
    i32.store offset=4
    local.get $3
    i32.const 2
    i32.shl
    local.get $1
    i32.add
    local.get $7
    i32.load offset=12
    f32.convert_i32_s
    f32.store
    global.get $~lib/memory/__stack_pointer
    local.get $7
    i32.store
    local.get $7
    i32.load offset=4
    i32.const 1
    i32.add
    local.set $8
    i32.const 0
    local.set $4
    loop $for-loop|2
     local.get $4
     local.get $8
     i32.lt_s
     if
      local.get $2
      local.tee $3
      i32.const 1
      i32.add
      local.set $2
      global.get $~lib/memory/__stack_pointer
      local.get $1
      i32.store
      global.get $~lib/memory/__stack_pointer
      local.get $7
      i32.store offset=8
      global.get $~lib/memory/__stack_pointer
      local.get $7
      i32.load
      local.tee $6
      i32.store offset=4
      local.get $3
      i32.const 2
      i32.shl
      local.get $1
      i32.add
      local.get $6
      local.get $4
      i32.const 2
      i32.shl
      i32.add
      f32.load
      f32.store
      local.get $4
      i32.const 1
      i32.add
      local.set $4
      br $for-loop|2
     end
    end
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|1
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $2
 )
 (func $assembly/index/serialize_state (result i32)
  (local $0 i32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 1928
  i32.lt_s
  if
   i32.const 34720
   i32.const 34768
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $assembly/index/stateBuffer
  i32.eqz
  global.get $assembly/index/reverb
  i32.eqz
  i32.or
  if
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   i32.const 0
   return
  end
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/index/reverb
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/index/stateBuffer
  local.tee $1
  i32.store offset=4
  local.get $0
  local.get $1
  call $assembly/dattorro/Dattorro#serializeState
  local.set $0
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $assembly/dattorro/Dattorro#deserializeState (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 1928
  i32.lt_s
  if
   i32.const 34720
   i32.const 34768
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  f32.load
  f32.store offset=20
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  f32.load offset=4
  f32.store offset=24
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  f32.load offset=8
  f32.store offset=28
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  f32.load offset=12
  f32.store offset=32
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  i32.const 5
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  f32.load offset=16
  i32.trunc_sat_f32_s
  i32.store offset=12
  loop $for-loop|0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $4
   local.get $0
   i32.load offset=8
   i32.lt_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load offset=4
    local.tee $6
    i32.store
    local.get $2
    local.tee $3
    i32.const 1
    i32.add
    local.set $2
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    local.get $6
    local.get $4
    i32.const 2
    i32.shl
    i32.add
    local.get $3
    i32.const 2
    i32.shl
    local.get $1
    i32.add
    f32.load
    f32.store
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $5
   i32.const 12
   i32.lt_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load
    local.tee $3
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $3
    local.get $5
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.tee $7
    i32.store offset=8
    global.get $~lib/memory/__stack_pointer
    local.get $7
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    local.get $7
    local.get $2
    i32.const 2
    i32.shl
    local.get $1
    i32.add
    f32.load
    i32.trunc_sat_f32_s
    i32.store offset=8
    global.get $~lib/memory/__stack_pointer
    local.get $7
    i32.store
    local.get $2
    i32.const 1
    i32.add
    local.tee $3
    i32.const 1
    i32.add
    local.set $2
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    local.get $7
    local.get $3
    i32.const 2
    i32.shl
    local.get $1
    i32.add
    f32.load
    i32.trunc_sat_f32_s
    i32.store offset=12
    global.get $~lib/memory/__stack_pointer
    local.get $7
    i32.store
    local.get $7
    i32.load offset=4
    i32.const 1
    i32.add
    local.set $8
    i32.const 0
    local.set $4
    loop $for-loop|2
     local.get $4
     local.get $8
     i32.lt_s
     if
      global.get $~lib/memory/__stack_pointer
      local.get $7
      i32.store offset=4
      global.get $~lib/memory/__stack_pointer
      local.get $7
      i32.load
      local.tee $6
      i32.store
      local.get $2
      local.tee $3
      i32.const 1
      i32.add
      local.set $2
      global.get $~lib/memory/__stack_pointer
      local.get $1
      i32.store offset=4
      local.get $6
      local.get $4
      i32.const 2
      i32.shl
      i32.add
      local.get $3
      i32.const 2
      i32.shl
      local.get $1
      i32.add
      f32.load
      f32.store
      local.get $4
      i32.const 1
      i32.add
      local.set $4
      br $for-loop|2
     end
    end
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|1
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/deserialize_state
  (local $0 i32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 1928
  i32.lt_s
  if
   i32.const 34720
   i32.const 34768
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $assembly/index/stateBuffer
  i32.eqz
  global.get $assembly/index/reverb
  i32.eqz
  i32.or
  if
   global.get $~lib/memory/__stack_pointer
   i32.const 8
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/index/reverb
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/index/stateBuffer
  local.tee $1
  i32.store offset=4
  local.get $0
  local.get $1
  call $assembly/dattorro/Dattorro#deserializeState
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/staticarray/StaticArray<f32>#constructor (param $0 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 1928
  i32.lt_s
  if
   i32.const 34720
   i32.const 34768
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  local.get $0
  i32.const 268435455
  i32.gt_u
  if
   i32.const 1216
   i32.const 1264
   i32.const 51
   i32.const 60
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.const 2
  i32.shl
  i32.const 4
  call $~lib/rt/itcms/__new
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
)
