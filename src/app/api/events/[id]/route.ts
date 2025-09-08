import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/lib/models/Event';
import '@/lib/models/User'; // Ensure User schema is registered
import { validateJWT } from '@/lib/middleware';
import { ApiErrorHandler, ERROR_MESSAGES } from '@/lib/errorHandler';

// Simple date validation function for server-side use
const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    const eventData = await request.json();
    const { id: eventId } = await params;

    // Validate event ID
    if (!eventId || eventId === 'undefined' || eventId.trim() === '') {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'eventId',
        eventId,
        'Valid event ID is required'
      );
      
      ApiErrorHandler.logError(
        new Error('Invalid event ID provided'),
        'PUT /api/events/[id] - Validation',
        { eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    // Validate ObjectId format (24 character hex string)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(eventId)) {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'eventId',
        eventId,
        'Event ID must be a valid MongoDB ObjectId'
      );
      
      ApiErrorHandler.logError(
        new Error('Invalid ObjectId format'),
        'PUT /api/events/[id] - Validation',
        { eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    // Enhanced validation with detailed error handling
    if (!eventData.title || eventData.title.trim() === '') {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'title',
        eventData.title,
        'Title is required and cannot be empty'
      );
      
      ApiErrorHandler.logError(
        new Error('Title validation failed'),
        'PUT /api/events/[id] - Validation',
        { eventData, eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    if (!eventData.start || !eventData.end || !isValidDate(new Date(eventData.start)) || !isValidDate(new Date(eventData.end))) {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'dates',
        { start: eventData.start, end: eventData.end },
        'Valid start and end dates are required'
      );
      
      ApiErrorHandler.logError(
        new Error('Date validation failed'),
        'PUT /api/events/[id] - Validation',
        { eventData, eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    // Validate that end date is after start date
    const startDate = new Date(eventData.start);
    const endDate = new Date(eventData.end);
    
    if (endDate <= startDate) {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'dates',
        { start: eventData.start, end: eventData.end },
        'End date must be after start date'
      );
      
      ApiErrorHandler.logError(
        new Error('Date range validation failed'),
        'PUT /api/events/[id] - Validation',
        { eventData, eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.END_BEFORE_START,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    const event = await Event.findById(eventId);

    if (!event) {
      const errorResponse = ApiErrorHandler.handleNotFoundError('Event', eventId);
      
      ApiErrorHandler.logError(
        new Error('Event not found'),
        'PUT /api/events/[id] - Not Found',
        { eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.EVENT_NOT_FOUND,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    if (event.user.toString() !== decoded.uid) {
      const errorResponse = ApiErrorHandler.handleAuthorizationError(
        'Event',
        'update',
        decoded.uid
      );
      
      ApiErrorHandler.logError(
        new Error('Unauthorized event update attempt'),
        'PUT /api/events/[id] - Authorization',
        { eventId, eventOwner: event.user.toString(), userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.EVENT_NO_PERMISSION,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
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
    const context = 'PUT /api/events/[id]';
    ApiErrorHandler.logError(error, context, { 
      url: request.url,
      method: 'PUT'
    });

    if (error instanceof Error && error.message.includes('Token')) {
      const errorResponse = ApiErrorHandler.handleAuthError(error.message);
      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    // Handle database errors specifically
    if (error instanceof Error && (error.name === 'ValidationError' || error.name === 'MongoError' || error.name === 'CastError')) {
      const errorResponse = ApiErrorHandler.handleDatabaseError('update event', error);
      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.EVENT_UPDATE_FAILED,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }
    
    const errorResponse = ApiErrorHandler.handleServerError(error, context);
    return NextResponse.json(
      { 
        ok: false, 
        msg: ERROR_MESSAGES.USER.EVENT_UPDATE_FAILED,
        error: errorResponse.technicalMessage
      },
      { status: errorResponse.statusCode }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    const { id: eventId } = await params;

    // Validate event ID
    if (!eventId || eventId === 'undefined' || eventId.trim() === '') {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'eventId',
        eventId,
        'Valid event ID is required'
      );
      
      ApiErrorHandler.logError(
        new Error('Invalid event ID provided'),
        'DELETE /api/events/[id] - Validation',
        { eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    // Validate ObjectId format (24 character hex string)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(eventId)) {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'eventId',
        eventId,
        'Event ID must be a valid MongoDB ObjectId'
      );
      
      ApiErrorHandler.logError(
        new Error('Invalid ObjectId format'),
        'DELETE /api/events/[id] - Validation',
        { eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    const event = await Event.findById(eventId);

    if (!event) {
      const errorResponse = ApiErrorHandler.handleNotFoundError('Event', eventId);
      
      ApiErrorHandler.logError(
        new Error('Event not found'),
        'DELETE /api/events/[id] - Not Found',
        { eventId, userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.EVENT_NOT_FOUND,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    if (event.user.toString() !== decoded.uid) {
      const errorResponse = ApiErrorHandler.handleAuthorizationError(
        'Event',
        'delete',
        decoded.uid
      );
      
      ApiErrorHandler.logError(
        new Error('Unauthorized event deletion attempt'),
        'DELETE /api/events/[id] - Authorization',
        { eventId, eventOwner: event.user.toString(), userId: decoded.uid }
      );

      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.EVENT_NO_PERMISSION,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    await Event.findByIdAndDelete(eventId);

    return NextResponse.json({ ok: true });

  } catch (error) {
    const context = 'DELETE /api/events/[id]';
    ApiErrorHandler.logError(error, context, { 
      url: request.url,
      method: 'DELETE'
    });

    if (error instanceof Error && error.message.includes('Token')) {
      const errorResponse = ApiErrorHandler.handleAuthError(error.message);
      return NextResponse.json(
        { 
          ok: false, 
          msg: errorResponse.userMessage,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }

    // Handle database errors specifically
    if (error instanceof Error && (error.name === 'ValidationError' || error.name === 'MongoError' || error.name === 'CastError')) {
      const errorResponse = ApiErrorHandler.handleDatabaseError('delete event', error);
      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.EVENT_DELETE_FAILED,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }
    
    const errorResponse = ApiErrorHandler.handleServerError(error, context);
    return NextResponse.json(
      { 
        ok: false, 
        msg: ERROR_MESSAGES.USER.EVENT_DELETE_FAILED,
        error: errorResponse.technicalMessage
      },
      { status: errorResponse.statusCode }
    );
  }
}
