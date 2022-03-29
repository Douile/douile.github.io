"use strict";

(function () {
  function defineConsts(object, values) {
    for (let key in values) {
      const value = values[key];
      Object.defineProperty(object, key, {
        configurable: false,
        enumerable: false,
        get: function () {
          return value;
        },
      });
    }
  }

  function initBackground(el) {
    if (!el || el.tagName !== "CANVAS")
      throw new Error("You must provide a canvas element");
    el.width = window.innerWidth;
    el.height = window.innerHeight;
    el.dataColor =
      getComputedStyle(el).getPropertyValue("--foreground") || "#ffffff";
    const state = {
      ctx: el.getContext("2d"),
      canvas: el,
    };
    Object.defineProperties(state, {
      width: {
        get: function () {
          return el.width;
        },
      },
      height: {
        get: function () {
          return el.height;
        },
      },
    });

    window._RENDERING = [];

    const render = function () {
      requestAnimationFrame(render);

      const width = this.width;
      const height = this.height;
      const ctx = this.ctx;
      const canvas = this.canvas;
      //if (getComputedStyle(canvas).display === 'none') return;
      let now = Date.now();

      ctx.clearRect(0, 0, width, height);

      const toAdd = new Array(Math.max(Math.floor(Math.random() * 20) - 17, 0));
      for (let i = 0; i < toAdd.length; i++) {
        toAdd[i] = {
          x: Math.random() * width,
          y: Math.random() * height,
          created: now,
          length: Math.floor(Math.random() * 4500) + 500,
          size: Math.random() * 5 + 2,
        };
      }

      window._RENDERING = window._RENDERING.concat(toAdd);
      const color = canvas.dataColor;

      for (let i = window._RENDERING.length - 1; i >= 0; i--) {
        const item = window._RENDERING[i];
        if (item === undefined) {
          window._RENDERING.splice(i, 1);
          continue;
        }
        const size = item.size * (1 - (now - item.created) / item.length);
        if (size <= 0) {
          window._RENDERING.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.ellipse(item.x, item.y, size, size, 0, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }
    }.bind(state);
    render();
  }

  function createElement(tagName, attributes, innerText) {
    const el = document.createElement(tagName);
    if (innerText !== undefined) el.innerText = innerText;
    if (attributes) {
      for (let key in attributes) {
        el.setAttribute(key, attributes[key]);
      }
    }
    return el;
  }

  function hsl(h) {
    return `hsl(${h},100%,60%)`;
  }

  async function loadProjects() {
    const res = await fetch("/content/projects.json", {
      mode: "same-origin",
      credentials: "omit",
    });
    const projects = await res.json();
    const rootEl = document.querySelector(".projects");
    rootEl.firstChild.remove();
    const categories = {};
    for (let project of projects) {
      const container = createElement("article", {
        class: "project project-shown",
      });
      container.appendChild(
        createElement("h1", { class: "project-title" }, project.name)
      );
      const tags = container.appendChild(
        createElement("div", { class: "project-tags" })
      );
      for (let tag of project.tags) {
        container.classList.add(`project__${tag}`);
        tags.appendChild(
          createElement(
            "button",
            { class: `project-tag project-tag__${tag}`, "data-tag": tag },
            tag
          )
        );
        if (!(tag in categories)) categories[tag] = "";
      }
      container.appendChild(
        createElement(
          "p",
          { class: "project-description" },
          project.description
        )
      );
      const links = createElement("div", { class: "project-links" });
      if (project.images.length > 0) {
        project.links.images = "#images";
      }
      for (let type in project.links) {
        const link = createElement("a", {
          class: "project-link",
          href: project.links[type],
          target: "_blank",
          "aria-label": type,
          rel: "noopener",
        });
        link.project = project;
        link.appendChild(
          createElement("div", { class: "link-icon", "data-link": type })
        );
        links.appendChild(link);
      }
      container.appendChild(links);
      rootEl.appendChild(container);
    }

    // Generate colours for tags
    const keys = Object.keys(categories);
    const n = Math.floor(360 / keys.length);
    for (let i = 0; i < keys.length; i++) {
      categories[keys[i]] = hsl(n * i);
    }

    // Add colour stylesheet
    let categoryStyles = document.querySelector("link[data-role=categories]");
    if (categoryStyles === null) {
      categoryStyles = createElement("link", {
        rel: "stylesheet",
        "data-role": "categories",
      });
      document.head.appendChild(categoryStyles);
    }
    URL.revokeObjectURL(categoryStyles.href);
    const blob = new Blob(
      Object.entries(categories).map((i) => {
        return `.project-tag__${i[0]}{--color:${i[1]}}`;
      }),
      { type: "text/css" }
    );
    categoryStyles.href = URL.createObjectURL(blob);
  }

  defineConsts(window, {
    displayPage: function (path, url) {
      if (!window.PAGES.hasOwnProperty(path))
        throw new Error("Unknown page " + path);
      console.log("%cLoading " + path, "text-decoration:underline");
      window.history.replaceState(null, "", path);
      document.body.setAttribute("data-page", path);
      const keys = Object.keys(PAGES);
      const current = keys.indexOf(path);
      for (let i = 0; i < keys.length; i++) {
        const action = i <= current ? "remove" : "add";
        document
          .querySelector(`[data-page="${keys[i]}"]`)
          .classList[action]("right");
      }
      if (window.PAGES[path] instanceof Function)
        window.PAGES[path].call(this, url);

      const splitPath = path.split("/");
      const pageName = splitPath[splitPath.length - 1].trim();
      document.title = `Douile${pageName.length > 0 ? ` | ${pageName}` : ""}`;
    },
    displayImages: function (project) {
      console.log(project.images);
      const gallery = document.querySelector(".gallery");
      gallery.setAttribute("data-selected", 0);
      if (project.images.length < 2)
        gallery.setAttribute("data-single", "true");
      for (let i = 0; i < project.images.length; i++) {
        const container = createElement("div", {
          class: "gallery-image-container",
        });
        container.appendChild(
          createElement("img", {
            class: "gallery-image",
            src: project.images[i],
            "data-index": i,
          })
        );
        gallery.appendChild(container);
        if (
          document.head.querySelector(
            `link[rel="preload"][as="image"][href="${project.images[i]}"]`
          ) === null
        ) {
          document.head.appendChild(
            createElement("link", {
              rel: "preload",
              as: "image",
              href: project.images[i],
            })
          );
        }
      }
      window.selectImage(0);
    },
    closeImages: function () {
      const gallery = document.querySelector(".gallery");
      gallery.removeAttribute("data-selected");
      gallery.removeAttribute("data-single");
      for (let child of gallery.querySelectorAll(".gallery-image-container")) {
        child.remove();
      }
    },
    selectImage: function (inc) {
      const gallery = document.querySelector(".gallery");
      if (!gallery.hasAttribute("data-selected")) return;
      let last = parseInt(gallery.getAttribute("data-selected"));
      if (isNaN(last)) last = 0;
      let selected = last + inc;

      const children = Array.from(
        gallery.querySelectorAll("img.gallery-image")
      );
      while (selected >= children.length) selected -= children.length;
      while (selected < 0) selected += children.length;

      gallery.setAttribute("data-selected", selected);

      if (last !== selected) {
        for (let i = 0; i < children.length; i++) {
          const img = children[i];
          img.removeAttribute("data-active");
          if (i === last) {
            img.setAttribute("class", "gallery-image");
            /* Wait for an animation frame to allow animation prop to update */
            window.requestAnimationFrame(() => {
              img.classList.add(inc > 0 ? "slide-out-left" : "slide-out-right");
            });
          } else if (i === selected) {
            img.setAttribute("data-active", "true");
            img.setAttribute("class", "gallery-image");
            /* Wait for an animation frame to allow animation prop to update */
            window.requestAnimationFrame(() => {
              img.classList.add(inc > 0 ? "slide-in-right" : "slide-in-left");
            });
          }
        }
      } else {
        children[selected].setAttribute("data-active", "true");
      }
    },
    toggleLightMode: function () {
      const isLight =
        document.documentElement.getAttribute("data-style") === "light";
      document.documentElement.setAttribute(
        "data-style",
        isLight ? "dark" : "light"
      );
      const canvas = document.querySelector("canvas#dynamic-background");
      canvas.dataColor =
        getComputedStyle(canvas).getPropertyValue("--foreground");
    },
    projectFilterAdd: function (filter) {
      const page = document.querySelector(".projects");
      let filters = [];
      if (page.hasAttribute("data-filter")) {
        filters = page.getAttribute("data-filter").split(" ");
      }
      filters.push(filter);
      projectFilterUpdate(filters);
    },
    projectFilterRemove: function (filter) {
      const page = document.querySelector(".projects");
      let filters = [];
      if (page.hasAttribute("data-filter")) {
        filters = page.getAttribute("data-filter").split(" ");
      }
      filters = filters.filter((f) => f !== filter);

      projectFilterUpdate(filters);
    },
    projectFilterToggle: function (filter) {
      const page = document.querySelector(".projects");
      let filters = [];
      if (page.hasAttribute("data-filter")) {
        filters = page.getAttribute("data-filter").split(" ");
      }
      if (filters.includes(filter)) {
        filters = filters.filter((f) => f !== filter);
      } else {
        filters.push(filter);
      }

      projectFilterUpdate(filters);
    },
    projectFilterUpdate: function (filters) {
      const page = document.querySelector(".projects");
      if (filters.length > 0) {
        page.setAttribute("data-filter", filters.join(" "));
        // clear old filter
        for (let project of document.querySelectorAll(".project")) {
          project.classList.remove("project-shown");
        }
        for (let project of document.querySelectorAll(
          filters.map((f) => `.project__${f}`).join(",")
        )) {
          project.classList.add("project-shown");
        }
      } else {
        page.removeAttribute("data-filter");
        for (let project of document.querySelectorAll(".project")) {
          project.classList.add("project-shown");
        }
      }

      let filterStyle = document.querySelector(
        "link[data-role=category-filter]"
      );
      if (filterStyle === null) {
        filterStyle = createElement("link", {
          rel: "stylesheet",
          "data-role": "category-filter",
        });
        document.head.appendChild(filterStyle);
      }
      URL.revokeObjectURL(filterStyle.href);
      const blob = new Blob(
        filters.map((f) => {
          return `.project-tag__${f}{border:1px solid var(--color)}`;
        }),
        { type: "text/css" }
      );
      filterStyle.href = URL.createObjectURL(blob);
    },
    loadActivityPage: async function () {
      console.log("%cLoad Activity Page", "color:#f00");
      const page = document.querySelector(".page-activity");
      if (page.hasAttribute("data-api-loading")) return;
      page.setAttribute("data-api-loading", "true");

      const currentPage = parseInt(page.getAttribute("data-api-page")) || 1;
      const res = await fetch(
        `https://api.github.com/users/Douile/events?page=${encodeURIComponent(
          currentPage
        )}`
      );
      if (res.status === 422) return; // Don't request anymore as github will never return anything

      if (res.status === 200) {
        const events = await res.json();
        page.append.apply(
          page,
          events.map((e) => {
            const c = document.createElement("a");
            c.title = new Date(e.created_at).toLocaleString();
            c.href = `https://github.com/${e.repo.name}`;
            switch (e.type) {
              case "CreateEvent":
                c.innerText = `Created ${e.payload.ref_type} ${
                  e.payload.ref || ""
                } ➔ ${e.repo.name}`;
                break;
              case "DeleteEvent":
                c.innerText = `Deleted ${e.payload.ref_type} ${
                  e.payload.ref || ""
                } ➔ ${e.repo.name}`;
                break;
              case "ForkEvent":
                c.innerText = `${e.repo.name} ⑂ ${e.payload.forkee.full_name}`;
                c.href = e.payload.forkee.html_url;
                break;
              case "IssueCommentEvent":
                c.innerText = `Commented on #${e.payload.issue.number} ➔ ${e.repo.name}`;
                c.href = e.payload.comment.html_url;
                break;
              case "IssuesEvent":
                c.innerText = `${e.payload.action
                  .charAt(0)
                  .toUpperCase()}${e.payload.action.substring(1)} #${
                  e.payload.issue.number
                } ➔ ${e.repo.name}`;
                c.href = e.payload.issue.html_url;
                break;
              case "PullRequestEvent":
                c.innerText = `${e.payload.action
                  .charAt(0)
                  .toUpperCase()}${e.payload.action.substring(1)} PR#${
                  e.payload.number
                } ➔ ${e.repo.name}`;
                c.href = e.payload.pull_request.html_url;
                break;
              case "PushEvent":
                c.innerText = `Pushed ${e.payload.distinct_size} commits ➔ ${e.repo.name}`;
                break;
              case "ReleaseEvent":
                c.innerText = `Released ${e.payload.release.name} ➔ ${e.repo.name}`;
                c.href = e.payload.release.html_url;
                break;
              case "WatchEvent":
                c.innerText = `${e.payload.action
                  .charAt(0)
                  .toUpperCase()}${e.payload.action.substring(1)} 👀 ${
                  e.repo.name
                }`;
                break;
              default:
                c.innerText = `${e.type} ➔ ${e.repo.name}`;
                break;
            }
            return c;
          })
        );
        page.setAttribute("data-api-page", currentPage + 1);
      }
      page.removeAttribute("data-api-loading");
    },
    PAGES: {
      "/": null,
      "/projects/": (url) => {
        let filters = [];
        if (url !== undefined && url.hash.length > 1) {
          filters.push(url.hash.substring(1));
        }
        projectFilterUpdate(filters);
      },
      "/activity/": async () => {
        const page = document.querySelector(".page-activity");
        if (page.childElementCount > 1) return;

        loadActivityPage().then(null, console.error);
      },
      "/contact/": null,
    },
  });

  const _GA = Object.defineProperties(
    {},
    {
      TRACKING_ID: {
        configurable: false,
        writable: false,
        value: "UA-98384710-12",
      },
      TRACKING_SCRIPT: {
        configurable: false,
        get: function () {
          return `https://www.googletagmanager.com/gtag/js?id=${_GA.TRACKING_ID}`;
        },
      },
      TRACKING_CONSENT_KEY: {
        configurable: false,
        writable: false,
        value: "_GA_CONSENT",
      },
    }
  );

  function checkGoogleAnalytics() {
    return new Promise((resolve) => {
      fetch(_GA.TRACKING_SCRIPT, { method: "HEAD", mode: "no-cors" })
        .then(() => {
          resolve(true);
        })
        .catch(() => {
          resolve(false);
        });
    });
  }

  function checkGoogleAnalyticsConsent() {
    return new Promise((resolve) => {
      try {
        if (localStorage) {
          const consent = localStorage.getItem(_GA.TRACKING_CONSENT_KEY);
          if (consent === "true") {
            return resolve(true);
          } else if (consent !== null) {
            return resolve(false);
          }
        }
        console.log("Showing GA consent dialog");
        /* Show consent dialog */
        const dialog = createElement("dialog", { class: "dialog" });
        dialog.appendChild(
          createElement(
            "p",
            { class: "dialog-text" },
            "Would you like to load Google Analytics?"
          )
        );
        const accept = createElement(
          "button",
          { class: "dialog-button dialog-accept" },
          "Yes"
        );
        const decline = createElement(
          "button",
          { class: "dialog-button dialog-decline" },
          "No"
        );

        accept.addEventListener(
          "click",
          () => {
            localStorage.setItem(_GA.TRACKING_CONSENT_KEY, "true");
            dialog.remove();
            resolve(true);
          },
          { once: true }
        );
        decline.addEventListener(
          "click",
          () => {
            localStorage.setItem(_GA.TRACKING_CONSENT_KEY, "false");
            dialog.remove();
            resolve(false);
          },
          { once: true }
        );

        dialog.appendChild(accept);
        dialog.appendChild(decline);
        document.body.appendChild(dialog);
      } catch (e) {
        console.error(e);
      }
    });
  }

  async function loadGoogleAnalytics() {
    console.log(`Attempting to load google analytics for ${_GA.TRACKING_ID}`);
    if (await checkGoogleAnalytics()) {
      /* Check for user consent */
      if (!(await checkGoogleAnalyticsConsent())) return;
      /* Load google analytics */
      const script = createElement("script", {
        async: "",
        src: _GA.TRACKING_SCRIPT,
      });
      document.head.appendChild(script);
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag("js", new Date());
      gtag("config", _GA.TRACKING_ID);
      console.log("Loaded google analytics");
    } else {
      console.log("User-Agent blocks google analytics");
    }
  }

  window.addEventListener(
    "click",
    function (e) {
      if (e.target.tagName === "A") {
        const dest = new URL(e.target.href, window.location);
        if (
          dest.host !== window.location.host ||
          dest.pathname.startsWith("/content/")
        )
          return;
        e.preventDefault();
        switch (dest.hash) {
          case "#images":
            window.displayImages(e.target.project);
            break;
          default:
            window.displayPage(dest.pathname, dest);
            break;
        }
      } else if (e.target.tagName === "BUTTON") {
        if (document.querySelector(".gallery").hasAttribute("data-selected")) {
          if (e.target.classList.contains("gallery-arrow-left")) {
            window.selectImage(-1);
          } else if (e.target.classList.contains("gallery-arrow-right")) {
            window.selectImage(1);
          }
          return;
        }
        if (e.target.classList.contains("light-mode-button")) {
          return window.toggleLightMode();
        } else if (e.target.classList.contains("project-tag")) {
          return window.projectFilterToggle(e.target.getAttribute("data-tag"));
        }
      } else if (e.target.classList.contains("gallery")) {
        if (e.target.hasAttribute("data-selected")) {
          window.closeImages();
        }
      }
    },
    { capture: true, passive: false }
  );

  window.addEventListener(
    "load",
    function () {
      window.displayPage(window.location.pathname, window.location);
      initBackground(document.querySelector("canvas#dynamic-background"));
      loadGoogleAnalytics().then(null, console.error);
    },
    { once: true }
  );

  window.addEventListener("resize", function () {
    const el = document.querySelector("canvas#dynamic-background");
    el.width = window.innerWidth;
    el.height = window.innerHeight;
  });

  let dragEvent = undefined;

  window.addEventListener("touchstart", function (e) {
    const keys = Object.keys(window.PAGES);
    const page = document.body.getAttribute("data-page");
    const i = keys.indexOf(page);
    if (e.touches.length > 0) {
      dragEvent = {
        identifier: e.touches[0].identifier,
        x: e.touches[0].clientX,
        min: window.innerWidth * 0.05,
        move: window.innerWidth * 0.35,
        page: document.querySelector(`.page[data-page="${page}"]`),
        pageIndex: i,
        pages: keys,
        right:
          i < keys.length - 1
            ? document.querySelector(`.page[data-page="${keys[i + 1]}"]`)
            : undefined,
        left:
          i > 0
            ? document.querySelector(`.page[data-page="${keys[i - 1]}"]`)
            : undefined,
        goingRight: true,
        goingLeft: true,
      };
    }
  });

  window.addEventListener("touchmove", function (e) {
    if (dragEvent === undefined) return;
    for (let touch of e.changedTouches) {
      if (dragEvent.identifier === touch.identifier) {
        const d = touch.clientX - dragEvent.x;

        if (Math.abs(d) >= dragEvent.min) {
          const percent = Math.max(
            Math.min(
              (dragEvent.move / (Math.abs(d) - dragEvent.min)) * 100,
              100
            ),
            0
          );
          if (d < 0 && dragEvent.right && dragEvent.goingRight) {
            dragEvent.goingLeft = false;
            dragEvent.page.style.transform = `translateX(-${percent}vw)`;
            dragEvent.right.style.transform = `translateX(${100 - percent}vw) `;
            dragEvent.right.style.opacity = "1";
          } else if (d > 0 && dragEvent.left && dragEvent.goingLeft) {
            dragEvent.goingRight = false;
            dragEvent.page.style.transform = `translateX(${percent}vw)`;
            dragEvent.left.style.transform = `translateX(${percent - 100}vw)`;
            dragEvent.left.style.opacity = "1";
          }
        }
      }
    }
  });

  window.addEventListener("touchend", function (e) {
    for (let touch of e.changedTouches) {
      if (dragEvent.identifier === touch.identifier) {
        const d = touch.clientX - dragEvent.x;
        dragEvent.page.style.transform = "";
        if (dragEvent.left) {
          dragEvent.left.style.transform = "";
          dragEvent.left.style.opacity = "";
        }
        if (dragEvent.right) {
          dragEvent.right.style.transform = "";
          dragEvent.right.style.opacity = "";
        }
        if (Math.abs(d) >= dragEvent.move) {
          if (d < 0 && dragEvent.right && dragEvent.goingRight) {
            window.displayPage(dragEvent.pages[dragEvent.pageIndex + 1]);
          } else if (d > 0 && dragEvent.left && dragEvent.goingLeft) {
            window.displayPage(dragEvent.pages[dragEvent.pageIndex - 1]);
          }
        }
        dragEvent = undefined;
      }
    }
  });

  window.addEventListener("touchcancel", function (e) {
    for (let touch of e.touches) {
      if (dragEvent.identifier === touch.identifier) {
        dragEvent.page.style.transform = "";
        if (dragEvent.left) {
          dragEvent.left.style.transform = "";
          dragEvent.left.style.opacity = "";
        }
        if (dragEvent.right) {
          dragEvent.right.style.transform = "";
          dragEvent.right.style.opacity = "";
        }
        dragEvent = undefined;
      }
    }
  });

  async function jsonOrEmpty(res) {
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    return data;
  }

  async function sendFormRequest(form) {
    let url = form.getAttribute("action");
    if (url === null) return;
    const method = form.getAttribute("method") || "GET";
    const opts = {
      method: method,
      mode: "cors",
      credentials: "omit",
      cache: "no-cache",
      redirect: "manual",
    };

    if (method === "GET") {
      url = new URL(url, location.href);
      for (let i = 0; i < form.elements.length; i++) {
        const el = form.elements[i];
        if (el.name.length > 0) {
          url.searchParams.append(el.name, el.value);
        }
      }
    } else if (method === "POST") {
      const body = {};
      for (let i = 0; i < form.elements.length; i++) {
        const el = form.elements[i];
        if (el.name.length > 0) {
          body[el.name] = el.value;
        }
      }
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    } else {
      return;
    }

    const output = document.querySelector(`.form-response[form=${form.id}]`);
    output.innerText = "Sending...";

    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      console.error(e);
      const error = await jsonOrEmpty(res);
      output.innerText = `API error ${
        "message" in error ? `, ${error.message},` : ""
      }please try again later...`;
      return;
    }

    if (res.ok) return (output.innerText = "Succesfully sent message.");
    const error = await jsonOrEmpty(res);
    output.innerText = `API error${
      "message" in error ? `, ${error.message},` : ""
    } please try again later...`;
  }

  window.addEventListener("submit", function (e) {
    e.preventDefault();
    sendFormRequest(e.target).then(null, console.error);
  });

  let keyLog = [];
  const keyCheck = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  window.addEventListener("keydown", function (e) {
    if (!e.isTrusted) return;
    keyLog.push(e.keyCode);
    if (keyLog.length > keyCheck.length)
      keyLog = keyLog.slice(keyLog.length - keyCheck.length);
    if (
      keyLog.length === keyCheck.length &&
      keyLog.reduce((a, v, i) => a && keyCheck[i] === v, true)
    )
      window.location = "https://ctf.cybersoc.cf/users/10";
  });

  document.querySelector(".page-activity").addEventListener(
    "scroll",
    function (e) {
      if (e.target.scrollTop >= e.target.scrollHeight - e.target.clientHeight) {
        loadActivityPage().then(null, console.error);
      }
    },
    { passive: true }
  );

  loadProjects().then(null, console.error);
})();
