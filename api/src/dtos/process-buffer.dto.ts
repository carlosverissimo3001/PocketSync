import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class ProcessBufferDto {
  @ApiProperty({
    description: 'Whether the sync is empty',
  })
  @IsBoolean()
  isEmptySync: boolean;

  @ApiProperty({ description: 'The owner of the lists' })
  @IsString({ message: 'userId must be a string' })
  userId: string;
}
