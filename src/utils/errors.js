// Quantyval AI - Error Handling
// Custom error classes and error handling utilities

// Base error class
export class QuantyvalError extends Error {
  constructor(message, code = 'UNKNOWN', meta = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      ...this.meta,
    };
  }
}

// Configuration errors
export class ConfigError extends QuantyvalError {
  constructor(message, meta = {}) {
    super(message, 'CONFIG_ERROR', meta);
  }
}

// LLM/Provider errors
export class LLMError extends QuantyvalError {
  constructor(message, meta = {}) {
    super(message, 'LLM_ERROR', meta);
  }
}

// Authentication errors
export class AuthError extends QuantyvalError {
  constructor(message, meta = {}) {
    super(message, 'AUTH_ERROR', meta);
  }
}

// Rate limiting errors
export class RateLimitError extends QuantyvalError {
  constructor(message, meta = {}) {
    super(message, 'RATE_LIMIT', meta);
  }
}

// Tool execution errors
export class ToolError extends QuantyvalError {
  constructor(message, meta = {}) {
    super(message, 'TOOL_ERROR', meta);
  }
}

// Validation errors
export class ValidationError extends QuantyvalError {
  constructor(message, meta = {}) {
    super(message, 'VALIDATION_ERROR', meta);
  }
}

// Network errors
export class NetworkError extends QuantyvalError {
  constructor(message, meta = {}) {
    super(message, 'NETWORK_ERROR', meta);
  }
}

// Error handler middleware
export class ErrorHandler {
  constructor(logger = null) {
    this.logger = logger;
  }
  
  handle(error) {
    // Log error
    if (this.logger) {
      this.logger.error(error.message, {
        name: error.name,
        code: error.code,
        ...error.meta,
      });
    }
    
    // Return formatted error
    return {
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
      },
    };
  }
  
  isRetryable(error) {
    const retryable = ['NETWORK_ERROR', 'RATE_LIMIT', 'TIMEOUT'];
    return retryable.includes(error.code);
  }
}

// Async wrapper for route handlers
export function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const handler = new ErrorHandler();
      const result = handler.handle(error);
      res.status(500).json(result);
    }
  };
}

// Validate input with schema
export function validate(input, schema) {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} is required` });
      continue;
    }
    
    if (value !== undefined && rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push({ field, message: `${field} must be of type ${rules.type}` });
      }
    }
    
    if (rules.minLength && value?.length < rules.minLength) {
      errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
    }
    
    if (rules.maxLength && value?.length > rules.maxLength) {
      errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push({ field, message: `${field} format is invalid` });
    }
  }
  
  if (errors.length) {
    throw new ValidationError('Validation failed', { errors });
  }
  
  return true;
}