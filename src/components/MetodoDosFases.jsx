import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Eye, EyeOff } from 'lucide-react';

const MetodoDosFases = () => {
  const [numVariables, setNumVariables] = useState(3);
  const [objetivo, setObjetivo] = useState({ tipo: 'Minimizar', coeficientes: [2, 1, 3] });
  const [restricciones, setRestricciones] = useState([
    { coeficientes: [5, 2, 7], tipo: '≤', valor: 420 },
    { coeficientes: [3, 2, 5], tipo: '≤', valor: 280 },
    { coeficientes: [1, 0, 1], tipo: '≤', valor: 100 }
  ]);
  const [solucion, setSolucion] = useState(null);
  const [mostrarPasos, setMostrarPasos] = useState(false);

  // Agregar nueva variable
  const agregarVariable = () => {
    setNumVariables(prev => prev + 1);
    setObjetivo(prev => ({
      ...prev,
      coeficientes: [...prev.coeficientes, 0]
    }));
    setRestricciones(prev => 
      prev.map(r => ({
        ...r,
        coeficientes: [...r.coeficientes, 0]
      }))
    );
  };

  // Eliminar variable
  const eliminarVariable = (index) => {
    if (numVariables <= 1) return;
    
    setNumVariables(prev => prev - 1);
    setObjetivo(prev => ({
      ...prev,
      coeficientes: prev.coeficientes.filter((_, i) => i !== index)
    }));
    setRestricciones(prev => 
      prev.map(r => ({
        ...r,
        coeficientes: r.coeficientes.filter((_, i) => i !== index)
      }))
    );
  };

  // Agregar nueva restricción
  const agregarRestriccion = () => {
    setRestricciones(prev => [
      ...prev,
      { coeficientes: new Array(numVariables).fill(0), tipo: '≤', valor: 0 }
    ]);
  };

  // Eliminar restricción
  const eliminarRestriccion = (index) => {
    setRestricciones(prev => prev.filter((_, i) => i !== index));
  };

  // Actualizar coeficiente de función objetivo
  const actualizarObjetivo = (index, valor) => {
    setObjetivo(prev => ({
      ...prev,
      coeficientes: prev.coeficientes.map((c, i) => i === index ? parseFloat(valor) || 0 : c)
    }));
  };

  // Actualizar coeficiente de restricción
  const actualizarRestriccion = (restriccionIndex, coefIndex, valor) => {
    setRestricciones(prev => 
      prev.map((r, i) => 
        i === restriccionIndex 
          ? { ...r, coeficientes: r.coeficientes.map((c, j) => j === coefIndex ? parseFloat(valor) || 0 : c) }
          : r
      )
    );
  };

  // Actualizar valor de restricción
  const actualizarValorRestriccion = (index, valor) => {
    setRestricciones(prev => 
      prev.map((r, i) => i === index ? { ...r, valor: parseFloat(valor) || 0 } : r)
    );
  };

  // Actualizar tipo de restricción
  const actualizarTipoRestriccion = (index, tipo) => {
    setRestricciones(prev => 
      prev.map((r, i) => i === index ? { ...r, tipo } : r)
    );
  };

  // Método de Dos Fases completo
  const resolver = () => {
    try {
      // Verificar que todas las restricciones tengan valores no negativos
      const restriccionesNegativas = restricciones.some(r => r.valor < 0);
      if (restriccionesNegativas) {
        setSolucion({ error: "Todas las restricciones deben tener valores no negativos para el lado derecho." });
        return;
      }

      // Convertir a forma estándar para Fase 1
      const { tablaFase1, variablesArtificiales, variablesHolgura, variablesExceso } = convertirFormaEstandarFase1();
      
      // Ejecutar Fase 1
      const resultadoFase1 = ejecutarFase1(tablaFase1, variablesArtificiales);
      
      if (!resultadoFase1.esFeasible) {
        setSolucion({ 
          esFeasible: false, 
          mensaje: "El problema no tiene solución factible",
          pasosFase1: resultadoFase1.pasos
        });
        return;
      }

      // Ejecutar Fase 2
      const resultadoFase2 = ejecutarFase2(resultadoFase1.tabla, variablesHolgura, variablesExceso);
      
      setSolucion({
        ...resultadoFase2,
        pasosFase1: resultadoFase1.pasos,
        pasosFase2: resultadoFase2.pasos
      });

    } catch (error) {
      setSolucion({ error: "Error al resolver el problema: " + error.message });
    }
  };

  // Convertir a forma estándar para Fase 1
  const convertirFormaEstandarFase1 = () => {
    const m = restricciones.length;
    const n = numVariables;
    
    let variablesHolgura = [];
    let variablesExceso = [];
    let variablesArtificiales = [];
    
    // Contar variables adicionales necesarias
    let numHolgura = 0, numExceso = 0, numArtificiales = 0;
    
    restricciones.forEach((r, i) => {
      if (r.tipo === '≤') {
        variablesHolgura.push(i);
        numHolgura++;
      } else if (r.tipo === '≥') {
        variablesExceso.push(i);
        variablesArtificiales.push(i);
        numExceso++;
        numArtificiales++;
      } else { // r.tipo === '='
        variablesArtificiales.push(i);
        numArtificiales++;
      }
    });

    // Crear tabla inicial para Fase 1
    const totalColumnas = n + numHolgura + numExceso + numArtificiales + 1; // +1 para RHS
    const tabla = Array(m + 1).fill(null).map(() => Array(totalColumnas).fill(0));
    
    // Llenar restricciones
    let colHolgura = n;
    let colExceso = n + numHolgura;
    let colArtificial = n + numHolgura + numExceso;
    
    restricciones.forEach((r, i) => {
      // Coeficientes de variables originales
      for (let j = 0; j < n; j++) {
        tabla[i][j] = r.coeficientes[j];
      }
      
      // Variables de holgura, exceso y artificiales
      if (r.tipo === '≤') {
        tabla[i][colHolgura] = 1;
        colHolgura++;
      } else if (r.tipo === '≥') {
        tabla[i][colExceso] = -1;
        tabla[i][colArtificial] = 1;
        colExceso++;
        colArtificial++;
      } else { // r.tipo === '='
        tabla[i][colArtificial] = 1;
        colArtificial++;
      }
      
      // Lado derecho
      tabla[i][totalColumnas - 1] = r.valor;
    });

    // Función objetivo para Fase 1 (minimizar suma de variables artificiales)
    variablesArtificiales.forEach(i => {
      let colArt = n + numHolgura + numExceso;
      restricciones.forEach((r, j) => {
        if (j === i) {
          if (r.tipo === '≥' || r.tipo === '=') {
            tabla[m][colArt] = 1;
          }
        }
        if (r.tipo === '≥' || r.tipo === '=') {
          colArt++;
        }
      });
    });

    // Eliminar variables artificiales de la función objetivo
    variablesArtificiales.forEach(i => {
      let colArt = n + numHolgura + numExceso;
      restricciones.forEach((r, j) => {
        if (j <= i) {
          if (r.tipo === '≥' || r.tipo === '=') {
            if (j === i) {
              // Restar la fila de la restricción a la función objetivo
              for (let k = 0; k < totalColumnas; k++) {
                tabla[m][k] -= tabla[i][k];
              }
            }
            if (j < i) colArt++;
          }
        }
      });
    });

    return { 
      tablaFase1: tabla, 
      variablesArtificiales: variablesArtificiales.map((_, i) => n + numHolgura + numExceso + i),
      variablesHolgura: variablesHolgura.map((_, i) => n + i),
      variablesExceso: variablesExceso.map((_, i) => n + numHolgura + i)
    };
  };

  // Ejecutar Fase 1
  const ejecutarFase1 = (tabla, variablesArtificiales) => {
    const pasos = [];
    let iteracion = 0;
    const maxIter = 100;
    
    const m = tabla.length - 1;
    const n = tabla[0].length - 1;
    
    // Variables básicas iniciales
    let variablesBasicas = [];
    for (let i = 0; i < m; i++) {
      // Encontrar la variable básica en cada fila
      for (let j = 0; j < n; j++) {
        if (tabla[i][j] === 1) {
          let esBasica = true;
          for (let k = 0; k < m; k++) {
            if (k !== i && Math.abs(tabla[k][j]) > 1e-10) {
              esBasica = false;
              break;
            }
          }
          if (esBasica) {
            variablesBasicas[i] = j;
            break;
          }
        }
      }
    }

    while (iteracion < maxIter) {
      // Encontrar variable entrante (más negativa en fila objetivo)
      let colEntrante = -1;
      let valorMasNegativo = 0;
      
      for (let j = 0; j < n; j++) {
        if (tabla[m][j] < valorMasNegativo) {
          valorMasNegativo = tabla[m][j];
          colEntrante = j;
        }
      }
      
      if (colEntrante === -1) break; // Solución óptima encontrada
      
      // Encontrar variable saliente (prueba de razón)
      let filaSaliente = -1;
      let menorRazon = Infinity;
      
      for (let i = 0; i < m; i++) {
        if (tabla[i][colEntrante] > 1e-10) {
          const razon = tabla[i][n] / tabla[i][colEntrante];
          if (razon >= 0 && razon < menorRazon) {
            menorRazon = razon;
            filaSaliente = i;
          }
        }
      }
      
      if (filaSaliente === -1) {
        return { esFeasible: false, mensaje: "Problema no acotado", pasos };
      }
      
      // Realizar operaciones de pivote
      const elementoPivote = tabla[filaSaliente][colEntrante];
      
      // Normalizar fila del pivote
      for (let j = 0; j <= n; j++) {
        tabla[filaSaliente][j] /= elementoPivote;
      }
      
      // Eliminar columna del pivote en otras filas
      for (let i = 0; i <= m; i++) {
        if (i !== filaSaliente && Math.abs(tabla[i][colEntrante]) > 1e-10) {
          const factor = tabla[i][colEntrante];
          for (let j = 0; j <= n; j++) {
            tabla[i][j] -= factor * tabla[filaSaliente][j];
          }
        }
      }
      
      variablesBasicas[filaSaliente] = colEntrante;
      iteracion++;
      
      pasos.push({
        iteracion,
        variableEntrante: colEntrante,
        variableSaliente: variablesBasicas[filaSaliente],
        tabla: tabla.map(fila => [...fila])
      });
    }
    
    // Verificar si la solución es factible
    const valorObjetivo = Math.abs(tabla[m][n]);
    const esFeasible = valorObjetivo < 1e-10;
    
    return { 
      esFeasible, 
      tabla, 
      variablesBasicas, 
      valorObjetivo,
      pasos,
      iteraciones: iteracion
    };
  };

  // Ejecutar Fase 2
  const ejecutarFase2 = (tablaFase1, variablesHolgura, variablesExceso) => {
    const pasos = [];
    
    // Remover columnas de variables artificiales y crear nueva función objetivo
    const m = tablaFase1.length - 1;
    const nOriginal = numVariables + variablesHolgura.length + variablesExceso.length;
    
    // Crear tabla para Fase 2
    const tabla = Array(m + 1).fill(null).map(() => Array(nOriginal + 1).fill(0));
    
    // Copiar restricciones (sin variables artificiales)
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < nOriginal; j++) {
        tabla[i][j] = tablaFase1[i][j];
      }
      tabla[i][nOriginal] = tablaFase1[i][tablaFase1[0].length - 1];
    }
    
    // Crear función objetivo original
    for (let j = 0; j < numVariables; j++) {
      if (objetivo.tipo === 'Minimizar') {
        tabla[m][j] = objetivo.coeficientes[j];
      } else {
        tabla[m][j] = -objetivo.coeficientes[j];
      }
    }
    
    // Ejecutar simplex para Fase 2
    let iteracion = 0;
    const maxIter = 100;
    
    while (iteracion < maxIter) {
      // Encontrar variable entrante
      let colEntrante = -1;
      let valorMasNegativo = 0;
      
      for (let j = 0; j < nOriginal; j++) {
        if (tabla[m][j] < valorMasNegativo) {
          valorMasNegativo = tabla[m][j];
          colEntrante = j;
        }
      }
      
      if (colEntrante === -1) break; // Solución óptima
      
      // Encontrar variable saliente
      let filaSaliente = -1;
      let menorRazon = Infinity;
      
      for (let i = 0; i < m; i++) {
        if (tabla[i][colEntrante] > 1e-10) {
          const razon = tabla[i][nOriginal] / tabla[i][colEntrante];
          if (razon >= 0 && razon < menorRazon) {
            menorRazon = razon;
            filaSaliente = i;
          }
        }
      }
      
      if (filaSaliente === -1) {
        return { 
          esFeasible: true, 
          esOptimal: false, 
          mensaje: "Problema no acotado",
          pasos 
        };
      }
      
      // Operaciones de pivote
      const elementoPivote = tabla[filaSaliente][colEntrante];
      
      for (let j = 0; j <= nOriginal; j++) {
        tabla[filaSaliente][j] /= elementoPivote;
      }
      
      for (let i = 0; i <= m; i++) {
        if (i !== filaSaliente && Math.abs(tabla[i][colEntrante]) > 1e-10) {
          const factor = tabla[i][colEntrante];
          for (let j = 0; j <= nOriginal; j++) {
            tabla[i][j] -= factor * tabla[filaSaliente][j];
          }
        }
      }
      
      iteracion++;
      
      pasos.push({
        iteracion,
        variableEntrante: colEntrante,
        variableSaliente: filaSaliente,
        tabla: tabla.map(fila => [...fila])
      });
    }
    
    // Extraer solución
    const variablesDecision = new Array(numVariables).fill(0);
    const variablesBasicas = [];
    
    // Encontrar variables básicas y sus valores
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < nOriginal; j++) {
        if (Math.abs(tabla[i][j] - 1) < 1e-10) {
          let esBasica = true;
          for (let k = 0; k < m; k++) {
            if (k !== i && Math.abs(tabla[k][j]) > 1e-10) {
              esBasica = false;
              break;
            }
          }
          if (esBasica) {
            const valor = tabla[i][nOriginal];
            if (j < numVariables) {
              variablesDecision[j] = Math.max(0, Math.round(valor * 1000) / 1000);
            }
            
            let nombreVariable;
            if (j < numVariables) {
              nombreVariable = `x${j + 1}`;
            } else if (j < numVariables + variablesHolgura.length) {
              nombreVariable = `s${j - numVariables + 1}`;
            } else {
              nombreVariable = `e${j - numVariables - variablesHolgura.length + 1}`;
            }
            
            variablesBasicas.push({
              nombre: nombreVariable,
              valor: Math.max(0, Math.round(valor * 1000) / 1000)
            });
            break;
          }
        }
      }
    }
    
    // Calcular valor óptimo
    let valorOptimo = 0;
    for (let i = 0; i < numVariables; i++) {
      valorOptimo += objetivo.coeficientes[i] * variablesDecision[i];
    }
    
    if (objetivo.tipo === 'Minimizar') {
      valorOptimo = Math.round(valorOptimo * 1000) / 1000;
    } else {
      valorOptimo = Math.round(valorOptimo * 1000) / 1000;
    }
    
    return {
      esFeasible: true,
      esOptimal: true,
      variablesDecision,
      variablesBasicas,
      valorOptimo,
      iteraciones: iteracion,
      pasos
    };
  };


