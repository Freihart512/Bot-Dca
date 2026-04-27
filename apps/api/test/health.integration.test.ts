import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module";

test("GET /health responde 200", async () => {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule]
  }).compile();

  const app: INestApplication = testingModule.createNestApplication();
  await app.init();

  const response = await request(app.getHttpServer()).get("/health");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: "ok" });

  await app.close();
});
