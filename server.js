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
    const{data, error} = await supabase
        .from("workouts")
        .insert({ name, date})
        .select()
        .single()

    if(error){
        console.error("Cannont add the Workout.", error.message)
    }
    return data 
}

function isValidDate(str) {
    if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str + 'T00:00:00Z');
    return !isNaN(d) && d.toISOString().slice(0, 10) === str;
}

app.post('/api/workouts', async(req, res)=>{
    const { name, date} = req.body

    if (name.trim() === '') {
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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
