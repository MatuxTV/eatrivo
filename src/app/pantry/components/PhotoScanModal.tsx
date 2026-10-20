"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Camera, ImagePlus, Loader2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/utils";
import { compressPhoto } from "@/lib/pantry/photo-scan/client-compress";
import {
  MAX_PHOTOS_PER_REQUEST,
  MAX_TOTAL_PHOTO_BYTES,
  PHOTO_ITEM_CATEGORIES,
} from "@/lib/pantry/photo-scan/constants";
import { normalizeItemKey } from "@/lib/pantry/photo-scan/merge";
import type { PhotoOutcome, PhotoOutcomeStatus } from "@/lib/pantry/photo-scan/recognize-batch";
import { planPhotoBatches } from "@/lib/pantry/photo-scan/validate-batch";

interface PhotoScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => Promise<void>;
}

type Phase = "pick" | "compressing" | "scanning" | "review" | "submitting";

interface PickedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  status: PhotoOutcomeStatus | null;
}

interface ReviewRow {
  id: string;
  name: string;
  category: string;
  selected: boolean;
  confidence: number;
  lowConfidence: boolean;
  alreadyInPantry: boolean;
  seenCount: number;
}

interface Quota {
  limit: number;
  used: number;
  remaining: number;
  isPaid: boolean;
}

interface ScanApiItem {
  id: string;
  name: string;
  category: string;
  confidence: number;
  lowConfidence: boolean;
  alreadyInPantry: boolean;
  seenInPhotos: number[];
}

interface ScanApiResponse {
  items?: ScanApiItem[];
  perPhoto?: PhotoOutcome[];
  quota?: Quota;
  code?: string;
}

const ERROR_KEY_BY_CODE: Record<string, string> = {
  NO_PHOTOS: "photo_error_generic",
  TOO_MANY_PHOTOS: "photo_limit_reached",
  UNSUPPORTED_TYPE: "photo_error_unsupported",
  PHOTO_TOO_LARGE: "photo_error_too_large",
  BATCH_TOO_LARGE: "photo_error_too_large",
  EMPTY_PHOTO: "photo_error_invalid_image",
  INVALID_IMAGE: "photo_error_invalid_image",
  QUOTA_EXCEEDED: "photo_error_quota",
  ALL_PHOTOS_FAILED: "photo_error_all_failed",
  AI_UNAVAILABLE: "photo_error_ai_unavailable",
};

let photoCounter = 0;
function nextPhotoId(): string {
  photoCounter += 1;
  return `photo-${photoCounter}`;
}

