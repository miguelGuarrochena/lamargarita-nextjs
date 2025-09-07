import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import { validateJWT } from '@/lib/middleware';

// Simple date validation function for server-side use
const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    const eventData = await request.json();
    const eventId = params.id;

    // Validate required fields
    if (!eventData.title) {
      return NextResponse.json(
        { ok: false, msg: 'El titulo es obligatorio' },
        { status: 400 }
      );
    }

    if (!isValidDate(new Date(eventData.start)) || !isValidDate(new Date(eventData.end))) {
      return NextResponse.json(
        { ok: false, msg: 'Fecha de inicio y finalización son obligatorias' },
        { status: 400 }
      );
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json(
        { ok: false, msg: 'Evento no existe por ese id' },
        { status: 404 }
      );
    }

    if (event.user.toString() !== decoded.uid) {
      return NextResponse.json(
        { ok: false, msg: 'No tiene privilegio de editar este evento' },
        { status: 401 }
      );
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { ...eventData, user: decoded.uid },
      { new: true }
    );

    return NextResponse.json({
      ok: true,
      evento: updatedEvent,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    const eventId = params.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json(
        { ok: false, msg: 'Evento no existe por ese id' },
        { status: 404 }
      );
    }

    if (event.user.toString() !== decoded.uid) {
      return NextResponse.json(
        { ok: false, msg: 'No tiene privilegio de eliminar este evento' },
        { status: 401 }
      );
    }

    await Event.findByIdAndDelete(eventId);

    return NextResponse.json({ ok: true });

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
