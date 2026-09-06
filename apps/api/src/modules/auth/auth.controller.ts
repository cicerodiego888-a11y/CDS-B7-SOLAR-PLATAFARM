import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtPayload } from './auth.types';
import { Public } from './public.decorator';

class LoginDto {
  @IsString() @MinLength(1) email!: string;
  @IsString() @MinLength(6) password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.service.me(user.sub);
  }
}
