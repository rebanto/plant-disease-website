const MODEL_URL = "https://teachablemachine.withgoogle.com/models/tljWX6fNP/";

let model;

async function init() {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    console.log("Model loaded successfully!");
}

function loadImage(event) {
    const image = document.getElementById("uploaded-image");
    const imageContainer = document.getElementById("image-container");
    const predictionContainer = document.getElementById("prediction-container");
    const labelContainer = document.getElementById("label-container");

    image.src = window.URL.createObjectURL(event.target.files[0]);
    image.onload = () => {
        imageContainer.classList.remove("hidden");
        predictionContainer.classList.remove("hidden");
        labelContainer.textContent = "Processing...";
        predict(image);
    };
}

async function predict(image) {
    const prediction = await model.predict(image);

    const topPrediction = prediction.reduce((max, pred) =>
        pred.probability > max.probability ? pred : max
    );

    const labelContainer = document.getElementById("label-container");
    labelContainer.textContent = `${topPrediction.className}: ${(topPrediction.probability * 100).toFixed(2)}%`;
}

init();
