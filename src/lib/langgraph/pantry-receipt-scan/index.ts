import { END, START, StateGraph } from "@langchain/langgraph";

import { RECEIPT_SCAN_MAX_RETRIES } from "./constants";
import { finalizeReviewPayload } from "./nodes/finalizeReviewPayload";
import { errorHandler } from "./nodes/errorHandler";
import { extractReceipt } from "./nodes/extractReceipt";
import { fetchContext } from "./nodes/fetchContext";
import { mapReceiptItems } from "./nodes/mapReceiptItems";
import { repairExtraction } from "./nodes/repairExtraction";
import { validateCompleteness } from "./nodes/validateCompleteness";
import { PantryReceiptScanState } from "./state";

/* eslint-disable @typescript-eslint/no-explicit-any */

function routeAfterFetchContext(state: typeof PantryReceiptScanState.State): string {
  return state.fatalError ? "error_handler" : "extract_receipt";
}

function routeAfterExtract(state: typeof PantryReceiptScanState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.requestError && state.retryCount >= RECEIPT_SCAN_MAX_RETRIES) {
    return "finalize_review_payload";
  }

  return state.requestError ? "repair_extraction" : "map_receipt_items";
}

function routeAfterValidation(state: typeof PantryReceiptScanState.State): string {
  if (state.fatalError) {
    return "error_handler";
  }

  if (state.requestError && state.retryCount <= RECEIPT_SCAN_MAX_RETRIES) {
    return "repair_extraction";
  }

  return "finalize_review_payload";
}

export function buildPantryReceiptScanGraph() {
  return new StateGraph(PantryReceiptScanState)
    .addNode("fetch_context", fetchContext as any)
    .addNode("extract_receipt", extractReceipt as any)
    .addNode("map_receipt_items", mapReceiptItems as any)
    .addNode("validate_completeness", validateCompleteness as any)
    .addNode("repair_extraction", repairExtraction as any)
    .addNode("finalize_review_payload", finalizeReviewPayload as any)
    .addNode("error_handler", errorHandler as any)
    .addEdge(START, "fetch_context")
    .addConditionalEdges("fetch_context", routeAfterFetchContext, {
      extract_receipt: "extract_receipt",
      error_handler: "error_handler",
    })
    .addConditionalEdges("extract_receipt", routeAfterExtract, {
      map_receipt_items: "map_receipt_items",
      repair_extraction: "repair_extraction",
      finalize_review_payload: "finalize_review_payload",
      error_handler: "error_handler",
    })
    .addEdge("map_receipt_items", "validate_completeness")
    .addConditionalEdges("validate_completeness", routeAfterValidation, {
      repair_extraction: "repair_extraction",
      finalize_review_payload: "finalize_review_payload",
      error_handler: "error_handler",
    })
    .addEdge("repair_extraction", "extract_receipt")
    .addEdge("finalize_review_payload", END)
    .addEdge("error_handler", END)
    .compile();
}