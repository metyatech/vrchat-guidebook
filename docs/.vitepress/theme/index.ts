import { onBeforeUnmount, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "./custom.css";

let overlay: HTMLDivElement | undefined;
let overlayImage: HTMLImageElement | undefined;

function ensureOverlay() {
  if (overlay && overlayImage) {
    return;
  }

  overlay = document.createElement("div");
  overlay.className = "image-zoom-overlay";
  overlay.setAttribute("aria-hidden", "true");

  overlayImage = document.createElement("img");
  overlayImage.className = "image-zoom-overlay-image";
  overlayImage.alt = "";
  overlay.appendChild(overlayImage);

  overlay.addEventListener("click", () => {
    closeOverlay();
  });

  overlayImage.addEventListener("click", (event) => {
    event.stopPropagation();
    closeOverlay();
  });

  document.body.appendChild(overlay);
}

function openOverlay(image: HTMLImageElement) {
  ensureOverlay();
  if (!overlay || !overlayImage) {
    return;
  }

  overlayImage.src = image.currentSrc || image.src;
  overlayImage.alt = image.alt || "";
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeOverlay() {
  if (!overlay || !overlayImage) {
    return;
  }

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  overlayImage.src = "";
  overlayImage.alt = "";
  document.body.style.overflow = "";
}

function bindImageZoom() {
  const images = document.querySelectorAll<HTMLImageElement>(".vp-doc img:not(.no-zoom)");
  images.forEach((image) => {
    if (image.dataset.zoomBound === "true") {
      return;
    }

    image.dataset.zoomBound = "true";
    image.classList.add("image-zoom-target");
    image.addEventListener("click", () => {
      openOverlay(image);
    });
  });
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOverlay();
      }
    };

    onMounted(() => {
      bindImageZoom();
      document.addEventListener("keydown", onKeydown);
    });

    watch(
      () => route.path,
      async () => {
        await nextTick();
        bindImageZoom();
      }
    );

    onBeforeUnmount(() => {
      document.removeEventListener("keydown", onKeydown);
      closeOverlay();
    });
  }
};
