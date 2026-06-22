import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

async function main() {
  const email = 'prueba@gmail.com';
  const password = 'Prueba123*';
  const nombre = 'Usuario Prueba';
  const rol = 'admin' as const;

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    console.log(`Ya existe un usuario con email ${email}`);
    return;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const user = await prisma.usuario.create({
    data: { nombre, email, password_hash, rol },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  });

  console.log('Usuario creado:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
