"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Camera,
  Loader2,
  Plus,
  ScanBarcode,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  BarcodeLookupOutcome,
  ReceiptScanReviewItem,
  ReceiptScanStartResponse,
} from "@/lib/pantry/receipt-scan-contracts";
import PantryEditableItemCard, {
  type EditablePantryFormItem,
} from "./PantryEditableItemCard";

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => Promise<void>;
  initialEntryMode?: ScanEntryMode;
}

type ScanPhase = "idle" | "scanning" | "review" | "submitting";
type ScanEntryMode = "receipt" | "barcode";
type BarcodeScannerState = "idle" | "starting" | "ready" | "unsupported" | "error";

interface DetectedBarcodeLike {
  rawValue?: string;
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcodeLike[]>;
}

interface ContinuousBarcodeReaderLike {
  decodeFromVideoElementContinuously(
    source: HTMLVideoElement,
    callback: (result: { getText(): string } | null, error?: unknown) => void,
  ): Promise<void> | void;
  reset(): void;
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

interface ReviewFormItem extends EditablePantryFormItem {
  barcode?: string | null;
  confidence: number | null;
  source: "detected" | "manual";
  needsReview: boolean;
}

interface BarcodeCropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BarcodeImageCandidate {
  label: string;
  source: string;
}

const BARCODE_DETECTOR_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
const BARCODE_IMAGE_MAX_DIMENSION = 1600;
const BARCODE_LOCALIZATION_MAX_DIMENSION = 420;

function logBarcodeDebug(event: string, metadata?: Record<string, unknown>) {
  console.warn("[ReceiptScanModal][barcode]", event, metadata ?? {});
}

function clampBarcodeCanvasSize(width: number, height: number) {
  const longestSide = Math.max(width, height);
  if (longestSide <= BARCODE_IMAGE_MAX_DIMENSION) {
    return { width, height };
  }

  const scale = BARCODE_IMAGE_MAX_DIMENSION / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function clampCropRegion(
  image: HTMLImageElement,
  region: BarcodeCropRegion,
): BarcodeCropRegion {
  const x = Math.max(0, Math.min(image.naturalWidth - 1, region.x));
  const y = Math.max(0, Math.min(image.naturalHeight - 1, region.y));
  const maxWidth = image.naturalWidth - x;
  const maxHeight = image.naturalHeight - y;

  return {
    x,
    y,
    width: Math.max(1, Math.min(maxWidth, region.width)),
    height: Math.max(1, Math.min(maxHeight, region.height)),
  };
}

function localizeBarcodeRegion(image: HTMLImageElement): BarcodeCropRegion | null {
  if (typeof document === "undefined") {
    return null;
  }

  const analysisSize = clampBarcodeCanvasSize(
    Math.min(image.naturalWidth, BARCODE_LOCALIZATION_MAX_DIMENSION),
    Math.min(image.naturalHeight, BARCODE_LOCALIZATION_MAX_DIMENSION),
  );
  const canvas = document.createElement("canvas");
  canvas.width = analysisSize.width;
  canvas.height = analysisSize.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.drawImage(image, 0, 0, analysisSize.width, analysisSize.height);
  const imageData = context.getImageData(0, 0, analysisSize.width, analysisSize.height);
  const pixels = imageData.data;
  const grayscale = new Float32Array(analysisSize.width * analysisSize.height);

  for (let y = 0; y < analysisSize.height; y += 1) {
    for (let x = 0; x < analysisSize.width; x += 1) {
      const offset = (y * analysisSize.width + x) * 4;
      grayscale[y * analysisSize.width + x] =
        pixels[offset] * 0.299 +
        pixels[offset + 1] * 0.587 +
        pixels[offset + 2] * 0.114;
    }
  }

  const rowEnergy = new Float32Array(analysisSize.height);
  for (let y = 0; y < analysisSize.height; y += 1) {
    let energy = 0;
    for (let x = 1; x < analysisSize.width; x += 1) {
      const current = grayscale[y * analysisSize.width + x];
      const previous = grayscale[y * analysisSize.width + x - 1];
      energy += Math.abs(current - previous);
    }

    const lowerBias = 1 + (y / Math.max(1, analysisSize.height - 1)) * 0.45;
    rowEnergy[y] = energy * lowerBias;
  }

  const candidateBandHeights = [0.18, 0.24, 0.32].map((ratio) =>
    Math.max(18, Math.round(analysisSize.height * ratio)),
  );
  let bestBandScore = -1;
  let bestBandY = 0;
  let bestBandHeight = candidateBandHeights[0] ?? analysisSize.height;

  for (const bandHeight of candidateBandHeights) {
    let runningScore = 0;
    for (let y = 0; y < bandHeight; y += 1) {
      runningScore += rowEnergy[y] ?? 0;
    }

    for (let startY = 0; startY <= analysisSize.height - bandHeight; startY += 2) {
      if (startY > 0) {
        runningScore += rowEnergy[startY + bandHeight - 1] ?? 0;
        runningScore -= rowEnergy[startY - 1] ?? 0;
      }

      if (runningScore > bestBandScore) {
        bestBandScore = runningScore;
        bestBandY = startY;
        bestBandHeight = bandHeight;
      }
    }
  }

  if (bestBandScore <= 0) {
    logBarcodeDebug("localize-region:no-row-band", {
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
    return null;
  }

  const columnEnergy = new Float32Array(analysisSize.width);
  for (let x = 1; x < analysisSize.width; x += 1) {
    let energy = 0;
    for (let y = bestBandY; y < bestBandY + bestBandHeight; y += 1) {
      const current = grayscale[y * analysisSize.width + x];
      const previous = grayscale[y * analysisSize.width + x - 1];
      energy += Math.abs(current - previous);
    }
    columnEnergy[x] = energy;
  }

  const candidateBandWidths = [0.42, 0.58, 0.74].map((ratio) =>
    Math.max(40, Math.round(analysisSize.width * ratio)),
  );
  let bestColumnScore = -1;
  let bestBandX = 0;
  let bestBandWidth = candidateBandWidths[0] ?? analysisSize.width;

  for (const bandWidth of candidateBandWidths) {
    let runningScore = 0;
    for (let x = 0; x < bandWidth; x += 1) {
      runningScore += columnEnergy[x] ?? 0;
    }

    for (let startX = 0; startX <= analysisSize.width - bandWidth; startX += 2) {
      if (startX > 0) {
        runningScore += columnEnergy[startX + bandWidth - 1] ?? 0;
        runningScore -= columnEnergy[startX - 1] ?? 0;
      }

      if (runningScore > bestColumnScore) {
        bestColumnScore = runningScore;
        bestBandX = startX;
        bestBandWidth = bandWidth;
      }
    }
  }

  if (bestColumnScore <= 0) {
    logBarcodeDebug("localize-region:no-column-band", {
      width: image.naturalWidth,
      height: image.naturalHeight,
      bestBandY,
      bestBandHeight,
    });
    return null;
  }

  const xScale = image.naturalWidth / analysisSize.width;
  const yScale = image.naturalHeight / analysisSize.height;
  const horizontalPadding = Math.round(bestBandWidth * 0.08 * xScale);
  const verticalPadding = Math.round(bestBandHeight * 0.12 * yScale);

  const region = clampCropRegion(image, {
    x: Math.round(bestBandX * xScale) - horizontalPadding,
    y: Math.round(bestBandY * yScale) - verticalPadding,
    width: Math.round(bestBandWidth * xScale) + horizontalPadding * 2,
    height: Math.round(bestBandHeight * yScale) + verticalPadding * 2,
  });

  logBarcodeDebug("localize-region:success", {
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    analysisWidth: analysisSize.width,
    analysisHeight: analysisSize.height,
    bestBandScore,
    bestColumnScore,
    region,
  });

  return region;
}

function createBarcodeVariantSource(
  image: HTMLImageElement,
  options: {
    grayscale?: boolean;
    threshold?: number;
    contrastBoost?: number;
    crop?: { x: number; y: number; width: number; height: number };
    scaleMultiplier?: number;
    rotateDegrees?: number;
    stretchX?: number;
    stretchY?: number;
  } = {},
): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cropX = options.crop?.x ?? 0;
  const cropY = options.crop?.y ?? 0;
  const cropWidth = options.crop?.width ?? image.naturalWidth;
  const cropHeight = options.crop?.height ?? image.naturalHeight;
  const scaleMultiplier = options.scaleMultiplier ?? 1;
  const stretchX = options.stretchX ?? 1;
  const stretchY = options.stretchY ?? 1;
  const rotationRadians = ((options.rotateDegrees ?? 0) * Math.PI) / 180;
  const baseTargetSize = clampBarcodeCanvasSize(
    cropWidth * scaleMultiplier * stretchX,
    cropHeight * scaleMultiplier * stretchY,
  );
  const targetSize = rotationRadians === 0
    ? baseTargetSize
    : clampBarcodeCanvasSize(
        Math.abs(baseTargetSize.width * Math.cos(rotationRadians)) +
          Math.abs(baseTargetSize.height * Math.sin(rotationRadians)),
        Math.abs(baseTargetSize.width * Math.sin(rotationRadians)) +
          Math.abs(baseTargetSize.height * Math.cos(rotationRadians)),
      );

  const canvas = document.createElement("canvas");
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.save();
  context.translate(targetSize.width / 2, targetSize.height / 2);
  if (rotationRadians !== 0) {
    context.rotate(rotationRadians);
  }
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    -baseTargetSize.width / 2,
    -baseTargetSize.height / 2,
    baseTargetSize.width,
    baseTargetSize.height,
  );
  context.restore();

  if (options.grayscale || typeof options.threshold === "number") {
    const imageData = context.getImageData(0, 0, targetSize.width, targetSize.height);
    const pixels = imageData.data;
    const contrast = options.contrastBoost ?? 0;
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast || 1));

    for (let index = 0; index < pixels.length; index += 4) {
      const luminance =
        pixels[index] * 0.299 +
        pixels[index + 1] * 0.587 +
        pixels[index + 2] * 0.114;

      let nextValue = luminance;
      if (contrast !== 0) {
        nextValue = contrastFactor * (luminance - 128) + 128;
      }

      if (typeof options.threshold === "number") {
        nextValue = nextValue >= options.threshold ? 255 : 0;
      }

      const normalizedValue = Math.max(0, Math.min(255, Math.round(nextValue)));
      pixels[index] = normalizedValue;
      pixels[index + 1] = normalizedValue;
      pixels[index + 2] = normalizedValue;
    }

    context.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL("image/png");
}

function createBarcodeImageCandidateSources(image: HTMLImageElement): BarcodeImageCandidate[] {
  const localizedRegion = localizeBarcodeRegion(image);
  const centerCropWidth = Math.round(image.naturalWidth * 0.84);
  const centerCropHeight = Math.round(image.naturalHeight * 0.45);
  const centerCropX = Math.max(0, Math.round((image.naturalWidth - centerCropWidth) / 2));
  const centerCropY = Math.max(0, Math.round((image.naturalHeight - centerCropHeight) / 2));
  const bottomWideWidth = Math.round(image.naturalWidth * 0.92);
  const bottomWideHeight = Math.round(image.naturalHeight * 0.34);
  const bottomWideX = Math.max(0, Math.round((image.naturalWidth - bottomWideWidth) / 2));
  const bottomWideY = Math.max(0, image.naturalHeight - bottomWideHeight - Math.round(image.naturalHeight * 0.03));
  const bottomTightWidth = Math.round(image.naturalWidth * 0.82);
  const bottomTightHeight = Math.round(image.naturalHeight * 0.24);
  const bottomTightX = Math.max(0, Math.round((image.naturalWidth - bottomTightWidth) / 2));
  const bottomTightY = Math.max(0, image.naturalHeight - bottomTightHeight - Math.round(image.naturalHeight * 0.02));

  const candidates = [
    localizedRegion
      ? {
          label: "localized-grayscale",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 105,
            scaleMultiplier: 1.5,
            crop: localizedRegion,
          }),
        }
      : null,
    localizedRegion
      ? {
          label: "localized-threshold",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 130,
            threshold: 148,
            scaleMultiplier: 1.75,
            crop: localizedRegion,
          }),
        }
      : null,
    localizedRegion
      ? {
          label: "localized-stretch-wide",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 110,
            scaleMultiplier: 1.45,
            stretchX: 1.45,
            crop: localizedRegion,
          }),
        }
      : null,
    localizedRegion
      ? {
          label: "localized-stretch-wide-threshold",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 125,
            threshold: 144,
            scaleMultiplier: 1.55,
            stretchX: 1.6,
            crop: localizedRegion,
          }),
        }
      : null,
    localizedRegion
      ? {
          label: "localized-rotate-left-soft",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 100,
            scaleMultiplier: 1.55,
            rotateDegrees: -3,
            stretchX: 1.25,
            crop: localizedRegion,
          }),
        }
      : null,
    localizedRegion
      ? {
          label: "localized-rotate-right-soft",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 100,
            scaleMultiplier: 1.55,
            rotateDegrees: 3,
            stretchX: 1.25,
            crop: localizedRegion,
          }),
        }
      : null,
    localizedRegion
      ? {
          label: "localized-rotate-left",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 120,
            threshold: 145,
            scaleMultiplier: 1.7,
            rotateDegrees: -6,
            stretchX: 1.2,
            crop: localizedRegion,
          }),
        }
      : null,
    localizedRegion
      ? {
          label: "localized-rotate-right",
          source: createBarcodeVariantSource(image, {
            grayscale: true,
            contrastBoost: 120,
            threshold: 145,
            scaleMultiplier: 1.7,
            rotateDegrees: 6,
            stretchX: 1.2,
            crop: localizedRegion,
          }),
        }
      : null,
    {
      label: "full-grayscale",
      source: createBarcodeVariantSource(image, { grayscale: true, contrastBoost: 80 }),
    },
    {
      label: "full-threshold",
      source: createBarcodeVariantSource(image, { grayscale: true, contrastBoost: 110, threshold: 150 }),
    },
    {
      label: "center-grayscale",
      source: createBarcodeVariantSource(image, {
        grayscale: true,
        contrastBoost: 90,
        crop: {
          x: centerCropX,
          y: centerCropY,
          width: centerCropWidth,
          height: centerCropHeight,
        },
      }),
    },
    {
      label: "bottom-wide-grayscale",
      source: createBarcodeVariantSource(image, {
        grayscale: true,
        contrastBoost: 95,
        scaleMultiplier: 1.35,
        crop: {
          x: bottomWideX,
          y: bottomWideY,
          width: bottomWideWidth,
          height: bottomWideHeight,
        },
      }),
    },
    {
      label: "bottom-wide-threshold",
      source: createBarcodeVariantSource(image, {
        grayscale: true,
        contrastBoost: 125,
        threshold: 152,
        scaleMultiplier: 1.45,
        crop: {
          x: bottomWideX,
          y: bottomWideY,
          width: bottomWideWidth,
          height: bottomWideHeight,
        },
      }),
    },
    {
      label: "bottom-tight-grayscale",
      source: createBarcodeVariantSource(image, {
        grayscale: true,
        contrastBoost: 105,
        scaleMultiplier: 1.6,
        crop: {
          x: bottomTightX,
          y: bottomTightY,
          width: bottomTightWidth,
          height: bottomTightHeight,
        },
      }),
    },
    {
      label: "bottom-tight-threshold",
      source: createBarcodeVariantSource(image, {
        grayscale: true,
        contrastBoost: 135,
        threshold: 145,
        scaleMultiplier: 1.8,
        crop: {
          x: bottomTightX,
          y: bottomTightY,
          width: bottomTightWidth,
          height: bottomTightHeight,
        },
      }),
    },
    {
      label: "center-threshold",
      source: createBarcodeVariantSource(image, {
        grayscale: true,
        contrastBoost: 120,
        threshold: 145,
        crop: {
          x: centerCropX,
          y: centerCropY,
          width: centerCropWidth,
          height: centerCropHeight,
        },
      }),
    },
  ].filter((value): value is BarcodeImageCandidate => Boolean(value?.source));

  logBarcodeDebug("image-candidates:prepared", {
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    localizedRegion,
    candidateLabels: candidates.map((candidate) => candidate.label),
  });

  return candidates;
}

