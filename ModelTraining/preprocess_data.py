import os
import tensorflow as tf

def preprocess_dataset(dataset_path):
    # Define paths to train and test directories
    train_dir = os.path.join(dataset_path, "TRAIN")
    test_dir = os.path.join(dataset_path,  "TEST")
    
    # Parameters for preprocessing
    img_size = (150, 150)
    batch_size = 32
    
    # Create training dataset
    train_dataset = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical"
    )
    
    # Create test dataset
    test_dataset = tf.keras.utils.image_dataset_from_directory(
        test_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical"
    )
    
    # Normalize the pixel values to [0, 1]
    normalization_layer = tf.keras.layers.Rescaling(1.0 / 255)
    train_dataset = train_dataset.map(lambda x, y: (normalization_layer(x), y))
    test_dataset = test_dataset.map(lambda x, y: (normalization_layer(x), y))
    
    return train_dataset, test_dataset

if __name__ == "__main__":
    dataset_path = r"C:\DATASET"
    train_data, test_data = preprocess_dataset(dataset_path)
    print("Train and test datasets are ready for use.")
