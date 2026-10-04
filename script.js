(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGSAP = Boolean(window.gsap);

  const projects = [
    {
      title: "Private Residence",
      type: "Bespoke residential cellar",
      location: "Ho Chi Minh City, Vietnam",
      main: "assets/images/hero-daylight.webp",
      detail: "assets/images/hero-detail.webp",
      alt: "Contemporary wine interior with bespoke timber cabinetry, glass storage and integrated lighting",
      description: "A calm, light-filled wine room conceived as part of the home’s architecture, pairing warm joinery with exact climate control and discreet glass boundaries.",
      gallery: [
        "assets/images/hero-daylight.webp",
        "assets/images/hero-detail.webp",
        "assets/images/philosophy-detail.webp",
      ],
    },
    {
      title: "Private Wine Room",
      type: "Residential wine room",
      location: "Hanoi, Vietnam",
      main: "assets/images/projects/hanoi-main-new.webp",
      detail: "assets/images/projects/hanoi-detail.webp",
      alt: "Dark timber and glass wine room with integrated architectural lighting",
      description: "A more intimate room shaped through blackened metal, smoked glass and timber. Integrated light gives every bottle presence without disturbing the atmosphere.",
      gallery: [
        "assets/images/projects/hanoi-main-new.webp",
        "assets/images/projects/hanoi-detail.webp",
        "assets/images/projects/hanoi-main.webp",
      ],
    },
    {
      title: "Hospitality Cellar",
      type: "Hospitality concept",
      location: "Concept Project",
      main: "assets/images/projects/hospitality-main.webp",
      detail: "assets/images/projects/hospitality-detail.webp",
      alt: "Warm hospitality cellar with illuminated bespoke wine cabinetry",
      description: "A theatrical hospitality cellar where storage, service and display become one continuous architectural experience built around warm, controlled illumination.",
      gallery: [
        "assets/images/projects/hospitality-main.webp",
        "assets/images/projects/hospitality-detail.webp",
        "assets/images/projects/hospitality-gallery.webp",
      ],
    },
  ];

  const storyChapters = [
    {
      image: "assets/images/hero-daylight.webp",
      title: "Architecture before storage.",
      text: "We begin with the room: its light, material rhythm and the way people move through it.",
    },
    {
      image: "assets/images/projects/hanoi-detail.webp",
      title: "Precision made quiet.",
      text: "Climate, lighting and bottle access are resolved into details that feel calm rather than technical.",
    },
    {
      image: "assets/images/projects/hospitality-main.webp",
      title: "A deeper way to live with wine.",
      text: "The result is an environment for preservation, ritual and conversation — designed to belong to its architecture.",
    },
  ];

  const header = document.querySelector("[data-header]");
  const slider = document.querySelector("[data-hero-slider]");
  const viewer = document.querySelector("[data-project-viewer]");
  const storyDialog = document.querySelector("[data-story-dialog]");
  const contentDialog = document.querySelector("[data-content-dialog]");
  let activeProjectIndex = 0;
  let activeGalleryIndex = 0;
  let activeStoryIndex = 0;
  let sliderTransitioning = false;
  let galleryTransitioning = false;
  let storyTransitioning = false;
  let activeOverlay = null;
  let overlayTrigger = null;
  let overlayTimeline = null;
  let overlayFocusTimer = null;
  let overlayClosing = false;
  let lockedScrollY = 0;
  const warmedImages = new Set();

  initHeader();
  initLanguage();
  initSlider();
  initOverlays();
  initContentActions();
  initKeyboard();
  syncHeroProject(projects[activeProjectIndex], false);
  scheduleAdjacentPreload();

  if (finePointer && !reducedMotion) initCursor();
  if (hasGSAP && !reducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    initMotion();
  }

  function initHeader() {
    const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 38);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  function initLanguage() {
    const toggle = document.querySelector("[data-language-toggle]");
    const menu = document.querySelector(".language-menu");
    if (!toggle || !menu) return;

    const close = () => {
      toggle.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    };

    toggle.addEventListener("click", () => {
      const opening = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(opening));
      menu.hidden = !opening;
      if (opening) menu.querySelector("button:not(:disabled)")?.focus();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".language-wrap")) close();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        close();
        toggle.focus();
      }
    });

    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
        toggle.focus();
      }
    });
  }

  function initSlider() {
    document.querySelector("[data-project-prev]")?.addEventListener("click", () => changeProject(-1));
    document.querySelector("[data-project-next]")?.addEventListener("click", () => changeProject(1));
    document.querySelector("[data-open-project]")?.addEventListener("click", (event) => openProjectViewer(event.currentTarget));
  }

  async function changeProject(direction) {
    if (sliderTransitioning) return;
    sliderTransitioning = true;

    const nextIndex = wrap(activeProjectIndex + direction, projects.length);
    const project = projects[nextIndex];
    const mainActive = document.querySelector(".hero-main-image.is-active");
    const mainNext = document.querySelector(".hero-main-image.is-next");
    const detailActive = document.querySelector(".hero-detail-image.is-active");
    const detailNext = document.querySelector(".hero-detail-image.is-next");

    try {
      await Promise.all([loadImage(mainNext, project.main), loadImage(detailNext, project.detail)]);

      if (!hasGSAP || reducedMotion) {
        activeProjectIndex = nextIndex;
        syncHeroProject(project);
        mainActive.src = project.main;
        mainActive.alt = project.alt;
        detailActive.src = project.detail;
        mainNext.removeAttribute("src");
        detailNext.removeAttribute("src");
        return;
      }

      const fromClip = direction > 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
      const exitX = direction > 0 ? -1.5 : 1.5;
      gsap.set([mainNext, detailNext], { clipPath: fromClip, scale: 1.045, xPercent: 0 });

      await new Promise((resolve) => {
        const timeline = gsap.timeline({
          defaults: { ease: "power4.inOut" },
          onComplete: () => {
            mainActive.src = project.main;
            mainActive.alt = project.alt;
            detailActive.src = project.detail;
            gsap.set([mainActive, detailActive], { scale: 1, xPercent: 0 });
            gsap.set([mainNext, detailNext], { clipPath: fromClip, scale: 1.045 });
            mainNext.removeAttribute("src");
            detailNext.removeAttribute("src");
            resolve();
          },
        });

        timeline
          .to(".hero-rail-current, .project-meta-copy, .detail-index", { y: -10, autoAlpha: 0, duration: 0.28, stagger: 0.035, ease: "power2.in" }, 0)
          .to(mainActive, { scale: 1.025, xPercent: exitX, duration: 1.05 }, 0)
          .to(mainNext, { clipPath: "inset(0 0% 0 0)", scale: 1, duration: 1.05 }, 0)
          .to(detailActive, { scale: 1.03, duration: 0.82 }, 0.08)
          .to(detailNext, { clipPath: "inset(0 0% 0 0)", scale: 1, duration: 0.82 }, 0.1)
          .add(() => {
            activeProjectIndex = nextIndex;
            syncHeroProject(project);
          }, 0.36)
          .fromTo(".hero-rail-current, .project-meta-copy, .detail-index", { y: 11, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.045, ease: "power3.out" }, 0.48);
      });
    } finally {
      sliderTransitioning = false;
    }
  }

  function syncHeroProject(project, warmAdjacent = true) {
    document.querySelector(".hero-rail-current").textContent = pad(activeProjectIndex + 1);
    document.querySelector(".hero-rail-total").textContent = pad(projects.length);
    document.querySelector(".hero-rail")?.setAttribute("aria-label", `Project ${activeProjectIndex + 1} of ${projects.length}`);
    document.querySelector(".project-name").textContent = project.title;
    document.querySelector(".project-type").textContent = project.type;
    document.querySelector(".project-location").textContent = project.location;
    document.querySelector(".detail-index").textContent = `Material detail / ${pad(activeProjectIndex + 1)}`;
    const openButton = document.querySelector("[data-open-project]");
    openButton?.setAttribute("aria-label", `View ${project.title} project`);
    if (warmAdjacent) preloadAdjacentSlides(activeProjectIndex);
  }

  function initOverlays() {
    document.querySelectorAll("[data-close-overlay]").forEach((button) => button.addEventListener("click", closeOverlay));

    document.querySelector("[data-viewer-prev]")?.addEventListener("click", () => changeGalleryImage(-1));
    document.querySelector("[data-viewer-next]")?.addEventListener("click", () => changeGalleryImage(1));
    document.querySelector("[data-viewer-project-prev]")?.addEventListener("click", () => changeViewerProject(-1));
    document.querySelector("[data-viewer-project-next]")?.addEventListener("click", () => changeViewerProject(1));
    document.querySelector("[data-story-prev]")?.addEventListener("click", () => changeStory(-1));
    document.querySelector("[data-story-next]")?.addEventListener("click", () => changeStory(1));

    document.querySelector("[data-open-intro]")?.addEventListener("click", (event) => {
      activeStoryIndex = 0;
      updateStory(true);
      openOverlay(storyDialog, event.currentTarget);
    });

    [viewer, storyDialog, contentDialog].forEach((overlay) => {
      overlay?.addEventListener("mousedown", (event) => {
        if (event.target === overlay) closeOverlay();
      });
    });
  }

  function openProjectViewer(trigger) {
    activeGalleryIndex = 0;
    updateViewerProject(true);
    openOverlay(viewer, trigger);
  }

  function updateViewerProject(immediate = false) {
    const project = projects[activeProjectIndex];
    activeGalleryIndex = 0;
    const activeImage = viewer.querySelector(".viewer-image.is-active");
    activeImage.src = project.gallery[0];
    activeImage.alt = project.alt;
    viewer.querySelector(".viewer-project-number").textContent = `Project ${pad(activeProjectIndex + 1)}`;
    viewer.querySelector(".viewer-kicker").textContent = project.type;
    viewer.querySelector("#viewer-title").textContent = project.title;
    viewer.querySelector(".viewer-description").textContent = project.description;
    viewer.querySelector(".viewer-location").textContent = project.location;
    viewer.querySelector(".viewer-type").textContent = project.type;
    viewer.querySelector(".viewer-gallery-total").textContent = `${pad(project.gallery.length)} images`;
    updateViewerCounter();

    if (hasGSAP && !reducedMotion && !immediate) {
      gsap.fromTo(".viewer-copy > *, .viewer-facts div", { y: 13, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.045, ease: "power3.out" });
    }
  }

  async function changeViewerProject(direction) {
    if (galleryTransitioning) return;
    activeProjectIndex = wrap(activeProjectIndex + direction, projects.length);
    const project = projects[activeProjectIndex];
    const heroMain = document.querySelector(".hero-main-image.is-active");
    const heroDetail = document.querySelector(".hero-detail-image.is-active");
    heroMain.src = project.main;
    heroMain.alt = project.alt;
    heroDetail.src = project.detail;
    syncHeroProject(project);
    updateViewerProject();
  }

  async function changeGalleryImage(direction) {
    if (galleryTransitioning) return;
    galleryTransitioning = true;
    const project = projects[activeProjectIndex];
    const nextIndex = wrap(activeGalleryIndex + direction, project.gallery.length);
    const activeImage = viewer.querySelector(".viewer-image.is-active");
    const nextImage = viewer.querySelector(".viewer-image.is-next");

    try {
      await loadImage(nextImage, project.gallery[nextIndex]);
      nextImage.alt = `${project.title}, image ${nextIndex + 1}`;
      if (!hasGSAP || reducedMotion) {
        activeGalleryIndex = nextIndex;
        activeImage.src = nextImage.src;
        activeImage.alt = nextImage.alt;
        nextImage.removeAttribute("src");
        updateViewerCounter();
        return;
      }

      const fromClip = direction > 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
      gsap.set(nextImage, { clipPath: fromClip, scale: 1.035 });
      await new Promise((resolve) => {
        gsap.timeline({
          defaults: { ease: "power4.inOut" },
          onInterrupt: resolve,
          onComplete: () => {
            activeImage.src = nextImage.src;
            activeImage.alt = nextImage.alt;
            gsap.set(activeImage, { scale: 1 });
            gsap.set(nextImage, { clipPath: fromClip, scale: 1.035 });
            nextImage.removeAttribute("src");
            resolve();
          },
        })
          .to(activeImage, { scale: 1.025, duration: 0.9 }, 0)
          .to(nextImage, { clipPath: "inset(0 0% 0 0)", scale: 1, duration: 0.9 }, 0)
          .to(".viewer-image-count", { y: -8, autoAlpha: 0, duration: 0.22, ease: "power2.in", onComplete: () => {
            activeGalleryIndex = nextIndex;
            updateViewerCounter();
          } }, 0)
          .fromTo(".viewer-image-count", { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" }, 0.33);
      });
    } finally {
      galleryTransitioning = false;
    }
  }

  function updateViewerCounter() {
    const total = projects[activeProjectIndex].gallery.length;
    viewer.querySelector(".viewer-image-count").textContent = `${pad(activeGalleryIndex + 1)} / ${pad(total)}`;
  }

  async function changeStory(direction) {
    if (storyTransitioning) return;
    storyTransitioning = true;
    activeStoryIndex = wrap(activeStoryIndex + direction, storyChapters.length);
    const image = storyDialog.querySelector(".story-image");
    const chapter = storyChapters[activeStoryIndex];
    const preload = new Image();
    await loadImage(preload, chapter.image);

    if (!hasGSAP || reducedMotion) {
      updateStory(true);
      storyTransitioning = false;
      return;
    }

    gsap.timeline({
      onComplete: () => { storyTransitioning = false; },
      onInterrupt: () => { storyTransitioning = false; },
    })
      .to([image, ".story-index", ".story-copy h2", ".story-text"], { autoAlpha: 0, y: -9, duration: 0.28, stagger: 0.025, ease: "power2.in" })
      .add(() => updateStory(true))
      .fromTo(image, { autoAlpha: 0, scale: 1.035 }, { autoAlpha: 1, scale: 1, duration: 0.85, ease: "power4.out" })
      .fromTo([".story-index", ".story-copy h2", ".story-text"], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.52, stagger: 0.06, ease: "power3.out" }, 0.36);
  }

  function updateStory() {
    const chapter = storyChapters[activeStoryIndex];
    storyDialog.querySelector(".story-image").src = chapter.image;
    storyDialog.querySelector(".story-index span").textContent = `${pad(activeStoryIndex + 1)} / ${pad(storyChapters.length)}`;
    storyDialog.querySelector("#story-title").textContent = chapter.title;
    storyDialog.querySelector(".story-text").textContent = chapter.text;
    storyDialog.querySelectorAll(".story-progress span").forEach((bar, index) => bar.classList.toggle("is-active", index === activeStoryIndex));
  }

  function initContentActions() {
    document.querySelectorAll("[data-open-inquiry]").forEach((button) => {
      button.addEventListener("click", () => openContentDialog({
        eyebrow: "Start a conversation",
        title: "Tell us about the space you have in mind.",
        text: "Share your location, project stage and the kind of wine environment you would like to create. We will respond with the right next step.",
        label: "KLUGMANN / Private commissions",
        showEmail: true,
      }, button));
    });

    document.querySelector("[data-open-approach]")?.addEventListener("click", (event) => openContentDialog({
      eyebrow: "Our approach",
      title: "The cellar begins with architecture, not equipment.",
      text: "We align spatial planning, climate strategy, lighting, material selection and joinery from the beginning. Technical performance is resolved quietly, allowing the finished room to feel coherent with the wider interior.",
      label: "KLUGMANN / Design philosophy",
      showEmail: false,
    }, event.currentTarget));

    document.querySelectorAll("[data-preview-section]").forEach((button) => {
      button.addEventListener("click", () => openContentDialog({
        eyebrow: "Preview scope",
        title: `${button.dataset.previewSection} will follow in the next review phase.`,
        text: "This prototype intentionally stops after Our Philosophy. The next sections will be designed only after the current typography, motion and interaction direction is approved.",
        label: "KLUGMANN / Current demo scope",
        showEmail: false,
      }, button));
    });
  }

  function openContentDialog(content, trigger) {
    contentDialog.querySelector(".content-dialog-eyebrow").textContent = content.eyebrow;
    contentDialog.querySelector("#content-dialog-title").textContent = content.title;
    contentDialog.querySelector(".content-dialog-text").textContent = content.text;
    contentDialog.querySelector(".content-dialog-label").textContent = content.label;
    contentDialog.querySelector(".dialog-email").hidden = !content.showEmail;
    openOverlay(contentDialog, trigger);
  }

  function openOverlay(overlay, trigger) {
    if (!overlay || activeOverlay) return;
    activeOverlay = overlay;
    overlayTrigger = trigger || document.activeElement;
    overlayClosing = false;
    lockScroll();
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");

    const closeButton = overlay.querySelector("[data-close-overlay]");
    if (hasGSAP && !reducedMotion) {
      overlayTimeline?.kill();
      gsap.killTweensOf(overlay);
      gsap.set(overlay, { autoAlpha: 1 });
      if (overlay === viewer) {
        overlayTimeline = gsap.timeline({
          defaults: { ease: "power4.out" },
          onComplete: () => { overlayTimeline = null; },
        })
          .fromTo(".viewer-media", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.05 })
          .fromTo(".viewer-image.is-active", { scale: 1.045 }, { scale: 1, duration: 1.2 }, 0)
          .fromTo(".viewer-info", { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.72 }, 0.28)
          .fromTo(".viewer-copy > *, .viewer-facts div, .viewer-project-nav", { y: 13, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.52, stagger: 0.045 }, 0.46);
      } else {
        const panel = overlay.querySelector(".content-dialog-panel, .story-visual");
        overlayTimeline = gsap.timeline({
          defaults: { ease: "power4.out" },
          onComplete: () => { overlayTimeline = null; },
        })
          .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.42 })
          .fromTo(panel, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.85 }, 0.08)
          .fromTo(overlay.querySelectorAll("h2, p, .story-controls, .dialog-email"), { y: 15, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.58, stagger: 0.05 }, 0.32);
      }
    }

    window.clearTimeout(overlayFocusTimer);
    overlayFocusTimer = window.setTimeout(() => {
      if (activeOverlay === overlay && !overlayClosing) closeButton?.focus();
    }, reducedMotion ? 0 : 350);
  }

  function closeOverlay() {
    if (!activeOverlay || overlayClosing) return;
    const overlay = activeOverlay;
    overlayClosing = true;
    window.clearTimeout(overlayFocusTimer);
    overlayFocusTimer = null;
    overlayTimeline?.kill();
    overlayTimeline = null;
    if (hasGSAP) {
      gsap.killTweensOf(overlay);
      gsap.killTweensOf(overlay.querySelectorAll("*"));
    }

    const finish = () => {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      activeOverlay = null;
      overlayClosing = false;
      galleryTransitioning = false;
      storyTransitioning = false;
      unlockScroll();
      overlayTrigger?.focus?.();
      overlayTrigger = null;
      if (hasGSAP) {
        gsap.set(overlay, { clearProps: "opacity,visibility" });
        gsap.set(overlay.querySelectorAll(".content-dialog-panel, .story-visual, .viewer-media, .viewer-info, h2, p, .story-controls, .dialog-email, .viewer-copy > *, .viewer-facts div, .viewer-project-nav"), {
          clearProps: "opacity,visibility,transform,clipPath",
        });
      }
    };

    if (hasGSAP && !reducedMotion) {
      overlayTimeline = gsap.to(overlay, {
        autoAlpha: 0,
        duration: 0.38,
        ease: "power2.inOut",
        onComplete: () => {
          overlayTimeline = null;
          finish();
        },
      });
    } else {
      finish();
    }
  }

  function initKeyboard() {
    document.addEventListener("keydown", (event) => {
      if (activeOverlay) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeOverlay();
          return;
        }
        if (event.key === "Tab") trapFocus(event, activeOverlay);
        if (activeOverlay === viewer && event.key === "ArrowLeft") changeGalleryImage(-1);
        if (activeOverlay === viewer && event.key === "ArrowRight") changeGalleryImage(1);
        if (activeOverlay === storyDialog && event.key === "ArrowLeft") changeStory(-1);
        if (activeOverlay === storyDialog && event.key === "ArrowRight") changeStory(1);
        return;
      }

      if (slider?.contains(document.activeElement)) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          changeProject(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          changeProject(1);
        }
      }
    });
  }

  function trapFocus(event, container) {
    const focusable = [...container.querySelectorAll("a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])")].filter((element) => !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function lockScroll() {
    lockedScrollY = window.scrollY;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.paddingRight = `${scrollbarGap}px`;
    document.body.classList.add("is-scroll-locked");
  }

  function unlockScroll() {
    document.body.classList.remove("is-scroll-locked");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.paddingRight = "";
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, lockedScrollY);
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
  }

  function initMotion() {
    const hero = document.querySelector(".hero");
    const philosophy = document.querySelector(".philosophy");
    const context = gsap.context(() => {
      const loadTimeline = gsap.timeline({ defaults: { ease: "power4.out" } });

      gsap.set(".wordmark-mask > span", { yPercent: 115 });
      gsap.set(".primary-nav > *, .header-actions > *", { y: -12, autoAlpha: 0 });
      gsap.set(".hero-eyebrow", { x: -18, autoAlpha: 0 });
      gsap.set(".hero-title .line-inner", { yPercent: 115, rotate: 1 });
      gsap.set(".hero-description, .hero-actions", { y: 18, autoAlpha: 0 });
      gsap.set(".hero-rail-line", { scaleY: 0 });
      gsap.set(".hero-rail-count", { y: 10, autoAlpha: 0 });
      gsap.set(".hero-main-reveal", { clipPath: "inset(0 0 100% 0)" });
      gsap.set(".hero-main-image.is-active", { scale: 1.075, yPercent: 2 });
      gsap.set(".hero-detail-reveal", { clipPath: "inset(100% 0 0 0)" });
      gsap.set(".hero-detail-image.is-active", { scale: 1.065 });
      gsap.set(".hero-detail-wrap", { autoAlpha: 0 });
      gsap.set(".detail-index, .project-meta, .scroll-hint", { y: 12, autoAlpha: 0 });

      loadTimeline
        .to(".wordmark-mask > span", { yPercent: 0, duration: 0.66 }, 0.02)
        .to(".primary-nav > *, .header-actions > *", { y: 0, autoAlpha: 1, duration: 0.54, stagger: 0.045 }, 0.14)
        .to(".hero-eyebrow", { x: 0, autoAlpha: 1, duration: 0.62 }, 0.28)
        .to(".hero-rail-line", { scaleY: 1, duration: 0.88 }, 0.3)
        .to(".hero-rail-count", { y: 0, autoAlpha: 1, duration: 0.58 }, 0.64)
        .to(".hero-title .line-inner", { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.075 }, 0.32)
        .to(".hero-main-reveal", { clipPath: "inset(0 0 0% 0)", duration: 1.08 }, 0.48)
        .to(".hero-main-image.is-active", { scale: 1, yPercent: 0, duration: 1.45 }, 0.48)
        .to(".hero-description, .hero-actions", { y: 0, autoAlpha: 1, duration: 0.68, stagger: 0.08 }, 0.7)
        .to(".hero-detail-wrap", { autoAlpha: 1, duration: 0.5 }, 0.86)
        .to(".hero-detail-reveal", { clipPath: "inset(0% 0 0 0)", duration: 0.82 }, 0.9)
        .to(".hero-detail-image.is-active", { scale: 1, duration: 1.08 }, 0.9)
        .to(".detail-index, .project-meta", { y: 0, autoAlpha: 1, duration: 0.58, stagger: 0.07 }, 1.06)
        .to(".scroll-hint", { y: 0, autoAlpha: 1, duration: 0.52 }, 1.24);

      gsap.to(".hero-main-image.is-active", {
        yPercent: 5,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 },
      });

      gsap.to(".hero-detail-wrap", {
        y: -27,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1 },
      });

      gsap.to(".hero-copy", {
        y: -17,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1.1 },
      });

      gsap.to(".scroll-hint", {
        autoAlpha: 0,
        y: -10,
        scrollTrigger: { trigger: hero, start: "top top-=75", end: "top top-=220", scrub: true },
      });

      gsap.set(".section-kicker-line", { scaleY: 0 });
      gsap.set(".section-kicker-text", { x: -10, autoAlpha: 0 });
      gsap.set(".philosophy-title .line-inner", { yPercent: 110, rotate: 0.8 });
      gsap.set(".philosophy-body p", { y: 20, autoAlpha: 0 });
      gsap.set(".body-rule", { scaleY: 0 });
      gsap.set(".text-link", { y: 11, autoAlpha: 0 });
      gsap.set(".philosophy-image-reveal", { clipPath: "inset(0 100% 0 0)" });
      gsap.set(".philosophy-image-reveal img", { scale: 1.07, xPercent: -3 });
      gsap.set(".philosophy-visual figcaption", { y: 8, autoAlpha: 0 });

      gsap.timeline({
        defaults: { ease: "power4.out" },
        scrollTrigger: { trigger: philosophy, start: "top 82%", once: true },
      })
        .to(".section-kicker-line", { scaleY: 1, duration: 0.62 })
        .to(".section-kicker-text", { x: 0, autoAlpha: 1, duration: 0.52 }, 0.08)
        .to(".philosophy-title .line-inner", { yPercent: 0, rotate: 0, duration: 0.82, stagger: 0.07 }, 0.05)
        .to(".body-rule", { scaleY: 1, duration: 0.62 }, 0.24)
        .to(".philosophy-body p", { y: 0, autoAlpha: 1, duration: 0.68 }, 0.3)
        .to(".text-link", { y: 0, autoAlpha: 1, duration: 0.55 }, 0.46)
        .to(".philosophy-image-reveal", { clipPath: "inset(0 0% 0 0)", duration: 0.94 }, 0.2)
        .to(".philosophy-image-reveal img", { scale: 1, xPercent: 0, duration: 1.15 }, 0.2)
        .to(".philosophy-visual figcaption", { y: 0, autoAlpha: 1, duration: 0.48 }, 0.7);

      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready?.then(refresh);
      window.addEventListener("load", refresh, { once: true });
    });

    window.addEventListener("pagehide", () => context.revert(), { once: true });
  }

  function initCursor() {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    const label = ring?.querySelector("span");
    if (!dot || !ring || !label) return;

    document.body.classList.add("cursor-active");
    const pointer = { x: -100, y: -100 };
    const follower = { x: -100, y: -100 };
    let visible = false;
    let hoveredElement = null;

    const clearState = () => {
      ring.classList.remove("is-link", "is-cta", "is-view", "is-prev", "is-next", "is-close");
      label.textContent = "";
      hoveredElement = null;
    };

    window.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!visible) {
        follower.x = pointer.x;
        follower.y = pointer.y;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
        visible = true;
      }
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
      const target = event.target.closest?.("[data-cursor]");
      if (!target || target === hoveredElement) return;
      clearState();
      hoveredElement = target;
      const state = target.dataset.cursor;
      ring.classList.add(`is-${state}`);
      label.textContent = target.dataset.cursorLabel || "";
    });

    document.addEventListener("pointerout", (event) => {
      if (!hoveredElement) return;
      const nextTarget = event.relatedTarget?.closest?.("[data-cursor]");
      if (nextTarget === hoveredElement) return;
      clearState();
    });

    document.addEventListener("pointerleave", () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      visible = false;
      clearState();
    });

    const render = () => {
      follower.x += (pointer.x - follower.x) * 0.16;
      follower.y += (pointer.y - follower.y) * 0.16;
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${follower.x}px, ${follower.y}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(render);
    };
    render();
  }

  function scheduleAdjacentPreload() {
    const warm = () => preloadAdjacentSlides(activeProjectIndex);
    if (document.querySelector(".hero-main-image.is-active")?.complete) {
      if ("requestIdleCallback" in window) window.requestIdleCallback(warm, { timeout: 2500 });
      else window.setTimeout(warm, 1400);
    } else {
      window.addEventListener("load", warm, { once: true });
    }
  }

  function preloadAdjacentSlides(index) {
    const adjacent = [wrap(index - 1, projects.length), wrap(index + 1, projects.length)];
    adjacent.flatMap((projectIndex) => [projects[projectIndex].main, projects[projectIndex].detail]).forEach((src) => {
      if (warmedImages.has(src)) return;
      warmedImages.add(src);
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    });
  }

  function loadImage(image, src) {
    return new Promise((resolve) => {
      if (!image) return resolve();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = src;
      if (image.complete) resolve();
    });
  }

  function wrap(index, length) { return (index + length) % length; }
  function pad(value) { return String(value).padStart(2, "0"); }
})();
