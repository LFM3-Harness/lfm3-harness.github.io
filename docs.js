// Progressive enhancement for the documentation pages.
// Everything here is optional: the pages read and navigate fully without it.
(() => {
  "use strict";

  /* ---------------- navigation disclosure ---------------- */

  const nav = document.querySelector("[data-docs-nav]");
  if (nav) {
    // A disclosure on narrow screens, always expanded on desktop, where the
    // toggle is hidden. Keep the two in step when the window is resized, so a
    // page opened narrow never ends up wide with no navigation at all.
    const wide = window.matchMedia("(min-width: 901px)");
    const syncNav = () => {
      nav.open = wide.matches;
    };
    syncNav();
    wide.addEventListener("change", syncNav);
  }

  /* ---------------- copy code ---------------- */

  for (const block of document.querySelectorAll(".code-block")) {
    const pre = block.querySelector("pre");
    if (!pre) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-code";
    button.textContent = "Copy";

    button.addEventListener("click", async () => {
      const text = pre.innerText.replace(/\n$/, "");
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy failed";
      }
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1600);
    });

    block.appendChild(button);
  }

  /* ---------------- on this page ---------------- */

  const toc = document.querySelector("[data-toc]");
  const headings = Array.from(document.querySelectorAll(".docs-article h2[id], .docs-article h3[id]"));
  const tocLinks = new Map();
  if (toc) {
    for (const link of toc.querySelectorAll("a[href^='#']")) {
      tocLinks.set(link.getAttribute("href").slice(1), link);
    }
  }

  const setActive = (id) => {
    for (const [key, link] of tocLinks) {
      link.classList.toggle("is-active", key === id);
    }
  };

  if (headings.length && "IntersectionObserver" in window) {
    let visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        if (visible.size === 0) return;
        const first = headings.find((heading) => visible.has(heading.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-76px 0px -62% 0px", threshold: 0 },
    );
    headings.forEach((heading) => observer.observe(heading));
  }

  /* ---------------- screenshot lightbox ---------------- */

  const shots = document.querySelectorAll(".figure-shot");
  if (shots.length && typeof HTMLDialogElement === "function") {
    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.setAttribute("aria-label", "Screenshot at full size");

    const image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "lightbox-close";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", () => dialog.close());

    dialog.append(image, closeButton);
    document.body.appendChild(dialog);

    for (const shot of shots) {
      shot.addEventListener("click", (event) => {
        const href = shot.getAttribute("href");
        const inline = shot.querySelector("img");
        if (!href || !inline || event.button !== 0 || event.metaKey || event.ctrlKey) return;
        event.preventDefault();
        image.src = href;
        image.alt = inline.alt;
        dialog.showModal();
      });
    }

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", () => image.removeAttribute("src"));
  }

  /* ---------------- search ---------------- */

  const input = document.querySelector("[data-search-input]");
  const panel = document.querySelector("[data-search-results]");
  if (!input || !panel) return;

  const base = new URL(".", window.location.href);
  let index = null;
  let loading = null;
  let results = [];
  let selected = -1;

  const load = () => {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch(new URL("search-index.json", base))
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => {
          index = data;
          return index;
        })
        .catch(() => {
          index = [];
          return index;
        });
    }
    return loading;
  };

  const snippet = (text, query) => {
    const at = text.indexOf(query);
    if (at < 0) return text.slice(0, 130) + (text.length > 130 ? "…" : "");
    const start = Math.max(0, at - 50);
    const end = Math.min(text.length, at + query.length + 90);
    return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
  };

  const search = (raw) => {
    const query = raw.trim().toLowerCase();
    if (query.length < 2) return [];
    const terms = query.split(/\s+/).filter(Boolean);

    const scored = [];
    for (const entry of index || []) {
      const heading = entry.h.toLowerCase();
      const page = entry.p.toLowerCase();
      let score = 0;

      for (const term of terms) {
        let termScore = 0;
        if (heading.includes(term)) termScore += heading.startsWith(term) ? 6 : 4;
        if (page.includes(term)) termScore += 2;
        if (entry.x.includes(term)) termScore += 1;
        if (termScore === 0) {
          score = 0;
          break;
        }
        score += termScore;
      }

      if (score > 0) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map(({ entry }) => entry);
  };

  const close = () => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    selected = -1;
  };

  const open = () => {
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  const highlight = () => {
    panel.querySelectorAll(".search-result").forEach((node, position) => {
      node.classList.toggle("is-selected", position === selected);
    });
    const active = panel.querySelector(".search-result.is-selected");
    if (active) active.scrollIntoView({ block: "nearest" });
  };

  const render = (query) => {
    panel.replaceChildren();

    if (results.length === 0) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = `No documentation matches “${query}”.`;
      panel.appendChild(empty);
      open();
      return;
    }

    results.forEach((entry, position) => {
      const link = document.createElement("a");
      link.className = "search-result";
      link.href = entry.u;

      const page = document.createElement("span");
      page.className = "search-result-page";
      page.textContent = entry.p;

      const title = document.createElement("span");
      title.className = "search-result-title";
      title.textContent = entry.h;

      const text = document.createElement("span");
      text.className = "search-result-snippet";
      text.textContent = snippet(entry.x, query.toLowerCase().trim());

      link.append(page, title, text);
      link.addEventListener("mouseenter", () => {
        selected = position;
        highlight();
      });
      link.addEventListener("click", close);
      panel.appendChild(link);
    });

    selected = 0;
    highlight();
    open();
  };

  let timer = 0;
  input.addEventListener("input", async () => {
    const query = input.value;
    if (query.trim().length < 2) {
      close();
      return;
    }
    await load();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      results = search(query);
      render(query);
    }, 90);
  });

  input.addEventListener("focus", () => {
    load();
    if (input.value.trim().length >= 2 && results.length) open();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      input.blur();
      return;
    }
    if (panel.hidden) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      selected = Math.min(results.length - 1, selected + 1);
      highlight();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      selected = Math.max(0, selected - 1);
      highlight();
    } else if (event.key === "Enter") {
      const active = panel.querySelector(".search-result.is-selected");
      if (active) {
        event.preventDefault();
        active.click();
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel.contains(event.target) && event.target !== input) close();
  });

  document.addEventListener("keydown", (event) => {
    const typing =
      event.target instanceof HTMLElement &&
      (event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA" ||
        event.target.isContentEditable);

    if (event.key === "/" && !typing) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
})();
