import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { validateJWT } from '@/lib/middleware';

// Simple date validation function for server-side use
const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    
    const events = await Event.find().populate('user', 'name');

    return NextResponse.json({
      ok: true,
      eventos: events,
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { ok: false, msg: error.message },
        { status: 401 }
      );
    }
    
    console.log(error);
    return NextResponse.json(
      { ok: false, msg: 'Hable con el administrador' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    const eventData = await request.json();

    // Validate required fields
    if (!eventData.title) {
      return NextResponse.json(
        { ok: false, msg: 'El titulo es obligatorio' },
        { status: 400 }
      );
    }

    const start = eventData.start;
    const end = eventData.end;

    if (!isValidDate(new Date(start)) || !isValidDate(new Date(end))) {
      return NextResponse.json(
        { ok: false, msg: 'Fecha de inicio y finalización son obligatorias' },
        { status: 400 }
      );
    }

    const event = new Event({
      ...eventData,
      user: decoded.uid,
    });

    const savedEvent = await event.save();

    return NextResponse.json({
      ok: true,
      evento: savedEvent,
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Token')) {
      return NextResponse.json(
        { ok: false, msg: error.message },
        { status: 401 }
      );
    }
    
    console.log(error);
    return NextResponse.json(
      { ok: false, msg: 'Hable con el administrador' },
      { status: 500 }
    );
  }
}
