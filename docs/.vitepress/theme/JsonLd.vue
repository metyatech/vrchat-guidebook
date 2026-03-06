<script setup>
import { computed } from "vue";
import { useData } from "vitepress";

const { page, frontmatter, site } = useData();

const isHome = computed(() => frontmatter.value.layout === "home");

const jsonLdString = computed(() => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.value.title || site.value.title,
    description: frontmatter.value.description || site.value.description || "",
    inLanguage: "ja",
    isPartOf: {
      "@type": "WebSite",
      name: "VRChat Guidebook",
      url: "https://metyatech.github.io/vrchat-guidebook/"
    }
  };
  return JSON.stringify(schema);
});
</script>

<template>
  <component :is="'script'" v-if="!isHome" type="application/ld+json">{{ jsonLdString }}</component>
</template>
