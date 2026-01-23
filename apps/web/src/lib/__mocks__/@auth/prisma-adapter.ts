/**
 * Mock @auth/prisma-adapter for Jest tests
 * Prevents ESM parsing errors during test runs
 */

export function PrismaAdapter(prisma: any) {
  return {
    createUser: async (user: any) => user,
    getUser: async (id: string) => null,
    getUserByEmail: async (email: string) => null,
    getUserByAccount: async (providerAccountId: any) => null,
    updateUser: async (user: any) => user,
    deleteUser: async (userId: string) => {},
    linkAccount: async (account: any) => account,
    unlinkAccount: async (providerAccountId: any) => {},
    createSession: async (session: any) => session,
    getSessionAndUser: async (sessionToken: string) => null,
    updateSession: async (session: any) => session,
    deleteSession: async (sessionToken: string) => {},
    createVerificationToken: async (verificationToken: any) => verificationToken,
    useVerificationToken: async (params: any) => null,
  };
}
