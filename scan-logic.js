// Contains  logic for scanning a plant leaf image and updating plant's streak and diseases detected in the database.
// Details of Machine Learning Model:
//   it is a Teachable Machine model trained to detect plant diseases
//   hosted on Google Cloud
//   trained with over 5,500 high-quality images
//   detects 20 disease classes
//   testing accuracy > 90%
//   URL: https://teachablemachine.withgoogle.com/models/tljWX6fNP/

// import the utility functions from supabase-utils.js and current plant ID from handle-dashboard.js
import { getDiseaseTips } from "./supabase-utils.js"
import { supabase } from "./supabase-utils.js";
import { plantId } from "./handle-dashboard.js"

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/tljWX6fNP/"; // URL of Teachable Machine model

let model; // variable to store model

// NOTE: much of code is already provided by the Teachable Machine website when training Machine Learning model

// load Teachable Machine model
async function initModel() {
  const modelURL = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL); // load model
}

// get the leaf image from user and predict the disease
const uploadButton = document.getElementById("upload-leaf-image-btn");
uploadButton.addEventListener("click", async () => { // event listener for click on upload button
  const fileInput = document.getElementById("leaf-image-upload"); // get file input element
  const file = fileInput.files[0]; // get uploaded file

  // if no file is uploaded, show alert
  if (!file) {
    alert("Please upload an image first.");
    return;
  }

  const predictionResult = document.getElementById("prediction-result");
  const previewContainer = document.createElement("div");
  const imagePreview = document.createElement("img");
  imagePreview.className = "img-fluid mb-3 mt-3 d-block mx-auto rounded";
  predictionResult.innerHTML = "<p>Processing...</p>";

  fileInput.disabled = true; // disable file input when processing file
  uploadButton.disabled = true; // disable upload button when processing file

  imagePreview.src = URL.createObjectURL(file); // set image preview to uploaded image
  previewContainer.appendChild(imagePreview); // append image preview to preview container
  predictionResult.before(previewContainer); // append preview container to prediction result (show it on screen)

  try {
    const tempImage = new Image(); // create temporary image
    tempImage.src = URL.createObjectURL(file); // set temporary image source to uploaded image

    // when temporary image is loaded, predict the image using model
    tempImage.onload = async () => {
      const predictions = await model.predict(tempImage); 

      // get the top prediction
      const topPrediction = predictions.reduce((max, pred) => 
        pred.probability > max.probability ? pred : max
      );

      console.log(topPrediction);
      console.log(await getDiseaseTips(topPrediction.className));

      const careTips = await getDiseaseTips(topPrediction.className); // get care tips for the disease detected

      const careTipsList = careTips.map((tip) => `<li>${tip}</li>`).join(""); // create list of care tips
      const careTipsHTML = `<ul>${careTipsList}</ul>`; // create HTML list of care tips

      // show prediction result on screen
      predictionResult.innerHTML = `
        <p><strong>Prediction: </strong>${topPrediction.className}</p>
        <p><strong>Confidence: </strong>${(topPrediction.probability * 100).toFixed(2)}%</p>
        <p><strong>Care Tips:</strong></p>
        ${careTipsHTML}
      `;

      const plantId = getSelectedPlantId(); // get the current plant ID

      // insert scan data into database
      const { data: scanData, error: scanError } = await supabase
        .from("scans")
        .insert([
          {
            plant_id: plantId,
            disease_detected: topPrediction.className,
          },
        ]);

      // get current (now outdated) plant's streak and diseases detected in database
      const { data: plantData, error: plantError } = await supabase
        .from("plants")
        .select("last_scanned_date, streak, diseases_detected")
        .eq("id", plantId)
        .single();

      if (plantError) {
        return;
      }

      // update plant's streak and diseases detected
      const currentDate = new Date();
      const lastScannedDate = new Date(plantData.last_scanned_date);

      // logic for incrementing streak (if one week has passed since last scan)
      let updatedStreak = plantData.streak || 0;
      if (isOneWeekPassed(lastScannedDate, currentDate)) {
        updatedStreak += 1;
      }

      let diseasesDetected = topPrediction.className === "healthy" ? "none" : await getUpdatedDiseasesDetected(plantId, topPrediction.className); // get disease tips unless the plant is healthy

      // update plant's streak and diseases detected in database
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
    predictionResult.innerHTML = "<p>Failed to get prediction. Please try again later.</p>";} // show error message if prediction fails
});

// function to check if one week has passed since last scan
function isOneWeekPassed(lastScannedDate, currentDate) {
  const oneWeekInMillis = 7 * 24 * 60 * 60 * 1000;
  return (currentDate - lastScannedDate) >= oneWeekInMillis;
}

// event listener for when scan plant modal is hidden
const scanPlantModal = document.getElementById("scanPlantModal");
scanPlantModal.addEventListener("hidden.bs.modal", () => {
  const imagePreview = document.querySelector(
    "#scanPlantModal .modal-body div img"
  );
  if (imagePreview) {
    imagePreview.remove(); // remove image preview when modal is hidden
  }

  const fileInput = document.getElementById("leaf-image-upload");
  const uploadButton = document.getElementById("upload-leaf-image-btn");
  
  // disable input and button and reset input value and text
  fileInput.disabled = false;
  uploadButton.disabled = false;
  fileInput.value = "";
  const predictionResult = document.getElementById("prediction-result");
  predictionResult.innerHTML = "";
});

initModel(); // call the function to load the model

function getSelectedPlantId() {
  return plantId;
}

// return the current diseases detected in the plant
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
