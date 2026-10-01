import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma, UserRole } from "@zayuno/database";
import { ConsumerAuthService } from "../src/modules/consumer/auth/consumer-auth.service";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, "DATABASE_URL is required");
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname), "This integration test only runs against a local database");

  const service = new ConsumerAuthService({} as never, { getClient: () => null } as never);
  const previousReviewEmail = process.env.PLAY_REVIEW_EMAIL;
  const previousReviewOtp = process.env.PLAY_REVIEW_OTP;
  try {
    process.env.PLAY_REVIEW_EMAIL = "review-test@example.invalid";
    delete process.env.PLAY_REVIEW_OTP;
    await assert.rejects(service.sendEmailOtp("review-test@example.invalid"), /Reviewer login is not configured/);
  } finally {
    if (previousReviewEmail === undefined) delete process.env.PLAY_REVIEW_EMAIL;
    else process.env.PLAY_REVIEW_EMAIL = previousReviewEmail;
    if (previousReviewOtp === undefined) delete process.env.PLAY_REVIEW_OTP;
    else process.env.PLAY_REVIEW_OTP = previousReviewOtp;
  }

  const userId = randomUUID();
  const reportId = randomUUID();
  const chatId = randomUUID();
  let actionId: string | undefined;
  try {
  await prisma.user.create({
    data: { id: userId, email: `deletion-test-${userId}@example.invalid`, name: "Deletion test", passwordHash: "TEST", role: UserRole.API_CONSUMER },
  });
  await prisma.userReport.create({
    data: { id: reportId, userId, description: "private description", transcriptMarkdown: "private transcript", transcript: [{ content: "private chat" }], metadata: { address: "private address" } },
  });
  await prisma.consumerChatSession.create({
    data: { id: chatId, userId, title: "private title", createdAt: new Date(), messages: { create: { id: randomUUID(), role: "user", content: "private chat", createdAt: new Date() } } },
  });
  const provider = await prisma.provider.findFirst({ select: { id: true } });
  if (provider) {
    const action = await prisma.action.create({
      data: {
        publicId: `DEL-${userId.slice(0, 8)}`, userId, providerId: provider.id,
        lines: [], subtotal: 1, total: 1, customerName: "Private name", customerPhone: "+998900000000",
        customerEmail: "private@example.invalid", destination: "private destination", locations: { address: "private" },
        parameters: { address: "private" }, metadata: { phone: "private" }, paymentUrl: "https://example.invalid/pay",
      },
    });
    actionId = action.id;
    await prisma.actionEvent.create({ data: { actionId, status: action.status, description: "private event", source: "TEST", payload: { phone: "private" } } });
  }

  await service.deleteConsumerAccount(userId);
  assert.equal(await prisma.user.findUnique({ where: { id: userId } }), null);
  assert.equal(await prisma.consumerChatSession.findUnique({ where: { id: chatId } }), null);
  const report = await prisma.userReport.findUniqueOrThrow({ where: { id: reportId } });
  assert.equal(report.userId, null);
  assert.deepEqual(report.transcript, []);
  assert.deepEqual(report.metadata, {});
  assert.equal(report.screenshotDataUrl, null);
  if (actionId) {
    const action = await prisma.action.findUniqueOrThrow({ where: { id: actionId }, include: { timeline: true } });
    assert.equal(action.userId, null);
    assert.equal(action.customerPhone, null);
    assert.equal(action.destination, null);
    assert.deepEqual(action.parameters, {});
    assert.deepEqual(action.timeline[0]?.payload, {});
  }
  console.log("Consumer account deletion integration PASS");
  } finally {
  if (actionId) {
    await prisma.actionEvent.deleteMany({ where: { actionId } });
    await prisma.action.deleteMany({ where: { id: actionId } });
  }
  await prisma.userReport.deleteMany({ where: { id: reportId } });
  await prisma.consumerChatSession.deleteMany({ where: { id: chatId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
