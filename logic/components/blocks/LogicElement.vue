<template>
  <div class="base">
    <div class="header">
      <p v-if="props.type.command !== 'jump'" class="title">
        {{ title }} <span v-if="props.locked" class="lock-text">[LOCK]</span>
      </p>
      <p v-else class="title">
        {{ title }} -> {{props.type.jumpDest}} <span v-if="props.locked" class="lock-text">[LOCK]</span>
      </p>

      <div v-if="props.control" class="control">
        <p class="title">{{ index }}</p>

        <button class="addimg" @click.stop="$emit('add')"></button>
        <button class="copyimg" @click.stop="$emit('copy')"></button>
        <button class="exitimg" @click.stop="$emit('remove')"></button>
      </div>
      <div v-else class="control">
        <p class="title">{{ index }}</p>
      </div>
    </div>
    <div class="code">
      <slot />
    </div>
  </div>
</template>

<script setup>
import {all, cats} from "../../core/sttms";

const props = defineProps({
  title: { type: String, default: 'none' },
  index: { type: [Number, String], default: 0 },
  color: { type: String, default: 'white'},
  type: { type: Object, default: {
      id: -1,
      command: all.objs[0],
      category: cats.unknown,
      params: []
    }},
  control: { type: Boolean, default: true },
  locked: { type: Boolean, default: false }
});
</script>

<style scoped>
@font-face {
  font-family: 'MindustryLogic';
  src: url('https://raw.githubusercontent.com/Anuken/Mindustry/master/core/assets/fonts/font.woff');
}

.header {
  cursor: grab;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
}

.header:active {
  cursor: grabbing;
}

.title {
  margin: 0;
  color: rgba(0, 0, 0, 0.78);
}

.lock-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
  margin-left: 8px;
}

.control {
  display: flex;
  gap: 8px;
  --add:  url('https://raw.githubusercontent.com/Anuken/Mindustry/v146/core/assets-raw/icons/add.png');
  --exit: url('https://raw.githubusercontent.com/Anuken/Mindustry/v146/core/assets-raw/icons/cancel.png');
  --copy: url('https://raw.githubusercontent.com/Anuken/Mindustry/v146/core/assets-raw/icons/copy.png');
}

.copyimg, .exitimg, .addimg{
  width: 24px;
  height: 24px;
  border: none;
  padding: 0;
  cursor: pointer;
  background-color: black;

  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

.copyimg {
  -webkit-mask-image: var(--copy);
  mask-image: var(--copy);
}

.exitimg {
  -webkit-mask-image: var(--exit);
  mask-image: var(--exit);
}

.addimg {
  -webkit-mask-image: var(--add);
  mask-image: var(--add);
}

.base {
  box-sizing: border-box;
  font-family: 'MindustryLogic',serif;
  font-size: 18px;
  font-weight: 900;
  background-color: v-bind('props.color');
  text-shadow: none;

  color: v-bind('props.color');
  padding: 6px;
  padding-left: 8px;
  margin: 8px;
}

.code {
  padding: 6px;
  background-color: black;
  color: #fff;
}

.jump-node-out {
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid black;
  margin-left: 5px;
  align-self: center;
}
.header.is-jump {
  padding-right: 4px;
}
</style>
