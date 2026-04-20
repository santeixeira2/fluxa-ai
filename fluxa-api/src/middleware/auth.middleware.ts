import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { AuthPayload } from '@/types';

declare global {
    namespace Express {
        interface Request {
            user?: { sub: string; email: string };
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const payload = jwt.verify(header.split(' ')[1], String(config.jwtSecret)) as AuthPayload;
        req.user = { sub: payload.userId, email: payload.email };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(header.split(' ')[1], String(config.jwtSecret)) as AuthPayload;
            req.user = { sub: payload.userId, email: payload.email };
        } catch { /* token inválido — ignora */ }
    }
    next();
}