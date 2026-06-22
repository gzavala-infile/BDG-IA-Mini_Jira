import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import ticketsRouter from './routes/tickets';
import commentsRouter from './routes/comments';
import usersRouter from './routes/users';
import metricsRouter from './routes/metrics';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3001);

app.use(cors({ origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/tickets/:ticketId/comments', commentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/metrics', metricsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
