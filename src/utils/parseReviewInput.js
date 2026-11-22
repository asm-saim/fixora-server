import ApiError from "./ApiError.js";

/** { rating: 1-5 whole number, comment: optional, up to 500 characters } */
export function parseReviewInput(body = {}) {
  const rating = typeof body.rating === "string" && body.rating.trim() !== "" ? Number(body.rating) : body.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(400, "Choose a rating from 1 to 5 stars");
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (comment.length > 500) throw new ApiError(400, "The review must be 500 characters or fewer");

  return { rating, comment };
}
