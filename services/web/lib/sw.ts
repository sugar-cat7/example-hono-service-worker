import { Hono } from "hono";
import { handle } from "hono/service-worker";
import { streamText } from "hono/streaming";

// https://github.com/microsoft/TypeScript/issues/14877
declare const self: ServiceWorkerGlobalScope;

const app = new Hono().basePath("/sw");

app.post("/chat", async (c) => {
  const { messages } = await c.req.json();
  return streamText(c, async (stream) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.body) {
      await stream.write('data: [ERROR] No response body\n\n');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        await stream.write(text);
      }
    } finally {
      await stream.write('data: [DONE]\n\n');
      reader.releaseLock();
    }
  });
});

self.addEventListener("fetch", handle(app));
