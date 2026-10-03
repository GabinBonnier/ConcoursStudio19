function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Données invalides', details: err.errors });
  }
  const status = err.status || err.statusCode || 500;
  const message = status >= 500
    ? 'Erreur interne du serveur. Veuillez réessayer dans quelques instants.'
    : err.message || 'Erreur de requête';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
