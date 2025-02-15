import {
  fetchUserPlants,
  signOut,
  addPlant,
  deletePlant,
  getUserId,
  updatePlantDetails,
  fetchData,
  sendData,
} from "./supabase-utils.js";

displayAllData();
const socket = io("http://127.0.0.1:5000");
const userID = await getUserId();

let charts = {};

async function displayAllData() {
  const userID = await getUserId();
  const data = await fetchData(userID);
  console.log("Data:", data);

  const labels = data.map((entry) => entry.datetime);
  const soilMoisture = data.map((entry) => entry.soil_moisture);
  const temperature = data.map((entry) => entry.temperature);
  const humidity = data.map((entry) => entry.humidity);
  const nitrogen = data.map((entry) => entry.nitrogen);
  const phosphorus = data.map((entry) => entry.phosphorus);
  const potassium = data.map((entry) => entry.potassium);
  const ph = data.map((entry) => entry.ph);

  const ctxMoisture = document.getElementById("moistureChart").getContext("2d");
  const ctxTemp = document.getElementById("tempChart").getContext("2d");
  const ctxHumidity = document.getElementById("humidityChart").getContext("2d");
  const ctxNutrients = document
    .getElementById("nutrientsChart")
    .getContext("2d");
  const ctxPH = document.getElementById("phChart").getContext("2d");

  function createChart(ctx, label, data, color, type = "line") {
    return new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            borderColor: color,
            backgroundColor: color + "80",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: { responsive: true, animation: { duration: 1000 } },
    });
  }

  charts.moistureChart = createChart(
    ctxMoisture,
    "Soil Moisture (%)",
    soilMoisture,
    "#0000FF"
  );
  charts.tempChart = createChart(
    ctxTemp,
    "Temperature (°C)",
    temperature,
    "#FF0000"
  );
  charts.humidityChart = createChart(
    ctxHumidity,
    "Humidity (%)",
    humidity,
    "#00FF00"
  );
  charts.phChart = createChart(ctxPH, "PH", ph, "#FFA500");

  charts.nutrientsChart = new Chart(ctxNutrients, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Nitrogen (N)",
          data: nitrogen,
          backgroundColor: "rgba(255, 165, 0, 0.6)",
        },
        {
          label: "Phosphorus (P)",
          data: phosphorus,
          backgroundColor: "rgba(75, 0, 130, 0.6)",
        },
        {
          label: "Potassium (K)",
          data: potassium,
          backgroundColor: "rgba(255, 0, 255, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 1000 },
      scales: { y: { beginAtZero: true } },
    },
  });

  document.querySelectorAll(".chart").forEach((canvas) => {
    canvas.style.display = "none";
  });

  document.getElementById("moistureChart").style.display = "block";
}

socket.on("new_data", (data) => {
  console.log("Received Arduino data:", data);

  sendData(
    userID,
    data.datetime,
    data.nitrogen,
    data.phosphorus,
    data.potassium,
    data.soil_moisture,
    data.temperature,
    data.humidity,
    data.ph
  );

  const newData = {
    datetime: data.datetime,
    soil_moisture: data.soil_moisture,
    temperature: data.temperature,
    humidity: data.humidity,
    nitrogen: data.nitrogen,
    phosphorus: data.phosphorus,
    potassium: data.potassium,
    ph: data.ph,
  };

  updateChartData(newData);
});

function updateChartData(newData) {
  const labels = charts.moistureChart.data.labels;
  if (labels.length > 20) {
    labels.shift();
  }
  labels.push(newData.datetime);

  updateChartDataset(charts.moistureChart, newData.soil_moisture);
  updateChartDataset(charts.tempChart, newData.temperature);
  updateChartDataset(charts.humidityChart, newData.humidity);
  updateChartDataset(
    charts.nutrientsChart,
    newData.nitrogen,
    newData.phosphorus,
    newData.potassium
  );
  updateChartDataset(charts.phChart, newData.ph);

  charts.moistureChart.update();
  charts.tempChart.update();
  charts.humidityChart.update();
  charts.nutrientsChart.update();
  charts.phChart.update();
}

function updateChartDataset(chart, ...data) {
  const datasets = chart.data.datasets;
  if (datasets[0].data.length > 20) {
    datasets.forEach((dataset) => dataset.data.shift());
  }

  data.forEach((datum, index) => {
    datasets[index].data.push(datum);
  });
}

