import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

type S3ClientConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type S3BucketConfig = {
  bucket: string;
};

// Provider-neutral S3_* names (Neon Object Storage) win; the legacy
// CLOUDFLARE_* names are still read so existing R2 deployments keep working.
const S3_ENV = {
  endpoint: ["S3_ENDPOINT", "CLOUDFLARE_S3_ENDPOINT"],
  region: ["S3_REGION"],
  accessKeyId: ["S3_ACCESS_KEY_ID", "CLOUDFLARE_ACCESS_KEY"],
  secretAccessKey: ["S3_SECRET_ACCESS_KEY", "CLOUDFLARE_SECRET_KEY"],
  bucket: ["S3_BUCKET", "CLOUDFLARE_S3_BUCKET"],
} as const;

function readEnvValue(keys: readonly string[]) {
  for (const key of keys) {
    const rawValue = process.env[key]?.trim();
    const value = rawValue?.replace(/^['\"]+|['\"]+$/g, "");

    if (value) {
      return value;
    }
  }

  return null;
}

function resolveS3Endpoint() {
  return readEnvValue(S3_ENV.endpoint);
}

function readS3ClientConfig(): S3ClientConfig | null {
  const endpoint = resolveS3Endpoint();
  const accessKeyId = readEnvValue(S3_ENV.accessKeyId);
  const secretAccessKey = readEnvValue(S3_ENV.secretAccessKey);

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    region: readEnvValue(S3_ENV.region) ?? "auto",
    accessKeyId,
    secretAccessKey,
  };
}

function readS3BucketConfig(): S3BucketConfig | null {
  const bucket = readEnvValue(S3_ENV.bucket);

  if (!bucket) {
    return null;
  }

  return { bucket };
}

export function isS3ClientConfigured() {
  return readS3ClientConfig() !== null;
}

export function getS3ClientConfig() {
  const config = readS3ClientConfig();
  if (!config) {
    throw new Error(
      `S3 client is not fully configured: ${getS3MissingClientConfigKeys().join(", ")}`,
    );
  }

  return config;
}

export function getS3BucketConfig() {
  const config = readS3BucketConfig();
  if (!config) {
    throw new Error(
      `S3 bucket is not configured: ${getS3MissingBucketConfigKeys().join(", ")}`,
    );
  }

  return config;
}

export function getS3Client() {
  const config = getS3ClientConfig();

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Neon Object Storage only supports path-style URLs; R2 accepts them too.
    forcePathStyle: true,
    // Avoids checksums computed from an empty body on presigned PUTs.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

export function getS3MissingClientConfigKeys() {
  const missing: string[] = [];

  if (!resolveS3Endpoint()) {
    missing.push(S3_ENV.endpoint[0]);
  }

  if (!readEnvValue(S3_ENV.accessKeyId)) {
    missing.push(S3_ENV.accessKeyId[0]);
  }

  if (!readEnvValue(S3_ENV.secretAccessKey)) {
    missing.push(S3_ENV.secretAccessKey[0]);
  }

  return missing;
}

export function getS3MissingBucketConfigKeys() {
  const missing: string[] = [];

  if (!readEnvValue(S3_ENV.bucket)) {
    missing.push(S3_ENV.bucket[0]);
  }

  return missing;
}

export function getS3MissingConfigKeys() {
  return [...getS3MissingClientConfigKeys(), ...getS3MissingBucketConfigKeys()];
}