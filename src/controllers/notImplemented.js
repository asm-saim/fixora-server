export const notImplemented = (step) => (req, res) =>
  res.status(501).json({ message: `Not implemented yet (${step})` });