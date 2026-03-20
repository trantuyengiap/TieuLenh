export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (error) {
      next({ status: 400, message: 'Invalid request data', details: error.flatten?.() || error.message });
    }
  };
}
