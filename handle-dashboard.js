import {
  fetchUserPlants,
  signOut,
  addPlant,
  deletePlant,
  getUserId,
  getDiseaseTips,
  updatePlantDetails
} from "./supabase-utils.js";

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

  updatePlantDetails(plantId, newName , newNotes);
});
