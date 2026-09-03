import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
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

type ChatBody = {
  prompt: string;
  messages?: ConversationMessage[];
  conversationId?: string;
};

@ApiTags("Consumer App - Chat")
@Controller("api/v1/consumer/chat")
@UseGuards(JwtAuthGuard)
export class ConsumerChatController {
  private readonly logger = new Logger(ConsumerChatController.name);

  constructor(private readonly chatService: ConsumerChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Chat with Zayuno using live provider context" })
  async processMessage(
    @Body()
    body: ChatBody,
    @Req() req: any,
  ) {
    try {
      return await this.chatService.processMessage({
        prompt: body.prompt,
        messages: body.messages,
        conversationId: body.conversationId,
        userId: req.user.id,
        userEmail: req.user.email,
      });
    } catch (error: any) {
      this.logger.warn(`Consumer chat failed: ${String(error?.message || error)}`);
      return {
        content: this.publicErrorMessage(error),
      };
    }
  }

  @Post("stream")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stream Zayuno chat with live provider context" })
  async streamMessage(
    @Body()
    body: ChatBody,
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
          conversationId: body.conversationId,
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
      // Provider contracts, infrastructure details and internal exception text
      // must never be exposed in the customer chat.
      this.logger.warn(`Consumer chat stream failed: ${String(error?.message || error)}`);
      const message = this.publicErrorMessage(error);
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.destroyed) res.end();
    }
  }

  private publicErrorMessage(error: any): string {
    return error?.status === HttpStatus.BAD_REQUEST
      ? "Xabarni tekshirib, yana bir marta yuboring."
      : "Zayuno hozir javob bera olmadi. Birozdan so‘ng qayta urinib ko‘ring.";
  }
}
