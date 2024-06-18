// URLS from S3 have an expiration time of 1 hour
export const FALLBACK_EXPIRATION_SECONDS = 3600;

export const resizeAndCropProportionally = (
  dataURI: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.src = dataURI;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        reject('Canvas context not supported');
        return;
      }

      const srcAspectRatio = image.width / image.height;
      const targetAspectRatio = targetWidth / targetHeight;

      let resizeWidth, resizeHeight, offsetX, offsetY;

      if (srcAspectRatio < targetAspectRatio) {
        // Source image is wider than the target area
        resizeWidth = targetWidth;
        resizeHeight = targetWidth / srcAspectRatio;
        offsetX = 0;
        offsetY = (resizeHeight - targetHeight) / 2;
      } else {
        // Source image is taller than the target area
        resizeWidth = targetHeight * srcAspectRatio;
        resizeHeight = targetHeight;
        offsetX = (resizeWidth - targetWidth) / 2;
        offsetY = 0;
      }

      // Set canvas dimensions to the target area
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Resize and crop the image proportionally
      context.drawImage(image, -offsetX, -offsetY, resizeWidth, resizeHeight);

      // Convert canvas to data URI
      const croppedDataURI = canvas.toDataURL();

      resolve(croppedDataURI);
    };

    image.onerror = () => {
      reject('Failed to load the image');
    };
  });
};
