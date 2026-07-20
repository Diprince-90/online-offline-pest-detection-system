const modelURLBase = "./my_model/";
const apiKey = "";
const cx = "a6b73477386be4a19";

let model, maxPredictions;
let pestData = {};

const MODEL_IMAGE_SIZE = 224;
const CONFIDENCE_THRESHOLD = 0.80;
const MARGIN_THRESHOLD = 0.20;

const labelAliases = {
  "Scopula Emissaria": "Scopular Emissaria",
  "Termite odontotermes (Rambur)": "Termite odontotermes",
};

const severityRules = [
  {
    min: 0.92,
    label: "High",
    className: "severity-high",
    note: "The CNN is highly confident. Inspect the crop quickly and start control measures.",
  },
  {
    min: 0.84,
    label: "Medium",
    className: "severity-medium",
    note: "The CNN is confident. Confirm with field symptoms before treatment.",
  },
  {
    min: 0,
    label: "Low",
    className: "severity-low",
    note: "The detection is possible but should be confirmed with a clearer image.",
  },
];

// -------------------- INIT --------------------
async function init() {
  const modelURL = modelURLBase + "model.json";
  const metadataURL = modelURLBase + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  await loadPestData();

  document
    .getElementById("image-upload")
    .addEventListener("change", handleImageUpload);
}

// -------------------- LOAD OFFLINE DATA --------------------
async function loadPestData() {
  try {
    const res = await fetch("pestData.json");
    pestData = await res.json();
    console.log("Pest data loaded");
  } catch (err) {
    console.error("Failed to load pest data:", err);
  }
}

// -------------------- IMAGE HANDLER --------------------
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  resetOutput();
  updatePipeline("step-preprocess", "active");

  const imgPreview = document.getElementById("image-preview");
  imgPreview.src = URL.createObjectURL(file);
  imgPreview.style.display = "block";

  imgPreview.onload = async () => {
    const processedCanvas = preprocessImage(imgPreview);
    updatePipeline("step-preprocess", "complete");
    updatePipeline("step-model", "active");

    const predictions = await model.predict(processedCanvas);
    updatePipeline("step-model", "complete");
    updatePipeline("step-detect", "active");

    await displayPredictions(predictions, processedCanvas);
  };
}

// -------------------- IMAGE PREPROCESSING --------------------
function preprocessImage(img) {
  const canvas = document.createElement("canvas");
  canvas.width = MODEL_IMAGE_SIZE;
  canvas.height = MODEL_IMAGE_SIZE;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, MODEL_IMAGE_SIZE, MODEL_IMAGE_SIZE);

  const scale = Math.min(
    MODEL_IMAGE_SIZE / img.naturalWidth,
    MODEL_IMAGE_SIZE / img.naturalHeight
  );
  const width = img.naturalWidth * scale;
  const height = img.naturalHeight * scale;
  const x = (MODEL_IMAGE_SIZE - width) / 2;
  const y = (MODEL_IMAGE_SIZE - height) / 2;

  ctx.drawImage(img, x, y, width, height);
  return canvas;
}

// -------------------- PIPELINE STATUS --------------------
function updatePipeline(stepId, status) {
  const step = document.getElementById(stepId);
  if (!step) return;

  step.classList.remove("active", "complete");
  if (status) step.classList.add(status);
}

function resetOutput() {
  document.getElementById("predictions").innerHTML = "";
  document.getElementById("search-results").innerHTML = "";
  document.getElementById("bounding-box").style.display = "none";

  const heatmap = document.getElementById("heatmap-canvas");
  const ctx = heatmap.getContext("2d");
  heatmap.style.display = "none";
  ctx.clearRect(0, 0, heatmap.width, heatmap.height);

  document.querySelectorAll(".pipeline-step").forEach((step) => {
    step.classList.remove("active", "complete");
  });
}

// -------------------- DRAW BOX --------------------
function drawBoundingBox() {
  const boundingBox = document.getElementById("bounding-box");

  setTimeout(() => {
    const img = document.getElementById("image-preview");
    const rect = img.getBoundingClientRect();

    boundingBox.style.width = `${rect.width * 0.6}px`;
    boundingBox.style.height = `${rect.height * 0.6}px`;
    boundingBox.style.left = `${rect.width * 0.2}px`;
    boundingBox.style.top = `${rect.height * 0.2}px`;
    boundingBox.style.display = "block";
  }, 100);
}

