import kagglehub

def download_dataset():
    # Download the dataset
    path = kagglehub.dataset_download("techsash/waste-classification-data")
    print("Dataset downloaded to:", path)
    return path

if __name__ == "__main__":
    dataset_path = download_dataset()
