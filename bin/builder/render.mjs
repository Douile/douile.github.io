import { HTMLElement } from "node-html-parser";

/**
 * Create a HTML element
 * @param {string} tagName
 * @param {{[key: string]: string} | undefined} attributes
 * @param {string | undefined} innerText
 * @returns {HTMLElement} Initialized element
 */
function createElement(tagName, attributes, innerText) {
  const keyAttributes = {};
  if (attributes && attributes.id) {
    keyAttributes.id = attributes.id;
  }
  if (attributes && attributes.class) {
    keyAttributes.class = attributes.class;
  }

  const el = new HTMLElement(tagName, keyAttributes);
  if (innerText !== undefined) el.set_content(innerText);
  if (attributes) {
    for (const key in attributes) {
      if (!["id", "class"].includes(key)) {
        el.setAttribute(key, attributes[key]);
      }
    }
  }
  return el;
}

/**
 * Project metadata
 * @typedef {Object} Project
 * @property {string} name Name of the project
 * @property {string} description A description of the project
 * @property {string[]} images URLs of images of the project
 * @property {{[name: string]: string}} links Named links to the project
 * @property {string[]} tags Tags of the project
 */

/**
 * Render a project element
 * @param {Project} project
 * @returns {HTMLElement}
 */
function renderProject(project) {
  const container = createElement("article", {
    class: "project project-shown",
  });
  container.appendChild(
    createElement("h1", { class: "project-title" }, project.name),
  );
  const tags = container.appendChild(
    createElement("div", { class: "project-tags" }),
  );
  for (let tag of project.tags) {
    container.classList.add(`project__${tag}`);
    tags.appendChild(
      createElement(
        "button",
        { class: `project-tag project-tag__${tag}`, "data-tag": tag },
        tag,
      ),
    );
  }
  container.appendChild(
    createElement("p", { class: "project-description" }, project.description),
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
    if (type === "images") {
      link.setAttribute("data-images", JSON.stringify(project.images));
    }
    link.appendChild(
      createElement("div", { class: "link-icon", "data-link": type }),
    );
    links.appendChild(link);
  }
  container.appendChild(links);

  return container;
}

/**
 * Generate CSS for project tag colours
 * @param {Set<string>} categories
 * @returns {string}
 */
function renderProjectCss(categories) {
  let css = "";

  const n = Math.floor(360 / categories.size);
  let i = 0;
  for (const key of categories) {
    const colour = `hsl(${n * i},100%,60%)`;

    css += `.project-tag__${key}{--color:${colour}}`;

    i += 1;
  }

  return css;
}

/**
 * Render projects HTML
 * @param {Project[]} projects
 */
export function renderProjects(projects) {
  /**
   * Categories (tags) of projects
   * @type {Set<string>}
   */
  const categories = new Set();

  const projectElements = projects.map((project) => {
    project.tags.forEach(categories.add, categories);
    return renderProject(project);
  });

  const css = renderProjectCss(categories);

  const cssElem = createElement("link", {
    rel: "stylesheet",
    href: "/src/projects.css",
    "data-role": "categories",
  });

  return { html: projectElements, css, cssElem };
}
