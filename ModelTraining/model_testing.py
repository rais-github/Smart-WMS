from keras.models import load_model
model = load_model("fine_tuned_waste_classification_model.h5")
print(model.summary())
