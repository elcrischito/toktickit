import { getPrisma } from "../src/prisma.js";

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

  const devRequesters = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
    { name: "David Lee", email: "david.lee@example.com", isActive: true },
    { name: "Robert Wilson", email: "robert.wilson@example.com", isActive: false },
  ];
  for (const requester of devRequesters) {
    await prisma.devRequester.upsert({
      where: { email: requester.email },
      update: {},
      create: requester,
    });
  }
  console.log("Development Requesters seeded.");

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