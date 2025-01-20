declare module "ml5" {
  interface ClassificationResult {
    label: string;
    confidence: number;
  }

  export function imageClassifier(
    model: string,
    callback?: () => void
  ): {
    classify: (
      image: HTMLImageElement | HTMLVideoElement,
      callback: (error: any, results: ClassificationResult[]) => void
    ) => void;
  };
}
