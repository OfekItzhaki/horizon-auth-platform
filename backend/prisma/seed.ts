import { PrismaClient, ClientType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Horizon Auth Clients...');

    // 1. Web Portal Client
    await prisma.client.upsert({
        where: { id: 'horizon-web-client' },
        update: {},
        create: {
            id: 'horizon-web-client',
            name: 'Horizon Web Portal',
            type: ClientType.PUBLIC,
            allowedRedirectUris: [
                'http://localhost:5173/login',
                'http://localhost:5173/auth/callback',
                'https://horizon-auth.ofeklabs.dev/login'
            ],
        },
    });

    // 2. Mobile App Client
    await prisma.client.upsert({
        where: { id: 'horizon-mobile-client' },
        update: {},
        create: {
            id: 'horizon-mobile-client',
            name: 'Horizon Mobile App',
            type: ClientType.PUBLIC,
            allowedRedirectUris: [
                'horizon-auth://callback',
                'http://localhost:3000/callback'
            ],
        },
    });

    console.log('Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
