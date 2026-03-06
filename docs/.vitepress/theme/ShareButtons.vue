<script setup>
import { ref, computed } from "vue";
import { useData } from "vitepress";

const { page, frontmatter, site } = useData();

const isHome = computed(() => frontmatter.value.layout === "home");

const pageUrl = computed(() => {
  const base = (site.value.base || "/").replace(/\/$/, "");
  const relativePath = page.value.relativePath
    .replace(/\.md$/, ".html")
    .replace(/index\.html$/, "");
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://metyatech.github.io";
  return `${origin}${base}/${relativePath}`;
});

const pageTitle = computed(() => page.value.title || site.value.title);

const tweetUrl = computed(() => {
  const url = encodeURIComponent(pageUrl.value);
  const text = encodeURIComponent(pageTitle.value);
  return `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
});

const tooltipVisible = ref(false);
let tooltipTimer = null;

async function copyUrlToClipboard() {
  try {
    await navigator.clipboard.writeText(pageUrl.value);
    tooltipVisible.value = true;
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      tooltipVisible.value = false;
    }, 2000);
  } catch {
    // clipboard unavailable — do nothing
  }
}
</script>

<template>
  <div v-if="!isHome" class="share-buttons">
    <span class="share-label">シェア：</span>
    <a
      :href="tweetUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="share-btn share-btn--x"
      aria-label="Xでシェア"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.903-5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          fill="currentColor"
        />
      </svg>
      <span>X</span>
    </a>
    <div class="share-btn-wrapper">
      <button
        class="share-btn share-btn--discord"
        aria-label="URLをコピー（Discordなどでシェア）"
        @click="copyUrlToClipboard"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
            fill="currentColor"
          />
        </svg>
        <span>Discord</span>
      </button>
      <div v-if="tooltipVisible" class="share-tooltip" role="status" aria-live="polite">
        URLをコピーしました
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--guide-border-strong);
  flex-wrap: wrap;
}

.share-label {
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid var(--guide-border-strong);
  background-color: var(--guide-control-bg);
  color: var(--vp-c-text-1);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.share-btn:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
}

.share-btn:focus-visible {
  outline: 2px solid var(--guide-focus-outline);
  outline-offset: 2px;
}

.share-btn-wrapper {
  position: relative;
  display: inline-flex;
}

.share-tooltip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background-color: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-size: 0.75rem;
  padding: 0.25rem 0.625rem;
  border-radius: 4px;
  pointer-events: none;
  z-index: 100;
}

.share-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--vp-c-text-1);
}
</style>
