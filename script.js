const modelURLBase = "./my_model/";
    const apiKey = "AIzaSyBruYxVHG3TjPI1tvgehMhAI-XP0R0XLVc";
    const cx = "a6b73477386be4a19";
    let model, maxPredictions;
    let pestData = {};

    async function init() {
      const modelURL = modelURLBase + "model.json";
      const metadataURL = modelURLBase + "metadata.json";

      model = await tmImage.load(modelURL, metadataURL);
      maxPredictions = model.getTotalClasses();

      await loadPestData();

      const fileInput = document.getElementById("image-upload");
      fileInput.addEventListener("change", handleImageUpload);
    }

    async function loadPestData() {
      try {
        const res = await fetch("pestData.json");
        pestData = await res.json();
      } catch (err) {
        console.error("Failed to load pest data:", err);
      }
    }

    async function handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const imgPreview = document.getElementById("image-preview");
      imgPreview.src = window.URL.createObjectURL(file);
      imgPreview.style.display = "block";

      imgPreview.onload = async () => {
        const prediction = await model.predict(imgPreview);
        displayPredictions(prediction);

        const boundingBox = document.getElementById("bounding-box");
        setTimeout(() => {
          const rect = imgPreview.getBoundingClientRect();
          boundingBox.style.width = `${rect.width * 0.6}px`;
          boundingBox.style.height = `${rect.height * 0.6}px`;
          boundingBox.style.left = `${rect.width * 0.2}px`;
          boundingBox.style.top = `${rect.height * 0.2}px`;
          boundingBox.style.display = "block";
        }, 100);
      };
    }

    async function fetchPestInfo(pestName) {
      const useOnline = document.getElementById("online-toggle").checked;

      if (navigator.onLine && useOnline) {
        const query = `${pestName} pest host plant, cause, and control`;
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;

        try {
          const res = await fetch(url);
          const data = await res.json();

          if (data.items && data.items.length > 0) {
            return {
              source: "online",
              title: data.items[0].title,
              snippet: data.items[0].snippet,
              link: data.items[0].link
            };
          }
        } catch (err) {
          console.warn("API failed, falling back to offline data");
        }
      }

      const info = pestData[pestName] || {
        description: "Unknown",
        cause: "Unknown",
        solution: "Unknown"
      };

      return {
        source: "offline",
        title: pestName,
        snippet: `Cause: ${info.cause}<br>Solution: ${info.solution}`,
        link: null
      };
    }

    async function displayPredictions(predictions) {
      const predictionContainer = document.getElementById("predictions");
      predictionContainer.innerHTML = "";

      predictions.sort((a, b) => b.probability - a.probability);

      console.log(predictions);

      const topPrediction = predictions[0];
      const secondPrediction = predictions.length > 1 ? predictions[1] : null;

      const pestInfo = await fetchPestInfo(topPrediction.className);

      const infoHTML = pestInfo.source === "online"
        ? `<br><strong>Cause & Solution:</strong> ${pestInfo.snippet}
           <br><a href="${pestInfo.link}" target="_blank">Learn more</a>`
        : `<br><strong>Cause & Solution:</strong> ${pestInfo.snippet}
           <br><em>Offline data used</em>`;

      predictionContainer.innerHTML += `
        <div class="prediction">
          <strong>${topPrediction.className}</strong><br>
          Confidence: ${(topPrediction.probability * 100).toFixed(2)}%
          ${infoHTML}
        </div>
      `;

      if (topPrediction.probability <= 0.9 && secondPrediction) {
        const secondInfo = await fetchPestInfo(secondPrediction.className);
        const secondHTML = secondInfo.source === "online"
          ? `<br><strong>Cause & Solution:</strong> ${secondInfo.snippet}
             <br><a href="${secondInfo.link}" target="_blank">Learn more</a>`
          : `<br><strong>Cause & Solution:</strong> ${secondInfo.snippet}
             <br><em>Offline data used</em>`;

        predictionContainer.innerHTML += `
          <div class="prediction">
            <strong>${secondPrediction.className}</strong><br>
            Confidence: ${(secondPrediction.probability * 100).toFixed(2)}%
            ${secondHTML}
          </div>
        `;
      }

      const searchResults = document.getElementById("search-results");

if (pestInfo.source === "online") {
  searchResults.innerHTML = `
    <div class="result-card">
      <h3>${pestInfo.title}</h3>
      <p>${pestInfo.snippet}</p>
      ${pestInfo.link ? `<a href="${pestInfo.link}" target="_blank">Read more</a>` : ""}
    </div>
  `;
} else {
  const info = pestData[topPrediction.className] || { description: "Unknown" };
  searchResults.innerHTML = `
    <div class="result-card">
      <h3>${topPrediction.className}</h3>
      <p><strong>Description:</strong> ${info.description}</p>
    </div>
  `;
}
    }

    init();