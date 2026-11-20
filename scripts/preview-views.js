// UI-only entry point: intentionally does not connect to MongoDB.
const app = require("../app")({ preview: true });
const port = process.env.VIEWS_PORT || 8081;
const server = app.listen(port, "127.0.0.1", () =>
  console.log(`UCRS view preview: http://127.0.0.1:${port} (sample data only)`),
);
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
