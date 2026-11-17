import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { corsOriginDelegate } from "./common/cors";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.use(
    helmet({
      // API returns JSON; CSP is mainly for browsers loading HTML.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(json({ limit: "3mb" }));
  app.use(urlencoded({ extended: true, limit: "3mb" }));
  app.enableCors({
    origin: corsOriginDelegate,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`API listening on http://0.0.0.0:${port}`);
}

bootstrap();
