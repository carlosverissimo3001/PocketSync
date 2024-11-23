import { Module } from '@nestjs/common';
import { ZmqService } from './zmq.service';

@Module({
  providers: [ZmqService],
  exports: [ZmqService],
})
export class ZmqModule {}
