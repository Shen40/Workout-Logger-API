import express from 'express';
import 'dotenv/config';
import supabase from './config/supabaseClient.js';

const app = express();
app.use(express.json());

app.get('/api/health', async (req, res) => {
    try{
        res.status(200).json({ 
            status: 'ok',
            server: 'running',
            database: 'connected'
    });
    } catch(err){
        res.status(500).json({
            status: 'error',
            server: 'running',
            database: 'unreachable',
            error: err.message,
        });
    }
});

async function createWorkout(name, date){
    const { data, error } = await supabase
        .from("workouts")
        .insert({ name, date })
        .select()
        .single()

    if (error) throw error
    return data
}

function isValidDate(str) {
    if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str + 'T00:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === str;
}

app.post('/api/workouts', async(req, res)=>{
    const { name, date } = req.body || {}

    if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'name is required and cannot be blank' });
    }
    if (!isValidDate(date)) {
        return res.status(400).json({ error: 'date must be a real date in YYYY-MM-DD format' });
    }

    try{
        const workout = await createWorkout(name, date);
        res.status(201).json(workout);
    } catch(err){
        res.status(500).json({ error: err.message })
    }
})
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(str) {
    return typeof str === 'string' && UUID_RE.test(str);
}

app.get('/api/workouts', async(req, res)=>{
    const {month} = req.query

    if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({ error: 'month must be in YYYY-MM format' });
    }

    try{
        const {data} = await supabase.from('workouts').select('*')

        const workouts = month? data.filter(w=>w.date.slice(0, 7) === month) : data

        res.status(200).json(workouts)
    }catch(err){
        res.status(500).json({error: err.message})
    }
})
//add set to workout
app.post('/api/workouts/:id/sets', async (req, res) => {
    const { id } = req.params;
    const { exercise, weight, reps } = req.body || {};

    if (!isValidUuid(id)) {
        return res.status(400).json({ error: 'workout id must be a valid UUID' });
    }
    if (typeof exercise !== 'string' || exercise.trim() === '') {
        return res.status(400).json({ error: 'exercise is required and cannot be blank' });
    }
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
        return res.status(400).json({ error: 'weight must be a number of 0 or more' });
    }
    if (!Number.isInteger(reps) || reps < 1) {
        return res.status(400).json({ error: 'reps must be a whole number of at least 1' });
    }

    try {
        // Make sure the workout exists
        const { data: workout, error: workoutError } = await supabase
            .from('workouts')
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (workoutError) throw workoutError;
        if (!workout) {
            return res.status(404).json({ error: 'workout not found' });
        }

        // Insert the set
        const { data: newSet, error: insertError } = await supabase
            .from('sets')
            .insert({ workout_id: id, exercise: exercise.trim(), weight, reps })
            .select()
            .single();

        if (insertError) throw insertError;

        res.status(201).json(newSet);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
//PR - personal records
app.get('/api/stats/personal-bests', async (req, res) => {
    try {
        const { data: sets, error } = await supabase
            .from('sets')
            .select('exercise, weight, reps, workout_id, workouts(date)');

        if (error) throw error;

        // Group by lowercase exercise name, keeping the heaviest set of each
        const bests = new Map();
        for (const s of sets) {
            const key = s.exercise.trim().toLowerCase();
            const weight = Number(s.weight);
            const current = bests.get(key);

            if (!current || weight > current.weight) {
                bests.set(key, {
                    exercise: key,
                    weight,
                    reps: s.reps,
                    workout_id: s.workout_id,
                    date: s.workouts ? s.workouts.date : null,
                });
            }
        }

        let results = Array.from(bests.values()).sort((a, b) =>
            a.exercise.localeCompare(b.exercise)
        );

        // Optional ?exercise= filter
        const { exercise } = req.query;
        if (exercise !== undefined) {
            const wanted = String(exercise).trim().toLowerCase();
            results = results.filter((r) => r.exercise === wanted);

            if (results.length === 0) {
                return res.status(404).json({ error: `no sets logged for "${exercise}"` });
            }
        }

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// json 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'route not found' });
});

//other uncaught errors
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'request body is not valid JSON' });
    }
    res.status(500).json({ error: err.message });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
