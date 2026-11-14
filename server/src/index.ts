import { lab3App } from "./lab3App";

const PORT = process.env.PORT || 5000;

lab3App.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
