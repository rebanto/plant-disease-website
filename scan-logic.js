import { getDiseaseTips } from "./supabase-utils.js";
import { supabase } from "./supabase-utils.js";
import { plantId } from "./handle-dashboard.js"

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/tljWX6fNP/";

let model;

async function initModel() {
  const modelURL = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
}

const uploadButton = document.getElementById("upload-leaf-image-btn");
uploadButton.addEventListener("click", async () => {
  const fileInput = document.getElementById("leaf-image-upload");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please upload an image first.");
    return;
  }

  const predictionResult = document.getElementById("prediction-result");
  const previewContainer = document.createElement("div");
  const imagePreview = document.createElement("img");
  imagePreview.className = "img-fluid mb-3 mt-3 d-block mx-auto rounded";
  predictionResult.innerHTML = "<p>Processing...</p>";

  fileInput.disabled = true;
  uploadButton.disabled = true;

  imagePreview.src = URL.createObjectURL(file);
  previewContainer.appendChild(imagePreview);
  predictionResult.before(previewContainer);

  try {
    const tempImage = new Image();
    tempImage.src = URL.createObjectURL(file);

    tempImage.onload = async () => {
      const predictions = await model.predict(tempImage);

      const topPrediction = predictions.reduce((max, pred) =>
        pred.probability > max.probability ? pred : max
      );

      console.log(topPrediction);
      console.log(await getDiseaseTips(topPrediction.className));

      const careTips = await getDiseaseTips(topPrediction.className);

      const careTipsList = careTips.map((tip) => `<li>${tip}</li>`).join("");
      const careTipsHTML = `<ul>${careTipsList}</ul>`;

      predictionResult.innerHTML = `
        <p><strong>Prediction: </strong>${topPrediction.className}</p>
        <p><strong>Confidence: </strong>${(topPrediction.probability * 100).toFixed(2)}%</p>
        <p><strong>Care Tips:</strong></p>
        ${careTipsHTML}
      `;

      const plantId = getSelectedPlantId();

      const { data: scanData, error: scanError } = await supabase
        .from("scans")
        .insert([
          {
            plant_id: plantId,
            disease_detected: topPrediction.className,
          },
        ]);

      const { data: plantData, error: plantError } = await supabase
        .from("plants")
        .select("last_scanned_date, streak, diseases_detected")
        .eq("id", plantId)
        .single();

      if (plantError) {
        return;
      }

      const currentDate = new Date();
      const lastScannedDate = new Date(plantData.last_scanned_date);

      let updatedStreak = plantData.streak || 0;
      if (isOneWeekPassed(lastScannedDate, currentDate)) {
        updatedStreak += 1;
      }

      let diseasesDetected = topPrediction.className === "healthy" ? "none" : await getUpdatedDiseasesDetected(plantId, topPrediction.className);

      const { data: updatedPlantData, error: updateError } = await supabase
        .from("plants")
        .update({
          last_scanned_date: currentDate.toISOString(),
          streak: updatedStreak,
          diseases_detected: diseasesDetected,
        })
        .eq("id", plantId);
    };
  } catch (error) {
    predictionResult.innerHTML =
      "<p>Failed to get prediction. Please try again later.</p>";
  }
});

function isOneWeekPassed(lastScannedDate, currentDate) {
  const oneWeekInMillis = 7 * 24 * 60 * 60 * 1000;
  return (currentDate - lastScannedDate) >= oneWeekInMillis;
}


const scanPlantModal = document.getElementById("scanPlantModal");
scanPlantModal.addEventListener("hidden.bs.modal", () => {
  const imagePreview = document.querySelector(
    "#scanPlantModal .modal-body div img"
  );
  if (imagePreview) {
    imagePreview.remove();
  }

  const fileInput = document.getElementById("leaf-image-upload");
  const uploadButton = document.getElementById("upload-leaf-image-btn");
  fileInput.disabled = false;
  uploadButton.disabled = false;
  fileInput.value = "";

  const predictionResult = document.getElementById("prediction-result");
  predictionResult.innerHTML = "";
});

initModel();

function getSelectedPlantId() {
  return plantId;
}

async function getPlantStreak(plantId) {
  const { data, error } = await supabase
    .from("plants")
    .select("streak")
    .eq("id", plantId)
    .single();

  if (error) {
    return 0;
  }

  return data.streak || 0;
}

async function getUpdatedDiseasesDetected(plantId, diseaseDetected) {
  const { data, error } = await supabase
    .from("plants")
    .select("diseases_detected")
    .eq("id", plantId)
    .single();

  if (error) {
    return diseaseDetected;
  }

  if (!diseaseDetected || diseaseDetected.toLowerCase() === "none") {
    return "none";
  }

  return diseaseDetected;
}
