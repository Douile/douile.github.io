#!/usr/bin/env node

// Build site

// Node requirements
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// External requirements
import { minify as html_minify } from "html-minifier";
import clean_css from "clean-css";
import { minify as js_minify } from "uglify-js";
import { optimize as svg_minify } from "svgo";

import { parse as html_parser } from "node-html-parser";

import YAML from "yaml";

const css_minify = new clean_css({ level: 2 });

// Internal requirements
import {
  calculateAndSaveIntegrity,
  calculateIntegrity,
  fileIntegrities,
} from "./builder/utils.mjs";
import { renderProjects } from "./builder/render.mjs";

// Constants

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directory of source files
 */
const SRC_DIR = path.join(__dirname, "../src");

/**
 * Directory for output
 */
const BUILD_DIR = path.join(__dirname, "../build");

const DOMAIN = "https://douile.com";
const APP_PAGES = ["/", "/projects/", "/activity/", "/contact/"];
const MEDIA_URL =
  "https://media.githubusercontent.com/media/Douile/douile.github.io/gh-pages";

/** Website version */
const version = execSync('git log -n 1 --format="%h"').toString().trim();

// Variables

/**
 * HTML files that need to be minified
 * @type {string[]}
 */
const htmlFiles = [];

/**
 * Pages to add to the sitemap
 * @type {{loc: string, priority: number}[]}
 */
const sitemap = [];

// STAGE 0: Checks
if (!fs.existsSync(SRC_DIR)) {
  console.error(`Source directory "${SRC_DIR}" does not exist`);
  process.exit(1);
}

if (fs.existsSync(BUILD_DIR)) {
  if (fs.statSync(BUILD_DIR).isDirectory()) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  } else {
    console.error(`Build directory "${BUILD_DIR}" is not a directory`);
    process.exit(1);
  }
}

// STAGE 1: Copy / minify files
console.log("Copying/minifying files...");

fs.mkdirSync(BUILD_DIR);

// Copy files
/**
 * Copy all the files in a directory (and process them)
 * @param {string} source Source directory
 * @param {string} dest Destination directory
 */
function copyDir(source, dest) {
  for (let ent of fs.readdirSync(source, { withFileTypes: true })) {
    if (ent.isFile()) {
      copyFile(source, dest, ent);
    } else if (ent.isDirectory()) {
      const dir = path.join(dest, ent.name);
      fs.mkdirSync(dir);
      copyDir(path.join(source, ent.name), dir);
    }
  }
}

/**
 *
 * @param {string} src Source directory
 * @param {string} dest Destination directory
 * @param {fs.Dirent} ent File entity to copy
 */
function copyFile(src, dest, ent) {
  let fileType = ent.name.match(/.+\.([^\.]+)$/);
  fileType = fileType.length > 1 ? fileType[1] : null;

  src = path.join(src, ent.name);
  dest = path.join(dest, ent.name);

  switch (fileType) {
    case "html": {
      fs.writeFileSync(
        dest,
        html_minify(fs.readFileSync(src, { encoding: "utf8" }), {
          collapseBooleanAttributes: true,
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
        })
      );
      htmlFiles.push(dest);
      break;
    }
    case "css": {
      fs.writeFileSync(
        dest,
        css_minify.minify(fs.readFileSync(src, { encoding: "utf8" })).styles
      );
      calculateAndSaveIntegrity(BUILD_DIR, dest);
      break;
    }
    case "js": {
      fs.writeFileSync(
        dest,
        js_minify(fs.readFileSync(src, { encoding: "utf8" }), {
          v8: true,
          webkit: true,
        }).code
      );
      calculateAndSaveIntegrity(BUILD_DIR, dest);
      break;
    }
    case "svg": {
      fs.writeFileSync(
        dest,
        svg_minify(fs.readFileSync(src, { encoding: "utf8" }), {
          multipass: true,
        }).data
      );
      break;
    }
    case "json": {
      let fileContent = JSON.parse(fs.readFileSync(src, { encoding: "utf8" }));
      fs.writeFileSync(dest, JSON.stringify(fileContent));
      break;
    }
    default: {
      fs.copyFileSync(src, dest);
      break;
    }
  }
}

copyDir(SRC_DIR, BUILD_DIR);

// STAGE 2: Render HTML
console.log(`Rendering HTML (${version})`);

// Render projects
const renderedProjects = renderProjects(
  YAML.parse(
    fs.readFileSync(path.join(__dirname, "../projects.yaml"), {
      encoding: "utf8",
    })
  ).map((project) => {
    for (let i = 0; i < project.images.length; i++) {
      if (project.images[i].startsWith("/")) {
        project.images[i] = MEDIA_URL + project.images[i];
      }
    }
    return project;
  })
);

// Render static HTML
for (let file of htmlFiles) {
  console.log(file);
  const html = html_parser(fs.readFileSync(file, { encoding: "utf8" }));

  // Add resource integrities
  for (let script of html.querySelectorAll("script")) {
    const src = script.getAttribute("src");
    if (fileIntegrities.has(src)) {
      script.setAttribute("integrity", fileIntegrities.get(src));
      script.setAttribute("src", src + `?v=${version}`);
    }
  }
  for (let style of html.querySelectorAll("link[rel=stylesheet]")) {
    const href = style.getAttribute("href");
    if (fileIntegrities.has(href)) {
      style.setAttribute("integrity", fileIntegrities.get(href));
      style.setAttribute("href", href + `?v=${version}`);
    }
  }

  // Index specific rendering
  if (path.basename(file) === "index.html") {
    // Add pre-rendered projects
    const projectsRoot = html.querySelector(".projects");

    if (!renderedProjects) {
      throw new Error("Projects were not rendered");
    }
    projectsRoot.firstChild.replaceWith(...renderedProjects.html);

    const css = css_minify.minify(renderedProjects.css).styles;
    fs.writeFileSync(path.join(BUILD_DIR, "src/projects.css"), css);
    const cssElem = renderedProjects.cssElem;
    cssElem.setAttribute("integrity", calculateIntegrity(css));
    html.querySelector("head").appendChild(cssElem);

    // Generate "app" pages
    const dir = path.dirname(file);
    const body = html.querySelector("body");
    for (let page of APP_PAGES) {
      body.setAttribute("data-page", page);
      let prio = 1;
      if (page === "/") {
        fs.writeFileSync(path.join(dir, "index.html"), html.toString());
      } else {
        const pagePath = path.join(dir, page.substring(1));
        fs.mkdirSync(pagePath, { recursive: true });
        fs.writeFileSync(path.join(pagePath, "index.html"), html.toString());
        prio = 0.8;
      }
      sitemap.push({ loc: DOMAIN + page, priority: prio });
    }
  } else {
    fs.writeFileSync(file, html.toString());
    sitemap.push({
      loc: DOMAIN + "/" + path.relative(BUILD_DIR, file),
      priority: 0.5,
    });
  }
}

// STAGE 3: Generate sitemap
console.log(`Generating sitemap...`);

const now = new Date().toISOString();
fs.writeFileSync(
  path.join(BUILD_DIR, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">` +
    sitemap
      .map(
        (p) =>
          `<url><loc>${p.loc}</loc><lastmod>${now}</lastmod><priority>${p.priority}</priority></url>`
      )
      .join("") +
    `</urlset>`
);
