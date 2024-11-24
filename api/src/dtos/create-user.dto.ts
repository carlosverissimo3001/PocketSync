import { IsString, IsNotEmpty, IsStrongPassword } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;
  
  @ApiProperty()
  @IsString()
  @IsStrongPassword({ minLength: 8, minUppercase: 1, minSymbols: 1 })
  password: string;
}
