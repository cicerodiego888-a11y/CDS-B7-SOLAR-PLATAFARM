import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const request = host.switchToHttp().getRequest<{ url?: string; requestId?: string }>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const message = typeof body === 'string'
      ? body
      : body && typeof body === 'object' && 'message' in body
        ? (body as { message?: string | string[] }).message
        : 'Erro interno do servidor.';

    response.status(status).json({
      statusCode: status,
      code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : status === 404 ? 'RESOURCE_NOT_FOUND' : 'HTTP_ERROR',
      message,
      path: request.url ?? null,
      requestId: request.requestId ?? null,
    });
  }
}