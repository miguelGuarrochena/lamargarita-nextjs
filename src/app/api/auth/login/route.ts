import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, msg: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    console.log('Searching for user with email:', email);
    console.log('Collection name:', User.collection.name);
    
    // Try to find user and log the result
    const user = await User.findOne({ email });
    console.log('User found:', user ? 'YES' : 'NO');
    
    // Also try to list all users to debug
    const allUsers = await User.find({}).limit(5);
    console.log('Total users in collection:', allUsers.length);
    console.log('Sample users:', allUsers.map(u => ({ email: u.email, name: u.name })));

    if (!user) {
      return NextResponse.json(
        { ok: false, msg: 'El usuario no existe con ese email' },
        { status: 400 }
      );
    }

    // Verify password
    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return NextResponse.json(
        { ok: false, msg: 'Password incorrecto' },
        { status: 400 }
      );
    }

    // Generate JWT
    const token = await generateJWT(user._id.toString(), user.name);

    return NextResponse.json({
      ok: true,
      uid: user._id,
      name: user.name,
      email: user.email,
      token,
    });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { ok: false, msg: 'Por favor hable con el administrador' },
      { status: 500 }
    );
  }
}
