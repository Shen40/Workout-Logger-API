
export default function createDeleteWorkoutHandler(supabase, isValidUuid) {
    return async (req, res) => {
        const { id } = req.params;

        if (!isValidUuid(id)) {
            return res.status(400).json({
                error: 'workout id must be a valid UUID'
            });
        }

        try {
            // Check if workout exists
            const { data: workout, error: lookupError } = await supabase
                .from('workouts')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (lookupError) throw lookupError;

            if (!workout) {
                return res.status(404).json({
                    error: 'workout not found'
                });
            }

            // Delete the sets belonging to the workout
            const { error: setsError } = await supabase
                .from('sets')
                .delete()
                .eq('workout_id', id);

            if (setsError) throw setsError;

            // Delete the workout
            const { data: deletedWorkout, error: deleteError } = await supabase
                .from('workouts')
                .delete()
                .eq('id', id)
                .select('*')
                .maybeSingle();

            if (deleteError) throw deleteError;

            if (!deletedWorkout) {
                return res.status(404).json({
                    error: 'workout not found'
                });
            }

            return res.status(200).json(deletedWorkout);

        } catch (err) {
            return res.status(500).json({
                error: err.message
            });
        }
    };
}
