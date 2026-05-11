import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { isAuthError, requireAdminAuth } from "@/lib/auth/adminAuth";
import {
  getS3BucketConfig,
  getS3Client,
  getS3MissingConfigKeys,
  isS3ClientConfigured,
} from "@/lib/storage/s3";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function isAllowedMimeType(value: string): value is (typeof ALLOWED_MIME_TYPES)[number] {
  return ALLOWED_MIME_TYPES.includes(value as (typeof ALLOWED_MIME_TYPES)[number]);
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdminAuth(["admin"]);
    if (isAuthError(authResult)) {
      return authResult;
    }

    if (!isS3ClientConfigured()) {
      return NextResponse.json(
        {
          error: `S3 storage is not fully configured: ${getS3MissingConfigKeys().join(", ")}`,
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Recipe image is required." }, { status: 400 });
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image exceeds upload limits." }, { status: 400 });
    }

    const extension =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/png"
          ? "png"
          : "webp";
    const imageKey = `recipes/admin/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const client = getS3Client();
    const { bucket } = getS3BucketConfig();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: imageKey,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          originalFileName: file.name || "recipe-image",
          uploadedByRole: "admin",
        },
      }),
    );

    return NextResponse.json({
      success: true,
      imageKey,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Recipe image upload failed.",
      },
      { status: 400 },
    );
  }
}