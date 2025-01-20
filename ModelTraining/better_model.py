import tensorflow as tf
from keras.applications import MobileNetV2
from keras.models import Model
from keras.layers import Dense, GlobalAveragePooling2D
import os

def preprocess_dataset(dataset_path, img_size=(150, 150), batch_size=32):
    """
    Preprocess the dataset by loading the train and test directories
    as TensorFlow image datasets.
    """
    # Directories for training and testing data
    train_dir = os.path.join(dataset_path, "TRAIN")
    test_dir = os.path.join(dataset_path, "TEST")

    # Load training dataset
    train_dataset = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical"
    )

    # Load testing dataset
    test_dataset = tf.keras.utils.image_dataset_from_directory(
        test_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical"
    )

    # Get class names for the dataset
    class_names = train_dataset.class_names
    print(f"Classes found: {class_names}")

    return train_dataset, test_dataset, class_names

def train_model(dataset_path):
    """
    Train a MobileNetV2-based model for waste classification.
    Includes a fine-tuning step for the last 20 layers of the base model.
    """
    # Preprocess the dataset
    train_gen, test_gen, class_names = preprocess_dataset(dataset_path)

    # Define the number of classes
    num_classes = len(class_names)

    # Load the pre-trained MobileNetV2 model
    base_model = MobileNetV2(weights="imagenet", include_top=False, input_shape=(150, 150, 3))

    # Add custom layers
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(1024, activation="relu")(x)
    predictions = Dense(num_classes, activation="softmax")(x)

    # Create the model
    model = Model(inputs=base_model.input, outputs=predictions)

    # Freeze all layers of the base model
    for layer in base_model.layers:
        layer.trainable = False

    # Compile the model with the frozen base layers
    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])

    # Train the model with frozen base layers
    print("Training with frozen base model layers...")
    model.fit(train_gen, validation_data=test_gen, epochs=10)

    # Fine-tune the last 20 layers of the base model
    print("Fine-tuning the last 20 layers of the base model...")
    for layer in base_model.layers[-20:]:
        layer.trainable = True

    # Recompile the model with a lower learning rate for fine-tuning
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5), loss="categorical_crossentropy", metrics=["accuracy"])

    # Retrain the model with the unfrozen layers
    model.fit(train_gen, validation_data=test_gen, epochs=5)

    # Save the fine-tuned model
    model.save("fine_tuned_waste_classification_model.h5")
    print("Fine-tuned model saved as fine_tuned_waste_classification_model.h5")

if __name__ == "__main__":
    dataset_path = input("Enter the dataset path: ")
    train_model(dataset_path)


#uvicorn app:app --reload