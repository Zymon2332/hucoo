import { http, HttpResponse } from "msw";
import { basicRunEvents, resumeRunEvents, toSse } from "./fixtures/basic-run";

export const handlers = [
  http.post("*/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    if (!body.username || !body.password) {
      return HttpResponse.json({
        code: 400,
        message: "账号或密码不能为空",
        data: null,
      });
    }
    return HttpResponse.json({
      code: 200,
      message: "success",
      data: {
        token: "demo-token",
        user: { id: "u1", name: "Admin User", email: body.username },
      },
    });
  }),

  http.post("*/agent/v1/chat/stream", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      decision?: string;
      tools?: string[];
      mentions?: string[];
      attachments?: string[];
    };

    let events;
    if (body.decision) {
      events = resumeRunEvents();
    } else {
      const parts: string[] = [];
      if (body.mentions?.length) parts.push(`@${body.mentions.join(" @")}`);
      if (body.tools?.length) parts.push(`/${body.tools.join(" /")}`);
      if (body.attachments?.length)
        parts.push(`附件：${body.attachments.join("、")}`);
      const echo = parts.length
        ? `已收到你的输入（${parts.join("，")}）。`
        : undefined;
      events = basicRunEvents(echo);
    }

    const text = toSse(events);
    const encoder = new TextEncoder();
    const chunks = text.match(/[\s\S]{1,48}/g) ?? [];

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          await new Promise((r) => setTimeout(r, 24));
        }
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }),
];
