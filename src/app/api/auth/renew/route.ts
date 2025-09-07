import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateJWT, verifyJWT } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { ok: false, msg: 'No hay token en la petición' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      const { uid } = await verifyJWT(token);
      
      const user = await User.findById(uid);
      
      if (!user) {
        return NextResponse.json(
          { ok: false, msg: 'Token no válido - usuario no existe' },
          { status: 401 }
        );
      }

      // Generate new JWT
      const newToken = await generateJWT(uid, user.name);

      return NextResponse.json({
        ok: true,
        uid,
        name: user.name,
        email: user.email,
        token: newToken,
      });

    } catch (jwtError) {
      return NextResponse.json(
        { ok: false, msg: 'Token no válido' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { ok: false, msg: 'Por favor hable con el administrador' },
      { status: 500 }
    );
  }
}
