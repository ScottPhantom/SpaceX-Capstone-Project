import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = path.resolve(process.cwd());
const WORKSPACE = path.resolve(ROOT, "../..");
const OUT = path.join(ROOT, "report");
const BUILD = path.join(ROOT, "deck_build");
const FINAL_DIR = path.resolve(ROOT, "../../outputs");
const REPO_URL = process.env.REPO_URL || "https://github.com/ScottPhantom/SpaceX-Capstone-Project";
const SKILL_DIR = "/Users/nguyentantai/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations";
const RUNTIME_PYTHON = "/Users/nguyentantai/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(BUILD, { recursive: true });
await fs.mkdir(FINAL_DIR, { recursive: true });

const summary = JSON.parse(await fs.readFile(path.join(ROOT, "analysis_summary.json"), "utf8"));
const C = {
  navy: "#081A2B", blue: "#17324D", orange: "#F26B38", cream: "#F7F4EE",
  white: "#FFFFFF", ink: "#102235", muted: "#5B6875", line: "#CBD5DF",
  teal: "#2A9D8F", red: "#D95D39", gold: "#E9C46A", soft: "#E8EEF3",
};

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function addShape(slide, geometry, position, fill, line = { style: "solid", fill: "none", width: 0 }) {
  return slide.shapes.add({ geometry, position, fill, line });
}

