import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { ConsumerHistoryService } from "./consumer-history.service";

@ApiTags("Consumer App - Chat History")
@Controller("api/v1/consumer/chats")
@UseGuards(JwtAuthGuard)
export class ConsumerHistoryController {
  constructor(private readonly history: ConsumerHistoryService) {}

  @Get()
  @ApiOperation({ summary: "List the signed-in consumer's chat history" })
  list(@Req() req: any) {
    return this.history.list(req.user.id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Persist one consumer chat session" })
  save(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.history.save(req.user.id, { ...(body || {}), id });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete one consumer chat session" })
  async remove(@Param("id") id: string, @Req() req: any) {
    await this.history.remove(req.user.id, id);
  }
}
