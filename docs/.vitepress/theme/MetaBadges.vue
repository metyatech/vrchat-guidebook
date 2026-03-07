<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";

const { frontmatter } = useData();

const badges = computed(() => {
  const fm = frontmatter.value;
  if (!fm || !fm.stepCount) {
    return [];
  }

  const result: { label: string; value: string }[] = [];
  if (fm.difficulty) {
    result.push({ label: "難易度", value: fm.difficulty });
  }
  if (fm.timeEstimate) {
    result.push({ label: "目安", value: fm.timeEstimate });
  }
  result.push({ label: "ステップ", value: `${fm.stepCount}` });
  return result;
});
</script>

<template>
  <div v-if="badges.length" class="meta-badges">
    <span v-for="badge in badges" :key="badge.label" class="meta-badge">
      {{ badge.label }}: {{ badge.value }}
    </span>
  </div>
</template>
