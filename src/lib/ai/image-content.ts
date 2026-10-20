export type PortableImageContentBlock = {
  type: "image_url";
  image_url: { url: string };
};

/** Provider-portable image block (accepted by Gemini, OpenAI/OpenRouter and Anthropic adapters). */
export function buildImageContentBlock(
  base64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
): PortableImageContentBlock {
  return { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } };
}