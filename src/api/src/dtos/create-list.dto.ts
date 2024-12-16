// src/dtos/create-list.dto.ts

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsOptional()
  lastEditorUsername?: string;
  
  // Add other fields as necessary
}
