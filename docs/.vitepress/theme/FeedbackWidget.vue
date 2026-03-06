<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useData } from "vitepress";

const route = useRoute();
const { frontmatter } = useData();

const isHome = computed(() => frontmatter.value.layout === "home");
const voted = ref(false);

function storageKey() {
  return `feedback-${route.path}`;
}

function checkVoted() {
  if (typeof localStorage === "undefined") return;
  voted.value = Boolean(localStorage.getItem(storageKey()));
}

function vote() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(), "1");
  voted.value = true;
}

onMounted(checkVoted);
watch(() => route.path, checkVoted);
</script>

<template>
  <div v-if="!isHome" class="feedback-widget">
    <div v-if="!voted" class="feedback-prompt">
      <span class="feedback-question">この記事は役に立ちましたか？</span>
      <div class="feedback-actions">
        <button class="feedback-btn" aria-label="役に立った" @click="vote">👍</button>
        <button class="feedback-btn" aria-label="役に立たなかった" @click="vote">👎</button>
      </div>
    </div>
    <p v-else class="feedback-thanks">フィードバックありがとうございます！</p>
  </div>
</template>

<style scoped>
.feedback-widget {
  margin-top: 1.5rem;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--guide-border-strong);
  background-color: var(--guide-control-bg);
}

.feedback-prompt {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.feedback-question {
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}

.feedback-actions {
  display: flex;
  gap: 0.5rem;
}

.feedback-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 6px;
  border: 1px solid var(--guide-border-strong);
  background-color: var(--vp-c-bg);
  font-size: 1.125rem;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.feedback-btn:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
}

.feedback-btn:focus-visible {
  outline: 2px solid var(--guide-focus-outline);
  outline-offset: 2px;
}

.feedback-thanks {
  margin: 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}
</style>
