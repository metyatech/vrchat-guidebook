<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useData } from "vitepress";

const route = useRoute();
const { frontmatter } = useData();
const container = ref(null);

function loadGiscus() {
  if (!container.value) return;
  if (frontmatter.value.layout === "home") return;

  container.value.innerHTML = "";
  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.setAttribute("data-repo", "metyatech/vrchat-guidebook");
  script.setAttribute("data-repo-id", "R_kgDORP-gow");
  script.setAttribute("data-category", "General");
  script.setAttribute("data-category-id", "DIC_kwDORP-go84C3zSG");
  script.setAttribute("data-mapping", "pathname");
  script.setAttribute("data-strict", "0");
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", "top");
  script.setAttribute("data-theme", "preferred_color_scheme");
  script.setAttribute("data-lang", "ja");
  script.setAttribute("data-loading", "lazy");
  script.setAttribute("crossorigin", "anonymous");
  script.async = true;
  container.value.appendChild(script);
}

onMounted(loadGiscus);
watch(() => route.path, loadGiscus);
</script>

<template>
  <div ref="container" class="giscus-comments" />
</template>

<style scoped>
.giscus-comments {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--guide-border-strong);
}
</style>
