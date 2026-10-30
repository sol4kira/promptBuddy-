export default function errorHandler(err, req, res, next) {
  console.error(err.stack || err);

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? "Internal Server Error" : (err.message || "An error occurred");

  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    return res.status(status).json({
      error: {
        status,
        message
      }
    });
  }

  res.status(status).send(message);
}
