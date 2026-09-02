import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { ConsumerChatService } from "./consumer-chat.service";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

@ApiTags("Consumer App - Chat")
@Controller("api/v1/consumer/chat")
@UseGuards(JwtAuthGuard)
export class ConsumerChatController {
  constructor(private readonly chatService: ConsumerChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Chat with Zayuno using live provider context" })
  processMessage(
    @Body()
    body: { prompt: string; messages?: ConversationMessage[] },
    @Req() req: any,
  ) {
    return this.chatService.processMessage({
      prompt: body.prompt,
      messages: body.messages,
      userId: req.user.id,
      userEmail: req.user.email,
    });
  }

  @Post("stream")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stream Zayuno chat with live provider context" })
  async streamMessage(
    @Body()
    body: { prompt: string; messages?: ConversationMessage[] },
    @Req() req: any,
    @Res() res: Response,
  ) {
    res.status(HttpStatus.OK);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const heartbeat = setInterval(() => {
      if (!res.destroyed) res.write(": keep-alive\n\n");
    }, 8_000);

    try {
      await this.chatService.streamMessage(
        {
          prompt: body.prompt,
          messages: body.messages,
          userId: req.user.id,
          userEmail: req.user.email,
        },
        (content) => {
          if (!res.destroyed) {
            res.write(
              `data: ${JSON.stringify({ type: "delta", content })}\n\n`,
            );
          }
        },
      );
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      }
    } catch (error: any) {
      const message =
        error?.response?.message ||
        error?.message ||
        "Zayuno hozir javob bera olmadi.";
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.destroyed) res.end();
    }
  }
}
