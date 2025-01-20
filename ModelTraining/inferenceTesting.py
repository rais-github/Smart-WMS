from keras.models import load_model
from keras.preprocessing.image import load_img, img_to_array
import numpy as np

# Load the trained model
model = load_model("fine_tuned_waste_classification_model.h5")

# Define class mapping
class_names = ["Organic", "Recyclable"]

def predict_waste_class(image_path):
    # Load and preprocess the image
    img = load_img(image_path, target_size=(150, 150))
    img_array = img_to_array(img) / 255.0  # Normalize pixel values
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension

    # Get model prediction
    prediction = model.predict(img_array)
    class_idx = np.argmax(prediction)  # Get the index of the highest probability
    class_name = class_names[class_idx]  # Map index to class name
    confidence = prediction[0][class_idx]  # Get confidence score

    return class_name, confidence

# Example usage
image_path = "C:\Smart-WMS\ModelTraining\image.jpg"
predicted_class, confidence_score = predict_waste_class(image_path)
print(f"Predicted Class: {predicted_class}")
print(f"Confidence Score: {confidence_score:.2f}")
