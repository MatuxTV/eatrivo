import { PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE_PX } from "./constants";
import { fitWithinEdge } from "./validate-batch";

export class PhotoCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoCompressionError";
  }
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/**
 * Decodes with createImageBitmap (honours EXIF orientation, decodes HEIC on Safari) and falls back
 * to an <img> element. Throws PhotoCompressionError when the browser cannot decode the file.
 */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // fall through to the <img> decoder
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new PhotoCompressionError("decode_failed"));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Downscales a photo to PHOTO_MAX_EDGE_PX on the long edge and re-encodes it as JPEG.
 * The canvas drops EXIF metadata (including GPS). Always returns image/jpeg.
 */
export async function compressPhoto(file: File, index: number): Promise<File> {
  const decoded = await decodeImage(file);
  const canvas = document.createElement("canvas");
  try {
    const { width, height } = fitWithinEdge(decoded.width, decoded.height, PHOTO_MAX_EDGE_PX);
    if (width <= 0 || height <= 0) {
      throw new PhotoCompressionError("empty_image");
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new PhotoCompressionError("canvas_unavailable");
    }
    // JPEG has no alpha: paint white first so transparent PNGs do not turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY);
    });
    if (!blob) {
      throw new PhotoCompressionError("encode_failed");
    }

    return new File([blob], `photo-${index + 1}.jpg`, { type: "image/jpeg" });
  } finally {
    decoded.release();
    canvas.width = 0;
    canvas.height = 0;
  }
}
