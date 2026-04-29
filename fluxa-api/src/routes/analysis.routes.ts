import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { detectRegime, getSentiment, refreshSentiment } from '@/services/analysis.service';
import { compareAssets } from '@/services/comparison.service';
import { ASSETS } from '@/config/assets.config';
import { z } from 'zod';

const router = Router();

router.get('/regime', asyncHandler(async (req, res) => {
    const { asset } = z.object({ asset: z.string().min(1) }).parse(req.query);
    const result = await detectRegime(asset);
    res.status(200).json(result);
}));

const compareSchema = z.object({
    assets: z.string().min(1),
    period: z.enum(['1M', '1Y', '5Y']),
});

router.get('/compare', asyncHandler(async (req, res) => {
    const { assets, period } = compareSchema.parse(req.query);
    const ids = assets.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length !== 2) {
        return res.status(400).json({ error: 'Exactly two asset ids are required (comma-separated)' });
    }
    const result = await compareAssets(ids[0], ids[1], period);
    res.status(200).json(result);
}));

router.get('/sentiment', asyncHandler(async (req, res) => {
    const { asset } = z.object({ asset: z.string().min(1) }).parse(req.query);
    const result = await getSentiment(asset);
    res.status(200).json(result);
}));

// Internal endpoint called by the scheduled job — refreshes all supported tickers
router.post('/sentiment/refresh', asyncHandler(async (req, res) => {
    const EARNINGS_ASSET_IDS = [
        // US stocks (SEC EDGAR)
        'aapl', 'msft', 'nvda', 'tsla', 'amzn', 'googl', 'meta', 'nflx', 'brkb', 'jpm', 'v', 'coin',
        // B3 stocks (CVM ITR)
        'petr4', 'vale3', 'itub4', 'bbdc4', 'bbas3', 'wege3', 'mglu3', 'b3sa3',
    ];
    const results = await Promise.allSettled(EARNINGS_ASSET_IDS.map(id => refreshSentiment(id)));
    const summary = results.map((r, i) =>
        r.status === 'fulfilled'
            ? r.value
            : { ticker: EARNINGS_ASSET_IDS[i], newQuarters: 0, error: (r.reason as Error).message }
    );
    res.status(200).json({ refreshed: summary });
}));

export default router;