import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  userId: string;
  
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  lastEditorUsername?: string; 
}
