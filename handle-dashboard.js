// Main logic handler for the dashboard page

// importing functions to handle database queries from supabase utilities file
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



// GRAPHS LOGIC SECTION

// initializing socket.io connection for websocket communication, used for communicating real-time updates between Flask server and front-end
const socket = io("wss://plant-disease-server.onrender.com", {
  transports: ["websocket"],
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("Successfully connected to the WebSocket server!");
});

const userID = await getUserId(); // fetching current user ID from the database

let charts = {}; // object to store chart instances

// function to display all sensor data on arduino info page with graphs
async function displayAllData() {
  const userID = await getUserId(); // fetching current user ID from the database
  const data = await fetchData(userID); // fetching all sensor data for the current user
  console.log("Data:", data); // printing fetched data to the console

  // extracting data for each sensor variable from the fetched data
  // ex: date/time, moisture of the soil, humidity, temperature, etc.
  const labels = data.map((entry) => entry.datetime);
  const soilMoisture = data.map((entry) => entry.soil_moisture);
  const temperature = data.map((entry) => entry.temperature);
  const humidity = data.map((entry) => entry.humidity);
  const nitrogen = data.map((entry) => entry.nitrogen);
  const phosphorus = data.map((entry) => entry.phosphorus);
  const potassium = data.map((entry) => entry.potassium);
  const ph = data.map((entry) => entry.ph);

  // getting the canvas elements for each chart
  const ctxMoisture = document.getElementById("moistureChart").getContext("2d");
  const ctxTemp = document.getElementById("tempChart").getContext("2d");
  const ctxHumidity = document.getElementById("humidityChart").getContext("2d");
  const ctxNutrients = document.getElementById("nutrientsChart").getContext("2d");
  const ctxPH = document.getElementById("phChart").getContext("2d");

  // reusable function to crate a line graph for displaying different sensor data variables
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

  // creating charts for each sensor data variable
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

  // creating a bar chart for displaying nutrient levels with nitrogen, phosphorus, and potassium levels
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

  // hiding all charts except the soil moisture chart in the beginning
  document.querySelectorAll(".chart").forEach((canvas) => {canvas.style.display = "none";});
  document.getElementById("moistureChart").style.display = "block";
}

