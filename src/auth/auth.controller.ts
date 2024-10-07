import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CodeAuthDto, CreateAuthDto } from './dto/create-auth.dto';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public, ResponseMessage } from '@/decorator/customize';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private mailerService: MailerService,
  ) {}

  @Post('login')
  @Public()
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Login success') // ✏️ custom decorator
  handleLogin(@Request() req) {
    ///fix bug
    return this.authService.login(req.user);
  }

  @Post('register')
  @Public()
  register(@Body() registerDto: CreateAuthDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Post('check-code')
  @Public()
  checkCode(@Body() checkCodeDto: CodeAuthDto) {
    return this.authService.checkCode(checkCodeDto);
  }

  @Post('retry-active')
  @Public()
  retryActive(@Body('email') email: string) {
    return this.authService.retryActive(email);
  }

  @Get('mail')
  @Public()
  testMail() {
    this.mailerService.sendMail({
      to: 'duchuy246938@gmail.com', // list of receivers
      // from: '"Support Team" <support@example.com>', // override default from
      subject: 'Welcome to Nice App! Confirm your Email',
      text: 'welcome',
      template: 'register', // `.hbs` extension is appended automatically
      context: {
        // ✏️ filling curly brackets with content
        name: 'duchuy',
        activationCode: 1234567,
      },
    });
    return 'mail sent';
  }
}
