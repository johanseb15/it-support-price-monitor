import { createPrismaClient } from "../lib/create-prisma-client";

const prisma = createPrismaClient();

async function main() {
  await prisma.company.upsert({
    where: { mapsPlaceId: "manual-seed-cordoba-demo" },
    update: {},
    create: {
      name: "Empresa Demo Soporte IT",
      websiteUrl: "https://example.com",
      mapsPlaceId: "manual-seed-cordoba-demo",
      address: "Cordoba Capital, Cordoba, Argentina",
      city: "Cordoba",
      province: "Cordoba",
      country: "Argentina",
      source: "MANUAL",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
