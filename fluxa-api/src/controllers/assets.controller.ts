import { Request, Response } from 'express';
import { ASSETS } from '../config/assets.config';

export function listAssets(_req: Request, res: Response) {
    // Return only the fields the frontend needs
    const assets = ASSETS.map(({ id, symbol, name, type, nativeCurrency, minDate }) => ({
        id,
        symbol,
        name,
        type,
        nativeCurrency,
        minDate,
    }));
    res.json(assets);
}
