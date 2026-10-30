export default function notFound(req, res, next) {
  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    return res.status(404).json({
      error: {
        status: 404,
        message: "Not found"
      }
    });
  }
  res.status(404).send("Not Found");
}
