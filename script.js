(() => {
  "use strict";

  const init = () => {
    const root = document.documentElement;
    const progressBar = document.querySelector(".reading-progress__bar");
    const header = document.querySelector(".site-header");
    let frameRequested = false;

    const updateScrollState = () => {
      frameRequested = false;

      if (progressBar) {
        const scrollableHeight = Math.max(
          0,
          root.scrollHeight - window.innerHeight,
        );
        const progress =
          scrollableHeight === 0
            ? 0
            : Math.min(1, Math.max(0, window.scrollY / scrollableHeight));

        progressBar.style.transform = `scaleX(${progress})`;
      }

      if (header) {
        header.classList.toggle("is-compact", window.scrollY > 80);
      }
    };

    const requestScrollUpdate = () => {
      if (frameRequested) {
        return;
      }

      frameRequested = true;
      window.requestAnimationFrame(updateScrollState);
    };

    if (progressBar || header) {
      updateScrollState();
      window.addEventListener("scroll", requestScrollUpdate, { passive: true });
      window.addEventListener("resize", requestScrollUpdate);
    }

    const sections = Array.from(
      document.querySelectorAll(".prose-section[id]"),
    );
    const tocLinks = Array.from(
      document.querySelectorAll('.toc-link[href^="#"]'),
    );

    if (
      sections.length === 0 ||
      tocLinks.length === 0 ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const linksBySection = new Map();

    for (const link of tocLinks) {
      let sectionId = "";

      try {
        sectionId = decodeURIComponent(
          new URL(link.getAttribute("href"), document.baseURI).hash.slice(1),
        );
      } catch {
        continue;
      }

      if (!sectionId) {
        continue;
      }

      const links = linksBySection.get(sectionId) ?? [];
      links.push(link);
      linksBySection.set(sectionId, links);
    }

    const setCurrentSection = (sectionId) => {
      for (const link of tocLinks) {
        link.removeAttribute("aria-current");
      }

      for (const link of linksBySection.get(sectionId) ?? []) {
        link.setAttribute("aria-current", "current");
      }
    };

    const visibleSections = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target);
          } else {
            visibleSections.delete(entry.target);
          }
        }

        const currentSection = Array.from(visibleSections).sort(
          (left, right) =>
            Math.abs(left.getBoundingClientRect().top) -
            Math.abs(right.getBoundingClientRect().top),
        )[0];

        if (currentSection) {
          setCurrentSection(currentSection.id);
        }
      },
      {
        rootMargin: "-12% 0px -72% 0px",
        threshold: [0, 0.1, 0.5, 1],
      },
    );

    for (const section of sections) {
      observer.observe(section);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
