<script setup>
import { CROP_TYPES } from '@/constants/cropTypes'
</script>

<template>
  <Transition name="fade-in">
    <div
      class="absolute bottom-8 right-4 z-[1000]
             bg-white/95 backdrop-blur-sm rounded-xl shadow-lg
             p-3 w-44 border border-warmgrey pointer-events-auto"
    >
      <p class="text-[10px] font-semibold text-midgrey uppercase tracking-widest mb-2.5 px-0.5">
        Crop Types
      </p>
      <ul class="space-y-1.5">
        <li
          v-for="crop in CROP_TYPES"
          :key="crop.id"
          class="flex items-center gap-2 text-xs"
        >
          <span
            class="w-3 h-3 rounded-sm flex-shrink-0"
            :style="{
              background: crop.color,
              border: '1.5px solid ' + crop.color + '99'
            }"
          />
          <span class="text-charcoal font-medium">{{ crop.label }}</span>
        </li>
      </ul>
    </div>
  </Transition>
</template>

<style scoped>
.fade-in-enter-active,
.fade-in-leave-active {
  transition: opacity 0.25s ease;
}
.fade-in-enter-from,
.fade-in-leave-to {
  opacity: 0;
}
</style>