// -------------------- FETCH PEST INFO --------------------
async function fetchPestInfo(pestName) {
  const useOnline = document.getElementById("online-toggle")?.checked;
  const normalizedPestName = normalizePestName(pestName);

  if (navigator.onLine && useOnline) {
    const query = `${normalizedPestName} pest cause symptoms prevention treatment`;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
      query
    )}&key=${apiKey}&cx=${cx}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        return {
          source: "online",
          title: data.items[0].title,
          snippet: data.items[0].snippet,
          link: data.items[0].link,
        };
      }
    } catch (err) {
      console.warn("Online API failed, using offline data");
    }
  }

  const info = pestData[normalizedPestName] || {
    cause: "Unknown",
    solution: "Unknown",
    description: "No description available",
  };

  return {
    source: "offline",
    title: normalizedPestName,
    snippet: buildOfflineSnippet(info),
    link: null,
    info,
  };
}

// -------------------- MAIN LOGIC --------------------
async function displayPredictions(predictions, processedCanvas) {
  const container = document.getElementById("predictions");
  const searchResults = document.getElementById("search-results");

  container.innerHTML = "";
  predictions.sort((a, b) => b.probability - a.probability);

  const top = predictions[0];
  const second = predictions[1];
  const gap = second ? top.probability - second.probability : top.probability;

  console.log("Predictions:", predictions);

  if (top.probability < CONFIDENCE_THRESHOLD || gap < MARGIN_THRESHOLD) {
    updatePipeline("step-detect", "complete");
    updatePipeline("step-confidence", "complete");

    container.innerHTML = `
      <div class="prediction">
        <strong>Unable to identify pest</strong><br><br>
        Best guess: ${normalizePestName(top.className)}<br>
        Confidence: ${(top.probability * 100).toFixed(2)}%<br><br>
        Please upload a clearer image of a visible pest.
      </div>
    `;

    searchResults.innerHTML = `
      <div class="result-card">
        <h3>No Reliable Match</h3>
        <p>The system could not confidently detect a pest in this image.</p>
      </div>
    `;

    return;
  }

  updatePipeline("step-detect", "complete");
  updatePipeline("step-confidence", "complete");
  updatePipeline("step-severity", "active");

  const pestInfo = await fetchPestInfo(top.className);
  const severity = analyzeSeverity(top.probability);
  const displayName = normalizePestName(top.className);

  updatePipeline("step-severity", "complete");
  updatePipeline("step-info", "active");

  const infoHTML =
    pestInfo.source === "online"
      ? `
        <br><strong>Cause, Symptoms, Prevention & Treatment:</strong><br>
        ${pestInfo.snippet}
        <br><a href="${pestInfo.link}" target="_blank">Read more</a>
      `
      : `
        <br><strong>Cause, Symptoms, Prevention & Treatment:</strong><br>
        ${pestInfo.snippet}
        <br><em>Offline data used</em>
      `;

  container.innerHTML = `
    <div class="prediction">
      <strong>${displayName}</strong>
      <div class="metric-grid">
        <div class="metric">
          <span>Confidence Score</span>
          ${(top.probability * 100).toFixed(2)}%
        </div>
        <div class="metric">
          <span>Severity Analysis</span>
          <strong class="${severity.className}">${severity.label}</strong>
        </div>
      </div>
      <p>${severity.note}</p>
      ${infoHTML}
    </div>
  `;

  if (pestInfo.source === "online") {
    searchResults.innerHTML = `
      <div class="result-card">
        <h3>${pestInfo.title}</h3>
        <p>${pestInfo.snippet}</p>
        ${pestInfo.link ? `<a href="${pestInfo.link}" target="_blank">Read more</a>` : ""}
      </div>
    `;
  } else {
    const info = pestInfo.info || {};

    searchResults.innerHTML = `
      <div class="result-card">
        <h3>${displayName}</h3>
        <p><strong>Symptoms:</strong> ${getSymptoms(info)}</p>
        <p><strong>Cause:</strong> ${info.cause || "N/A"}</p>
        <p><strong>Prevention:</strong> ${getPrevention(info)}</p>
        <p><strong>Treatment:</strong> ${getTreatment(info)}</p>
      </div>
    `;
  }

  updatePipeline("step-info", "complete");

  if (top.probability <= 0.90 && second) {
    container.innerHTML += `
      <div class="prediction">
        <strong>${normalizePestName(second.className)}</strong><br>
        Confidence: ${(second.probability * 100).toFixed(2)}%
        <br><em>Secondary suggestion</em>
      </div>
    `;
  }

  updatePipeline("step-heatmap", "active");
  await generateHeatmap(processedCanvas, top.className, top.probability);
  drawBoundingBox();
  updatePipeline("step-heatmap", "complete");
}

