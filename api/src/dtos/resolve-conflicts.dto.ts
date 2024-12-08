import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsString } from 'class-validator';
import { List } from '../entities/list.entity';

export class ResolveConflictsDto {
  @ApiProperty({
    description: 'Array of lists to resolve conflicts',
    type: [List],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => List)
  lists: List[];

  @ApiProperty({ description: 'User ID making the changes' })
  @IsString({ message: 'userId must be a string' })
  userId: string;
}
