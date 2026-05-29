import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { extractPricesFromWebsite } from "../../src/services/scraper/target-extractor";

let server: Server;
let baseUrl: string;

function html(body: string): string {
  return `<!doctype html><html><head><title>Mock IT</title></head><body>${body}</body></html>`;
}

beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");

    if (request.url === "/static") {
      response.end(
        html(`
          <section>
            <h2>Mantenimiento PC</h2>
            <p>Formateo e instalacion Windows desde $ 15.000</p>
            <p>Texto institucional sin precio publicado.</p>
          </section>
          <section>
            <h2>Redes</h2>
            <span>Configuracion de router ARS 28000</span>
          </section>
        `),
      );
      return;
    }

    if (request.url === "/dynamic") {
      response.end(
        html(`
          <main id="app"></main>
          <script>
            setTimeout(() => {
              const section = document.createElement("section");
              section.innerHTML = "<h2>Recuperacion de datos</h2><p>Diagnostico SSD desde $ 45.500</p>";
              document.querySelector("#app").appendChild(section);
            }, 20);
          </script>
        `),
      );
      return;
    }

    response.statusCode = 404;
    response.end(html("<p>No encontrado</p>"));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe("extractPricesFromWebsite", () => {
  it("extracts price candidates from static HTML", async () => {
    const results = await extractPricesFromWebsite(`${baseUrl}/static`);

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Mantenimiento PC",
          text: "Formateo e instalacion Windows desde $ 15.000",
          priceRaw: "$ 15.000",
          sourceUrl: `${baseUrl}/static`,
        }),
        expect.objectContaining({
          title: "Redes",
          text: "Configuracion de router ARS 28000",
          priceRaw: "ARS 28000",
        }),
      ]),
    );
  }, 15_000);

  it("extracts price candidates after JavaScript rendering", async () => {
    const results = await extractPricesFromWebsite(`${baseUrl}/dynamic`);

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Recuperacion de datos",
          text: "Diagnostico SSD desde $ 45.500",
          priceRaw: "$ 45.500",
        }),
      ]),
    );
  }, 15_000);
});
