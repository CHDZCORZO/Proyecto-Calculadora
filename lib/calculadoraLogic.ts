export type TipoProducto =
  | 'Nuevo'
  | 'NUEVO'
  | 'Segunda disposición'
  | 'SEGUNDA DISP'
  | 'CNCA'
  | 'Intercompañía'
  | 'INTERCOMPAÑÍA'
  | 'CNCA Interno'
  | 'CNCA INTERNO'
  | 'LCOM TERCEROS';

export interface CreditoALiquidar {
  marca: string;
  saldo: number;
  tasa: number;
  cat: number;
  pagos_aplicados: number;
  plazo_actual: number;
}

export interface DatosCliente {
  edad: number;
  capacidad_pago: number; // Representa la Capacidad Disponible
}

export interface CotizadorData {
  id: string;
  marca: string;
  id_cotizador: string;
  nombre_cotizador: string;
  plazo: number;
  monto_bruto: number;
  descuento: number;
  tasa_mensual: number;
  cat_iva: number;
}

/**
 * Motor de Reglas de Negocio CLEARVOICE.
 * Audita y filtra el listado de ofertas disponibles asegurando el cumplimiento de todas las normativas.
 *
 * @param datosCliente Objeto con la edad y capacidad_pago del cliente.
 * @param tipoProducto Clasificación de la solicitud actual.
 * @param creditosALiquidar Array con los créditos a liquidar del cliente.
 * @param ofertasDisponibles Array de ofertas brutas provenientes de cotizadores_data.
 * @returns Array de ofertas aprobadas por la auditoría.
 */
export function calcularOfertas(
  datosCliente: DatosCliente,
  tipoProducto: TipoProducto,
  creditosALiquidar: CreditoALiquidar[],
  ofertasDisponibles: CotizadorData[]
): CotizadorData[] {

  return ofertasDisponibles.filter((oferta) => {

    // =========================================================================
    // 2. REGLA UNIVERSAL (Aplica a todo)
    // =========================================================================

    // Diferencial Neto: (Monto_Bruto_Oferta - Suma_Saldos_Liquidar) >= $5,000
    const sumaSaldos = creditosALiquidar.reduce((sum, c) => sum + c.saldo, 0);
    const diferencialNeto = oferta.monto_bruto - sumaSaldos;
    if (diferencialNeto < 5000) {
      return false; // Si no se cumple, descarta la oferta para cualquier marca
    }

    // Filtro de Edad: (Edad + Plazo_Meses / 12) <= 85
    const edadAlTerminar = datosCliente.edad + (oferta.plazo / 12);
    if (edadAlTerminar > 85) {
      return false;
    }

    // Regla implícita de negocio: El descuento no puede exceder la capacidad de pago base
    if (oferta.descuento > datosCliente.capacidad_pago) {
      return false;
    }

    // =========================================================================
    // 3. VALIDACIÓN DE MEJORA DE CONDICIONES Y PAGOS MÍNIMOS (Por crédito individual)
    // =========================================================================
    const tpStr = (tipoProducto as string).toUpperCase();
    const requiereMejora = ['CNCA', 'INTERCOMPAÑÍA', 'INTERCOMPANIA', 'LCOM TERCEROS'].includes(tpStr);

    if (requiereMejora && creditosALiquidar.length > 0) {
      // Validar mínimo 24 pagos aplicados en todos los créditos
      const tienePagosSuficientes = creditosALiquidar.every(c => c.pagos_aplicados >= 24);
      if (!tienePagosSuficientes) return false;

      // Debe cumplirse para CADA crédito a liquidar
      const mejoraCumplida = creditosALiquidar.every((credito) => {
        if (tpStr === 'CNCA') {
          // El Nuevo_CAT debe ser estrictamente menor al CAT de CADA crédito
          return oferta.cat_iva < credito.cat;
        } else if (tpStr === 'INTERCOMPAÑÍA' || tpStr === 'INTERCOMPANIA' || tpStr === 'LCOM TERCEROS') {
          // El Nuevo_CAT debe ser <= (CAT anterior - 0.50) para CADA crédito
          return oferta.cat_iva <= (credito.cat - 0.50);
        }
        return true;
      });

      // Si un solo crédito no mejora, la marca (oferta) se descarta.
      if (!mejoraCumplida) return false;
    }

    // =========================================================================
    // 4. AUDITORÍA ESPECÍFICA PARA 'CNCA INTERNO' (Reglas por Tokens)
    // =========================================================================
    if (tipoProducto === 'CNCA Interno' && creditosALiquidar.length > 0) {
      const marcaOferta = oferta.marca.toUpperCase();
      let capacidadDisponible = datosCliente.capacidad_pago;

      // Validamos que sea de las marcas con reglas definidas para CNCA Interno
      if (marcaOferta !== 'OPCIPRES' && marcaOferta !== 'CONSUBANCO') {
        return false;
      }

      // Evalúa cada crédito individualmente. TODOS los créditos deben cumplir al menos UNA regla.
      const pasaAuditoriaInterna = creditosALiquidar.every((credito) => {
        const tasaOferta = oferta.tasa_mensual;
        const pagos = credito.pagos_aplicados;
        const plazoActual = credito.plazo_actual;
        const plazoNuevo = oferta.plazo;

        // Regla universal para incremento de plazo: (12->36+, 24->48+, 36/48->54+, 54->60+)
        const cumpleIncrementoPlazo = (actual: number, nuevo: number) => {
          if (actual <= 12 && nuevo >= 36) return true;
          if (actual > 12 && actual <= 24 && nuevo >= 48) return true;
          if (actual > 24 && actual <= 48 && nuevo >= 54) return true;
          if (actual > 48 && actual <= 54 && nuevo >= 60) return true;
          return false;
        };

        let cumpleReglaIndividual = false;

        // A. Marca OPCIPRES
        if (marcaOferta === 'OPCIPRES') {
          const regla1 = credito.tasa <= 2.57;
          const regla2 = pagos >= 16 && credito.tasa <= 2.64;
          const regla4 = cumpleIncrementoPlazo(plazoActual, plazoNuevo);
          const regla3Condicion = capacidadDisponible >= 750 && credito.tasa <= 2.64;

          // Priorizamos reglas que no consumen capacidad
          if (regla1 || regla2 || regla4) {
            cumpleReglaIndividual = true;
          }
          // Si es estrictamente necesario, usamos el consumo de capacidad (Token)
          else if (regla3Condicion) {
            cumpleReglaIndividual = true;
            capacidadDisponible -= 750; // Al usar esta regla, resta de la capacidad
          }
        }
        // B. Marca CONSUBANCO
        else if (marcaOferta === 'CONSUBANCO') {
          const regla1 = credito.tasa <= 2.40;
          const regla2 = pagos >= 16 && credito.tasa <= 2.57;
          const regla4 = cumpleIncrementoPlazo(plazoActual, plazoNuevo);
          const regla3Condicion = capacidadDisponible >= 1000 && credito.tasa <= 2.57;

          if (regla1 || regla2 || regla4) {
            cumpleReglaIndividual = true;
          } else if (regla3Condicion) {
            cumpleReglaIndividual = true;
            capacidadDisponible -= 1000; // Al usar esta regla, resta de la capacidad
          }
        }

        return cumpleReglaIndividual;
      });

      // Si no pasa la auditoría para la totalidad de sus créditos a liquidar, descartar
      if (!pasaAuditoriaInterna) return false;
    }

    // =========================================================================
    // 5. RESULTADO
    // =========================================================================
    // Si pasa satisfactoriamente todos los filtros, retornar verdadero
    return true;
  });
}
