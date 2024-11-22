import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateListItemDto {
  @IsString()
  name: string;

  @IsInt()
  quantity: number;

  @IsOptional()
  checked?: boolean; // Not required (defaults to false)

  @IsString()
  listId: string;
}
