import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { AccountStatus, AccountType, PaymentPlanType } from "@prisma/client";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsEnum(AccountType)
  accountType!: AccountType;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  track?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  /** If set, user becomes ACTIVE and can log in immediately. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  sendInvitation?: boolean;

  /** Student: enroll into these courses on create. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyFee?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCourseFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  courseDurationMonths?: number;

  @IsOptional()
  @IsEnum(PaymentPlanType)
  paymentType?: PaymentPlanType;

  @IsOptional()
  @IsInt()
  @Min(0)
  installment1Amount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  installment2Amount?: number;

  @IsOptional()
  @IsString()
  feeStartDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  feeDueDay?: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  /** If set (min 8 chars), replaces login password. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  track?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsString()
  batchId?: string | null;

  @IsOptional()
  @IsInt()
  monthlyFee?: number;

  @IsOptional()
  @IsString()
  feeStartDate?: string;

  @IsOptional()
  @IsInt()
  feeDueDay?: number;

  @IsOptional()
  @IsString()
  internshipStart?: string | null;

  @IsOptional()
  @IsString()
  internshipEnd?: string | null;

  @IsOptional()
  @IsEnum(PaymentPlanType)
  paymentType?: PaymentPlanType | null;

  @IsOptional()
  @IsInt()
  installment1Amount?: number | null;

  @IsOptional()
  @IsInt()
  installment2Amount?: number | null;

  @IsOptional()
  @IsInt()
  courseDurationMonths?: number | null;

  @IsOptional()
  @IsInt()
  totalCourseFee?: number | null;

  /** Replace student enrollments with these course IDs. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];
}

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  /** Filter students enrolled in this course. */
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}
