import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

type S3ClientConfig = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type S3BucketConfig = {
  bucket: string;
};

const S3_ENV = {
  endpoint: "CLOUDFLARE_S3_ENDPOINT",
  accessKeyId: "CLOUDFLARE_ACCESS_KEY",
  secretAccessKey: "CLOUDFLARE_SECRET_KEY",
  bucket: "CLOUDFLARE_S3_BUCKET",
} as const;

function readEnvValue(key: string) {
  const rawValue = process.env[key]?.trim();
  const value = rawValue?.replace(/^['\"]+|['\"]+$/g, "");

  return value || null;
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
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function getS3MissingClientConfigKeys() {
  const missing: string[] = [];

  if (!resolveS3Endpoint()) {
    missing.push(S3_ENV.endpoint);
  }

  if (!readEnvValue(S3_ENV.accessKeyId)) {
    missing.push(S3_ENV.accessKeyId);
  }

  if (!readEnvValue(S3_ENV.secretAccessKey)) {
    missing.push(S3_ENV.secretAccessKey);
  }

  return missing;
}

export function getS3MissingBucketConfigKeys() {
  const missing: string[] = [];

  if (!readEnvValue(S3_ENV.bucket)) {
    missing.push(S3_ENV.bucket);
  }

  return missing;
}

export function getS3MissingConfigKeys() {
  return [...getS3MissingClientConfigKeys(), ...getS3MissingBucketConfigKeys()];
}