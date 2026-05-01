const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kdzbivxubtjhsalbretf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkemJpdnh1YnRqaHNhbGJyZXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTQzMTcsImV4cCI6MjA5MjA3MDMxN30.tFu44Poos_fwDZGVBW9L_jtp9D-a2mdBdqN79jcThM0');

async function test() {
    let tablasRaw = [];
    let hasMore = true;
    let from = 0;
    const step = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from('tablas_cotizador')
        .select('*')
        .eq('tramite', 'NUEVO')
        .order('id')
        .range(from, from + step - 1);
        
      if (error || !data || data.length === 0) {
        hasMore = false;
        if(error) console.error(error);
      } else {
        tablasRaw = [...tablasRaw, ...data];
        from += step;
        if (data.length < step) hasMore = false;
      }
    }
    
    console.log('Total fetched:', tablasRaw.length);
    const marcasDisponibles = Array.from(new Set(tablasRaw.map(o => o.marca)));
    console.log('Marcas:', marcasDisponibles);
}

test();