async function detectBarcodeFromImageWithNativeDetector(file: File): Promise<string | null> {
  const BarcodeDetectorConstructor = getBarcodeDetectorConstructor();
  if (!BarcodeDetectorConstructor || typeof createImageBitmap !== "function") {
    return null;
  }

  let imageBitmap: ImageBitmap | null = null;

  try {
    const supportedFormats =
      typeof BarcodeDetectorConstructor.getSupportedFormats === "function"
        ? await BarcodeDetectorConstructor.getSupportedFormats()
        : BARCODE_DETECTOR_FORMATS;
    const formats = BARCODE_DETECTOR_FORMATS.filter((format) => supportedFormats.includes(format));

    if (formats.length === 0) {
      logBarcodeDebug("native-detector:no-supported-formats");
      return null;
    }

    imageBitmap = await createImageBitmap(file);
    const detector = new BarcodeDetectorConstructor({ formats });
    const detections = await detector.detect(imageBitmap);
    const value =
      detections
        .find(
          (candidate) =>
            typeof candidate.rawValue === "string" && candidate.rawValue.trim().length > 0,
        )
        ?.rawValue?.trim() ?? null;

    logBarcodeDebug("native-detector:completed", {
      detectionCount: detections.length,
      found: Boolean(value),
      value,
    });

    return value;
  } finally {
    imageBitmap?.close();
  }
}