// event listener for receiving new data from the Arduino via websocket
socket.on("new_data", (data) => {
  console.log("Received Arduino data:", data); // printing received data to the console

  // sending the received data from the Flask server and saving it to the database
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

  // making a new data object with the received data and then updating the charts with the new data
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

displayAllData(); // calling function to display all sensor data on the arduino sensor info page

// function to update the chart data with new data
function updateChartData(newData) {
  const labels = charts.moistureChart.data.labels; // getting the labels from the moisture chart
  
  // removing the first label if the number of labels exceeds 20
  if (labels.length > 20) { 
    labels.shift();
  }
  labels.push(newData.datetime);

  // calling function to update the datasets for each chart with the new data
  updateChartDataset(charts.moistureChart, newData.soil_moisture);
  updateChartDataset(charts.tempChart, newData.temperature);
  updateChartDataset(charts.humidityChart, newData.humidity);
  updateChartDataset(charts.nutrientsChart, newData.nitrogen, newData.phosphorus, newData.potassium);
  updateChartDataset(charts.phChart, newData.ph);

  // updating the charts with the new data
  charts.moistureChart.update();
  charts.tempChart.update();
  charts.humidityChart.update();
  charts.nutrientsChart.update();
  charts.phChart.update();
}

// function to update the dataset of a chart with new data
function updateChartDataset(chart, ...data) {
  const datasets = chart.data.datasets; // getting the datasets from the chart
  if (datasets[0].data.length > 20) { // removing the first data point if the number of data points exceeds 20
    datasets.forEach((dataset) => dataset.data.shift());
  }

  // adding the new data to the datasets of the chart
  data.forEach((all_data, index) => {
    datasets[index].data.push(all_data);
  });
}

// switch between different grpahs on arduino sensor info page
window.switchGraph = function () {
  const selectedGraph = document.getElementById("graphSelector").value; // getting selected graph from dropdown

  // hiding all charts except the selected chart
  document.querySelectorAll(".chart").forEach((canvas) => {canvas.style.display = "none";});
  document.getElementById(selectedGraph).style.display = "block";
};

window.onload = displayAllData; // when the windows loads, display all sensor data on the arduino sensor info page




// PLANT AND GENERAL LOGIC SECTION

let plantId = null; // store ID of the selected plant

// function to check if the device is a mobile device
window.botpress.sendEvent({ type: "restart" });
function isMobileDevice() {
  return /Mobi|Android|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);
}

// opening the chatbot window if the device is not a mobile device or an ipad
if (!isMobileDevice() || /iPad/i.test(navigator.userAgent)) {
  window.botpress.open();
}

// event listener for the logout button
const logoutButton = document.getElementById("logout-btn");
logoutButton.addEventListener("click", async () => {
  try {
    await signOut();
  } catch (error) {
    alert("An error occurred while logging out.");
  }
});

const plants = await fetchUserPlants(); // fetching all plants for the current user

const plantsContainer = document.getElementById("plants-container");
const plantDetailsDiv = document.getElementById("plant-details");

// displaying all plants in the plants container
plants.forEach((plant) => {
  const col = document.createElement("div");
  col.className = "col";

  const escapedId = encodeURIComponent(plant.id);

  const plantImage = plant.latest_scan_image || "images/plant.png";

  // creating a card for each plant with the plant name, last scanned date, and a button to view details
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

  plantsContainer.appendChild(col); // appending the card to the plants container
});

// function to add a new plant to the database
const addPlantForm = document.getElementById("add-plant-form");
addPlantForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // getting plant name and notes from form
  const name = document.getElementById("plant-name-input").value.trim(); 
  const notes = document.getElementById("plant-notes-input").value.trim();

  const userId = await getUserId(); // fetching current user ID from the database

  // creating a new plant object with the user ID, plant name, notes, last scanned date, and streak
  const newPlant = {
    user_id: userId,
    name,
    diseases_detected: null,
    notes,
    last_scanned_date: null,
    streak: 0,
  };
  const result = await addPlant(newPlant); // adding the new plant to the database

  if (result) {
    alert("Failed to add plant. Please try again.");
  } else {
    alert("Plant added successfully!");
    window.location.reload(); // reloading page to display new plant
  }
});

// function to handle the plant scan button
window.showPlantDetails = (id) => {
  const decodedId = decodeURIComponent(id);
  const plant = plants.find((p) => p.id === decodedId); // finding the plant with the selected ID

  if (plant) {
    plantId = plant.id;

    // displaying the plant details in the plant details modal
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

    const deleteButton = document.getElementById("delete-plant-btn"); // getting the delete plant button
    deleteButton.onclick = async () => { 
      const result = await deletePlant(plant.id); // deleting the selected plant from the database
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

export { plantId }; // exporting the plant ID for use in other files

// getting the edit plant button, save plant button, plant name field, plant notes field, and edit fields div
const editPlantBtn = document.getElementById("edit-plant-btn");
const savePlantBtn = document.getElementById("save-plant-btn");
const plantNameField = document.getElementById("plant-name");
const plantNotesField = document.getElementById("plant-notes");
const editFields = document.getElementById("edit-fields");
const editPlantName = document.getElementById("edit-plant-name");
const editPlantNotes = document.getElementById("edit-plant-notes");

// event listener for the edit plant button
editPlantBtn.addEventListener("click", () => {
  editFields.style.display = "block";
  plantNameField.parentElement.style.display = "none";
  plantNotesField.parentElement.style.display = "none";

  editPlantName.value = plantNameField.textContent;
  editPlantNotes.value = plantNotesField.textContent;
});

// event listener for the save plant button
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

  updatePlantDetails(plantId, newName, newNotes); // updating the plant details in the database
  window.location.reload(); // reloading page to display updated plant details
});

window.onload = displayAllData;