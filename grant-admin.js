require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.update({
      where: { email: 'maksimgorkij21@gmail.com' },
      data: { isAdmin: true },
    });
    console.log('✅ Admin granted to:', user.email);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
