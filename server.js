import express from 'express';
import 'dotenv/config';
import supabase from './config/supabaseClient.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Workout Logger API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
