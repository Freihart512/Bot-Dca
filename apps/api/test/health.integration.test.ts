import "reflect-metadata";
import { expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";

it("GET /health responde 200", async () => {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app: INestApplication = testingModule.createNestApplication();
  await app.init();

  const response = await request(app.getHttpServer()).get("/health");
  expect(response.statusCode).toBe(200);
  expect(response.body).toEqual({ status: "ok" });

  await app.close();
});
