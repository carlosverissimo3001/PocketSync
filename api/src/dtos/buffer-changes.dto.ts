import { List } from '../entities/list.entity';
import { IsString, IsArray, IsDate, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BufferChangesDto {
  @ApiProperty({ description: 'User ID making the changes' })
  @IsString({ message: 'userId must be a string' })
  userId: string;

  @ApiProperty({ description: 'Array of lists to buffer', type: [List] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => List)
  lists: List[];

  @ApiProperty({ description: 'Timestamp of the changes' })
  @IsDate()
  timestamp: Date;
}
