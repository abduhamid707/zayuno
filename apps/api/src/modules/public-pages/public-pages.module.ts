import { Module } from '@nestjs/common';
import { PublicPagesController } from './public-pages.controller';

@Module({
  controllers: [PublicPagesController],
})
export class PublicPagesModule {}
