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

const BARCODE_DETECTOR_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

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
      return null;
    }

    imageBitmap = await createImageBitmap(file);
    const detector = new BarcodeDetectorConstructor({ formats });
    const detections = await detector.detect(imageBitmap);

    return (
      detections
        .find(
          (candidate) =>
            typeof candidate.rawValue === "string" && candidate.rawValue.trim().length > 0,
        )
        ?.rawValue?.trim() ?? null
    );
  } finally {
    imageBitmap?.close();
  }
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

async function detectBarcodeFromImageWithZxing(file: File): Promise<string | null> {
  const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType, NotFoundException } =
    await import("@zxing/library");

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints);
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(imageUrl);
    const result = await reader.decodeFromImageElement(image);
    return result.getText().trim() || null;
  } catch (error) {
    if (error instanceof NotFoundException) {
      return null;
    }

    throw error;
  } finally {
    reader.reset();
    URL.revokeObjectURL(imageUrl);
  }
}

async function detectBarcodeFromImageFile(file: File): Promise<string | null> {
  try {
    const barcode = await detectBarcodeFromImageWithNativeDetector(file);
    if (barcode) {
      return barcode;
    }
  } catch {
    // Fall through to the JS decoder when native detection is unavailable or fails.
  }

  return await detectBarcodeFromImageWithZxing(file);
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
    value: string,
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
        return;
      }

      barcodeLookupInFlightRef.current = true;
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
        setPhase("review");
      } catch (error) {
        console.error("[ReceiptScanModal] barcode lookup failed", error);
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
      if (!BarcodeDetectorConstructor || !navigator.mediaDevices?.getUserMedia) {
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
        const supportedFormats =
          typeof BarcodeDetectorConstructor.getSupportedFormats === "function"
            ? await BarcodeDetectorConstructor.getSupportedFormats()
            : BARCODE_DETECTOR_FORMATS;
        const formats = BARCODE_DETECTOR_FORMATS.filter((format) =>
          supportedFormats.includes(format),
        );

        if (formats.length === 0) {
          setBarcodeScannerState("unsupported");
          setBarcodeScannerMessage(t("barcode_scanner_unsupported"));
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
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
      } catch (error) {
        const errorKey = getBarcodeCameraErrorKey(error);
        console.error("[ReceiptScanModal] barcode camera failed", error);
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
      const data = (await response.json()) as {
        error?: string;
        code?: string;
        feedbackRecorded?: boolean;
      };

      if (!response.ok) {
        toast.error(
          data.code === "INGREDIENT_RESOLUTION_FAILED"
            ? data.feedbackRecorded
              ? t("ingredient_resolution_feedback_sent")
              : t("ingredient_resolution_failed")
            : data.error || t("scan_finalize_error"),
        );
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