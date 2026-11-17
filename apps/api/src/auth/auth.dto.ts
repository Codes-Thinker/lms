import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class AcceptInvitationDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "Password must include letters and numbers",
  })
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "Password must include letters and numbers",
  })
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
