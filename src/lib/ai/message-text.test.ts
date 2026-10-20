import { test } from "node:test";
import assert from "node:assert/strict";

import { AIMessage } from "@langchain/core/messages";

import { messageText } from "./message-text";

test("string content is returned as is", () => {
  assert.equal(messageText({ content: "hello" }), "hello");
});

test("empty string content returns empty string", () => {
  assert.equal(messageText({ content: "" }), "");
});

test("Claude blocks keep only text and ignore thinking", () => {
  assert.equal(
    messageText({
      content: [
        { type: "thinking", thinking: "secret", signature: "s" },
        { type: "text", text: "Ahoj" },
      ],
    }),
    "Ahoj",
  );
});

test("several text blocks are joined in order", () => {
  assert.equal(
    messageText({
      content: [
        { type: "text", text: "A" },
        { type: "text", text: "B" },
      ],
    }),
    "AB",
  );
});

test("redacted_thinking, tool_use (with text) and image blocks are ignored", () => {
  assert.equal(
    messageText({
      content: [
        { type: "redacted_thinking", data: "xyz" },
        { type: "tool_use", id: "1", name: "f", input: {}, text: "nope" },
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: "AAAA" },
          text: "nope",
        },
        { type: "text", text: "kept" },
      ],
    }),
    "kept",
  );
});

test("Gemini-style parts without type are joined", () => {
  assert.equal(messageText({ content: [{ text: "x" }, "y"] }), "xy");
});

test("non-array, non-string content returns empty string", () => {
  assert.equal(messageText({ content: undefined }), "");
  assert.equal(messageText({ content: null }), "");
  assert.equal(messageText({ content: 42 }), "");
  assert.equal(messageText({ content: { text: "x" } }), "");
});

test("array with null/undefined/numbers does not throw and ignores them", () => {
  assert.equal(
    messageText({ content: [null, undefined, 1, 2, "a", 3] }),
    "a",
  );
});

test("real LangChain AIMessage with string content works", () => {
  assert.equal(messageText(new AIMessage("hello")), "hello");
});

test("real LangChain AIMessage with content blocks works", () => {
  assert.equal(
    messageText(
      new AIMessage({
        content: [
          { type: "thinking", thinking: "t", signature: "s" },
          { type: "text", text: "hi" },
        ],
      }),
    ),
    "hi",
  );
});
