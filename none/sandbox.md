---
title: Песочница
aside: false
outline: false
hidden: true
---

Процессор без задания и без ограничений. Код можно писать с нуля, блоки мира добавляются кнопкой `mocks`.

В песочнице доступны `cell1`, `bank1`, `display1`, `message1`, `switch1`. Вставить готовый код можно кнопкой `from buffer`, забрать обратно кнопкой `to buffer`.

<Proc>
<World>

```mock
cell size:64
display size:176
message
switch enabled:false
```

```code
set i 0
op mul sq i i
write sq cell1 i
op add i i 1
jump 1 lessThan i 10
print "Готово: {0}"
format i
printflush message1
end
```

</World>
</Proc>
