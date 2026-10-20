interface ContentCarrier {
  content: unknown;
}

/**
 * Plain text of a model reply. Claude can return `content` as an array of blocks
 * (thinking, text, tool_use...), Gemini as a string or text parts. Only text is kept:
 * thinking, redacted_thinking, tool_use and image blocks are ignored.
 */
export function messageText(message: ContentCarrier): string {
  const content = message.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part: unknown) => {
      if (typeof part === "string") {
        return part;
      }
      if (!part || typeof part !== "object") {
        return "";
      }
      const block = part as { type?: unknown; text?: unknown };
      const isTextLike = block.type === undefined || block.type === "text";
      return isTextLike && typeof block.text === "string" ? block.text : "";
    })
    .join("");
}
