export const getEnvVariables = () => {
  return {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/lamargarita',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-here',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-nextauth-secret',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  }
}

export const getClientEnvVariables = () => {
  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  }
}
