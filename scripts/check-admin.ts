import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "liraz@lirazai.com" },
    select: { email: true, globalRole: true, isBlocked: true, passwordHash: true },
  });

  if (!user) {
    console.log("USER_MISSING");
    return;
  }

  console.log(
    JSON.stringify({
      email: user.email,
      role: user.globalRole,
      blocked: user.isBlocked,
      hasPassword: Boolean(user.passwordHash),
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
