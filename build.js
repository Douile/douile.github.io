#!/usr/bin/env node

// Build site

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const html_minify = require("html-minifier").minify;
const css_minify = new (require("clean-css"))({ level: 2 });
const js_minify = require("uglify-js").minify;
const svg_minify = require("svgo").optimize;

const html_parser = require("node-html-parser").parse;

const SRC_DIR = path.join(__dirname, "src");
const BUILD_DIR = path.join(__dirname, "build");

const APP_PAGES = ["/", "/projects", "/activity", "/contact"];

const htmlFiles = [];
const fileIntegrity = new Map();

if (!fs.existsSync(SRC_DIR)) {
  console.error(`"${SRC_DIR}" does not exist`);
  process.exit(1);
}

if (fs.existsSync(BUILD_DIR)) {
  if (fs.statSync(BUILD_DIR).isDirectory()) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  } else {
    console.error(`"${BUILD_DIR}" is not a directory`);
    process.exit(1);
  }
}

console.log("Copying/minifying files...");

fs.mkdirSync(BUILD_DIR);

// Copy files
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
    default: {
      fs.copyFileSync(src, dest);
      break;
    }
  }
}

function relativePath(base, file) {
  return "/" + path.normalize(path.relative(base, file));
}

function saveIntegrity(file) {
  const hash = crypto.createHash("sha512");
  hash.update(fs.readFileSync(file));
  fileIntegrity.set(
    relativePath(BUILD_DIR, file),
    "sha512-" + hash.digest("base64")
  );
}

copyDir(SRC_DIR, BUILD_DIR);

console.log("Adding script integrities");

let version = NaN;
if (fs.existsSync(".version"))
  version = parseInt(fs.readFileSync(".version", { encoding: "utf8" })) + 1;

if (isNaN(version)) version = 1;
version = version % 100;

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
      fs.writeFileSync(
        path.join(
          dir,
          page === "/" ? "index.html" : `index_${page.substring(1)}.html`
        ),
        html.toString()
      );
    }
  } else {
    fs.writeFileSync(file, html.toString());
  }
}

fs.writeFileSync(".version", version.toString());
