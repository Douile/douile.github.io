#!/usr/bin/env node

// Build site

// Node requirements
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// External requirements
const html_minify = require("html-minifier").minify;
const css_minify = new (require("clean-css"))({ level: 2 });
const js_minify = require("uglify-js").minify;
const svg_minify = require("svgo").optimize;
const json_minify = require("jsonminify");

const html_parser = require("node-html-parser").parse;

// Constants

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
 * Hashes of assets to use for HTML integrity
 * @type {Map<string, string>}
 */
const fileIntegrity = new Map();

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
      saveIntegrity(dest);
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
      saveIntegrity(dest);
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
      if (ent.name === "projects.json") {
        const o = fileContent;
        for (let i = 0; i < o.length; i++) {
          for (let j = 0; j < o[i].images.length; j++) {
            if (o[i].images[j].startsWith("/")) {
              o[i].images[j] = MEDIA_URL + o[i].images[j];
            }
          }
        }
        fileContent = o;
      }
      fs.writeFileSync(dest, JSON.stringify(fileContent));
      break;
    }
    default: {
      fs.copyFileSync(src, dest);
      break;
    }
  }
}

/**
 * Normalize a path into a relative path usable in HTML
 * @param {string} base The root directory of the website
 * @param {string} file The path to the file
 * @returns {string} A normalized relative path
 */
function relativePath(base, file) {
  return "/" + path.normalize(path.relative(base, file));
}

/**
 * Read a file and store its integrity in {@link fileIntegrity}
 * @param {string} file The path to the file
 */
function saveIntegrity(file) {
  const hash = crypto.createHash("sha512");
  hash.update(fs.readFileSync(file));
  fileIntegrity.set(
    relativePath(BUILD_DIR, file),
    "sha512-" + hash.digest("base64")
  );
}

copyDir(SRC_DIR, BUILD_DIR);

// STAGE 2: Update HTML integrities
console.log(`Adding script integrities (${version})`);

for (let file of htmlFiles) {
  console.log(file);
  const html = html_parser(fs.readFileSync(file, { encoding: "utf8" }));
  for (let script of html.querySelectorAll("script")) {
    const src = script.getAttribute("src");
    if (fileIntegrity.has(src)) {
      script.setAttribute("integrity", fileIntegrity.get(src));
      script.setAttribute("src", src + `?v=${version}`);
    }
  }
  for (let style of html.querySelectorAll("link[rel=stylesheet]")) {
    const href = style.getAttribute("href");
    if (fileIntegrity.has(href)) {
      style.setAttribute("integrity", fileIntegrity.get(href));
      style.setAttribute("href", href + `?v=${version}`);
    }
  }
  if (path.basename(file) === "index.html") {
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
