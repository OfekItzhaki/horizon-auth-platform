import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger('AllExceptionsFilter');

    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();

        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (exception instanceof HttpException) {
            httpStatus = exception.getStatus();
        } else if (exception instanceof Error && (exception.name === 'JsonWebTokenError' || exception.name === 'TokenExpiredError')) {
            httpStatus = HttpStatus.UNAUTHORIZED;
        }

        this.logger.error(`Exception occurred: ${exception}`);
        if (exception instanceof Error) {
            this.logger.error(`Stack trace: ${exception.stack}`);
        }

        const exceptionResponse: any = exception instanceof HttpException
            ? exception.getResponse()
            : { message: 'Internal server error' };

        const message = typeof exceptionResponse === 'object' && exceptionResponse.message
            ? exceptionResponse.message
            : exceptionResponse;

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(ctx.getRequest()),
            message: Array.isArray(message) ? message[0] : message,
        };

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