// -------------------- SEVERITY + PEST INFO --------------------
function normalizePestName(pestName) {
  return labelAliases[pestName] || pestName;
}

function analyzeSeverity(confidence) {
  return severityRules.find((rule) => confidence >= rule.min);
}

function buildOfflineSnippet(info) {
  return `
    <strong>Cause:</strong> ${info.cause || "N/A"}<br>
    <strong>Symptoms:</strong> ${getSymptoms(info)}<br>
    <strong>Prevention:</strong> ${getPrevention(info)}<br>
    <strong>Treatment:</strong> ${getTreatment(info)}
  `;
}

function getSymptoms(info) {
  return (
    info.symptoms ||
    info.description ||
    "Visible crop damage or pest activity on the plant."
  );
}

function getPrevention(info) {
  return (
    info.prevention ||
    "Keep the field clean, remove infested plant parts, monitor regularly, and encourage natural predators."
  );
}

function getTreatment(info) {
  return (
    info.treatment ||
    info.solution ||
    "Use recommended biological or chemical control after confirming the pest."
  );
}

// -------------------- EXPLAINABLE AI HEATMAP --------------------
async function generateHeatmap(sourceCanvas, targetClassName, originalConfidence) {
  const preview = document.getElementById("image-preview");
  const heatmap = document.getElementById("heatmap-canvas");
  const wrapperRect = preview.getBoundingClientRect();
  const gridSize = 7;
  const cellSize = MODEL_IMAGE_SIZE / gridSize;
  const scores = [];
  let maxDrop = 0;

  heatmap.width = Math.round(wrapperRect.width);
  heatmap.height = Math.round(wrapperRect.height);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const testCanvas = document.createElement("canvas");
      testCanvas.width = MODEL_IMAGE_SIZE;
      testCanvas.height = MODEL_IMAGE_SIZE;

      const ctx = testCanvas.getContext("2d");
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.fillStyle = "#d8d8d8";
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

      const prediction = await model.predict(testCanvas);
      const target = prediction.find((item) => item.className === targetClassName);
      const drop = Math.max(0, originalConfidence - (target?.probability || 0));

      scores.push({ row, col, drop });
      maxDrop = Math.max(maxDrop, drop);
    }
  }

  drawHeatmap(scores, maxDrop, gridSize, heatmap);
}

function drawHeatmap(scores, maxDrop, gridSize, heatmap) {
  const ctx = heatmap.getContext("2d");
  const cellWidth = heatmap.width / gridSize;
  const cellHeight = heatmap.height / gridSize;

  ctx.clearRect(0, 0, heatmap.width, heatmap.height);

  scores.forEach(({ row, col, drop }) => {
    const strength = maxDrop > 0 ? drop / maxDrop : 0;
    ctx.fillStyle = getHeatColor(strength);
    ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
  });

  heatmap.style.display = "block";
}

function getHeatColor(strength) {
  if (strength > 0.66) return "rgba(255, 0, 0, 0.75)";
  if (strength > 0.33) return "rgba(255, 165, 0, 0.65)";
  if (strength > 0.12) return "rgba(255, 255, 0, 0.5)";
  return "rgba(0, 128, 255, 0.15)";
}

// -------------------- START APP --------------------
init();
