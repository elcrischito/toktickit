import { lab3App } from "./lab3App";
import { assertProductionConfig } from "./config";

assertProductionConfig();

// Cloud Run injects PORT (3000 in the Dockerfile). Locally the default stays 5000,
// which is what the Vite dev proxy expects.
const PORT = Number(process.env.PORT) || 5000;

lab3App.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
