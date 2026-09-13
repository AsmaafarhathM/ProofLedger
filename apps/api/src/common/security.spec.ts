import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

describe('Phase 8 Security Hardening Unit Tests', () => {
  describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;
    let mockResponse: any;
    let mockRequest: any;
    let mockArgumentsHost: any;

    beforeEach(() => {
      filter = new HttpExceptionFilter();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockRequest = {
        url: '/test-endpoint',
        method: 'POST',
      };
      mockArgumentsHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => mockRequest,
        }),
      };
    });

    it('should format standard HTTP exceptions cleanly without exposing internal details', () => {
      const exception = new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          path: '/test-endpoint',
          method: 'POST',
          message: 'Invalid credentials',
        }),
      );
    });

    it('should handle unhandled internal server errors safely', () => {
      const exception = new Error('Database connection reset');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          path: '/test-endpoint',
          method: 'POST',
          message: 'Database connection reset',
        }),
      );
    });
  });

  describe('LoggingInterceptor', () => {
    let interceptor: LoggingInterceptor;

    beforeEach(() => {
      interceptor = new LoggingInterceptor();
    });

    it('should scrub sensitive fields like password, token, and authorization', () => {
      const payload = {
        email: 'user@example.com',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1Ni...secret',
        authorization: 'Bearer token123',
        nested: {
          secret: 'my_secret_key',
          safeField: 'normal_data',
        },
      };

      const sanitized = (interceptor as any).sanitize(payload);

      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.nested.secret).toBe('[REDACTED]');
      expect(sanitized.nested.safeField).toBe('normal_data');
    });
  });
});
