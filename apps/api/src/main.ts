import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "./modules/app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { getCorsOrigins } from "./config/env.validation";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  if (config.get<string>("NODE_ENV") === "production") {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(compression());

  app.setGlobalPrefix("v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter(config));

  const origins = getCorsOrigins(config as unknown as Record<string, unknown>);
  app.enableCors({
    origin: origins,
    credentials: true
  });

  await app.listen(config.get<number>("PORT", 4000));
}

void bootstrap();
