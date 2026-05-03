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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorLike | null>(null);
  const barcodeScanTimeoutRef = useRef<number | null>(null);
  const barcodeLookupInFlightRef = useRef(false);
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [entryMode, setEntryMode] = useState<ScanEntryMode>("receipt");
  const [items, setItems] = useState<ReviewFormItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [vendor, setVendor] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [barcodeScannerState, setBarcodeScannerState] = useState<BarcodeScannerState>("idle");
  const [barcodeScannerMessage, setBarcodeScannerMessage] = useState<string | null>(null);
  const [barcodeScanAttempt, setBarcodeScanAttempt] = useState(0);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null);

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
    setEntryMode("receipt");
    setItems([]);
    setWarnings([]);
    setVendor(null);
    setCurrency(null);
    setPartial(false);
    setBarcodeScannerState("idle");
    setBarcodeScannerMessage(null);
    setBarcodeScanAttempt(0);
    setLastDetectedBarcode(null);
    barcodeLookupInFlightRef.current = false;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
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
          setEntryMode("barcode");
          setBarcodeScannerState("error");
          setBarcodeScannerMessage(t("barcode_lookup_error"));
          return;
        }

        setItems(data.items.map(mapReviewItem));
        setWarnings(data.warnings ?? []);
        setVendor(data.vendor ?? null);
        setCurrency(data.currency ?? null);
        setPartial(data.partial);
        setPhase("review");
      } catch (error) {
        console.error("[ReceiptScanModal] barcode lookup failed", error);
        toast.error(t("barcode_lookup_error"));
        setPhase("idle");
        setEntryMode("barcode");
        setBarcodeScannerState("error");
        setBarcodeScannerMessage(t("barcode_lookup_error"));
      } finally {
        barcodeLookupInFlightRef.current = false;
      }
    },
    [stopBarcodeScanner, t],
  );

  useEffect(() => {
    if (!isOpen || phase !== "idle" || entryMode !== "barcode") {
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
        console.error("[ReceiptScanModal] barcode camera failed", error);
        setBarcodeScannerState("error");
        setBarcodeScannerMessage(t("barcode_scanner_permission_error"));
      }
    }

    void startBarcodeScanner();

    return () => {
      cancelled = true;
      stopBarcodeScanner();
    };
  }, [barcodeScanAttempt, entryMode, handleBarcodeLookup, isOpen, phase, stopBarcodeScanner, t]);

  const activateReceiptMode = useCallback(() => {
    stopBarcodeScanner();
    setEntryMode("receipt");
    setBarcodeScannerState("idle");
    setBarcodeScannerMessage(null);
    setLastDetectedBarcode(null);
  }, [stopBarcodeScanner]);

  const activateBarcodeMode = useCallback(() => {
    stopBarcodeScanner();
    setEntryMode("barcode");
    setBarcodeScannerState("idle");
    setBarcodeScannerMessage(null);
    setLastDetectedBarcode(null);
    setBarcodeScanAttempt((current) => current + 1);
  }, [stopBarcodeScanner]);

  useEffect(() => {
    if (!isOpen || phase !== "idle") {
      return;
    }

    if (initialEntryMode === "barcode") {
      activateBarcodeMode();
      return;
    }

    activateReceiptMode();
  }, [activateBarcodeMode, activateReceiptMode, initialEntryMode, isOpen, phase]);

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
                <h2 className="mt-2 text-lg font-bold text-gray-900">{t("scan_modal_title")}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {phase === "review" ? t("scan_review_description") : t("scan_modal_description")}
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

                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-amber-200 bg-white/70 p-1">
                    <Button
                      type="button"
                      onClick={activateReceiptMode}
                      className={
                        entryMode === "receipt"
                          ? "bg-amber-500 text-white hover:bg-amber-500/90"
                          : "border border-transparent bg-transparent text-gray-700 shadow-none hover:bg-amber-100"
                      }
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {t("scan_mode_receipt")}
                    </Button>
                    <Button
                      type="button"
                      onClick={activateBarcodeMode}
                      className={
                        entryMode === "barcode"
                          ? "bg-amber-500 text-white hover:bg-amber-500/90"
                          : "border border-transparent bg-transparent text-gray-700 shadow-none hover:bg-amber-100"
                      }
                    >
                      <ScanBarcode className="mr-2 h-4 w-4" />
                      {t("scan_mode_barcode")}
                    </Button>
                  </div>

                  {entryMode === "receipt" ? (
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
                                  : barcodeScannerMessage ?? t("barcode_scanner_ready_hint")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          className="justify-center"
                          onClick={activateBarcodeMode}
                          disabled={barcodeScannerState === "starting"}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          {t("barcode_scanner_retry")}
                        </Button>
                        <Button
                          type="button"
                          className="justify-center border-2 border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-black-primary hover:bg-eatrivo-white-primary/90"
                          onClick={activateReceiptMode}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {t("scan_mode_receipt")}
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
                    {entryMode === "barcode" ? t("barcode_loading_title") : t("scan_loading_title")}
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-gray-600">
                    {entryMode === "barcode"
                      ? t("barcode_loading_description")
                      : t("scan_loading_description")}
                  </p>
                </div>
              ) : null}

              {phase === "review" || phase === "submitting" ? (
                <div className="space-y-4">
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