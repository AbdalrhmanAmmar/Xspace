export const getDeletedVisits = async () => {
  const { data, error } = await supabase
    .from('deleted_visits')
    .select(`
      *,
      deleted_by:profiles(username)
    `)
    .order('deleted_at', { ascending: false });
  
  if (error) throw error;
  return data;
};