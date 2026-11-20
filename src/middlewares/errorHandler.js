export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || "Server error";

  if (err.name === "MulterError") {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image must be under 4 MB" : "Invalid upload";
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === "production" ? "Internal server error" : message,
  });
}