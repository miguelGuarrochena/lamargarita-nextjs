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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    
    const events = await Event.find().populate('user', 'name uid');

    return NextResponse.json({
      ok: true,
      eventos: events,
    });

  } catch (error) {
    const context = 'GET /api/events';
    ApiErrorHandler.logError(error, context, { 
      url: request.url,
      method: 'GET'
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
    
    const errorResponse = ApiErrorHandler.handleServerError(error, context);
    return NextResponse.json(
      { 
        ok: false, 
        msg: errorResponse.userMessage,
        error: errorResponse.technicalMessage
      },
      { status: errorResponse.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const decoded = await validateJWT(request);
    const eventData = await request.json();

    // Enhanced validation with detailed error handling
    if (!eventData.title || eventData.title.trim() === '') {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'title',
        eventData.title,
        'Title is required and cannot be empty'
      );
      
      ApiErrorHandler.logError(
        new Error('Title validation failed'),
        'POST /api/events - Validation',
        { eventData, userId: decoded.uid }
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

    const start = eventData.start;
    const end = eventData.end;

    if (!start || !end || !isValidDate(new Date(start)) || !isValidDate(new Date(end))) {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'dates',
        { start, end },
        'Valid start and end dates are required'
      );
      
      ApiErrorHandler.logError(
        new Error('Date validation failed'),
        'POST /api/events - Validation',
        { eventData, userId: decoded.uid }
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
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (endDate < startDate) {
      const errorResponse = ApiErrorHandler.handleValidationError(
        'dates',
        { start, end },
        'End date must be after start date'
      );
      
      ApiErrorHandler.logError(
        new Error('Date range validation failed'),
        'POST /api/events - Validation',
        { eventData, userId: decoded.uid }
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
    const context = 'POST /api/events';
    ApiErrorHandler.logError(error, context, { 
      url: request.url,
      method: 'POST'
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
    if (error instanceof Error && (error.name === 'ValidationError' || error.name === 'MongoError')) {
      const errorResponse = ApiErrorHandler.handleDatabaseError('create event', error);
      return NextResponse.json(
        { 
          ok: false, 
          msg: ERROR_MESSAGES.USER.EVENT_CREATE_FAILED,
          error: errorResponse.technicalMessage
        },
        { status: errorResponse.statusCode }
      );
    }
    
    const errorResponse = ApiErrorHandler.handleServerError(error, context);
    return NextResponse.json(
      { 
        ok: false, 
        msg: ERROR_MESSAGES.USER.EVENT_CREATE_FAILED,
        error: errorResponse.technicalMessage
      },
      { status: errorResponse.statusCode }
    );
  }
}
