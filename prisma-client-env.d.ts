// Workaround for occasional TS resolution issue where PrismaClient isn't picked up.
// Ensures the generated client types are visible to the compiler.
declare module '@prisma/client' {
  export { PrismaClient } from '.prisma/client';
}
