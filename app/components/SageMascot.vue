<script setup lang="ts">
withDefaults(defineProps<{
  state?: 'idle' | 'talking' | 'happy' | 'thinking'
  size?: number
}>(), {
  state: 'idle',
  size: 64
})
</script>

<template>
  <div
    class="sage-mascot inline-block"
    :class="[`sage-${state}`]"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full h-full drop-shadow-md"
    >
      <!-- Hair (white, receding, sides only) -->
      <path
        d="M20 50 Q18 38 25 30 Q30 26 35 28"
        class="fill-gray-200 dark:fill-gray-300"
      />
      <path
        d="M80 50 Q82 38 75 30 Q70 26 65 28"
        class="fill-gray-200 dark:fill-gray-300"
      />

      <!-- Left ear -->
      <ellipse cx="20" cy="52" rx="5" ry="7" class="fill-amber-100 dark:fill-amber-200" />
      <!-- Right ear -->
      <ellipse cx="80" cy="52" rx="5" ry="7" class="fill-amber-100 dark:fill-amber-200" />

      <!-- Head (main circle) -->
      <circle cx="50" cy="50" r="30" class="fill-amber-50 dark:fill-amber-100" />

      <!-- Bald top highlight -->
      <ellipse cx="50" cy="30" rx="18" ry="6" class="fill-amber-50/60 dark:fill-amber-100/40" />

      <!-- Wrinkles (forehead) -->
      <path d="M36 32 Q50 30 64 32" fill="none" class="stroke-amber-200 dark:stroke-amber-300" stroke-width="0.6" />
      <path d="M38 35 Q50 33 62 35" fill="none" class="stroke-amber-200 dark:stroke-amber-300" stroke-width="0.5" />

      <!-- Eyebrows (bushy, white/gray) -->
      <path d="M30 42 Q35 38 42 41" fill="none" class="stroke-gray-300 dark:stroke-gray-400" stroke-width="2" stroke-linecap="round" />
      <path d="M58 41 Q65 38 70 42" fill="none" class="stroke-gray-300 dark:stroke-gray-400" stroke-width="2" stroke-linecap="round" />

      <!-- Glasses frames -->
      <circle cx="37" cy="48" r="9" fill="none" class="stroke-gray-600 dark:stroke-gray-400" stroke-width="1.8" />
      <circle cx="63" cy="48" r="9" fill="none" class="stroke-gray-600 dark:stroke-gray-400" stroke-width="1.8" />
      <!-- Glasses bridge -->
      <path d="M46 48 Q50 46 54 48" fill="none" class="stroke-gray-600 dark:stroke-gray-400" stroke-width="1.5" />
      <!-- Glasses temples -->
      <path d="M28 47 L21 44" class="stroke-gray-600 dark:stroke-gray-400" stroke-width="1.5" stroke-linecap="round" />
      <path d="M72 47 L79 44" class="stroke-gray-600 dark:stroke-gray-400" stroke-width="1.5" stroke-linecap="round" />

      <!-- Glasses lens tint -->
      <circle cx="37" cy="48" r="7.5" class="fill-blue-100/20 dark:fill-blue-200/10" />
      <circle cx="63" cy="48" r="7.5" class="fill-blue-100/20 dark:fill-blue-200/10" />

      <!-- Eyes - idle/talking -->
      <g v-if="state === 'idle' || state === 'talking'">
        <circle cx="37" cy="48" r="3" class="fill-gray-700 dark:fill-gray-800" />
        <circle cx="63" cy="48" r="3" class="fill-gray-700 dark:fill-gray-800" />
        <circle cx="38.5" cy="47" r="1.2" class="fill-white" />
        <circle cx="64.5" cy="47" r="1.2" class="fill-white" />
      </g>

      <!-- Eyes - happy (curved/squinting) -->
      <g v-if="state === 'happy'">
        <path d="M32 48 Q37 44 42 48" fill="none" class="stroke-gray-700 dark:stroke-gray-800" stroke-width="2" stroke-linecap="round" />
        <path d="M58 48 Q63 44 68 48" fill="none" class="stroke-gray-700 dark:stroke-gray-800" stroke-width="2" stroke-linecap="round" />
      </g>

      <!-- Eyes - thinking (looking up-right) -->
      <g v-if="state === 'thinking'">
        <circle cx="37" cy="48" r="3" class="fill-gray-700 dark:fill-gray-800" />
        <circle cx="63" cy="48" r="3" class="fill-gray-700 dark:fill-gray-800" />
        <circle cx="38.5" cy="46" r="1.2" class="fill-white" />
        <circle cx="64.5" cy="46" r="1.2" class="fill-white" />
      </g>

      <!-- Nose -->
      <path d="M48 54 Q50 58 52 54" fill="none" class="stroke-amber-300 dark:stroke-amber-400" stroke-width="1.5" stroke-linecap="round" />

      <!-- Mouth - idle (gentle smile) -->
      <path v-if="state === 'idle'" d="M42 62 Q50 66 58 62" fill="none" class="stroke-amber-400 dark:stroke-amber-500" stroke-width="1.5" stroke-linecap="round" />

      <!-- Mouth - talking (open) -->
      <ellipse v-if="state === 'talking'" cx="50" cy="63" rx="5" ry="3" class="fill-amber-300 dark:fill-amber-400" />

      <!-- Mouth - happy (big warm smile) -->
      <path v-if="state === 'happy'" d="M40 61 Q50 68 60 61" fill="none" class="stroke-amber-400 dark:stroke-amber-500" stroke-width="2" stroke-linecap="round" />

      <!-- Mouth - thinking (small pout) -->
      <circle v-if="state === 'thinking'" cx="50" cy="63" r="2" class="fill-amber-300 dark:fill-amber-400" />

      <!-- Crow's feet (smile lines near eyes) -->
      <path d="M26 50 Q28 48 27 46" fill="none" class="stroke-amber-200 dark:stroke-amber-300" stroke-width="0.5" />
      <path d="M74 50 Q72 48 73 46" fill="none" class="stroke-amber-200 dark:stroke-amber-300" stroke-width="0.5" />

      <!-- Collar hint (suit/shirt) -->
      <path d="M35 78 L42 72 L50 76 L58 72 L65 78" fill="none" class="stroke-gray-500 dark:stroke-gray-400" stroke-width="1.5" />
      <!-- Tie -->
      <path d="M50 76 L48 84 L50 86 L52 84 Z" class="fill-red-600 dark:fill-red-500" />

      <!-- Cheek warmth -->
      <circle cx="30" cy="56" r="4" class="fill-pink-200/30 dark:fill-pink-300/20" />
      <circle cx="70" cy="56" r="4" class="fill-pink-200/30 dark:fill-pink-300/20" />

      <!-- Thinking dots -->
      <g v-if="state === 'thinking'" class="thinking-dots">
        <circle cx="80" cy="32" r="2" class="fill-gray-400 dark:fill-gray-500" />
        <circle cx="86" cy="24" r="2.5" class="fill-gray-400 dark:fill-gray-500" />
        <circle cx="92" cy="16" r="3" class="fill-gray-400 dark:fill-gray-500" />
      </g>

      <!-- Happy sparkles -->
      <g v-if="state === 'happy'" class="happy-sparkles">
        <path d="M16 34 L18 30 L20 34 L16 34" class="fill-amber-400" />
        <path d="M82 30 L84 26 L86 30 L82 30" class="fill-amber-400" />
      </g>
    </svg>
  </div>
</template>
