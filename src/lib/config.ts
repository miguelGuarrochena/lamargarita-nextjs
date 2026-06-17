const requireEnv = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    // Falla rápido y claro en vez de arrancar con un secreto inseguro.
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
};

export const getEnvVariables = () => {
  return {
    // Sin fallback: si falta, no debe arrancar (evita secretos hardcodeados).
    MONGODB_URI: requireEnv('MONGODB_URI'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    NEXTAUTH_SECRET: requireEnv('NEXTAUTH_SECRET', process.env.JWT_SECRET),
    NEXTAUTH_URL: requireEnv('NEXTAUTH_URL', 'http://localhost:3000'),
  }
}

export const getClientEnvVariables = () => {
  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  }
}
