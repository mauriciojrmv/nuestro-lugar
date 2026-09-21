import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'

export async function setFavorite(memoryId: string, coupleId: string, userId: string, favorite: boolean) {
  if (favorite) {
    unwrap(
      await supabase
        .from('favorites')
        .upsert(
          { memory_id: memoryId, couple_id: coupleId, user_id: userId },
          { onConflict: 'memory_id,user_id', ignoreDuplicates: true },
        ),
    )
  } else {
    unwrap(await supabase.from('favorites').delete().eq('memory_id', memoryId).eq('user_id', userId))
  }
}
