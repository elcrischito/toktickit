import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// Issue 7 — seed Related Systems (at least 6 required by the handout).
// Requirement: running the seed twice must NOT create duplicates.

async function main() {
  const prisma = getPrisma();

  const categoryNames = ["Account and Access", "Hardware", "Software", "Network"];
  for (const name of categoryNames) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Categories seeded.");

  const relatedSystemNames = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];
  for (const name of relatedSystemNames) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Related Systems seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });