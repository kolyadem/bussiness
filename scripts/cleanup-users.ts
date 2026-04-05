import { db } from "@/lib/db";
import { USER_ROLES } from "@/lib/auth";

const OWNER_LOGIN = "kolyadem1";

async function main() {
  const owner = await db.user.findUnique({
    where: {
      login: OWNER_LOGIN,
    },
    select: {
      id: true,
      login: true,
      email: true,
      role: true,
    },
  });

  if (!owner) {
    throw new Error(`Owner account "${OWNER_LOGIN}" was not found.`);
  }

  const removableUsers = await db.user.findMany({
    where: {
      login: {
        not: OWNER_LOGIN,
      },
    },
    select: {
      id: true,
      login: true,
      email: true,
      role: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  await db.$transaction(async (tx) => {
    if (owner.role !== USER_ROLES.admin) {
      await tx.user.update({
        where: {
          id: owner.id,
        },
        data: {
          role: USER_ROLES.admin,
        },
      });
    }

    if (removableUsers.length > 0) {
      await tx.user.deleteMany({
        where: {
          login: {
            not: OWNER_LOGIN,
          },
        },
      });
    }
  });

  console.log(
    JSON.stringify(
      {
        owner,
        deletedUsers: removableUsers,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