window.switchGraph = function () {
  const selectedGraph = document.getElementById("graphSelector").value;

  document.querySelectorAll(".chart").forEach((canvas) => {
    canvas.style.display = "none";
  });

  document.getElementById(selectedGraph).style.display = "block";
};

window.onload = displayAllData;

let plantId = null;

window.botpress.sendEvent({ type: "restart" });
function isMobileDevice() {
  return /Mobi|Android|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
}

if (!isMobileDevice() || /iPad/i.test(navigator.userAgent)) {
  window.botpress.open();
}

const logoutButton = document.getElementById("logout-btn");
logoutButton.addEventListener("click", async () => {
  try {
    await signOut();
  } catch (error) {
    alert("An error occurred while logging out.");
  }
});

const plants = await fetchUserPlants();

const plantsContainer = document.getElementById("plants-container");
const plantDetailsDiv = document.getElementById("plant-details");

plants.forEach((plant) => {
  const col = document.createElement("div");
  col.className = "col";

  const escapedId = encodeURIComponent(plant.id);

  const plantImage = plant.latest_scan_image || "images/plant.png";

  col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${plantImage}" class="card-img-top" alt="Plant Image">
        <div class="card-body">
          <h5 class="card-title">${plant.name}</h5>
          <p class="card-text">Last scanned: ${
            plant.last_scanned_date || "Never"
          }</p>
          <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#plantModal" onclick="showPlantDetails('${escapedId}')">
            View Details
          </button>
        </div>
      </div>
    `;

  plantsContainer.appendChild(col);
});

const addPlantForm = document.getElementById("add-plant-form");
addPlantForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("plant-name-input").value.trim();
  const notes = document.getElementById("plant-notes-input").value.trim();

  const userId = await getUserId();

  const newPlant = {
    user_id: userId,
    name,
    diseases_detected: null,
    notes,
    last_scanned_date: null,
    streak: 0,
  };
  const result = await addPlant(newPlant);

  if (result) {
    alert("Failed to add plant. Please try again.");
  } else {
    alert("Plant added successfully!");
    window.location.reload();
  }
});

window.showPlantDetails = (id) => {
  const decodedId = decodeURIComponent(id);
  const plant = plants.find((p) => p.id === decodedId);

  if (plant) {
    plantId = plant.id;

    document.getElementById("plant-name").innerText = plant.name;
    document.getElementById("plant-last-scanned").innerText =
      plant.last_scanned_date || "Never";
    document.getElementById("plant-diseases-detected").innerText =
      plant.diseases_detected || "None";
    document.getElementById("plant-scan-streak").innerText = plant.streak || 0;
    document.getElementById("plant-notes").innerText = plant.notes || "None";
    document.getElementById("plant-scans").innerText = "To be implemented";

    const plantImage = plant.latest_scan_image || "images/plant.png";
    document.getElementById("plant-image").src = plantImage;

    const scanNowButton = document.getElementById("scan-now-btn");
    scanNowButton.disabled = false;

    const deleteButton = document.getElementById("delete-plant-btn");
    deleteButton.onclick = async () => {
      const result = await deletePlant(plant.id);
      if (result) {
        alert("Failed to delete plant. Please try again.");
      } else {
        alert("Plant deleted successfully!");
        window.location.reload();
      }
    };
  } else {
    document.getElementById(
      "plant-details"
    ).innerHTML = `<p>Plant not found!</p>`;
  }
};

export { plantId };

const editPlantBtn = document.getElementById("edit-plant-btn");
const savePlantBtn = document.getElementById("save-plant-btn");
const plantNameField = document.getElementById("plant-name");
const plantNotesField = document.getElementById("plant-notes");
const editFields = document.getElementById("edit-fields");
const editPlantName = document.getElementById("edit-plant-name");
const editPlantNotes = document.getElementById("edit-plant-notes");

editPlantBtn.addEventListener("click", () => {
  editFields.style.display = "block";
  plantNameField.parentElement.style.display = "none";
  plantNotesField.parentElement.style.display = "none";

  editPlantName.value = plantNameField.textContent;
  editPlantNotes.value = plantNotesField.textContent;
});

savePlantBtn.addEventListener("click", () => {
  const newName = editPlantName.value.trim();
  const newNotes = editPlantNotes.value.trim();

  if (newName) {
    plantNameField.textContent = newName;
  }
  plantNotesField.textContent = newNotes;

  editFields.style.display = "none";
  plantNameField.parentElement.style.display = "block";
  plantNotesField.parentElement.style.display = "block";

  updatePlantDetails(plantId, newName, newNotes);
  window.location.reload();
});

window.onload = displayAllData;