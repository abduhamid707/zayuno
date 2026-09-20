import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  getAgentErrorPresentation,
  normalizeZayunoErrorCode,
} from "@zayuno/shared";
import type { Response } from "express";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { ConsumerChatService } from "./consumer-chat.service";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatSelection = {
  id?: string;
  groupId?: string;
  kind?: string;
  title?: string;
  providerSlug?: string;
  offeringId?: string;
  quantity?: number;
  sku?: string;
  variantId?: string;
  fieldPath?: string;
  value?: unknown;
};

type ChatBody = {
  prompt: string;
  messages?: ConversationMessage[];
  conversationId?: string;
  selections?: ChatSelection[];
};

@ApiTags("Consumer App - Chat")
@Controller("api/v1/consumer/chat")
@UseGuards(JwtAuthGuard)
export class ConsumerChatController {
  private readonly logger = new Logger(ConsumerChatController.name);

  constructor(private readonly chatService: ConsumerChatService) {}

  @Get("quick-actions")
  @ApiOperation({ summary: "Get capability-aware home-screen quick actions" })
  quickActions() {
    return this.chatService.getQuickActions();
  }

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
        selections: body.selections,
        userId: req.user.id,
        userEmail: req.user.email,
      });
    } catch (error: any) {
      this.logFailure("request", error);
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
          selections: body.selections,
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
        (interaction) => {
          if (!res.destroyed) {
            res.write(
              `data: ${JSON.stringify({ type: "ui", interaction })}\n\n`,
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
      this.logFailure("stream", error);
      const message = this.publicErrorMessage(error);
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      }
    } finally {
      clearInterval(heartbeat);
      if (!res.destroyed) res.end();
    }
  }

  private publicErrorMessage(error: unknown): string {
    const { code, status, message } = this.errorDetails(error);
    if (status === HttpStatus.BAD_REQUEST) {
      if (message === 'Bir vaqtda bitta taklif tanlang.') return message;
      if (/1[–-]1200/.test(message)) {
        return "Xabar 1 200 belgidan uzun. Ro‘yxatni qismlarga bo‘lib yuboring.";
      }
      if (/bitta faol hamkor/i.test(message)) {
        return "Bir so‘rovda bitta hamkor tanlang. Boshqa hamkor uchun yangi so‘rov yuboring.";
      }
    }

    return getAgentErrorPresentation({
      errorCode: code,
      statusCode: status,
      message,
    }).customerMessage;
  }

  private logFailure(scope: "request" | "stream", error: unknown): void {
    const { code, status } = this.errorDetails(error);
    this.logger.warn(`Consumer chat ${scope} failed [${code}/${status}]`);
  }

  private errorDetails(error: unknown): {
    code: string;
    status: number;
    message: string;
  } {
    const candidate = this.asRecord(error);
    const getResponse = candidate?.getResponse;
    const response =
      typeof getResponse === "function"
        ? getResponse.call(error)
        : candidate?.response;
    const responseRecord = this.asRecord(response);
    const rawMessage =
      responseRecord?.message ??
      candidate?.message ??
      (typeof response === "string" ? response : "");
    const message = Array.isArray(rawMessage)
      ? rawMessage.map((part) => String(part)).join("; ")
      : String(rawMessage || "");
    const getStatus = candidate?.getStatus;
    const rawStatus =
      typeof getStatus === "function"
        ? getStatus.call(error)
        : candidate?.statusCode ?? candidate?.status ?? responseRecord?.statusCode;
    const parsedStatus = Number(rawStatus);
    const status =
      Number.isInteger(parsedStatus) && parsedStatus >= 100 && parsedStatus <= 599
        ? parsedStatus
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawCode =
      candidate?.errorCode ??
      responseRecord?.errorCode ??
      responseRecord?.code ??
      candidate?.code ??
      responseRecord?.error;

    return {
      code: normalizeZayunoErrorCode(rawCode, status, message),
      status,
      message,
    };
  }

  private asRecord(value: unknown): Record<string, any> | undefined {
    return value && typeof value === "object"
      ? (value as Record<string, any>)
      : undefined;
  }
}
