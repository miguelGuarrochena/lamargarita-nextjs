export interface ErrorResponse {
  userMessage: string;
  technicalMessage: string;
  statusCode: number;
  errorCode?: string;
}

export interface ApiError {
  ok: false;
  msg: string;
  error?: string;
  statusCode?: number;
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT'
}

/**
 * Predefined error messages for consistency
 */
export const ERROR_MESSAGES = {
  // User-friendly messages
  USER: {
    VALIDATION: 'Por favor, verifica que todos los campos estén completos y sean válidos.',
    AUTHENTICATION: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    AUTHORIZATION: 'No tienes permisos para realizar esta acción.',
    NOT_FOUND: 'El elemento que buscas no existe o ha sido eliminado.',
    DATABASE: 'Ocurrió un problema con el servidor. Intenta nuevamente en unos momentos.',
    NETWORK: 'Problema de conexión. Verifica tu internet e intenta nuevamente.',
    SERVER: 'Error interno del servidor. Nuestro equipo ha sido notificado.',
    CLIENT: 'Ocurrió un error inesperado. Intenta recargar la página.',
    
    // Specific calendar errors
    EVENT_CREATE_FAILED: 'No se pudo crear el evento. Verifica los datos e intenta nuevamente.',
    EVENT_UPDATE_FAILED: 'No se pudo actualizar el evento. Intenta nuevamente.',
    EVENT_DELETE_FAILED: 'No se pudo eliminar el evento. Intenta nuevamente.',
    EVENT_LOAD_FAILED: 'No se pudieron cargar los eventos. Verifica tu conexión.',
    EVENT_NOT_FOUND: 'El evento que intentas modificar ya no existe.',
    EVENT_NO_PERMISSION: 'No tienes permisos para modificar este evento.',
    
    // Field validation
    TITLE_REQUIRED: 'El título del evento es obligatorio.',
    DATES_REQUIRED: 'Las fechas de inicio y fin son obligatorias.',
    DATES_INVALID: 'Las fechas proporcionadas no son válidas.',
    END_BEFORE_START: 'La fecha de fin debe ser posterior a la fecha de inicio.'
  },
  
  // Technical messages for logging
  TECHNICAL: {
    VALIDATION_FAILED: 'Validation failed for request data',
    TOKEN_INVALID: 'JWT token validation failed',
    TOKEN_EXPIRED: 'JWT token has expired',
    TOKEN_MISSING: 'Authorization token is missing',
    DATABASE_CONNECTION: 'Database connection failed',
    DATABASE_QUERY: 'Database query execution failed',
    NETWORK_TIMEOUT: 'Network request timeout',
    PARSE_ERROR: 'Failed to parse request/response data',
    UNKNOWN_ERROR: 'Unknown error occurred'
  }
};

/**
 * Server-side error handler for API routes
 */
