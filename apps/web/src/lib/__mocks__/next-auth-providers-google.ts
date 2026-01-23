/**
 * Mock next-auth/providers/google for Jest tests
 */

export default function GoogleProvider(options: any) {
  return {
    id: 'google',
    name: 'Google',
    type: 'oauth',
    options,
  };
}
