import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Erro interno" };

    const message =
      typeof responseBody === "string"
        ? responseBody
        : ((responseBody as { message?: string | string[] }).message ?? "Erro");

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} ${status}`,
        isProd ? undefined : exception instanceof Error ? exception.stack : String(exception)
      );
    }

    res.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message.join(", ") : message,
      timestamp: new Date().toISOString(),
      path: req.url,
      ...(isProd ? {} : { debug: exception instanceof Error ? exception.message : String(exception) })
    });
  }
}
