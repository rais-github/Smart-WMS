import tensorflow as tf
from keras.applications import MobileNetV2
from keras.models import Model
from keras.layers import Dense, GlobalAveragePooling2D
import os

def preprocess_dataset(dataset_path, img_size=(150, 150), batch_size=32):
    # Use image_dataset_from_directory to load the dataset
    train_dir = os.path.join(dataset_path, "TRAIN")
    test_dir = os.path.join(dataset_path, "TEST")

    train_dataset = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical"
    )

    test_dataset = tf.keras.utils.image_dataset_from_directory(
        test_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical"
    )

    # Get class names
    class_names = train_dataset.class_names
    print(f"Classes found: {class_names}")

    return train_dataset, test_dataset, class_names

def train_model(dataset_path):
    # Preprocess the dataset
    train_gen, test_gen, class_names = preprocess_dataset(dataset_path)

    # Define the number of classes
    num_classes = len(class_names)

    # Load pre-trained MobileNetV2
    base_model = MobileNetV2(weights="imagenet", include_top=False, input_shape=(150, 150, 3))

    # Add custom layers
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(1024, activation="relu")(x)
    predictions = Dense(num_classes, activation="softmax")(x)

    # Create the model
    model = Model(inputs=base_model.input, outputs=predictions)

    # Freeze the layers of the base model
    for layer in base_model.layers:
        layer.trainable = False

    # Compile the model
    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])

    # Train the model
    model.fit(train_gen, validation_data=test_gen, epochs=10)

    # Save the model
    model.save("waste_classification_model.h5")
    print("Model saved as waste_classification_model.h5")

if __name__ == "__main__":
    dataset_path = input("Enter the dataset path: ")
    train_model(dataset_path)
