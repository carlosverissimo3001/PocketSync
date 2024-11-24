import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { List } from '../entities/list.entity';
import { Type } from 'class-transformer';

export class SyncListsDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => List)
  lists: List[];
}
