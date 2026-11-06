import jwt from 'jsonwebtoken';
import { User, IUserDocument } from '../models/User';
import { UserRole } from '../constants/roles';
import { AppError } from '../utils/appError';
import { env } from '../config/env';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: Date;
  };
  token: string;
}

export class AuthService {
  /**
   * Generate a signed JWT with user ID and role claims.
   */
  public static signToken(user: IUserDocument): string {
    return jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN as any,
      }
    );
  }

  /**
   * Format the sanitized public user response.
   */
  private static formatUserResponse(user: IUserDocument) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Register a new guest customer.
   * Enforces role = GUEST regardless of any client inputs.
   */
  public static async registerGuest(input: RegisterInput): Promise<AuthResponse> {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new AppError(
        'An account with this email address already exists.',
        409,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    const user = await User.create({
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
      role: UserRole.GUEST, // Enforce guest role strictly
    });

    const token = this.signToken(user);

    return {
      user: this.formatUserResponse(user),
      token,
    };
  }

  /**
   * Authenticate any registered user (Guest, Staff, or Admin).
   */
  public static async login(input: LoginInput): Promise<AuthResponse> {
    // Explicitly query for +password because select: false is configured on the schema
    const user = await User.findOne({ email: input.email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      throw new AppError(
        'Invalid email or password.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const isPasswordCorrect = await user.comparePassword(input.password);
    if (!isPasswordCorrect) {
      throw new AppError(
        'Invalid email or password.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const token = this.signToken(user);

    return {
      user: this.formatUserResponse(user),
      token,
    };
  }

  /**
   * Retrieve current authenticated user profile.
   */
  public static async getCurrentUser(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    return this.formatUserResponse(user);
  }
}