export default function PhotoScanModal({ isOpen, onClose, onCompleted }: PhotoScanModalProps) {
  const t = useTranslations("pantry");
  const shouldReduceMotion = useReducedMotion();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<PickedPhoto[]>([]);

  const [phase, setPhase] = useState<Phase>("pick");
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = phase === "compressing" || phase === "scanning" || phase === "submitting";

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;
    void fetch("/api/pantry/scan-photos/quota")
      .then((response) => (response.ok ? (response.json() as Promise<Quota>) : null))
      .then((data) => {
        if (!cancelled && data) {
          setQuota(data);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const resetState = useCallback(() => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    setRows([]);
    setErrorMessage(null);
    setPhase("pick");
  }, []);

  function handleClose() {
    if (isBusy) {
      return;
    }
    resetState();
    onClose();
  }

  function errorFor(code: string | undefined, fallback = "photo_error_generic"): string {
    if (code === "QUOTA_EXCEEDED") {
      return t("photo_error_quota", { limit: quota?.limit ?? 0 });
    }
    return t(ERROR_KEY_BY_CODE[code ?? ""] ?? fallback, { max: MAX_PHOTOS_PER_REQUEST });
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const selected = Array.from(input.files ?? []);
    input.value = "";
    if (selected.length === 0) {
      return;
    }

    const slots = MAX_PHOTOS_PER_REQUEST - photos.length;
    if (slots <= 0 || selected.length > slots) {
      toast.error(t("photo_limit_reached", { max: MAX_PHOTOS_PER_REQUEST }));
    }
    const accepted = selected.slice(0, Math.max(0, slots));
    if (accepted.length === 0) {
      return;
    }

    setErrorMessage(null);
    setPhase("compressing");
    const added: PickedPhoto[] = [];
    for (const file of accepted) {
      try {
        const compressed = await compressPhoto(file, photos.length + added.length);
        added.push({
          id: nextPhotoId(),
          file: compressed,
          previewUrl: URL.createObjectURL(compressed),
          status: null,
        });
      } catch {
        toast.error(t("photo_error_decode"));
      }
    }
    setPhotos((current) => [...current, ...added]);
    setPhase("pick");
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((photo) => photo.id !== id);
    });
  }

  async function handleScan() {
    if (photos.length === 0) {
      return;
    }

    setErrorMessage(null);
    setPhase("scanning");

    const batches = planPhotoBatches(
      photos.map((photo) => photo.file.size),
      MAX_TOTAL_PHOTO_BYTES,
      MAX_PHOTOS_PER_REQUEST,
    );
    const statusByPhotoIndex = new Map<number, PhotoOutcomeStatus>();
    const merged = new Map<string, ReviewRow>();
    let lastError: string | null = null;

    try {
      for (const batch of batches) {
        const formData = new FormData();
        batch.forEach((photoIndex) => formData.append("files", photos[photoIndex].file));

        const response = await fetch("/api/pantry/scan-photos", { method: "POST", body: formData });
        const data = (await response.json().catch(() => ({}))) as ScanApiResponse;

        if (data.quota) {
          setQuota(data.quota);
        }
        if (!response.ok) {
          lastError = response.status === 429 && !data.code ? t("photo_error_rate_limit") : errorFor(data.code);
          break;
        }

        data.perPhoto?.forEach((outcome) => {
          statusByPhotoIndex.set(batch[outcome.index], outcome.status);
        });
        for (const item of data.items ?? []) {
          const key = normalizeItemKey(item.name);
          const existing = merged.get(key);
          if (existing) {
            existing.seenCount += item.seenInPhotos.length;
            existing.confidence = Math.max(existing.confidence, item.confidence);
            continue;
          }
          merged.set(key, {
            id: `row-${merged.size}`,
            name: item.name,
            category: item.category,
            selected: !item.alreadyInPantry && !item.lowConfidence,
            confidence: item.confidence,
            lowConfidence: item.lowConfidence,
            alreadyInPantry: item.alreadyInPantry,
            seenCount: item.seenInPhotos.length,
          });
        }
      }
    } catch {
      lastError = t("photo_error_generic");
    }

    setPhotos((current) =>
      current.map((photo, index) => ({ ...photo, status: statusByPhotoIndex.get(index) ?? photo.status })),
    );

    if (merged.size === 0) {
      setErrorMessage(lastError ?? t("photo_none_found"));
      setPhase("pick");
      return;
    }

    if (lastError) {
      toast.error(lastError);
    }
    setRows([...merged.values()]);
    setPhase("review");
  }

  function updateRow(id: string, patch: Partial<ReviewRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function handleFinalize() {
    const chosen = rows.filter((row) => row.selected && row.name.trim().length > 0);
    if (chosen.length === 0) {
      toast.error(t("photo_review_empty"));
      return;
    }

    setPhase("submitting");
    try {
      const response = await fetch("/api/pantry/scan-photos/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: chosen.map((row) => ({
            id: row.id,
            name: row.name.trim(),
            barcode: null,
            quantity: null,
            unit: null,
            category: row.category || null,
            expiryDate: null,
            confidence: row.confidence,
            source: "detected",
            needsReview: row.lowConfidence,
          })),
          partial: false,
        }),
      });

      if (!response.ok) {
        toast.error(response.status === 429 ? t("photo_error_rate_limit") : t("photo_error_finalize"));
        setPhase("review");
        return;
      }

      await onCompleted();
      toast.success(t("photo_finalize_success"));
      resetState();
      onClose();
    } catch {
      toast.error(t("photo_error_finalize"));
      setPhase("review");
    }
  }

  const selectedCount = rows.filter((row) => row.selected).length;
  const isReviewing = phase === "review" || phase === "submitting";

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
            role="dialog"
            aria-modal="true"
            aria-label={t("photo_title")}
            initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 32 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, y: 32 }}
            transition={shouldReduceMotion ? undefined : { type: "spring", stiffness: 380, damping: 30 }}
            className="font-brand fixed inset-x-0 bottom-0 z-[80] flex max-h-[min(88dvh,860px)] w-full flex-col rounded-t-[1.75rem] bg-white shadow-[0_-16px_50px_rgba(17,24,39,0.18)] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[92vh] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem]"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-200" />
            </div>

            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-6">
              <div>
                <h2 className="text-[22px] font-bold leading-7 tracking-[-0.025em] text-gray-900">
                  {t("photo_title")}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {isReviewing
                    ? t("photo_found_count", { count: rows.length })
                    : t("photo_description", { max: MAX_PHOTOS_PER_REQUEST })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isBusy}
                aria-label={t("quick_add_cancel")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-[transform,background-color] duration-150 hover:bg-gray-200 active:scale-95 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 sm:px-6">
              {!isReviewing ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      disabled={isBusy || photos.length >= MAX_PHOTOS_PER_REQUEST}
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-12 gap-2 rounded-2xl bg-eatrivo-purple text-[15px] font-bold text-white hover:bg-eatrivo-purple/90 active:scale-[0.97]"
                    >
                      <Camera className="h-[18px] w-[18px]" />
                      {photos.length > 0 ? t("photo_add_another") : t("photo_take")}
                    </Button>
                    <Button
                      type="button"
                      disabled={isBusy || photos.length >= MAX_PHOTOS_PER_REQUEST}
                      onClick={() => galleryInputRef.current?.click()}
                      className="h-12 gap-2 rounded-2xl border-[1.5px] border-[#E9D9FF] bg-white text-[15px] font-bold text-eatrivo-purple shadow-none hover:bg-eatrivo-purple/5 active:scale-[0.97]"
                    >
                      <ImagePlus className="h-[18px] w-[18px]" />
                      {t("photo_upload")}
                    </Button>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => void handleFilesSelected(event)}
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleFilesSelected(event)}
                  />

                  {errorMessage ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-eatrivo-red/20 bg-eatrivo-red/10 px-4 py-3 text-sm text-eatrivo-red">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  ) : null}

                  {photos.length > 0 ? (
                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        {t("photo_counter", { count: photos.length, max: MAX_PHOTOS_PER_REQUEST })}
                      </p>
                      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {photos.map((photo) => (
                          <li key={photo.id} className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                            {photo.status && photo.status !== "ok" ? (
                              <span className="absolute inset-x-1 bottom-1 rounded-full bg-black/65 px-2 py-0.5 text-center text-[11px] font-semibold text-white">
                                {t(`photo_status_${photo.status}`)}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              disabled={isBusy}
                              aria-label={t("photo_remove")}
                              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-transform active:scale-95 disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {phase === "compressing" || phase === "scanning" ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-eatrivo-purple">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {phase === "compressing" ? t("photo_compressing") : t("photo_scanning")}
                    </div>
                  ) : null}

                  <div className="space-y-1 text-xs text-gray-500">
                    {quota ? <p>{t("photo_quota_remaining", { remaining: quota.remaining, limit: quota.limit })}</p> : null}
                    <p>{t("photo_privacy_note")}</p>
                  </div>
                </>
              ) : (
                <ul className="space-y-2.5">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className={cn(
                        "rounded-2xl border p-3",
                        row.selected ? "border-[#E9D9FF] bg-[#FAF7FF]" : "border-gray-100 bg-white",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(event) => updateRow(row.id, { selected: event.target.checked })}
                          aria-label={t("photo_item_include")}
                          className="h-5 w-5 shrink-0 accent-[#7B3FF2]"
                        />
                        <Input
                          value={row.name}
                          onChange={(event) => updateRow(row.id, { name: event.target.value })}
                          aria-label={t("photo_item_name")}
                          maxLength={80}
                          className="h-10 flex-1 rounded-xl border-gray-200 bg-white text-[15px] font-semibold"
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                        <select
                          value={row.category}
                          onChange={(event) => updateRow(row.id, { category: event.target.value })}
                          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700"
                        >
                          {PHOTO_ITEM_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {t(`categories.${category}`)}
                            </option>
                          ))}
                        </select>
                        {row.alreadyInPantry ? (
                          <Badge className="rounded-full border-transparent bg-emerald-100 text-emerald-800">
                            {t("photo_already_in_pantry")}
                          </Badge>
                        ) : null}
                        {row.lowConfidence ? (
                          <Badge className="rounded-full border-transparent bg-amber-100 text-amber-800">
                            {t("photo_not_sure")}
                          </Badge>
                        ) : null}
                        {row.seenCount > 1 ? (
                          <span className="text-xs text-gray-500">{t("photo_seen_in", { count: row.seenCount })}</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleClose}
                  disabled={isBusy}
                  className="h-12 flex-1 rounded-2xl border-2 border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-black-primary"
                >
                  {t("quick_add_cancel")}
                </Button>
                {isReviewing ? (
                  <Button
                    type="button"
                    onClick={() => void handleFinalize()}
                    disabled={phase === "submitting" || selectedCount === 0}
                    className="h-12 flex-[2] gap-2 rounded-2xl bg-eatrivo-purple font-bold text-white hover:bg-eatrivo-purple/90"
                  >
                    {phase === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("photo_finalize", { count: selectedCount })}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void handleScan()}
                    disabled={isBusy || photos.length === 0}
                    className="h-12 flex-[2] gap-2 rounded-2xl bg-eatrivo-purple font-bold text-white hover:bg-eatrivo-purple/90"
                  >
                    {phase === "scanning" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("photo_scan_action")}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
