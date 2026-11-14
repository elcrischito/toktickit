import { PrismaClient, Role, Priority, Status, ActionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Lab 5 (Student Guide Episode 2, point 2): the seed is safe for production.
// - Passwords come from environment variables, never from code. The local fallback
//   "Password123!" is only used outside production (local dev, tests, CI).
// - Reference data and the first administrator are always created.
// - Demo users and sample tickets (needed for the Lab 6 UAT) only when SEED_DEMO_DATA=true.
//   Default: on locally, off in production.
// - Safe to rerun: in production an existing admin keeps its current password.
const isProduction = process.env.NODE_ENV === "production";
const LOCAL_FALLBACK_PASSWORD = "Password123!";

function passwordFromEnv(name: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (isProduction) throw new Error(`${name} must be set when NODE_ENV=production`);
  return LOCAL_FALLBACK_PASSWORD;
}

const seedDemoData = process.env.SEED_DEMO_DATA !== undefined
  ? process.env.SEED_DEMO_DATA === "true"
  : !isProduction;

async function main() {
  console.log(`Seeding TokTickIT (production=${isProduction}, demo data=${seedDemoData})...`);

  const categories = [];
  for (const name of ["Account and Access", "Hardware", "Software", "Network"]) {
    categories.push(await prisma.category.upsert({ where: { name }, update: {}, create: { name } }));
  }

  const systems = [];
  for (const name of ["Corporate Laptop", "VPN Access", "Email Service", "SharePoint", "HR Portal", "Finance App"]) {
    systems.push(await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } }));
  }

  const adminPasswordHash = await bcrypt.hash(passwordFromEnv("ADMIN_PASSWORD"), 10);
  await prisma.user.upsert({
    where: { email: "admin@toktickit.com" },
    // Locally the admin is reset on every seed (tests rely on it). In production a
    // rerun (every release runs the migration job) must not undo the admin's password change.
    update: isProduction ? {} : { passwordHash: adminPasswordHash, isActive: true, mustChangePassword: true },
    create: { email: "admin@toktickit.com", fullName: "John Smith (Admin)", passwordHash: adminPasswordHash, role: Role.ADMIN, isActive: true, mustChangePassword: true },
  });

  if (!seedDemoData) {
    console.log("Reference data and administrator seeded (demo data skipped).");
    return;
  }

  const defaultPasswordHash = await bcrypt.hash(passwordFromEnv("DEMO_USER_PASSWORD"), 10);

  const staff1 = await prisma.user.upsert({
    where: { email: "michael.brown@toktickit.com" },
    update: {},
    create: { email: "michael.brown@toktickit.com", fullName: "Michael Brown", passwordHash: defaultPasswordHash, role: Role.IT_STAFF, isActive: true, mustChangePassword: false },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "sarah.johnson@toktickit.com" },
    update: {},
    create: { email: "sarah.johnson@toktickit.com", fullName: "Sarah Johnson", passwordHash: defaultPasswordHash, role: Role.IT_STAFF, isActive: true, mustChangePassword: false },
  });

  await prisma.user.upsert({
    where: { email: "david.lee@toktickit.com" },
    update: {},
    create: { email: "david.lee@toktickit.com", fullName: "David Lee", passwordHash: defaultPasswordHash, role: Role.IT_STAFF, isActive: true, mustChangePassword: false },
  });

  await prisma.user.upsert({
    where: { email: "kevin.patel@toktickit.com" },
    update: {},
    create: { email: "kevin.patel@toktickit.com", fullName: "Kevin Patel", passwordHash: defaultPasswordHash, role: Role.IT_STAFF, isActive: false, mustChangePassword: false },
  });

  const req1 = await prisma.user.upsert({
    where: { email: "jennifer.anderson@toktickit.com" },
    update: {},
    create: { email: "jennifer.anderson@toktickit.com", fullName: "Jennifer Anderson", passwordHash: defaultPasswordHash, role: Role.REQUESTER, isActive: true, mustChangePassword: false },
  });

  const req2 = await prisma.user.upsert({
    where: { email: "emily.davis@toktickit.com" },
    update: {},
    create: { email: "emily.davis@toktickit.com", fullName: "Emily Davis", passwordHash: defaultPasswordHash, role: Role.REQUESTER, isActive: true, mustChangePassword: false },
  });

  for (const [email, fullName, isActive] of [
    ["amanda.clark@toktickit.com", "Amanda Clark", true],
    ["robert.wilson@toktickit.com", "Robert Wilson", true],
    ["brian.inactive@toktickit.com", "Brian Inactive", false],
  ] as const) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, fullName, passwordHash: defaultPasswordHash, role: Role.REQUESTER, isActive, mustChangePassword: false },
    });
  }

  // Ticket 1: IN_PROGRESS, multiple Actions Taken by different IT Staff (BR-02)
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

  // Ticket 2: OPEN, 1 Action Taken
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

  // Ticket 3: NEW, Unassigned, 0 Actions Taken
  await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2026-001236" },
    update: {},
    create: {
      ticketNumber: "TKT-2026-001236",
      summary: "Request Adobe Creative Cloud license",
      description: "Need Creative Cloud access for Q4 marketing assets preparation.",
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      status: Status.NEW,
      categoryId: categories[2].id,
      relatedSystemId: systems[3].id,
      requesterId: req2.id,
      ownerId: null,
    },
  });

  // Ticket 4: WAITING_FOR_REQUESTER (Jennifer Anderson), 0 Actions Taken
  await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2026-001237" },
    update: {},
    create: {
      ticketNumber: "TKT-2026-001237",
      summary: "Outlook calendar sync issue on mobile",
      description: "Shared team calendar events are delayed on iOS Mail app.",
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.HIGH,
      status: Status.WAITING_FOR_REQUESTER,
      categoryId: categories[2].id,
      relatedSystemId: systems[2].id,
      requesterId: req1.id,
      ownerId: staff1.id,
    },
  });

  // Ticket 5: RESOLVED (Jennifer Anderson), 1 Completed Action Taken
  const ticket5 = await prisma.ticket.upsert({
    where: { ticketNumber: "TKT-2026-001238" },
    update: {},
    create: {
      ticketNumber: "TKT-2026-001238",
      summary: "HR Portal MFA token reset",
      description: "Switched phones and need MFA authenticator re-enrolled for HR Portal.",
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      status: Status.RESOLVED,
      resolutionSummary: "Reset MFA enrollment and verified successful login with user.",
      categoryId: categories[0].id,
      relatedSystemId: systems[4].id,
      requesterId: req1.id,
      ownerId: staff2.id,
    },
  });

  // Idempotent Actions Taken (0, 1, and multiple across Tickets)
  await prisma.actionTaken.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      ticketId: ticket1.id,
      actionDateTime: new Date("2026-11-12T09:30:00.000Z"),
      description: "Ran Windows powercfg battery health diagnostic report",
      result: "Battery full charge capacity degraded to 48%; replacement unit ordered",
      status: ActionStatus.COMPLETED,
      performedById: staff1.id,
      assignedToId: staff1.id,
      followUpRequired: true,
      followUpNote: "Install replacement battery once hardware stock arrives",
      attachmentNotes: "powercfg-battery-report.html",
    },
  });

  await prisma.actionTaken.upsert({
    where: { id: "00000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000002",
      ticketId: ticket1.id,
      actionDateTime: new Date("2026-11-13T14:15:00.000Z"),
      description: "Installed new OEM battery and calibrated BIOS power profile",
      result: "Battery charging normally; monitoring discharge rate under load",
      status: ActionStatus.IN_PROGRESS,
      performedById: staff2.id,
      assignedToId: staff2.id,
      followUpRequired: false,
      attachmentNotes: "bios-battery-calibration.png",
    },
  });

  await prisma.actionTaken.upsert({
    where: { id: "00000000-0000-4000-8000-000000000003" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000003",
      ticketId: ticket2.id,
      actionDateTime: new Date("2026-11-13T11:00:00.000Z"),
      description: "Inspected RADIUS gateway logs and client SSL certificate",
      result: "Identified expired client VPN profile; scheduled certificate push",
      status: ActionStatus.PLANNED,
      performedById: staff2.id,
      assignedToId: staff1.id,
      followUpRequired: true,
      followUpNote: "Confirm remote handshake from home network after profile push",
      attachmentNotes: "vpn-gateway-trace.log",
    },
  });

  await prisma.actionTaken.upsert({
    where: { id: "00000000-0000-4000-8000-000000000004" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000004",
      ticketId: ticket5.id,
      actionDateTime: new Date("2026-11-11T16:00:00.000Z"),
      description: "Cleared stale TOTP binding in Identity Provider and re-enrolled device",
      result: "User confirmed HR Portal access restored",
      status: ActionStatus.COMPLETED,
      performedById: staff2.id,
      assignedToId: staff2.id,
      followUpRequired: false,
      attachmentNotes: "mfa-audit-entry.png",
    },
  });

  console.log("Database successfully seeded with Lab 4 data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
