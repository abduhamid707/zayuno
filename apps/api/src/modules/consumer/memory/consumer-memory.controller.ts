import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { ConsumerMemoryService } from "./consumer-memory.service";

@ApiTags("Consumer App - Personalization Memory")
@Controller("api/v1/consumer/memory")
@UseGuards(JwtAuthGuard)
export class ConsumerMemoryController {
  constructor(private readonly memory: ConsumerMemoryService) {}

  @Get()
  @ApiOperation({
    summary: "View consent status and user-editable personalization memory",
  })
  get(@Req() req: any) {
    return this.memory.getMemory(req.user.id);
  }

  @Get("export")
  @ApiOperation({ summary: "Export personalization memory" })
  export(@Req() req: any) {
    return this.memory.exportMemory(req.user.id);
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Get ranked, consent-based quick suggestions" })
  suggestions(@Req() req: any) {
    return this.memory.getSuggestions(req.user.id);
  }

  @Put("consent")
  @ApiOperation({ summary: "Enable or disable consent-based personalization" })
  consent(@Req() req: any, @Body() body: { enabled?: boolean }) {
    return this.memory.setConsent(req.user.id, body?.enabled === true);
  }

  @Patch("signals/:id")
  @ApiOperation({ summary: "Correct one personalization signal" })
  updateSignal(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.memory.updateSignal(req.user.id, id, body || {});
  }

  @Delete("signals/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Forget one personalization signal" })
  async deleteSignal(@Req() req: any, @Param("id") id: string) {
    await this.memory.deleteSignal(req.user.id, id);
  }

  @Post("suggestion-events")
  @ApiOperation({ summary: "Record an opted-in suggestion interaction" })
  suggestionEvent(@Req() req: any, @Body() body: any) {
    return this.memory.recordSuggestion(req.user.id, body || {});
  }

  @Delete()
  @ApiOperation({
    summary: "Delete all derived memory and disable personalization",
  })
  clear(@Req() req: any) {
    return this.memory.clearMemory(req.user.id);
  }
}
