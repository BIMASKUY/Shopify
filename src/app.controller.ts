import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaClient } from '@prisma/client';
import { LoginDto } from './login.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

const prisma = new PrismaClient();

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('/')
  getHome() {
    return 'Hello Api Alive!';
  }

  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto;
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || user.password !== password) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid credentials',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const payload = { username: user.email, sub: user.id };
      const token = this.jwtService.sign(payload);

      return {
        success: true,
        message: 'Login successful',
        data: { user, token },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to login',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/orders')
  async getOrders() {
    try {
      return await this.appService.fetchOrders();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve Orders',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/customers')
  async getCustomer() {
    try {
      return await this.appService.fetchCustomer();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve customer data',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/sales-forecast')
  async getSalesForecast() {
    try {
      return await this.appService.fetchSalesForecast();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve sales forecast',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('/churn-prediction')
  async getChurnPrediction() {
    try {
      return await this.appService.fetchChurnPrediction();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve churn prediction',
          data: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}