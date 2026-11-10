import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seeding...");

  // 1. Seed Alert Templates
  const templates = [
    {
      channel: "EMAIL",
      subject: "🚨 URGENT: Accessible Security Alert Triggered",
      body: `<h2>EMERGENCY SECURITY ALERT</h2>
<p>An emergency alert was triggered by the user via the Accessible Security System.</p>
<p><strong>Trigger Time:</strong> {{timestamp}}</p>
<p><strong>Location/Source:</strong> Security Web Client</p>
<p style="color: #b91c1c; font-weight: bold;">Immediate attention required. Please contact the user or designated authorities.</p>`,
    },
    {
      channel: "SMS",
      subject: null,
      body: "🚨 EMERGENCY ALERT: Security alert triggered at {{timestamp}}. Please check on user immediately.",
    },
    {
      channel: "WHATSAPP",
      subject: null,
      body: "*🚨 EMERGENCY SECURITY ALERT*\n\nA security alert was initiated from the Accessible Alert System at *{{timestamp}}*.\n\n*Action Required:* Please reach out or verify user safety immediately.",
    },
    {
      channel: "CALL",
      subject: null,
      body: "Emergency Security Alert. An urgent security alert was triggered by the user at {{timestamp}}. Immediate attention required. Please verify user safety now.",
    },
  ];

  for (const t of templates) {
    const record = await prisma.alertTemplate.upsert({
      where: { channel: t.channel },
      update: {
        subject: t.subject,
        body: t.body,
        isActive: true,
      },
      create: {
        channel: t.channel,
        subject: t.subject,
        body: t.body,
        isActive: true,
      },
    });
    console.log(`✓ Seeded ${t.channel} template (ID: ${record.id})`);
  }

  // 2. Clean & Seed Authorized Chat Users as requested:
  // Primary: SB, Secondary: ZB, Third: SH, Fourth: Emergency Contact
  await prisma.chatMessage.deleteMany({});
  await prisma.chatUser.deleteMany({});

  const chatUsers = [
    {
      userId: "user_sb",
      name: "SB",
      code: process.env.CHAT_CODE_PRIMARY || "1111",
      role: "PRIMARY",
    },
    {
      userId: "user_zb",
      name: "ZB",
      code: process.env.CHAT_CODE_SECONDARY || "2222",
      role: "SECONDARY",
    },
    {
      userId: "user_sh",
      name: "SH",
      code: process.env.CHAT_CODE_THIRD || "3333",
      role: "THIRD",
    },
    {
      userId: "user_emergency",
      name: "Emergency Contact",
      code: process.env.CHAT_CODE_EMERGENCY || "4444",
      role: "EMERGENCY",
    },
  ];

  for (const u of chatUsers) {
    const userRecord = await prisma.chatUser.create({
      data: {
        userId: u.userId,
        name: u.name,
        code: u.code,
        role: u.role,
      },
    });
    console.log(`✓ Seeded Chat User: ${userRecord.name} (ID: ${userRecord.userId}) [Code: ${userRecord.code}]`);
  }

  console.log("✅ Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