async function detectBarcodeFromImageElementWithNativeDetector(
  image: HTMLImageElement,
): Promise<string | null> {
  const BarcodeDetectorConstructor = getBarcodeDetectorConstructor();
  if (!BarcodeDetectorConstructor) {
    return null;
  }

  const supportedFormats =
    typeof BarcodeDetectorConstructor.getSupportedFormats === "function"
      ? await BarcodeDetectorConstructor.getSupportedFormats()
      : BARCODE_DETECTOR_FORMATS;
  const formats = BARCODE_DETECTOR_FORMATS.filter((format) => supportedFormats.includes(format));

  if (formats.length === 0) {
    return null;
  }

  const detector = new BarcodeDetectorConstructor({ formats });
  const detections = await detector.detect(image);
  return (
    detections
      .find(
        (candidate) =>
          typeof candidate.rawValue === "string" && candidate.rawValue.trim().length > 0,
      )
      ?.rawValue?.trim() ?? null
  );
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.src = src;

  if (typeof image.decode === "function") {
    try {
      await image.decode();
      return image;
    } catch {
      // Fall back to load events for browsers that reject decode on blob URLs.
    }
  }

  return await new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load barcode image."));
  });
}

function createCanvasFromImageElement(image: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, image.naturalWidth || image.width);
  canvas.height = Math.max(1, image.naturalHeight || image.height);

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function runWithSuppressedZxingNotFound<T>(action: () => T): T {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("MultiFormatReader: non-ReaderException from reader: NotFoundException")
    ) {
      return;
    }

    originalWarn(...args);
  };

  try {
    return action();
  } finally {
    console.warn = originalWarn;
  }
}

