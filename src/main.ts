
// merges api and middleware modules
export =
{
  ...require('./api'),
  // exporting the express router as function ensures that express is not a required dependency
  express: () => { return require('./unologin-express'); },
}
