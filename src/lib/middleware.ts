import { NextRequest } from 'next/server';
import { verifyJWT } from './jwt';

export async function validateJWT(request: NextRequest): Promise<any> {
  const authHeader = request.headers.get('authorization');
  const xToken = request.headers.get('x-token');
  
  let token = '';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (xToken) {
    token = xToken;
  } else {
    throw new Error('No hay token en la petición');
  }

  try {
    const decoded = await verifyJWT(token);
    return decoded;
  } catch (error) {
    throw new Error('Token no válido');
  }
}
