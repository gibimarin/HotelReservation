import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { UserRole } from '../constants/roles';
import { AppError } from '../utils/appError';
import { env } from '../config/env';

interface JwtPayload {
  id: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Protect routes: verifies the JWT Bearer token and attaches the authenticated user to req.user.
 */
export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Extract Bearer token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError(
        'Authentication required. Please provide a valid Bearer token.',
        401,
        'UNAUTHORIZED'
      );
    }

    // 2. Cryptographically verify the token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // 3. Confirm user still exists in database
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new AppError(
        'The user belonging to this authentication token no longer exists.',
        401,
        'USER_NOT_FOUND'
      );
    }

    // 4. Grant access and attach user to request context
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict route access to specified roles.
 * Example: authorize(UserRole.ADMIN, UserRole.STAFF)
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required before role verification.',
          401,
          'UNAUTHORIZED'
        )
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Your role (${req.user.role}) is not authorized for this resource.`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