export class ApiErrorHandler {
  /**
   * Log technical error details for debugging
   */
  static logError(error: any, context: string, additionalData?: any): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        name: error?.name,
        code: error?.code
      },
      additionalData
    };
    
    console.error(`[ERROR] ${context}:`, errorInfo);
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(
    category: ErrorCategory,
    technicalMessage: string,
    userMessage?: string,
    statusCode?: number,
    errorCode?: string
  ): ErrorResponse {
    return {
      userMessage: userMessage || ERROR_MESSAGES.USER.SERVER,
      technicalMessage,
      statusCode: statusCode || 500,
      errorCode
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(
    field: string,
    value: any,
    requirement: string
  ): ErrorResponse {
    const technicalMessage = `Validation failed for field '${field}' with value '${value}': ${requirement}`;
    
    let userMessage = ERROR_MESSAGES.USER.VALIDATION;
    
    // Specific field messages
    if (field === 'title') userMessage = ERROR_MESSAGES.USER.TITLE_REQUIRED;
    if (field === 'dates') userMessage = ERROR_MESSAGES.USER.DATES_INVALID;
    
    return this.createErrorResponse(
      ErrorCategory.VALIDATION,
      technicalMessage,
      userMessage,
      400,
      'VALIDATION_ERROR'
    );
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(technicalMessage: string): ErrorResponse {
    return this.createErrorResponse(
      ErrorCategory.AUTHENTICATION,
      technicalMessage,
      ERROR_MESSAGES.USER.AUTHENTICATION,
      401,
      'AUTH_ERROR'
    );
  }

  /**
   * Handle authorization errors
   */
  static handleAuthorizationError(
    resource: string,
    action: string,
    userId: string
  ): ErrorResponse {
    const technicalMessage = `User ${userId} attempted unauthorized ${action} on ${resource}`;
    
    return this.createErrorResponse(
      ErrorCategory.AUTHORIZATION,
      technicalMessage,
      ERROR_MESSAGES.USER.AUTHORIZATION,
      403,
      'AUTHORIZATION_ERROR'
    );
  }

  /**
   * Handle not found errors
   */
  static handleNotFoundError(resource: string, id: string): ErrorResponse {
    const technicalMessage = `${resource} with ID ${id} not found`;
    
    return this.createErrorResponse(
      ErrorCategory.NOT_FOUND,
      technicalMessage,
      ERROR_MESSAGES.USER.NOT_FOUND,
      404,
      'NOT_FOUND'
    );
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(operation: string, error: any): ErrorResponse {
    const technicalMessage = `Database ${operation} failed: ${error?.message || 'Unknown database error'}`;
    
    return this.createErrorResponse(
      ErrorCategory.DATABASE,
      technicalMessage,
      ERROR_MESSAGES.USER.DATABASE,
      500,
      'DATABASE_ERROR'
    );
  }

  /**
   * Handle generic server errors
   */
  static handleServerError(error: any, context: string): ErrorResponse {
    const technicalMessage = `Server error in ${context}: ${error?.message || 'Unknown error'}`;
    
    return this.createErrorResponse(
      ErrorCategory.SERVER,
      technicalMessage,
      ERROR_MESSAGES.USER.SERVER,
      500,
      'SERVER_ERROR'
    );
  }
}

/**
 * Client-side error handler for frontend
 */
export class ClientErrorHandler {
  /**
   * Log client-side errors
   */
  static logError(error: any, context: string, additionalData?: any): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      userAgent: navigator?.userAgent,
      url: window?.location?.href,
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        name: error?.name
      },
      additionalData
    };
    
    console.error(`[CLIENT ERROR] ${context}:`, errorInfo);
  }

  /**
   * Parse API error response
   */
  static parseApiError(response: any, fallbackMessage: string): {
    userMessage: string;
    technicalMessage: string;
  } {
    let userMessage = fallbackMessage;
    let technicalMessage = 'API request failed';

    if (response?.msg) {
      userMessage = response.msg;
    }
    
    if (response?.error) {
      technicalMessage = response.error;
    } else if (response?.message) {
      technicalMessage = response.message;
    }

    return { userMessage, technicalMessage };
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: any, operation: string): {
    userMessage: string;
    technicalMessage: string;
  } {
    const technicalMessage = `Network error during ${operation}: ${error?.message || 'Connection failed'}`;
    
    let userMessage = ERROR_MESSAGES.USER.NETWORK;
    
    // Check for specific network error types
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      userMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    } else if (error?.code === 'NETWORK_ERROR') {
      userMessage = 'Error de red. Intenta nuevamente en unos momentos.';
    }

    return { userMessage, technicalMessage };
  }

  /**
   * Handle validation errors on the client
   */
  static handleValidationError(field: string, value: any): {
    userMessage: string;
    technicalMessage: string;
  } {
    const technicalMessage = `Client validation failed for field '${field}' with value '${value}'`;
    
    let userMessage = ERROR_MESSAGES.USER.VALIDATION;
    
    // Specific field messages
    switch (field) {
      case 'title':
        userMessage = ERROR_MESSAGES.USER.TITLE_REQUIRED;
        break;
      case 'dates':
        userMessage = ERROR_MESSAGES.USER.DATES_INVALID;
        break;
      case 'eventId':
        userMessage = 'ID de evento inválido.';
        break;
    }

    return { userMessage, technicalMessage };
  }
}
