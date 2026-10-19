import app from "./app";

const PORT = process.env.PORT ?? 4002;
const SERVICE_NAME = "auth-service";

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
});
