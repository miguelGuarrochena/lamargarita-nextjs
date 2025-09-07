import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { generateJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { ok: false, msg: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, msg: 'El password debe de ser de 6 caracteres' },
        { status: 400 }
      );
    }

    let user = await User.findOne({ email });

    if (user) {
      return NextResponse.json(
        { ok: false, msg: 'El usuario ya existe' },
        { status: 400 }
      );
    }

    user = new User({ name, email, password });

    // Encrypt password
    const salt = bcrypt.genSaltSync();
    user.password = bcrypt.hashSync(password, salt);

    await user.save();

    // Generate JWT
    const token = await generateJWT(user._id.toString(), user.name);

    return NextResponse.json({
      ok: true,
      uid: user._id,
      name: user.name,
      email: user.email,
      token,
    }, { status: 201 });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { ok: false, msg: 'Por favor hable con el administrador' },
      { status: 500 }
    );
  }
}