async function detectBarcodeFromImageWithZxing(file: File): Promise<string | null> {
  const {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    GlobalHistogramBinarizer,
    HTMLCanvasElementLuminanceSource,
    HybridBinarizer,
    MultiFormatReader,
  } = await import("@zxing/library");

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();
  reader.setHints(hints);
  const decodeBarcodeFromCanvas = (canvas: HTMLCanvasElement): string | null => {
    const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
    const decodeInputs = [
      new BinaryBitmap(new HybridBinarizer(luminanceSource)),
      new BinaryBitmap(new HybridBinarizer(luminanceSource.invert())),
      new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource)),
      new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource.invert())),
    ];

    for (const bitmap of decodeInputs) {
      try {
        const result = runWithSuppressedZxingNotFound(() => reader.decodeWithState(bitmap));
        const value = result.getText().trim();
        if (value) {
          return value;
        }
      } catch {
        continue;
      }
    }

    return null;
  };
  const imageUrl = URL.createObjectURL(file);

  try {
    const baseImage = await loadImageElement(imageUrl);
    const candidateSources = [
      { label: "original", source: imageUrl },
      ...createBarcodeImageCandidateSources(baseImage),
    ];

    logBarcodeDebug("zxing-image:start", {
      candidateCount: candidateSources.length,
      fileName: file.name,
      fileSize: file.size,
    });

    for (const candidate of candidateSources) {
      try {
        const image = candidate.source === imageUrl
          ? baseImage
          : await loadImageElement(candidate.source);

        try {
          const nativeValue = await detectBarcodeFromImageElementWithNativeDetector(image);
          if (nativeValue) {
            logBarcodeDebug("native-candidate:success", {
              candidateLabel: candidate.label,
              value: nativeValue,
            });
            return nativeValue;
          }
        } catch (error) {
          logBarcodeDebug("native-candidate:error", {
            candidateLabel: candidate.label,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        const canvas = createCanvasFromImageElement(image);
        if (!canvas) {
          logBarcodeDebug("zxing-image:canvas-unavailable", {
            candidateLabel: candidate.label,
          });
          continue;
        }

        const value = decodeBarcodeFromCanvas(canvas);
        if (value) {
          logBarcodeDebug("zxing-image:success", {
            candidateLabel: candidate.label,
            value,
          });
          return value;
        }

        logBarcodeDebug("zxing-image:not-found", {
          candidateLabel: candidate.label,
        });
      } catch (error) {
        logBarcodeDebug("zxing-image:error", {
          candidateLabel: candidate.label,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    logBarcodeDebug("zxing-image:no-match");
    return null;
  } finally {
    reader.reset();
    URL.revokeObjectURL(imageUrl);
  }
}

async function detectBarcodeFromImageFile(file: File): Promise<string | null> {
  try {
    logBarcodeDebug("image-decode:start", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    const barcode = await detectBarcodeFromImageWithNativeDetector(file);
    if (barcode) {
      logBarcodeDebug("image-decode:native-success", { barcode });
      return barcode;
    }
  } catch {
    // Fall through to the JS decoder when native detection is unavailable or fails.
    logBarcodeDebug("image-decode:native-failed-falling-back");
  }

  const barcode = await detectBarcodeFromImageWithZxing(file);
  logBarcodeDebug("image-decode:final-result", {
    found: Boolean(barcode),
    barcode,
  });
  return barcode;
}

function getBarcodeCameraErrorKey(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "barcode_scanner_permission_denied";
    }

    if (error.name === "NotFoundError") {
      return "barcode_scanner_not_found";
    }

    if (error.name === "NotReadableError") {
      return "barcode_scanner_busy";
    }
  }

  return "barcode_scanner_permission_error";
}

function getBarcodeDetectorConstructor(): BarcodeDetectorConstructorLike | null {
  return (
    globalThis as typeof globalThis & {
      BarcodeDetector?: BarcodeDetectorConstructorLike;
    }
  ).BarcodeDetector ?? null;
}

function createManualReviewItem(): ReviewFormItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    barcode: null,
    quantity: "",
    unit: "ks",
    category: "other",
    expiryDate: "",
    confidence: null,
    source: "manual",
    needsReview: false,
    trackingMode: "quantity",
    inStock: true,
  };
}

function mapReviewItem(item: ReceiptScanReviewItem): ReviewFormItem {
  return {
    id: item.id,
    name: item.name,
    barcode: item.barcode ?? null,
    quantity: item.quantity === null ? "" : String(item.quantity),
    unit: item.unit ?? "ks",
    category: item.category ?? "other",
    expiryDate: item.expiryDate ?? "",
    confidence: item.confidence,
    source: item.source,
    needsReview: item.needsReview,
    trackingMode: "quantity",
    inStock: true,
  };
}

export default function ReceiptScanModal({
  isOpen,
  onClose,
  onCompleted,
  initialEntryMode = "receipt",
}: ReceiptScanModalProps) {
  const t = useTranslations("pantry");
  const shouldReduceMotion = useReducedMotion();
  const isBarcodeFlow = initialEntryMode === "barcode";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeFileInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorLike | null>(null);
  const barcodeReaderRef = useRef<ContinuousBarcodeReaderLike | null>(null);
  const barcodeScanTimeoutRef = useRef<number | null>(null);
  const barcodeLookupInFlightRef = useRef(false);
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [entryMode, setEntryMode] = useState<ScanEntryMode>(initialEntryMode);
  const [items, setItems] = useState<ReviewFormItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [vendor, setVendor] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [barcodeScannerState, setBarcodeScannerState] = useState<BarcodeScannerState>("idle");
  const [barcodeScannerMessage, setBarcodeScannerMessage] = useState<string | null>(null);
  const [barcodeScanAttempt, setBarcodeScanAttempt] = useState(0);
  const [barcodeScannerRequested, setBarcodeScannerRequested] = useState(false);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null);
  const [barcodeLookupOutcome, setBarcodeLookupOutcome] =
    useState<BarcodeLookupOutcome | null>(null);

  const categories = useMemo(
    () => [
      { value: "dairy", label: t("categories.dairy") },
      { value: "meat_fish", label: t("categories.meat_fish") },
      { value: "fruit", label: t("categories.fruit") },
      { value: "vegetables", label: t("categories.vegetables") },
      { value: "grains", label: t("categories.grains") },
      { value: "eggs", label: t("categories.eggs") },
      { value: "condiments", label: t("categories.condiments") },
      { value: "beverages", label: t("categories.beverages") },
      { value: "nuts_seeds", label: t("categories.nuts_seeds") },
      { value: "other", label: t("categories.other") },
    ],
    [t],
  );

  const canSaveBarcodeToCatalog =
    isBarcodeFlow &&
    items.some((item) => item.barcode && item.source === "manual");

  const activeBarcodeValue =
    items.find((item) => item.barcode)?.barcode ?? lastDetectedBarcode;
  const isUnknownBarcodeResult =
    isBarcodeFlow && barcodeLookupOutcome === "unknown_barcode" && canSaveBarcodeToCatalog;
  const isCatalogUnavailableResult =
    isBarcodeFlow && barcodeLookupOutcome === "catalog_unavailable" && canSaveBarcodeToCatalog;

  const stopBarcodeScanner = useCallback(() => {
    if (barcodeScanTimeoutRef.current !== null) {
      window.clearTimeout(barcodeScanTimeoutRef.current);
      barcodeScanTimeoutRef.current = null;
    }

    if (barcodeStreamRef.current) {
      barcodeStreamRef.current.getTracks().forEach((track) => track.stop());
      barcodeStreamRef.current = null;
    }

    if (barcodeVideoRef.current) {
      barcodeVideoRef.current.srcObject = null;
    }

    barcodeDetectorRef.current = null;
    barcodeReaderRef.current?.reset();
    barcodeReaderRef.current = null;
  }, []);

  function resetState() {
    stopBarcodeScanner();
    setPhase("idle");
    setEntryMode(initialEntryMode);
    setItems([]);
    setWarnings([]);
    setVendor(null);
    setCurrency(null);
    setPartial(false);
    setBarcodeScannerState("idle");
    setBarcodeScannerMessage(null);
    setBarcodeScanAttempt(0);
    setBarcodeScannerRequested(false);
    setLastDetectedBarcode(null);
    setBarcodeLookupOutcome(null);
    barcodeLookupInFlightRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    if (barcodeFileInputRef.current) {
      barcodeFileInputRef.current.value = "";
    }
    if (barcodeCameraInputRef.current) {
      barcodeCameraInputRef.current.value = "";
    }
  }

  function handleClose() {
    if (phase === "scanning" || phase === "submitting") {
      return;
    }

    resetState();
    onClose();
  }

  function updateItem(
    id: string,
    field: keyof Omit<EditablePantryFormItem, "id">,
    value: EditablePantryFormItem[keyof Omit<EditablePantryFormItem, "id">],
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value, needsReview: false } : item,
      ),
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addManualItem() {
    setItems((current) => [...current, createManualReviewItem()]);
  }

  const handleBarcodeLookup = useCallback(
    async (barcode: string) => {
      if (barcodeLookupInFlightRef.current) {
        logBarcodeDebug("lookup:skipped-in-flight", { barcode });
        return;
      }

      barcodeLookupInFlightRef.current = true;
      logBarcodeDebug("lookup:start", { barcode });
      stopBarcodeScanner();
      setLastDetectedBarcode(barcode);
      setPhase("scanning");
      setWarnings([]);
      setVendor(null);
      setCurrency(null);
      setPartial(false);
      setBarcodeLookupOutcome(null);

      try {
        const response = await fetch("/api/pantry/scan-barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode }),
        });
        const data = (await response.json()) as ReceiptScanStartResponse & {
          error?: string;
        };

        if (!response.ok) {
          logBarcodeDebug("lookup:error-response", {
            barcode,
            status: response.status,
            error: data.error ?? null,
          });
          toast.error(data.error || t("barcode_lookup_error"));
          setPhase("idle");
          setBarcodeScannerState("error");
          setBarcodeScannerMessage(t("barcode_lookup_error"));
          return;
        }

        setItems(data.items.map(mapReviewItem));
        setWarnings(data.warnings ?? []);
        setVendor(data.vendor ?? null);
        setCurrency(data.currency ?? null);
        setPartial(data.partial);
        setBarcodeLookupOutcome(data.lookupOutcome ?? null);
        logBarcodeDebug("lookup:success", {
          barcode,
          itemCount: data.items.length,
          warnings: data.warnings?.length ?? 0,
          lookupOutcome: data.lookupOutcome ?? null,
          partial: data.partial,
        });
        setPhase("review");
      } catch (error) {
        console.error("[ReceiptScanModal] barcode lookup failed", error);
        logBarcodeDebug("lookup:exception", {
          barcode,
          error: error instanceof Error ? error.message : String(error),
        });
        toast.error(t("barcode_lookup_error"));
        setPhase("idle");
        setBarcodeScannerState("error");
        setBarcodeScannerMessage(t("barcode_lookup_error"));
      } finally {
        barcodeLookupInFlightRef.current = false;
      }
    },
    [stopBarcodeScanner, t],
  );

  const handleBarcodeImageUpload = useCallback(
    async (file: File) => {
      stopBarcodeScanner();
      setPhase("scanning");
      setBarcodeScannerState("starting");
      setBarcodeScannerMessage(t("barcode_photo_detecting"));
      setLastDetectedBarcode(null);

      try {
        const barcode = await detectBarcodeFromImageFile(file);

        if (!barcode) {
          setPhase("idle");
          setBarcodeScannerState("error");
          setBarcodeScannerMessage(t("barcode_photo_not_found"));
          toast.error(t("barcode_photo_not_found"));
          return;
        }

        await handleBarcodeLookup(barcode);
      } catch (error) {
        console.error("[ReceiptScanModal] barcode image detection failed", error);
        setPhase("idle");
        setBarcodeScannerState("error");
        setBarcodeScannerMessage(t("barcode_photo_not_found"));
        toast.error(t("barcode_photo_not_found"));
      }
    },
    [handleBarcodeLookup, stopBarcodeScanner, t],
  );

  useEffect(() => {
    if (!isOpen || phase !== "idle" || entryMode !== "barcode" || !barcodeScannerRequested) {
      stopBarcodeScanner();
      return;
    }

    let cancelled = false;

    async function startBarcodeScanner() {
      const BarcodeDetectorConstructor = getBarcodeDetectorConstructor();
      logBarcodeDebug("live-scanner:start", {
        hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
        hasBarcodeDetector: Boolean(BarcodeDetectorConstructor),
      });
      if (!navigator.mediaDevices?.getUserMedia) {
        setBarcodeScannerState("unsupported");
        setBarcodeScannerMessage(t("barcode_scanner_unsupported"));
        return;
      }

      if (navigator.permissions?.query) {
        try {
          await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
        } catch {
          // Ignore optional camera permission query failures.
        }
      }

      setBarcodeScannerState("starting");
      setBarcodeScannerMessage(null);
      setLastDetectedBarcode(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        logBarcodeDebug("live-scanner:stream-opened", {
          trackCount: stream.getTracks().length,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        barcodeStreamRef.current = stream;

        const video = barcodeVideoRef.current;
        if (!video) {
          setBarcodeScannerState("error");
          setBarcodeScannerMessage(t("barcode_scanner_permission_error"));
          stopBarcodeScanner();
          return;
        }

        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => undefined);

        const supportedFormats = BarcodeDetectorConstructor
          ? typeof BarcodeDetectorConstructor.getSupportedFormats === "function"
            ? await BarcodeDetectorConstructor.getSupportedFormats()
            : BARCODE_DETECTOR_FORMATS
          : [];
        const formats = BARCODE_DETECTOR_FORMATS.filter((format) =>
          supportedFormats.includes(format),
        );

        if (BarcodeDetectorConstructor && formats.length > 0) {
          logBarcodeDebug("live-scanner:mode-native", { formats });
          barcodeDetectorRef.current = new BarcodeDetectorConstructor({ formats });
          setBarcodeScannerState("ready");

          const scanNextFrame = async () => {
            if (cancelled || barcodeLookupInFlightRef.current) {
              return;
            }

            const activeVideo = barcodeVideoRef.current;
            const detector = barcodeDetectorRef.current;
            if (!activeVideo || !detector) {
              return;
            }

            try {
              if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const detections = await detector.detect(activeVideo);
                const barcode = detections
                  .find(
                    (candidate) =>
                      typeof candidate.rawValue === "string" && candidate.rawValue.trim().length > 0,
                  )
                  ?.rawValue?.trim();

                if (barcode) {
                  void handleBarcodeLookup(barcode);
                  return;
                }
              }
            } catch (error) {
              console.error("[ReceiptScanModal] barcode detection failed", error);
              setBarcodeScannerState("error");
              setBarcodeScannerMessage(t("barcode_scanner_detect_error"));
              return;
            }

            barcodeScanTimeoutRef.current = window.setTimeout(() => {
              void scanNextFrame();
            }, 350);
          };

          void scanNextFrame();
          return;
        }

        const {
          BrowserMultiFormatReader,
          BarcodeFormat,
          DecodeHintType,
        } = await import("@zxing/library");

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints) as ContinuousBarcodeReaderLike;
        barcodeReaderRef.current = reader;
        logBarcodeDebug("live-scanner:mode-zxing-fallback");
        setBarcodeScannerState("ready");

        reader.decodeFromVideoElementContinuously(video, (result, error) => {
          if (cancelled || barcodeLookupInFlightRef.current) {
            return;
          }

          const barcode = result?.getText()?.trim();
          if (barcode) {
            void handleBarcodeLookup(barcode);
            return;
          }

          const errorName =
            error instanceof Error || error instanceof DOMException
              ? error.name
              : null;

          if (
            error &&
            errorName !== "NotFoundException" &&
            errorName !== "ChecksumException" &&
            errorName !== "FormatException"
          ) {
            console.error("[ReceiptScanModal] zxing live detection failed", error);
            setBarcodeScannerState("error");
            setBarcodeScannerMessage(t("barcode_scanner_detect_error"));
          }
        });
      } catch (error) {
        const errorKey = getBarcodeCameraErrorKey(error);
        console.error("[ReceiptScanModal] barcode camera failed", error);
        logBarcodeDebug("live-scanner:error", {
          errorKey,
          error: error instanceof Error ? error.message : String(error),
        });
        setBarcodeScannerState("error");
        setBarcodeScannerMessage(t(errorKey));
      }
    }

    void startBarcodeScanner();

    return () => {
      cancelled = true;
      stopBarcodeScanner();
    };
  }, [
    barcodeScanAttempt,
    barcodeScannerRequested,
    entryMode,
    handleBarcodeLookup,
    isOpen,
    phase,
    stopBarcodeScanner,
    t,
  ]);

  const requestBarcodeScannerStart = useCallback(() => {
    logBarcodeDebug("live-scanner:requested");
    stopBarcodeScanner();
    setBarcodeScannerRequested(true);
    setBarcodeScannerState("idle");
    setBarcodeScannerMessage(null);
    setLastDetectedBarcode(null);
    setBarcodeScanAttempt((current) => current + 1);
  }, [stopBarcodeScanner]);

  useEffect(() => {
    if (!isOpen || phase !== "idle") {
      return;
    }

    stopBarcodeScanner();
    setEntryMode(initialEntryMode);
    setBarcodeScannerState("idle");
    setBarcodeScannerMessage(null);
    setBarcodeScannerRequested(false);
    setLastDetectedBarcode(null);
    setBarcodeLookupOutcome(null);
  }, [initialEntryMode, isOpen, phase, stopBarcodeScanner]);

  async function handleUpload(file: File) {
    setEntryMode("receipt");
    setPhase("scanning");
    setWarnings([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pantry/scan-receipt", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ReceiptScanStartResponse & {
        error?: string;
      };

      if (!response.ok) {
        toast.error(data.error || t("scan_error"));
        setPhase("idle");
        return;
      }

      setItems(data.items.map(mapReviewItem));
      setWarnings(data.warnings ?? []);
      setVendor(data.vendor ?? null);
      setCurrency(data.currency ?? null);
      setPartial(data.partial);
      setPhase("review");
    } catch (error) {
      console.error("[ReceiptScanModal] upload failed", error);
      toast.error(t("scan_error"));
      setPhase("idle");
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleUpload(file);
  }

  async function handleBarcodeFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleBarcodeImageUpload(file);
  }

  async function handleFinalize() {
    const validItems = items
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        barcode: item.barcode ?? null,
        quantity: item.quantity ? Number.parseFloat(item.quantity) : null,
        unit: item.quantity ? item.unit || null : null,
        category: item.category || null,
        expiryDate: item.expiryDate ? `${item.expiryDate}T12:00:00` : null,
        confidence: item.confidence,
        source: item.source,
        needsReview: item.needsReview,
      }));

    if (validItems.length === 0) {
      toast.error(t("scan_review_empty"));
      return;
    }

    setPhase("submitting");
    try {
      const response = await fetch("/api/pantry/scan-receipt/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems,
          vendor,
          currency,
          partial,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error || t("scan_finalize_error"));
        setPhase("review");
        return;
      }

      await onCompleted();
      toast.success(t("scan_finalize_success"));
      resetState();
      onClose();
    } catch (error) {
      console.error("[ReceiptScanModal] finalize failed", error);
      toast.error(t("scan_finalize_error"));
      setPhase("review");
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <>
          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 32 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 32 }}
            transition={shouldReduceMotion ? undefined : { type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[min(88dvh,860px)] w-full flex-col rounded-t-[1.75rem] bg-white shadow-[0_-16px_50px_rgba(17,24,39,0.18)] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[92vh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem]"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-200" />
            </div>

            <div className="flex items-center justify-between px-5 pb-4 pt-4 sm:px-6 sm:pt-6">
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full border-transparent bg-amber-100 text-amber-800">
                    {t("scan_premium_badge")}
                  </Badge>
                  {partial ? (
                    <Badge className="rounded-full border-transparent bg-orange-100 text-orange-700">
                      {t("scan_partial_badge")}
                    </Badge>
                  ) : null}
                </div>
                <h2 className="mt-2 text-lg font-bold text-gray-900">
                  {isBarcodeFlow ? t("barcode_scanner_title") : t("scan_modal_title")}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {phase === "review"
                    ? isUnknownBarcodeResult
                      ? t("barcode_unknown_review_description")
                      : isCatalogUnavailableResult
                        ? t("barcode_catalog_unavailable_review_description")
                        : t("scan_review_description")
                    : isBarcodeFlow
                      ? t("barcode_scanner_description")
                      : t("scan_modal_description")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
              {phase === "idle" ? (
                <div className="space-y-4 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-700">
                      <WandSparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t("scan_secure_title")}</p>
                      <p className="mt-1 text-sm text-gray-600">{t("scan_secure_description")}</p>
                    </div>
                  </div>

                  {!isBarcodeFlow ? (
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-white/80 p-4">
                      <p className="text-sm font-medium text-gray-900">{t("scan_upload_title")}</p>
                      <p className="mt-1 text-sm text-gray-600">{t("scan_upload_description")}</p>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => void handleFileChange(event)}
                      />
                      <Input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => void handleFileChange(event)}
                      />

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          className="justify-center"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {t("scan_choose_file")}
                        </Button>
                        <Button
                          type="button"
                          className="justify-center border-2 border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-black-primary hover:bg-eatrivo-white-primary/90"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {t("scan_open_camera")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-white/80 p-4">
                      <p className="text-sm font-medium text-gray-900">{t("barcode_scanner_title")}</p>
                      <p className="mt-1 text-sm text-gray-600">{t("barcode_scanner_description")}</p>
                      <Input
                        ref={barcodeFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => void handleBarcodeFileChange(event)}
                      />
                      <Input
                        ref={barcodeCameraInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => void handleBarcodeFileChange(event)}
                      />

                      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-amber-200 bg-gray-950 shadow-sm">
                        <div className="relative aspect-[4/3]">
                          <video
                            ref={barcodeVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                          {barcodeScannerState === "ready" ? (
                            <>
                              <div className="pointer-events-none absolute inset-6 rounded-[1.5rem] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
                              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/60 px-4 py-3 text-left text-white">
                                <p className="text-sm font-semibold">{t("barcode_scanner_ready")}</p>
                                <p className="mt-1 text-xs text-white/80">{t("barcode_scanner_ready_hint")}</p>
                                {lastDetectedBarcode ? (
                                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200">
                                    {t("barcode_detected_label", { value: lastDetectedBarcode })}
                                  </p>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/65 px-5 text-center text-white">
                              {barcodeScannerState === "starting" ? (
                                <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
                              ) : (
                                <ScanBarcode className="h-7 w-7 text-amber-300" />
                              )}
                              <p className="max-w-xs text-sm font-medium">
                                {barcodeScannerState === "starting"
                                  ? t("barcode_scanner_starting")
                                  : barcodeScannerMessage ?? t("barcode_scanner_idle_hint")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-sm font-medium text-gray-900">
                          {t("barcode_photo_title")}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {t("barcode_photo_description")}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          className="justify-center"
                          onClick={requestBarcodeScannerStart}
                          disabled={barcodeScannerState === "starting"}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {barcodeScanAttempt > 0
                            ? t("barcode_scanner_retry")
                            : t("barcode_scanner_start")}
                        </Button>
                        <Button
                          type="button"
                          className="justify-center border-2 border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-black-primary hover:bg-eatrivo-white-primary/90"
                          onClick={() => barcodeCameraInputRef.current?.click()}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {t("barcode_photo_camera")}
                        </Button>
                        <Button
                          type="button"
                          className="justify-center border-2 border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-black-primary hover:bg-eatrivo-white-primary/90"
                          onClick={() => barcodeFileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {t("barcode_photo_upload")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {phase === "scanning" ? (
                <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-6 text-center">
                  <div className="rounded-full bg-amber-500/10 p-4 text-amber-700">
                    <Loader2 className="h-7 w-7 animate-spin" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {isBarcodeFlow ? t("barcode_loading_title") : t("scan_loading_title")}
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-gray-600">
                    {isBarcodeFlow
                      ? t("barcode_loading_description")
                      : t("scan_loading_description")}
                  </p>
                </div>
              ) : null}

              {phase === "review" || phase === "submitting" ? (
                <div className="space-y-4">
                  {!isBarcodeFlow ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{t("scan_quantity_review_note")}</p>
                      </div>
                    </div>
                  ) : null}

                  {canSaveBarcodeToCatalog ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          {isUnknownBarcodeResult
                            ? t("barcode_unknown_create_note", {
                                value: activeBarcodeValue ?? "",
                              })
                            : isCatalogUnavailableResult
                              ? t("barcode_catalog_unavailable_note", {
                                  value: activeBarcodeValue ?? "",
                                })
                              : t("barcode_catalog_save_note")}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {(vendor || currency || warnings.length > 0) ? (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {vendor ? <Badge className="rounded-full border-transparent bg-white text-gray-700">{vendor}</Badge> : null}
                        {currency ? <Badge className="rounded-full border-transparent bg-white text-gray-700">{currency}</Badge> : null}
                        <Badge className="rounded-full border-transparent bg-amber-100 text-amber-800">
                          {t("scan_detected_count", { count: items.length })}
                        </Badge>
                      </div>
                      {warnings.length > 0 ? (
                        <div className="mt-3 space-y-2 text-sm text-amber-900">
                          {warnings.map((warning) => (
                            <div key={warning} className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="space-y-2">
                        <PantryEditableItemCard
                          item={item}
                          index={index}
                          categories={categories}
                          labels={{
                            itemLabel: t("batch_item_label", { index: index + 1 }),
                            fieldName: t("field_name"),
                            fieldNamePlaceholder: t("field_name_placeholder"),
                            fieldQuantity: t("field_quantity"),
                            fieldQuantityPlaceholder: t("field_quantity_placeholder"),
                            fieldUnit: t("field_unit"),
                            fieldCategory: t("field_category"),
                            fieldExpiry: t("field_expiry"),
                            fieldOptional: t("field_optional"),
                          }}
                          autoFocus={Boolean(isUnknownBarcodeResult && index === 0)}
                          canRemove={items.length > 1}
                          onChange={updateItem}
                          onRemove={removeItem}
                        />
                        <div className="flex items-center gap-2 px-1 text-xs text-gray-500">
                          <Badge className="rounded-full border-transparent bg-gray-100 text-gray-600">
                            {item.source === "manual" ? t("scan_manual_source") : t("scan_detected_source")}
                          </Badge>
                          {item.confidence !== null ? (
                            <span>{t("scan_confidence", { value: Math.round(item.confidence * 100) })}</span>
                          ) : null}
                          {item.barcode ? (
                            <span>{t("barcode_value_label", { value: item.barcode })}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addManualItem}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-eatrivo-purple/30 bg-eatrivo-purple/5 px-4 py-3 text-sm font-medium text-eatrivo-purple transition-colors hover:bg-eatrivo-purple/10"
                  >
                    <Plus className="h-4 w-4" />
                    {t("scan_add_manual")}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="border-t border-gray-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 border-2 border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-black-primary"
                >
                  {t("quick_add_cancel")}
                </Button>
                {phase === "review" || phase === "submitting" ? (
                  <Button
                    type="button"
                    onClick={() => void handleFinalize()}
                    disabled={phase === "submitting"}
                    className="flex-1 bg-amber-500 text-white hover:bg-amber-500/90"
                  >
                    {phase === "submitting" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {t("scan_finalize")}
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}