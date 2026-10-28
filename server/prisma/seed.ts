import { PrismaClient, Role, Priority, Status } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Lab 3 data...");

  // Password par défaut pour tous les comptes de test : Password123!
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);

  // 1. Catégories
  const categoriesData = ["Account and Access", "Hardware", "Software", "Network"];
  const categories = [];
  for (const name of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories.push(cat);
  }

  // 2. Systèmes connexes
  const systemsData = ["Corporate Laptop", "VPN Access", "Email Service", "SharePoint", "HR Portal", "Finance App"];
  const systems = [];
  for (const name of systemsData) {
    const sys = await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    systems.push(sys);
  }

  // 3. Utilisateurs (Admin, IT Staff, Requesters)
  const admin = await prisma.user.upsert({
    where: { email: "admin@toktickit.com" },
    update: {},
    create: {
      email: "admin@toktickit.com",
      fullName: "John Smith (Admin)",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      isActive: true,
      mustChangePassword: true,
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { email: "michael.brown@toktickit.com" },
    update: {},
    create: {
      email: "michael.brown@toktickit.com",
      fullName: "Michael Brown",
      passwordHash: defaultPasswordHash,
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "sarah.johnson@toktickit.com" },
    update: {},
    create: {
      email: "sarah.johnson@toktickit.com",
      fullName: "Sarah Johnson",
      passwordHash: defaultPasswordHash,
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const staff3 = await prisma.user.upsert({
    where: { email: "david.lee@toktickit.com" },
    update: {},
    create: {
      email: "david.lee@toktickit.com",
      fullName: "David Lee",
      passwordHash: defaultPasswordHash,
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: "kevin.patel@toktickit.com" },
    update: {},
    create: {
      email: "kevin.patel@toktickit.com",
      fullName: "Kevin Patel",
      passwordHash: defaultPasswordHash,
      role: Role.IT_STAFF,
      isActive: false,
      mustChangePassword: false,
    },
  });

  const req1 = await prisma.user.upsert({
    where: { email: "jennifer.anderson@toktickit.com" },
    update: {},
    create: {
      email: "jennifer.anderson@toktickit.com",
      fullName: "Jennifer Anderson",
      passwordHash: defaultPasswordHash,
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const req2 = await prisma.user.upsert({
    where: { email: "emily.davis@toktickit.com" },
    update: {},
    create: {
      email: "emily.davis@toktickit.com",
      fullName: "Emily Davis",
      passwordHash: defaultPasswordHash,
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: "amanda.clark@toktickit.com" },
    update: {},
    create: {
      email: "amanda.clark@toktickit.com",
      fullName: "Amanda Clark",
      passwordHash: defaultPasswordHash,
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: "robert.wilson@toktickit.com" },
    update: {},
    create: {
      email: "robert.wilson@toktickit.com",
      fullName: "Robert Wilson",
      passwordHash: defaultPasswordHash,
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
  });

  await prisma.user.upsert({
    where: { email: "brian.inactive@toktickit.com" },
    update: {},
    create: {
      email: "brian.inactive@toktickit.com",
      fullName: "Brian Inactive",
      passwordHash: defaultPasswordHash,
      role: Role.REQUESTER,
      isActive: false,
      mustChangePassword: false,
    },
  });

  // 4. Tickets de test
  const ticket1 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2026-001234" },
    update: {},
    create: {
      ticketNumber: "TKT-2026-001234",
      summary: "Laptop battery drains quickly",
      description: "My laptop battery is draining much faster than usual even when idling.",
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      status: Status.IN_PROGRESS,
      categoryId: categories[1].id,
      relatedSystemId: systems[0].id,
      requesterId: req1.id,
      ownerId: staff1.id,
    },
  });

  const ticket2 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2026-001235" },
    update: {},
    create: {
      ticketNumber: "TKT-2026-001235",
      summary: "Cannot connect to VPN",
      description: "Getting timeout error when connecting to corporate VPN from home.",
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      status: Status.OPEN,
      categoryId: categories[3].id,
      relatedSystemId: systems[1].id,
      requesterId: req2.id,
      ownerId: staff2.id,
    },
  });

  // 5. Commentaires publics & Notes internes
  await prisma.publicComment.createMany({
    data: [
      {
        ticketId: ticket1.id,
        authorId: req1.id,
        content: "Thank you for looking into this. Let me know if you need battery diagnostic logs.",
      },
      {
        ticketId: ticket1.id,
        authorId: staff1.id,
        content: "We are investigating the issue with battery health tests.",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.internalNote.createMany({
    data: [
      {
        ticketId: ticket1.id,
        authorId: staff1.id,
        content: "Battery replacement requested from hardware inventory. ETA tomorrow.",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Database successfully seeded with Lab 3 accounts and data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
