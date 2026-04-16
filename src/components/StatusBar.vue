<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/useAppStore'

const store = useAppStore()
const stats = computed(() => store.generationStats)
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="store.hasFeatures"
      class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]
             bg-charcoal/90 backdrop-blur-sm text-offwhite
             px-5 py-2.5 rounded-full text-sm font-medium shadow-lg
             flex items-center gap-2.5 pointer-events-none select-none
             whitespace-nowrap"
    >
      <span class="text-wheat font-semibold">{{ stats.succeeded }}</span>
      <span class="text-offwhite/70">polygons</span>
      <span class="text-offwhite/40 text-xs">/</span>
      <span>{{ stats.attempted }} attempted</span>
      <span class="w-px h-3.5 bg-offwhite/20 mx-0.5"></span>
      <span class="text-sage font-semibold">{{ stats.totalAreaHa.toFixed(1) }} ha</span>
      <span class="text-offwhite/70">total</span>
      <span v-if="stats.failed > 0" class="text-offwhite/40 text-xs ml-1">
        ({{ stats.failed }} skipped)
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
.slide-up-enter-to,
.slide-up-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
