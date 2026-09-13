import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-uuid-1234',
    email: 'test@proofledger.org',
    passwordHash: '$2a$10$mockHashedPassword12345678901234567890123456789012',
    firstName: 'Test',
    lastName: 'User',
    globalRole: 'USER' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    sanitizeUser: jest.fn().mockImplementation((user: any) => {
      const { passwordHash, ...rest } = user;
      return rest;
    }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-access-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully and return an access token', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const dto = {
        email: 'test@proofledger.org',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await service.register(dto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(usersService.create).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toHaveProperty('accessToken', 'mock-jwt-access-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const dto = {
        email: 'test@proofledger.org',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      await expect(service.register(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should authenticate user and return an access token', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };

      mockUsersService.findByEmail.mockResolvedValue(userWithHash);

      const dto = {
        email: 'test@proofledger.org',
        password: 'Password123!',
      };

      const result = await service.login(dto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(result).toHaveProperty('accessToken', 'mock-jwt-access-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const userWithHash = { ...mockUser, passwordHash: hashedPassword };

      mockUsersService.findByEmail.mockResolvedValue(userWithHash);

      const dto = {
        email: 'test@proofledger.org',
        password: 'WrongPassword!',
      };

      await expect(service.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
