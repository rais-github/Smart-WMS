from fastapi import FastAPI, UploadFile, File
from keras.models import load_model
from PIL import Image
import numpy as np
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS for all domains (you can restrict this later if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins. Adjust for more security in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained model
model = load_model("fine_tuned_waste_classification_model.h5")

# Define image preprocessing
def preprocess_image(image: Image.Image, target_size=(150, 150)):
    image = image.resize(target_size)
    image_array = np.array(image) / 255.0  # Normalize pixel values
    return np.expand_dims(image_array, axis=0)  # Add batch dimension

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image = Image.open(file.file)
    processed_image = preprocess_image(image)
    prediction = model.predict(processed_image)
    predicted_class = np.argmax(prediction)

    # Ensure numpy.int64 is converted to a native Python integer
    return {"predicted_class": int(predicted_class)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
