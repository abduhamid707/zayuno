import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { ConsumerReportsService } from "./consumer-reports.service";

@ApiTags("Consumer App - Reports")
@Controller("api/v1/consumer/reports")
@UseGuards(JwtAuthGuard)
export class ConsumerReportsController {
  constructor(private readonly reports: ConsumerReportsService) {}

  @Post()
  @ApiOperation({ summary: "Send a technical report with chat context" })
  create(@Body() body: any, @Req() req: any) {
    return this.reports.create(req.user.id, body || {});
  }
}
