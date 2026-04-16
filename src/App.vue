<script setup>
import InputPanel from '@/components/InputPanel.vue'
import MapView from '@/components/MapView.vue'
</script>

<template>
  <div
    class="flex overflow-hidden"
    style="height: 100dvh; background: #F9F6F0; font-family: 'Inter', sans-serif"
  >
    <InputPanel />
    <main class="flex-1 relative overflow-hidden">
      <MapView />
    </main>
  </div>
</template>
