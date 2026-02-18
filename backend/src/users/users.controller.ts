import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(
        private userService: UsersService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Register a new user' })
    async createUser(@Body() data: CreateUserDto) {
        return this.userService.createUser(data);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user by ID' })
    async getUser(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
        return this.userService.getUser(id, user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user profile' })
    async updateUser(
        @Param('id') id: string,
        @Body() data: UpdateUserDto,
        @CurrentUser() user: CurrentUserPayload,
    ) {
        return this.userService.updateUser(id, data, user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Soft delete user account' })
    async deleteUser(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
        return this.userService.deleteUser(id, user.userId);
    }
}