return (
  <div className="max-w-6xl mx-auto p-6 bg-white">
    <div className="bg-gray-50 rounded-lg p-6 mb-6">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Método de Dos Fases - Programación Lineal
      </h1>

      {/* Variables de Decisión */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-blue-600 mb-3">• Variables de Decisión</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: numVariables }, (_, i) => (
            <div key={i} className="flex items-center bg-blue-100 text-blue-800 rounded">
              <span className="px-3 py-1">x{i + 1}</span>
              {numVariables > 1 && (
                <button
                  onClick={() => eliminarVariable(i)}
                  className="px-2 py-1 text-red-500 hover:bg-red-100 rounded-r"
                  title="Eliminar variable"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={agregarVariable}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          >
            <Plus size={16} />
            Agregar Variable
          </button>
        </div>
      </div>

      {/* Función Objetivo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-600 mb-3">📊 Función Objetivo</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={objetivo.tipo}
            onChange={(e) => setObjetivo(prev => ({ ...prev, tipo: e.target.value }))}
            className="px-3 py-2 border rounded"
          >
            <option value="Minimizar">Minimizar</option>
            <option value="Maximizar">Maximizar</option>
          </select>
          <span className="text-lg">Z =</span>
          {objetivo.coeficientes.map((coef, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="number"
                value={coef}
                onChange={(e) => actualizarObjetivo(i, e.target.value)}
                className="w-16 px-2 py-1 border rounded text-center"
              />
              <span>x{i + 1}</span>
              {i < objetivo.coeficientes.length - 1 && <span>+</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Restricciones */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-600 mb-3">🔒 Restricciones</h3>
        {restricciones.map((restriccion, rIndex) => (
          <div key={rIndex} className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-sm text-gray-500 w-8">R{rIndex + 1}:</span>
            {restriccion.coeficientes.map((coef, cIndex) => (
              <div key={cIndex} className="flex items-center gap-1">
                <input
                  type="number"
                  value={coef}
                  onChange={(e) => actualizarRestriccion(rIndex, cIndex, e.target.value)}
                  className="w-16 px-2 py-1 border rounded text-center"
                />
                <span>x{cIndex + 1}</span>
                {cIndex < restriccion.coeficientes.length - 1 && <span>+</span>}
              </div>
            ))}
            <select
              value={restriccion.tipo}
              onChange={(e) => actualizarTipoRestriccion(rIndex, e.target.value)}
              className="px-2 py-1 border rounded"
            >
              <option value="≤">≤</option>
              <option value="≥">≥</option>
              <option value="=">=</option>
            </select>
            <input
              type="number"
              value={restriccion.valor}
              onChange={(e) => actualizarValorRestriccion(rIndex, e.target.value)}
              className="w-20 px-2 py-1 border rounded text-center"
            />
            <button
              onClick={() => eliminarRestriccion(rIndex)}
              className="p-1 text-red-500 hover:bg-red-100 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          onClick={agregarRestriccion}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
        >
          <Plus size={16} />
          Agregar Restricción
        </button>
      </div>

      {/* Botón Resolver */}
      <div className="text-center">
        <button
          onClick={resolver}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"
        >
          <Calculator size={20} />
          Resolver con Método de Dos Fases
        </button>
      </div>
    </div>

    {/* Solución */}
    {solucion && (
      <div
        className={`border rounded-lg p-6 ${
          solucion.esFeasible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`text-lg font-semibold ${
              solucion.error ? 'text-red-800' : solucion.esFeasible ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {solucion.error
              ? '❌ Error'
              : solucion.esFeasible
              ? '✅ Solución Óptima'
              : '❌ Sin Solución Factible'}
          </h3>

          {solucion.pasosFase1 && (
            <button
              onClick={() => setMostrarPasos(!mostrarPasos)}
              className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {mostrarPasos ? <EyeOff size={16} /> : <Eye size={16} />}
              {mostrarPasos ? 'Ocultar Pasos' : 'Mostrar Pasos'}
            </button>
          )}
        </div>

        {solucion.error ? (
          <div className="text-red-600 font-medium">{solucion.error}</div>
        ) : !solucion.esFeasible ? (
          <div className="text-red-600 font-medium">{solucion.mensaje}</div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Variables de Decisión */}
              <div>
                <h4 className="font-semibold text-green-700 mb-3">Variables de Decisión</h4>
                <div className="space-y-2">
                  {solucion.variablesDecision?.map((valor, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-2 px-3 bg-white rounded border"
                    >
                      <span className="text-blue-600 font-medium">x{i + 1} =</span>
                      <span className="font-bold text-lg">{valor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variables Básicas */}
              <div>
                <h4 className="font-semibold text-green-700 mb-3">Variables Básicas</h4>
                <div className="space-y-2">
                  {solucion.variablesBasicas?.map((variable, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-2 px-3 bg-white rounded border"
                    >
                      <span className="text-blue-600 font-medium">{variable.nombre} =</span>
                      <span className="font-bold text-lg">{variable.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Valor óptimo */}
            {solucion.valorOptimo !== undefined && (
              <div className="mt-6 text-center">
                <h4 className="font-semibold text-green-700 mb-2">
                  Valor Óptimo de la Función Objetivo
                </h4>
                <div className="text-3xl font-bold text-green-800 bg-green-100 rounded-lg py-4 px-6 inline-block">
                  Z* = {solucion.valorOptimo}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )}
  </div>
)}

export default MetodoDosFases;