function addText(slide, text, position, style = {}) {
  const box = slide.shapes.add({
    geometry: "textbox", position, fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = { fontFamily: "Arial", fontSize: 20, color: C.ink, ...style };
  return box;
}

function addTitle(slide, title, kicker = "SPACEX CAPSTONE") {
  addText(slide, kicker, { left: 72, top: 38, width: 400, height: 24 }, { fontSize: 11, bold: true, color: C.orange, letterSpacing: 1.6 });
  addText(slide, title, { left: 72, top: 66, width: 1100, height: 52 }, { fontSize: 31, bold: true, color: C.ink });
  addShape(slide, "rect", { left: 72, top: 126, width: 54, height: 5 }, C.orange);
}

function baseSlide(title, kicker) {
  const slide = presentation.slides.add();
  slide.background.fill = C.cream;
  addTitle(slide, title, kicker);
  return slide;
}

function footer(slide, number, label = "IBM Applied Data Science Capstone") {
  addText(slide, label, { left: 72, top: 686, width: 560, height: 18 }, { fontSize: 9, color: C.muted });
  addText(slide, String(number).padStart(2, "0"), { left: 1160, top: 683, width: 48, height: 20 }, { fontSize: 10, bold: true, color: C.orange, alignment: "right" });
}

function note(slide, sources, extra = "") {
  slide.speakerNotes.text = [extra, "Sources:", ...sources.map((s) => `- ${s}`)].filter(Boolean).join("\n");
}

function bulletList(slide, items, position, opts = {}) {
  const gap = opts.gap || 66;
  items.forEach((item, i) => {
    addShape(slide, "ellipse", { left: position.left, top: position.top + i * gap + 7, width: 11, height: 11 }, opts.bulletColor || C.orange);
    addText(slide, item, { left: position.left + 28, top: position.top + i * gap, width: position.width - 28, height: gap - 5 }, { fontSize: opts.fontSize || 18, color: opts.color || C.ink, ...opts.textStyle });
  });
}

function kpi(slide, value, label, position, accent = C.orange) {
  addShape(slide, "roundRect", position, C.white, { style: "solid", fill: C.line, width: 1 });
  addShape(slide, "rect", { left: position.left, top: position.top, width: 8, height: position.height }, accent);
  addText(slide, value, { left: position.left + 30, top: position.top + 23, width: position.width - 48, height: 46 }, { fontSize: 31, bold: true, color: C.ink });
  addText(slide, label, { left: position.left + 30, top: position.top + 78, width: position.width - 48, height: 38 }, { fontSize: 13, color: C.muted });
}

function processStep(slide, n, title, body, x, y, color = C.orange) {
  addShape(slide, "ellipse", { left: x, top: y, width: 52, height: 52 }, color);
  addText(slide, String(n), { left: x, top: y + 8, width: 52, height: 34 }, { fontSize: 22, bold: true, color: C.white, alignment: "center" });
  addText(slide, title, { left: x - 34, top: y + 68, width: 120, height: 32 }, { fontSize: 16, bold: true, color: C.ink, alignment: "center" });
  addText(slide, body, { left: x - 48, top: y + 104, width: 148, height: 86 }, { fontSize: 12, color: C.muted, alignment: "center" });
}

function addRepo(slide, top = 632) {
  addText(slide, "Repository", { left: 72, top, width: 100, height: 20 }, { fontSize: 10, bold: true, color: C.orange });
  addText(slide, REPO_URL, { left: 170, top: top - 1, width: 970, height: 22 }, { fontSize: 10, color: C.blue });
}

function styleTable(table) {
  table.styleOptions = { headerRow: true, bandedRows: true };
  table.borders.assign({ style: "solid", fill: C.line, width: 1 });
  const cols = table.columns.length || 0;
  for (let c = 0; c < cols; c++) {
    table.getCell(0, c).fill = C.blue;
    table.getCell(0, c).text.style = { fontFamily: "Arial", fontSize: 13, bold: true, color: C.white };
  }
}

async function imageBytes(p) {
  const b = await fs.readFile(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

// 1 — Cover
{
  const s = presentation.slides.add();
  s.background.fill = C.navy;
  addShape(s, "rect", { left: 0, top: 0, width: 600, height: 720 }, C.navy);
  s.images.add({ blob: await imageBytes(path.join(ROOT, "assets/falcon9_launchpad.jpg")), contentType: "image/jpeg", alt: "Falcon 9 and Dragon vertical at the launch pad", fit: "cover", position: { left: 600, top: 0, width: 680, height: 720 } });
  addShape(s, "rect", { left: 560, top: 0, width: 130, height: 720 }, { color: C.navy, transparency: 35 });
  addText(s, "DATA SCIENCE CAPSTONE", { left: 72, top: 82, width: 420, height: 30 }, { fontSize: 13, bold: true, color: C.orange, letterSpacing: 2 });
  addText(s, "Predicting Falcon 9\nfirst-stage landings", { left: 72, top: 152, width: 470, height: 170 }, { fontSize: 43, bold: true, color: C.white });
  addText(s, "From launch records to an interpretable machine-learning comparison", { left: 72, top: 350, width: 430, height: 86 }, { fontSize: 19, color: "#D9E3EA" });
  addShape(s, "rect", { left: 72, top: 480, width: 80, height: 6 }, C.orange);
  addText(s, "IBM Applied Data Science Capstone", { left: 72, top: 512, width: 400, height: 32 }, { fontSize: 16, color: C.white });
  note(s, ["NASA Images, KSC-20260927-PH-SPX01_0004 — public domain dedication: https://images.nasa.gov/details/KSC-20260927-PH-SPX01_0004", "IBM Skills Network assignment rubric: https://mark.skills.network/learner/2977?lang=en"]);
}

// 2 — Executive summary
{
  const s = baseSlide("Executive summary");
  kpi(s, "90", "Falcon 9 launches in the 2010–2020 IBM snapshot", { left: 72, top: 176, width: 340, height: 132 });
  kpi(s, "66.7%", "Overall successful first-stage landing rate", { left: 442, top: 176, width: 340, height: 132 }, C.teal);
  kpi(s, "83.3%", "Best observed test accuracy on 18 held-out rows", { left: 812, top: 176, width: 340, height: 132 }, C.gold);
  bulletList(s, [
    "Methods: API + web scraping → wrangling → EDA/SQL → Folium/Dash → classification.",
    "Result: landing performance improved strongly over time; KSC LC‑39A led sites at 77.3%.",
    "Model result: KNN, SVM, and logistic regression tied on test accuracy; KNN won the CV tie-break.",
  ], { left: 92, top: 374, width: 1040, height: 210 }, { gap: 62, fontSize: 17 });
  footer(s, 2);
  note(s, ["IBM Skills Network course datasets; analysis_summary.json generated by this project"]);
}

// 3 — Introduction
{
  const s = baseSlide("Why predict a first-stage landing?", "INTRODUCTION");
  addText(s, "Reusable boosters can change launch economics — but only when the first stage returns safely.", { left: 72, top: 170, width: 650, height: 92 }, { fontSize: 27, bold: true, color: C.blue });
  addShape(s, "roundRect", { left: 760, top: 168, width: 392, height: 314 }, C.navy);
  addText(s, "Research question", { left: 804, top: 210, width: 300, height: 30 }, { fontSize: 14, bold: true, color: C.orange });
  addText(s, "Can historical mission, payload, launch-site, orbit, and booster information predict a successful Falcon 9 first-stage landing?", { left: 804, top: 262, width: 302, height: 176 }, { fontSize: 24, bold: true, color: C.white });
  bulletList(s, ["Target: Class = 1 for a successful landing", "Scope: 90 launches from June 2010 to November 2020", "Goal: interpretable comparison, not operational certification"], { left: 92, top: 332, width: 590, height: 220 }, { gap: 70, fontSize: 17 });
  footer(s, 3);
  note(s, ["IBM Skills Network Applied Data Science Capstone datasets"]);
}

// 4 — Methods overview
{
  const s = baseSlide("End-to-end methodology", "METHODS");
  const xs = [100, 300, 500, 700, 900, 1100];
  const titles = ["Collect", "Wrangle", "Explore", "Query", "Interact", "Predict"];
  const bodies = ["API + Wikipedia", "Target + features", "Charts + trends", "SQLite questions", "Folium + Dash", "4 classifiers"];
  xs.forEach((x, i) => { if (i < xs.length - 1) addShape(s, "rect", { left: x + 54, top: 250, width: 142, height: 4 }, C.line); processStep(s, i + 1, titles[i], bodies[i], x, 224, i === 5 ? C.teal : C.orange); });
  addText(s, "The same frozen course snapshot feeds every analysis layer, allowing figures, queries, maps, dashboard views, and model results to remain consistent.", { left: 180, top: 494, width: 920, height: 86 }, { fontSize: 20, color: C.blue, alignment: "center" });
  addRepo(s);
  footer(s, 4);
  note(s, ["Project README and executed notebook in the repository"]);
}

// 5 — API collection
{
  const s = baseSlide("Data collection — SpaceX API", "DATA COLLECTION");
  processStep(s, 1, "Request", "GET past launches", 150, 198);
  processStep(s, 2, "Normalize", "Flatten nested JSON", 430, 198, C.teal);
  processStep(s, 3, "Enrich", "Rocket, pad, payload, core", 710, 198, C.gold);
  processStep(s, 4, "Filter", "Falcon 9, cutoff date", 990, 198, C.orange);
  addShape(s, "roundRect", { left: 142, top: 468, width: 996, height: 106 }, C.white, { style: "solid", fill: C.line, width: 1 });
  addText(s, "Key fields", { left: 178, top: 492, width: 110, height: 26 }, { fontSize: 13, bold: true, color: C.orange });
  addText(s, "flight number · date · booster · payload mass · orbit · launch site · landing outcome", { left: 304, top: 489, width: 790, height: 42 }, { fontSize: 19, bold: true, color: C.blue });
  addRepo(s, 615);
  footer(s, 5);
  note(s, ["SpaceX API v4 past launches: https://api.spacexdata.com/v4/launches/past", `${REPO_URL}/blob/main/src/data_collection.py`]);
}

// 6 — Web scraping
{
  const s = baseSlide("Data collection — web scraping", "DATA COLLECTION");
  addText(s, "Wikipedia launch tables provide a flat, human-readable cross-check for mission metadata.", { left: 72, top: 170, width: 1040, height: 52 }, { fontSize: 24, bold: true, color: C.blue });
  const labels = [["1", "Read HTML tables"], ["2", "Detect Flight No. columns"], ["3", "Concatenate launch rows"], ["4", "Export reproducible CSV"]];
  labels.forEach((d, i) => {
    const x = 92 + i * 285;
    addShape(s, "roundRect", { left: x, top: 276, width: 235, height: 172 }, C.white, { style: "solid", fill: C.line, width: 1 });
    addText(s, d[0], { left: x + 22, top: 298, width: 46, height: 46 }, { fontSize: 29, bold: true, color: C.orange });
    addText(s, d[1], { left: x + 24, top: 360, width: 190, height: 58 }, { fontSize: 18, bold: true, color: C.ink });
  });
  addText(s, "Implementation: pandas.read_html() with an explicit table-selection guard.", { left: 92, top: 506, width: 1000, height: 44 }, { fontSize: 17, color: C.muted });
  addRepo(s, 615);
  footer(s, 6);
  note(s, ["Wikipedia: https://en.wikipedia.org/wiki/List_of_Falcon_9_and_Falcon_Heavy_launches", `${REPO_URL}/blob/main/src/data_collection.py`]);
}

// 7 — Wrangling
{
  const s = baseSlide("Data wrangling and feature engineering", "DATA WRANGLING");
  bulletList(s, [
    "Standardize dates and numeric payload mass; impute missing payload mass with the sample mean.",
    "Map landing outcomes into Class: 1 = successful landing, 0 = unsuccessful landing.",
    "One-hot encode launch site, orbit, booster serial, grid fins, legs, and reuse indicators.",
    "Verify the 83-column model matrix contains no missing values before training.",
  ], { left: 88, top: 178, width: 710, height: 360 }, { gap: 82, fontSize: 18 });
  addShape(s, "roundRect", { left: 850, top: 182, width: 300, height: 310 }, C.navy);
  addText(s, "90", { left: 900, top: 218, width: 200, height: 58 }, { fontSize: 47, bold: true, color: C.white, alignment: "center" });
  addText(s, "rows retained", { left: 900, top: 278, width: 200, height: 30 }, { fontSize: 15, color: "#D9E3EA", alignment: "center" });
  addText(s, "83", { left: 900, top: 340, width: 200, height: 58 }, { fontSize: 47, bold: true, color: C.orange, alignment: "center" });
  addText(s, "encoded features", { left: 900, top: 400, width: 200, height: 30 }, { fontSize: 15, color: "#D9E3EA", alignment: "center" });
  addRepo(s, 615);
  footer(s, 7);
  note(s, ["IBM Skills Network dataset_part_1.csv, dataset_part_2.csv, dataset_part_3.csv", `${REPO_URL}/blob/main/notebooks/SpaceX_Capstone_Analysis.ipynb`]);
}

// 8 — EDA viz methodology
{
  const s = baseSlide("EDA with visualization", "METHODOLOGY");
  addText(s, "Each chart answers a specific operational question.", { left: 72, top: 166, width: 800, height: 46 }, { fontSize: 24, bold: true, color: C.blue });
  const rows = [
    ["Site success bar", "Which launch site has the strongest observed landing rate?"],
    ["Payload scatter", "How do payload mass and site relate to landing outcome?"],
    ["Yearly trend", "Did landing performance improve over time?"],
    ["Orbit summary", "Which mission profiles show stronger or weaker outcomes?"],
  ];
  rows.forEach((r, i) => {
    const y = 246 + i * 82;
    addText(s, r[0], { left: 96, top: y, width: 220, height: 34 }, { fontSize: 17, bold: true, color: C.orange });
    addText(s, r[1], { left: 332, top: y, width: 800, height: 42 }, { fontSize: 17, color: C.ink });
    addShape(s, "rect", { left: 96, top: y + 52, width: 1036, height: 1 }, C.line);
  });
  addRepo(s, 615);
  footer(s, 8);
  note(s, [`${REPO_URL}/blob/main/notebooks/SpaceX_Capstone_Analysis.ipynb`]);
}

// 9 — SQL methodology
{
  const s = baseSlide("EDA with SQL", "METHODOLOGY");
  addText(s, "A SQLite copy of the 101-row lab table supports transparent, repeatable questions.", { left: 72, top: 166, width: 1050, height: 56 }, { fontSize: 24, bold: true, color: C.blue });
  processStep(s, 1, "Load", "CSV → SPACEXTBL", 160, 264);
  processStep(s, 2, "Filter", "LIKE, BETWEEN, dates", 420, 264, C.teal);
  processStep(s, 3, "Aggregate", "COUNT, SUM, MIN, MAX", 680, 264, C.gold);
  processStep(s, 4, "Rank", "GROUP BY + ORDER BY", 940, 264, C.orange);
  addText(s, "Questions cover sites, NASA CRS payload, successful landings, maximum payload boosters, failure timing, and launch-site rankings.", { left: 168, top: 510, width: 920, height: 66 }, { fontSize: 17, color: C.muted, alignment: "center" });
  addRepo(s, 615);
  footer(s, 9);
  note(s, ["IBM Skills Network Spacex.csv", `${REPO_URL}/blob/main/notebooks/SpaceX_Capstone_Analysis.ipynb`]);
}

// 10 — Interactive methodology
{
  const s = baseSlide("Interactive visual analytics", "METHODOLOGY");
  addShape(s, "roundRect", { left: 92, top: 182, width: 510, height: 350 }, C.white, { style: "solid", fill: C.line, width: 1 });
  addText(s, "FOLIUM", { left: 132, top: 218, width: 160, height: 32 }, { fontSize: 15, bold: true, color: C.orange });
  addText(s, "Geospatial questions", { left: 132, top: 265, width: 360, height: 38 }, { fontSize: 25, bold: true, color: C.blue });
  bulletList(s, ["Where are the launch sites?", "Which records succeeded or failed?", "How close are sites to infrastructure?"], { left: 142, top: 336, width: 400, height: 150 }, { gap: 53, fontSize: 15 });
  addShape(s, "roundRect", { left: 650, top: 182, width: 510, height: 350 }, C.navy);
  addText(s, "PLOTLY DASH", { left: 690, top: 218, width: 200, height: 32 }, { fontSize: 15, bold: true, color: C.orange });
  addText(s, "Interactive filtering", { left: 690, top: 265, width: 360, height: 38 }, { fontSize: 25, bold: true, color: C.white });
  bulletList(s, ["Select one site or all sites", "Filter payload mass range", "Update pie and scatter views together"], { left: 700, top: 336, width: 400, height: 150 }, { gap: 53, fontSize: 15, color: C.white, bulletColor: C.teal });
  addRepo(s, 615);
  footer(s, 10);
  note(s, [`${REPO_URL}/tree/main/figures`, `${REPO_URL}/blob/main/app/spacex_dash_app.py`]);
}

// 11 — Site success chart
{
  const s = baseSlide("KSC LC‑39A leads observed site success", "EDA RESULTS");
  const data = summary.site_success.slice().reverse();
  s.charts.add("bar", {
    position: { left: 82, top: 174, width: 760, height: 420 },
    title: "Successful first-stage landings by launch site",
    titleTextStyle: { fontSize: 17, bold: true, color: C.ink },
    categories: data.map((d) => d.LaunchSite),
    series: [{ name: "Success rate (%)", values: data.map((d) => d.success_rate), fill: C.orange }],
    hasLegend: false,
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 60 },
    dataLabels: { showValue: true, position: "outEnd", textStyle: { fontSize: 12 } },
    xAxis: { min: 0, max: 100, majorUnit: 20, title: "Success rate (%)", majorGridlines: { style: "solid", fill: C.line, width: 1 } },
  });
  kpi(s, "77.3%", "KSC LC‑39A · 22 launches", { left: 890, top: 214, width: 280, height: 138 }, C.teal);
  kpi(s, "60.0%", "CCAFS SLC‑40 · 55 launches", { left: 890, top: 382, width: 280, height: 138 }, C.orange);
  addText(s, "Site is informative, but sample sizes differ.", { left: 900, top: 548, width: 260, height: 45 }, { fontSize: 14, color: C.muted, alignment: "center" });
  footer(s, 11);
  note(s, ["IBM Skills Network dataset_part_2.csv; group-by results generated by analysis_pipeline.py"]);
}

// 12 — Payload scatter
{
  const s = baseSlide("Payload mass alone does not determine landing outcome", "EDA RESULTS");
  const success = summary.payload_scatter.filter((d) => d.Class === 1);
  const fail = summary.payload_scatter.filter((d) => d.Class === 0);
  s.charts.add("scatter", {
    position: { left: 78, top: 166, width: 850, height: 440 },
    title: "Payload mass versus landing class",
    titleTextStyle: { fontSize: 17, bold: true, color: C.ink },
    series: [
      { name: "Successful landing", xValues: success.map((d) => d.PayloadMass), values: success.map(() => 1), fill: C.teal, marker: { symbol: "circle", size: 8, fill: C.teal } },
      { name: "Unsuccessful landing", xValues: fail.map((d) => d.PayloadMass), values: fail.map(() => 0), fill: C.red, marker: { symbol: "diamond", size: 8, fill: C.red } },
    ],
    hasLegend: true,
    legend: { position: "bottom" },
    scatterOptions: { style: "marker" },
    xAxis: { title: "Payload mass (kg)", majorGridlines: { style: "solid", fill: C.line, width: 1 } },
    yAxis: { title: "Landing class", min: -0.15, max: 1.15, majorUnit: 1 },
  });
  bulletList(s, ["Successes span light and heavy payloads.", "High-mass VLEO launches are mostly successful.", "Mission era, orbit, and site add context."], { left: 970, top: 228, width: 245, height: 270 }, { gap: 78, fontSize: 15 });
  footer(s, 12);
  note(s, ["IBM Skills Network dataset_part_2.csv"]);
}

// 13 — Yearly + orbit
{
  const s = baseSlide("Landing performance improved over time", "EDA RESULTS");
  s.charts.add("line", {
    position: { left: 76, top: 166, width: 720, height: 430 },
    title: "Annual success rate",
    titleTextStyle: { fontSize: 17, bold: true, color: C.ink },
    categories: summary.year_success.map((d) => String(d.Year)),
    series: [{ name: "Success rate (%)", values: summary.year_success.map((d) => d.success_rate), line: { fill: C.orange, width: 3 }, marker: { symbol: "circle", size: 8, fill: C.orange } }],
    hasLegend: false,
    yAxis: { min: 0, max: 100, majorUnit: 20, title: "Success rate (%)", majorGridlines: { style: "solid", fill: C.line, width: 1 } },
  });
  addText(s, "Orbit profile", { left: 850, top: 178, width: 300, height: 32 }, { fontSize: 18, bold: true, color: C.blue });
  const orbits = summary.orbit_success.filter((d) => d.launches >= 5).slice(0, 6);
  const table = s.tables.add({ rows: orbits.length + 1, columns: 3, left: 842, top: 226, width: 350, height: 298, values: [["Orbit", "Launches", "Success"], ...orbits.map((d) => [d.Orbit, d.launches, `${d.success_rate.toFixed(1)}%`])] });
  styleTable(table);
  addText(s, "2019 peaked at 90.0%; 2020 remained high at 84.2%.", { left: 850, top: 548, width: 340, height: 54 }, { fontSize: 15, color: C.muted });
  footer(s, 13);
  note(s, ["IBM Skills Network dataset_part_2.csv"]);
}

// 14 — SQL results I
{
  const s = baseSlide("SQL results — sites, payloads, and outcomes", "SQL RESULTS");
  const values = [
    ["Question", "Result"],
    ["Distinct launch sites", "4"],
    ["NASA CRS payload mass", "48,213 kg"],
    ["First successful ground-pad landing", "2015-12-22"],
    ["Mission outcomes marked Success", "98 of 101"],
    ["2015 drone-ship failures", "2"],
  ];
  const table = s.tables.add({ rows: values.length, columns: 2, left: 92, top: 178, width: 760, height: 390, values, columnWidths: [500, 260] });
  styleTable(table);
  addShape(s, "roundRect", { left: 910, top: 192, width: 255, height: 280 }, C.navy);
  addText(s, "4", { left: 960, top: 235, width: 155, height: 72 }, { fontSize: 54, bold: true, color: C.orange, alignment: "center" });
  addText(s, "successful drone-ship landings with payloads between 4,000 and 6,000 kg", { left: 944, top: 326, width: 188, height: 110 }, { fontSize: 17, color: C.white, alignment: "center" });
  addText(s, "JCSAT‑14 · JCSAT‑16 · SES‑10 · SES‑11/EchoStar 105", { left: 906, top: 500, width: 264, height: 70 }, { fontSize: 13, color: C.muted, alignment: "center" });
  footer(s, 14);
  note(s, ["IBM Skills Network Spacex.csv; SQL queries in executed notebook"]);
}

// 15 — SQL ranking
{
  const s = baseSlide("SQL results — launch-site ranking", "SQL RESULTS");
  const ranks = summary.sql.site_ranking;
  s.charts.add("bar", {
    position: { left: 84, top: 174, width: 720, height: 420 },
    title: "Launches by site in the SQL table",
    titleTextStyle: { fontSize: 17, bold: true, color: C.ink },
    categories: ranks.map((d) => d.Launch_Site),
    series: [{ name: "Launches", values: ranks.map((d) => d.launches), fill: C.teal }],
    hasLegend: false,
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 60 },
    dataLabels: { showValue: true, position: "outEnd" },
    xAxis: { min: 0, max: 40, majorUnit: 10, majorGridlines: { style: "solid", fill: C.line, width: 1 } },
  });
  bulletList(s, ["CCAFS SLC‑40 ranks first with 34 launches.", "Twelve boosters share the maximum payload mass of 15,600 kg.", "SQL answers are generated from the included 101-row table."], { left: 880, top: 230, width: 300, height: 280 }, { gap: 86, fontSize: 15 });
  footer(s, 15);
  note(s, ["IBM Skills Network Spacex.csv; SQL queries in executed notebook"]);
}

// 16 — Folium sites
{
  const s = baseSlide("Folium — launch-site markers", "INTERACTIVE ANALYTICS");
  s.images.add({ blob: await imageBytes(path.join(ROOT, "figures/map_launch_sites.png")), contentType: "image/png", alt: "Map of United States with launch-site markers in Florida and California", fit: "contain", position: { left: 72, top: 158, width: 820, height: 480 } });
  bulletList(s, ["Three Florida pads cluster around Cape Canaveral / Kennedy Space Center.", "VAFB SLC‑4E is on the California coast.", "Marker popups retain site name and coordinates."], { left: 935, top: 222, width: 260, height: 270 }, { gap: 82, fontSize: 15 });
  footer(s, 16);
  note(s, ["IBM Skills Network spacex_launch_geo.csv", "OpenStreetMap contributors: https://www.openstreetmap.org/copyright"]);
}

// 17 — Folium records
{
  const s = baseSlide("Folium — launch records and outcomes", "INTERACTIVE ANALYTICS");
  s.images.add({ blob: await imageBytes(path.join(ROOT, "figures/map_launch_records.png")), contentType: "image/png", alt: "Clustered launch records showing Florida and California counts", fit: "contain", position: { left: 72, top: 158, width: 820, height: 480 } });
  kpi(s, "46", "mapped launch records clustered in Florida", { left: 930, top: 218, width: 250, height: 132 }, C.orange);
  kpi(s, "10", "mapped launch records clustered in California", { left: 930, top: 382, width: 250, height: 132 }, C.teal);
  footer(s, 17);
  note(s, ["IBM Skills Network spacex_launch_geo.csv", "OpenStreetMap contributors: https://www.openstreetmap.org/copyright"]);
}

// 18 — Folium proximity
{
  const s = baseSlide("Folium — proximity to infrastructure", "INTERACTIVE ANALYTICS");
  s.images.add({ blob: await imageBytes(path.join(ROOT, "figures/map_proximity.png")), contentType: "image/png", alt: "Detailed Florida map with distance lines from a launch site to coastline, railway, roadway, and Titusville", fit: "contain", position: { left: 72, top: 158, width: 800, height: 480 } });
  const prox = summary.proximities;
  prox.forEach((d, i) => {
    addText(s, `${d.distance_km.toFixed(1)} km`, { left: 925, top: 190 + i * 94, width: 180, height: 36 }, { fontSize: 24, bold: true, color: i === 1 ? C.teal : C.orange });
    addText(s, d.feature, { left: 925, top: 230 + i * 94, width: 220, height: 30 }, { fontSize: 14, color: C.muted });
  });
  addText(s, "Nearby rail and road access support logistics; coastal siting also separates launch trajectories from populated areas.", { left: 900, top: 568, width: 280, height: 60 }, { fontSize: 13, color: C.blue });
  footer(s, 18);
  note(s, ["Distances computed with the haversine formula from IBM Skills Network geospatial coordinates", "OpenStreetMap contributors: https://www.openstreetmap.org/copyright"]);
}

// 19 — Dash pie
{
  const s = baseSlide("Dash — success share by site", "INTERACTIVE ANALYTICS");
  s.charts.add("doughnut", {
    position: { left: 110, top: 168, width: 580, height: 430 },
    title: "All-site landing outcomes",
    titleTextStyle: { fontSize: 17, bold: true, color: C.ink },
    categories: ["Successful", "Unsuccessful"],
    series: [{ name: "Launches", values: [60, 30], points: [{ idx: 0, fill: C.teal }, { idx: 1, fill: C.red }] }],
    hasLegend: true,
    legend: { position: "bottom" },
    doughnutOptions: { holeSize: 56 },
    dataLabels: { showValue: true, showPercent: true, position: "bestFit" },
  });
  addText(s, "Dashboard controls", { left: 770, top: 202, width: 330, height: 38 }, { fontSize: 22, bold: true, color: C.blue });
  bulletList(s, ["Site dropdown: all or one launch site", "Payload range: minimum to maximum mass", "Pie and scatter update from the same filter"], { left: 780, top: 282, width: 340, height: 250 }, { gap: 82, fontSize: 16 });
  addRepo(s, 615);
  footer(s, 19);
  note(s, ["IBM Skills Network spacex_launch_dash.csv", `${REPO_URL}/blob/main/app/spacex_dash_app.py`]);
}

// 20 — Dash scatter
{
  const s = baseSlide("Dash — payload versus outcome", "INTERACTIVE ANALYTICS");
  const success = summary.payload_scatter.filter((d) => d.Class === 1);
  const fail = summary.payload_scatter.filter((d) => d.Class === 0);
  s.charts.add("scatter", {
    position: { left: 76, top: 164, width: 820, height: 440 },
    title: "Interactive payload filter view",
    titleTextStyle: { fontSize: 17, bold: true, color: C.ink },
    series: [
      { name: "Successful", xValues: success.map((d) => d.PayloadMass), values: success.map(() => 1), marker: { symbol: "circle", size: 8, fill: C.teal } },
      { name: "Unsuccessful", xValues: fail.map((d) => d.PayloadMass), values: fail.map(() => 0), marker: { symbol: "diamond", size: 8, fill: C.red } },
    ],
    hasLegend: true, legend: { position: "bottom" }, scatterOptions: { style: "marker" },
    xAxis: { title: "Payload mass (kg)", majorGridlines: { style: "solid", fill: C.line, width: 1 } },
    yAxis: { title: "Landing class", min: -0.15, max: 1.15, majorUnit: 1 },
  });
  addShape(s, "roundRect", { left: 940, top: 220, width: 230, height: 250 }, C.navy);
  addText(s, "Why interactive?", { left: 972, top: 254, width: 170, height: 35 }, { fontSize: 18, bold: true, color: C.orange, alignment: "center" });
  addText(s, "Users can isolate a site and payload band, then inspect how booster categories and outcomes change together.", { left: 970, top: 318, width: 172, height: 124 }, { fontSize: 16, color: C.white, alignment: "center" });
  footer(s, 20);
  note(s, ["IBM Skills Network spacex_launch_dash.csv", `${REPO_URL}/blob/main/app/spacex_dash_app.py`]);
}

// 21 — Modeling methodology
{
  const s = baseSlide("Predictive modeling methodology", "PREDICTIVE ANALYSIS");
  const models = [["Logistic regression", "linear baseline"], ["SVM", "nonlinear decision boundary"], ["Decision tree", "rule-based splits"], ["KNN", "local neighborhood"]];
  models.forEach((m, i) => {
    const x = 72 + i * 288;
    addShape(s, "roundRect", { left: x, top: 176, width: 250, height: 132 }, i === 3 ? C.navy : C.white, { style: "solid", fill: i === 3 ? C.navy : C.line, width: 1 });
    addText(s, m[0], { left: x + 22, top: 207, width: 206, height: 34 }, { fontSize: 17, bold: true, color: i === 3 ? C.white : C.blue, alignment: "center" });
    addText(s, m[1], { left: x + 22, top: 257, width: 206, height: 28 }, { fontSize: 13, color: i === 3 ? "#D9E3EA" : C.muted, alignment: "center" });
  });
  processStep(s, 1, "Split", "72 train / 18 test", 170, 390);
  processStep(s, 2, "Scale", "inside each pipeline", 445, 390, C.teal);
  processStep(s, 3, "Tune", "GridSearchCV", 720, 390, C.gold);
  processStep(s, 4, "Evaluate", "accuracy + precision/recall/F1", 995, 390, C.orange);
  addRepo(s, 615);
  footer(s, 21);
  note(s, ["Model evaluation generated by analysis_pipeline.py; random_state=2", `${REPO_URL}/blob/main/analysis_pipeline.py`]);
}

// 22 — Model comparison
{
  const s = baseSlide("Three models tie at 83.3% test accuracy", "PREDICTIVE ANALYSIS");
  const models = summary.model.models;
  s.charts.add("bar", {
    position: { left: 74, top: 166, width: 790, height: 440 },
    title: "Cross-validation and held-out test accuracy",
    titleTextStyle: { fontSize: 17, bold: true, color: C.ink },
    categories: models.map((m) => m.model.replace("Support vector machine", "SVM").replace("Logistic regression", "Logistic")),
    series: [
      { name: "CV accuracy (%)", values: models.map((m) => m.cv_accuracy * 100), fill: "#577590" },
      { name: "Test accuracy (%)", values: models.map((m) => m.test_accuracy * 100), fill: C.orange },
    ],
    hasLegend: true, legend: { position: "bottom" },
    barOptions: { direction: "column", grouping: "clustered", gapWidth: 70 },
    dataLabels: { showValue: true, position: "outEnd", numberFormatCode: "0.0" },
    yAxis: { min: 0, max: 100, majorUnit: 20, title: "Accuracy (%)", majorGridlines: { style: "solid", fill: C.line, width: 1 } },
  });
  addShape(s, "roundRect", { left: 910, top: 212, width: 250, height: 280 }, C.navy);
  addText(s, "Selected model", { left: 946, top: 244, width: 178, height: 28 }, { fontSize: 13, bold: true, color: C.orange, alignment: "center" });
  addText(s, "K-nearest\nneighbors", { left: 942, top: 294, width: 186, height: 80 }, { fontSize: 28, bold: true, color: C.white, alignment: "center" });
  addText(s, "Highest CV accuracy\n84.8%", { left: 950, top: 404, width: 170, height: 62 }, { fontSize: 16, color: "#D9E3EA", alignment: "center" });
  footer(s, 22);
  note(s, ["Model evaluation generated by analysis_pipeline.py; 5-fold GridSearchCV on the training split"]);
}

// 23 — Confusion matrix
{
  const s = baseSlide("Best-model confusion matrix", "PREDICTIVE ANALYSIS");
  const cm = summary.model.confusion_matrix;
  const table = s.tables.add({ rows: 3, columns: 3, left: 120, top: 190, width: 560, height: 330, values: [["Actual / Predicted", "0", "1"], ["0 — unsuccessful", cm[0][0], cm[0][1]], ["1 — successful", cm[1][0], cm[1][1]]] });
  styleTable(table);
  table.getCell(1, 1).fill = "#DDEFEA";
  table.getCell(2, 2).fill = "#DDEFEA";
  table.getCell(1, 2).fill = "#F8DFD6";
  table.getCell(2, 1).fill = "#F8DFD6";
  kpi(s, "12", "true positives", { left: 760, top: 188, width: 190, height: 130 }, C.teal);
  kpi(s, "3", "true negatives", { left: 980, top: 188, width: 190, height: 130 }, C.blue);
  kpi(s, "3", "false positives", { left: 760, top: 354, width: 190, height: 130 }, C.red);
  kpi(s, "0", "false negatives", { left: 980, top: 354, width: 190, height: 130 }, C.gold);
  addText(s, "Recall is 100%, but the model over-predicts success for half of the actual failures in this small test split.", { left: 748, top: 536, width: 430, height: 70 }, { fontSize: 16, color: C.blue, alignment: "center" });
  footer(s, 23);
  note(s, ["KNN evaluation generated by analysis_pipeline.py on an 18-row test split"]);
}

// 24 — Conclusions
{
  const s = baseSlide("Conclusions and next steps", "CONCLUSION");
  addText(s, "What the evidence supports", { left: 90, top: 170, width: 460, height: 40 }, { fontSize: 23, bold: true, color: C.blue });
  bulletList(s, ["Landing success rose materially after 2015.", "Site, orbit, and mission era carry predictive signal.", "KNN is the CV winner, not a uniquely dominant test winner."], { left: 100, top: 246, width: 470, height: 260 }, { gap: 78, fontSize: 17 });
  addShape(s, "rect", { left: 635, top: 164, width: 2, height: 390 }, C.line);
  addText(s, "What comes next", { left: 700, top: 170, width: 400, height: 40 }, { fontSize: 23, bold: true, color: C.blue });
  bulletList(s, ["Use time-aware validation to prevent era leakage.", "Refresh the dataset with newer missions and richer weather/trajectory features.", "Calibrate probabilities before any cost or risk decision."], { left: 710, top: 246, width: 450, height: 260 }, { gap: 78, fontSize: 17, bulletColor: C.teal });
  addShape(s, "roundRect", { left: 180, top: 574, width: 920, height: 66 }, C.navy);
  addText(s, REPO_URL, { left: 220, top: 594, width: 840, height: 28 }, { fontSize: 15, bold: true, color: C.white, alignment: "center" });
  footer(s, 24);
  note(s, ["All conclusions computed from the IBM Skills Network course snapshot and the executed repository analysis", REPO_URL]);
}

for (let i = 0; i < presentation.slides.items.length; i++) {
  const slide = presentation.slides.items[i];
  const png = await presentation.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(BUILD, `slide-${String(i + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
}
const montage = await presentation.export({ format: "webp", montage: true, scale: 0.35 });
await fs.writeFile(path.join(BUILD, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));

const draftPath = path.join(OUT, "SpaceX_Capstone_Presentation_draft.pptx");
await (await PresentationFile.exportPptx(presentation)).save(draftPath);

const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href);
const stagingDir = path.join(BUILD, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const finalPptx = path.join(FINAL_DIR, "SpaceX_Capstone_Presentation.pptx");
const requirements = {
  explicitTotalSlideCount: 24,
  requiredNativeTableOwnerSlides: [13, 14, 23],
  requiredNativeChartOwnerSlides: [11, 12, 13, 15, 19, 20, 22],
  materializeLiteralChartWorkbooks: true,
};
const result = await finalizePresentation({
  ...requirements,
  workspaceDir: WORKSPACE,
  candidatePath,
  finalPath: finalPptx,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit", "--require-native-table-slide", "13", "--require-native-table-slide", "14", "--require-native-table-slide", "23"],
  requiredNativeTableOwnerSlides: requirements.requiredNativeTableOwnerSlides,
  requiredNativeChartOwnerSlides: requirements.requiredNativeChartOwnerSlides,
  fontPolicy: { basis: "design", families: ["Aptos"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "SpaceX_Capstone_Presentation.validation.json"),
});
console.log(JSON.stringify({ slides: presentation.slides.items.length, draftPath, finalPptx, result }, null, 2));
