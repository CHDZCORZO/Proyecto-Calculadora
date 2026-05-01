const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kdzbivxubtjhsalbretf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkemJpdnh1YnRqaHNhbGJyZXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTQzMTcsImV4cCI6MjA5MjA3MDMxN30.tFu44Poos_fwDZGVBW9L_jtp9D-a2mdBdqN79jcThM0');

async function testLogic() {
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
      } else {
        tablasRaw = [...tablasRaw, ...data];
        from += step;
        if (data.length < step) hasMore = false;
      }
    }
    
    const marcasDisponibles = Array.from(new Set(tablasRaw.map(o => o.marca)));
    console.log('Marcas:', marcasDisponibles);

    const resultadosTemp = {};
    const erroresTemp = {};

    const capacidadTotal = 5000;
    const edad = 35;
    const totalSaldos = 0;
    const reglas = {}; // defaults will be used

    marcasDisponibles.forEach(marca => {
      const ofertasMarca = tablasRaw.filter(o => o.marca === marca);
      const ofertasViables = [];
      let errorPrincipal = '';

      for (const oferta of ofertasMarca) {
        const neto = Number(oferta.monto) - totalSaldos;
        const difMin = reglas['diferencial_neto_minimo'] || 5000;
        if (neto < difMin) { errorPrincipal = 'Neto inferior'; continue; }

        const edadCritica = reglas['edad_critica_maxima'] || 85;
        if (edad + (Number(oferta.plazo) / 12) > edadCritica) { errorPrincipal = 'Edad Critica'; continue; }

        const plazoMax = reglas['plazo_maximo'] || 60;
        if (Number(oferta.plazo) > plazoMax) { errorPrincipal = 'Plazo max'; continue; }

        if (Number(oferta.descuento) > capacidadTotal) { errorPrincipal = 'Capacidad'; continue; }

        ofertasViables.push(oferta);
      }

      if (ofertasViables.length > 0) {
        const mejoresPorPlazo = {};
        ofertasViables.forEach(o => {
          if (!mejoresPorPlazo[o.plazo] || Number(o.monto) > Number(mejoresPorPlazo[o.plazo].monto)) {
            mejoresPorPlazo[o.plazo] = o;
          }
        });
        resultadosTemp[marca] = Object.values(mejoresPorPlazo).sort((a, b) => a.plazo - b.plazo);
      } else {
        erroresTemp[marca] = errorPrincipal || 'No hay ofertas viables';
      }
    });

    console.log('Resultados:', Object.keys(resultadosTemp).map(m => m + ' (' + resultadosTemp[m].length + ')'));
    console.log('Errores:', erroresTemp);
}

testLogic();
