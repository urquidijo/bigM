import React, { useState } from "react";
import { Plus, Trash2, Calculator, AlertCircle } from "lucide-react";

const BigMSolver = () => {
  //variables a usar
  const [variables, setVariables] = useState(["x1", "x2"]);
  const [objective, setObjective] = useState({
    coeficientes: [1.5, 2.5],
    esMaximizacion: false,
  });
  //un objeto para guardar las restricciones
  const [restricciones, setRestricciones] = useState([
    { coeficientes: [2, 1], operador: "<=", rhs: 90 },
    { coeficientes: [1, 1], operador: ">=", rhs: 50 },
    { coeficientes: [1, 0], operador: "<=", rhs: 10 },
  ]);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState("");
  const [mostrarTabla, setMostrarTabla] = useState(false);
  const [tablaFinal, setTablaFinal] = useState(null);

  // Función para validar y formatear números (solo se usa en onBlur)
  const validateNumber = (value) => {
    if (value === "-.") return 0;
    // Si el valor es exactamente '-' o '.' o '-.', lo permitimos tal cual
    if (value === "-" || value === ".") return value;

    // Si el valor actual es '0' y se ingresa '-', permitir reemplazar por '-'
    if (value === "0-") return "-";

    // Si comienza con 0 y luego hay más dígitos (pero no un punto), eliminar el 0 inicial
    if (/^0\d+$/.test(value)) {
      return value.replace(/^0+/, "");
    }

    // Permitir que el usuario escriba cosas como '1.' o '-1.'
    if (/^-?\d+\.$/.test(value)) return value;

    // Permitir entradas completas tipo '12.34', '-5.6', etc.
    const num = parseFloat(value);
    if (!isNaN(num)) return value;

    // En cualquier otro caso (por ejemplo '0-' o algo inválido), volver a 0
    return "0";
  };

  const handleNumberInput = (value) => {
    // Permitir '-' si es el primer carácter
    if (value === "-" || value === "." || value === "-.") return value;

    // Permitir que si el valor anterior era '0' y el nuevo es '-', retorne '-'
    if (value === "0-") return "-";

    // Prevenir múltiples signos negativos
    const minusCount = (value.match(/-/g) || []).length;
    if (minusCount > 1) return value.slice(0, -1);

    // Prevenir múltiples puntos decimales
    const dotCount = (value.match(/\./g) || []).length;
    if (dotCount > 1) return value.slice(0, -1);

    // El signo negativo solo puede estar al inicio
    if (value.includes("-") && value.indexOf("-") !== 0) {
      return value.slice(0, -1);
    }

    // Permitir solo números, un punto decimal y un signo negativo al inicio
    const regex = /^-?(\d*\.?\d*)$/;
    if (!regex.test(value)) {
      return value.slice(0, -1);
    }
    return value;
  };
  // Función para manejar el pegado de texto
  const handlePaste = (e) => {
    e.preventDefault(); // Prevenir el pegado por defecto
    
    // Obtener el texto del portapapeles
    const pastedText = e.clipboardData.getData('text');
    
    // Validar que sea un número válido
    const cleanedText = pastedText.trim();
    
    // Verificar si es un número válido (incluyendo negativos y decimales)
    const numberRegex = /^-?(\d+\.?\d*|\d*\.\d+)$/;
    
    if (numberRegex.test(cleanedText)) {
      // Si es un número válido, usar la función de validación existente
      const validatedValue = handleNumberInput(cleanedText);
      
      // Actualizar el input manualmente
      e.target.value = validatedValue;
      
      // Disparar el evento onChange manualmente
      const changeEvent = new Event('input', { bubbles: true });
      e.target.dispatchEvent(changeEvent);
    }
    // Si no es un número válido, simplemente no hacer nada (ignorar el pegado)
  };

  //funcion para adicionar variables
  const addVariable = () => {
    const newVar = `x${variables.length + 1}`;
    setVariables([...variables, newVar]);
    setObjective({
      ...objective,
      coeficientes: [...objective.coeficientes, 0],
    });
    setRestricciones(
      restricciones.map((c) => ({
        ...c,
        coeficientes: [...c.coeficientes, 0],
      }))
    );
  };
  //funcion para remover una variable
  const removeVariable = (index) => {
    // Solo permitir eliminar si hay más de 2 variables y es la última
    if (variables.length <= 2 || index !== variables.length - 1) return;

    setVariables(variables.filter((_, i) => i !== index));
    setObjective({
      ...objective,
      coeficientes: objective.coeficientes.filter((_, i) => i !== index),
    });
    setRestricciones(
      restricciones.map((c) => ({
        ...c,
        coeficientes: c.coeficientes.filter((_, i) => i !== index),
      }))
    );
  };
  //adicionar restriccion
  const addConstraint = () => {
    setRestricciones([
      ...restricciones,
      {
        coeficientes: new Array(variables.length).fill(0),
        operador: ">=",
        rhs: 0,
      },
    ]);
  };
  //eliminar restriccion
  const removeConstraint = (index) => {
    if (restricciones.length <= 1) return;
    setRestricciones(restricciones.filter((_, i) => i !== index));
  };
  //actualizar los coeficientes
  const updateObjectiveCoeff = (index, value) => {
    const newCoeffs = [...objective.coeficientes];
    newCoeffs[index] = validateNumber(value);
    setObjective({ ...objective, coeficientes: newCoeffs });
  };
  //actualizar las restricciones
  const updateConstraintCoeff = (constraintIndex, varIndex, value) => {
    const newrestricciones = [...restricciones];
    newrestricciones[constraintIndex].coeficientes[varIndex] =
      validateNumber(value);
    setRestricciones(newrestricciones);
  };
  //actualizar el operador de las restricciones
  const updateConstraintoperador = (index, operador) => {
    const newrestricciones = [...restricciones];
    newrestricciones[index].operador = operador;
    setRestricciones(newrestricciones);
  };
  //actualizar el RHS de la restriccion
  const updateConstraintRHS = (index, value) => {
    const newrestricciones = [...restricciones];
    newrestricciones[index].rhs = validateNumber(value);
    setRestricciones(newrestricciones);
  };

  // Función para normalizar restricciones con RHS negativo
  const normalizarRestricciones = (restricciones) => {
    return restricciones.map((constraint) => {
      if (constraint.rhs < 0) {
        // Multiplicar toda la restricción por -1 e invertir el operador
        const newcoeficientes = constraint.coeficientes.map((c) => -c);
        const newRhs = -constraint.rhs;
        let newoperador;

        if (constraint.operador === "<=") {
          newoperador = ">=";
        } else if (constraint.operador === ">=") {
          newoperador = "<=";
        } else {
          // "="
          newoperador = "=";
        }

        return {
          coeficientes: newcoeficientes,
          operador: newoperador,
          rhs: newRhs,
        };
      }
      return constraint;
    });
  };

  //metodo para resolver por BigM
  const solveBigM = () => {
    try {
      setError("");

      // Normalizar restricciones para manejar RHS negativos
      const normalizedrestricciones = normalizarRestricciones(restricciones);

      let M = 1000000; // Valor grande para M

      // Contar variables auxiliares necesarias
      let numSlack = 0;
      let numArtificial = 0;

      for (let i = 0; i < normalizedrestricciones.length; i++) {
        if (normalizedrestricciones[i].operador === "<=") {
          numSlack++;
        } else if (normalizedrestricciones[i].operador === ">=") {
          numSlack++; // variable de exceso
          numArtificial++; // variable artificial
        } else {
          // =
          numArtificial++; // solo variable artificial
        }
      }

      // Dimensiones de la tabla
      let numVars = variables.length + numSlack + numArtificial;
      let numRows = normalizedrestricciones.length + 1; // +1 para función objetivo

      // Crear tabla inicial
      let tabla = Array(numRows)
        .fill()
        .map(() => Array(numVars + 1).fill(0));

      // Configurar función objetivo (fila 0)
      for (let i = 0; i < variables.length; i++) {
        if (objective.esMaximizacion) {
          tabla[0][i] = -objective.coeficientes[i];
        } else {
          tabla[0][i] = objective.coeficientes[i];
        }
      }

      // Agregar penalización M para variables artificiales
      let artificialIndex = variables.length + numSlack;
      for (let i = 0; i < numArtificial; i++) {
        tabla[0][artificialIndex + i] = M;
      }

      // Configurar restricciones
      let slackIndex = variables.length;
      artificialIndex = variables.length + numSlack;
      let currentSlack = 0;
      let currentArtificial = 0;

      for (let i = 0; i < normalizedrestricciones.length; i++) {
        let row = i + 1; // +1 porque fila 0 es función objetivo

        // Coeficientes de variables originales
        for (let j = 0; j < variables.length; j++) {
          tabla[row][j] = normalizedrestricciones[i].coeficientes[j];
        }

        // Variables auxiliares según tipo de restricción
        if (normalizedrestricciones[i].operador === "<=") {
          tabla[row][slackIndex + currentSlack] = 1; // variable de holgura
          currentSlack++;
        } else if (normalizedrestricciones[i].operador === ">=") {
          tabla[row][slackIndex + currentSlack] = -1; // variable de exceso
          tabla[row][artificialIndex + currentArtificial] = 1; // variable artificial
          currentSlack++;
          currentArtificial++;
        } else {
          // =
          tabla[row][artificialIndex + currentArtificial] = 1; // variable artificial
          currentArtificial++;
        }

        // RHS (ya normalizado para ser >= 0)
        tabla[row][numVars] = normalizedrestricciones[i].rhs;
      }

      // Eliminar variables artificiales de la función objetivo
      artificialIndex = variables.length + numSlack;
      currentArtificial = 0;

      for (let i = 0; i < normalizedrestricciones.length; i++) {
        if (
          normalizedrestricciones[i].operador === ">=" ||
          normalizedrestricciones[i].operador === "="
        ) {
          let row = i + 1;
          for (let j = 0; j <= numVars; j++) {
            tabla[0][j] -= M * tabla[row][j];
          }
          currentArtificial++;
        }
      }

      // Algoritmo simplex
      let maxIterations = 100;
      let iteration = 0;

      while (iteration < maxIterations) {
        // Encontrar columna pivote (más negativo en fila objetivo)
        let pivotCol = -1;
        let minValue = -1e-10; // tolerancia numérica

        for (let j = 0; j < numVars; j++) {
          if (tabla[0][j] < minValue) {
            minValue = tabla[0][j];
            pivotCol = j;
          }
        }

        if (pivotCol === -1) break; // Óptimo encontrado

        // Encontrar fila pivote (prueba de razón mínima)
        let pivotRow = -1;
        let minRatio = Infinity;

        for (let i = 1; i < numRows; i++) {
          if (tabla[i][pivotCol] > 1e-10) {
            let ratio = tabla[i][numVars] / tabla[i][pivotCol];
            if (ratio >= 0 && ratio < minRatio) {
              minRatio = ratio;
              pivotRow = i;
            }
          }
        }

        if (pivotRow === -1) {
          setError("Problema no acotado");
          return;
        }

        // Operaciones de pivote
        let pivotElement = tabla[pivotRow][pivotCol];

        // Normalizar fila pivote
        for (let j = 0; j <= numVars; j++) {
          tabla[pivotRow][j] /= pivotElement;
        }

        // Eliminar columna pivote en otras filas
        for (let i = 0; i < numRows; i++) {
          if (i !== pivotRow && Math.abs(tabla[i][pivotCol]) > 1e-10) {
            let factor = tabla[i][pivotCol];
            for (let j = 0; j <= numVars; j++) {
              tabla[i][j] -= factor * tabla[pivotRow][j];
            }
          }
        }

        iteration++;
      }

      if (iteration >= maxIterations) {
        setError("Máximo número de iteraciones alcanzado");
        return;
      }

      // Verificar factibilidad
      artificialIndex = variables.length + numSlack;
      let isInfeasible = false;

      for (let j = artificialIndex; j < artificialIndex + numArtificial; j++) {
        for (let i = 1; i < numRows; i++) {
          let isBasicInThisRow = true;
          let count = 0;

          for (let row = 0; row < numRows; row++) {
            if (Math.abs(tabla[row][j]) > 1e-10) {
              count++;
              if (row !== i || Math.abs(tabla[row][j] - 1) > 1e-10) {
                isBasicInThisRow = false;
                break;
              }
            }
          }

          if (isBasicInThisRow && count === 1 && tabla[i][numVars] > 1e-6) {
            isInfeasible = true;
            break;
          }
        }
        if (isInfeasible) break;
      }

      if (isInfeasible) {
        setError("El problema no tiene solución factible");
        return;
      }

      // Extraer solución
      let solutionValues = new Array(variables.length).fill(0);

      // Identificar variables básicas para las variables originales
      for (let j = 0; j < variables.length; j++) {
        for (let i = 1; i < numRows; i++) {
          let isBasicInThisRow = true;
          let count = 0;

          for (let row = 0; row < numRows; row++) {
            if (Math.abs(tabla[row][j]) > 1e-10) {
              count++;
              if (row !== i || Math.abs(tabla[row][j] - 1) > 1e-10) {
                isBasicInThisRow = false;
                break;
              }
            }
          }

          if (isBasicInThisRow && count === 1) {
            solutionValues[j] = Math.max(0, tabla[i][numVars]);
            break;
          }
        }
      }

      // Calcular valor objetivo
      let objectiveValue = tabla[0][numVars];
      if (objective.esMaximizacion) {
        objectiveValue = -objectiveValue;
      }

      setSolution({
        variables: solutionValues.map((v) => Math.round(v * 1000) / 1000),
        objectiveValue: Math.round(objectiveValue * 1000) / 1000,
        isOptimal: true,
      });

      // Identificar variables básicas para la tabla final
      let basicVariables = new Array(numRows - 1).fill("No básica");

      // Crear nombres de todas las variables (originales + auxiliares)
      let allVariableNames = [...variables];

      // Agregar nombres de variables de holgura/exceso
      for (let i = 0; i < numSlack; i++) {
        allVariableNames.push(`s${i + 1}`);
      }

      // Agregar nombres de variables artificiales
      for (let i = 0; i < numArtificial; i++) {
        allVariableNames.push(`a${i + 1}`);
      }

      // Identificar qué variable está en cada fila de la base
      for (let j = 0; j < numVars; j++) {
        let basicRow = -1;
        let isBasic = true;
        let nonZeroCount = 0;

        for (let i = 0; i < numRows; i++) {
          if (Math.abs(tabla[i][j]) > 1e-10) {
            nonZeroCount++;
            if (i > 0 && Math.abs(tabla[i][j] - 1) < 1e-10) {
              basicRow = i - 1; // -1 porque la fila 0 es la función objetivo
            } else if (i > 0) {
              isBasic = false;
              break;
            }
          }
        }

        if (isBasic && nonZeroCount === 1 && basicRow >= 0) {
          basicVariables[basicRow] = allVariableNames[j] || `x${j + 1}`;
        }
      }

      // Guardar tabla final para debugging
      setTablaFinal({
        tabla: tabla.map((row) =>
          row.map((val) => Math.round(val * 1000) / 1000)
        ),
        numVars,
        artificialStart: variables.length + numSlack,
        numArtificial,
        wasNormalized: restricciones.some((c) => c.rhs < 0),
        basicVariables,
        allVariableNames,
      });
    } catch (err) {
      setError("Error al resolver el problema: " + err.message);
    }
  };

  //funcion para cargar el 2do ejemplo
  const loadExample = () => {
    setVariables(["x1", "x2"]);
    setObjective({ coeficientes: [5, 6], esMaximizacion: true });
    setRestricciones([
      { coeficientes: [1, 1], operador: ">=", rhs: 4 },
      { coeficientes: [2, 3], operador: "=", rhs: 12 },
    ]);
    setSolution(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Solucionador - Método de la Gran M
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Resuelve problemas de programación lineal con restricciones de
            igualdad y desigualdad
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Panel Principal */}
          <div className="xl:col-span-2 space-y-8">
            {/* Botón de Ejemplo */}
            <div className="flex justify-center">
              <button
                onClick={loadExample}
                className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium shadow-md transition-all duration-200"
              >
                📊 Cargar Ejemplo
              </button>
            </div>

            {/* Variables */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                Variables de Decisión
              </h2>
              <div className="flex flex-wrap gap-3">
                {variables.map((variable, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-slate-100 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg group hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium">{variable}</span>
                    {/* Solo mostrar el trash en la última variable y si hay más de 2 variables */}
                    {variables.length > 2 && index === variables.length - 1 && (
                      <button
                        onClick={() => removeVariable(index)}
                        className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addVariable}
                  className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  <span>Nueva Variable</span>
                </button>
              </div>
            </div>

            {/* Función Objetivo */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Función Objetivo
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <select
                    value={objective.esMaximizacion ? "max" : "min"}
                    onChange={(e) =>
                      setObjective({
                        ...objective,
                        esMaximizacion: e.target.value === "max",
                      })
                    }
                    className="border border-amber-300 bg-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  >
                    <option value="min">Minimizar</option>
                    <option value="max">Maximizar</option>
                  </select>
                  <span className="text-xl font-semibold text-slate-700">
                    Z =
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {variables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {index > 0 && (
                        <span className="text-slate-400 text-lg">+</span>
                      )}
                      <input
                        type="text"
                        inputMode="tel"
                        value={objective.coeficientes[index]}
                        onChange={(e) => {
                          const val = handleNumberInput(e.target.value);
                          e.target.value = val;
                          updateObjectiveCoeff(index, val);
                        }}
                        onBlur={(e) => {
                          const valid = validateNumber(e.target.value);
                          e.target.value = valid;
                          updateObjectiveCoeff(index, valid);
                        }}
                        onPaste={handlePaste}
                        placeholder="0"
                        className="w-20 px-3 py-2 text-center border border-amber-300 bg-white rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />
                      <span className="text-amber-700 font-semibold">
                        {variable}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Restricciones */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Restricciones
              </h2>
              <div className="space-y-4">
                {restricciones.map((constraint, cIndex) => (
                  <div
                    key={cIndex}
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {variables.map((variable, vIndex) => (
                        <div key={vIndex} className="flex items-center gap-2">
                          {vIndex > 0 && (
                            <span className="text-slate-400">+</span>
                          )}
                          <input
                            type="text"
                            inputMode="tel"
                            value={constraint.coeficientes[vIndex]}
                            onChange={(e) => {
                              const val = handleNumberInput(e.target.value);
                              e.target.value = val;
                              updateConstraintCoeff(cIndex, vIndex, val);
                            }}
                            onBlur={(e) => {
                              const valid = validateNumber(e.target.value);
                              e.target.value = valid;
                              updateConstraintCoeff(cIndex, vIndex, valid);
                            }}
                            onPaste={handlePaste}
                            placeholder="0"
                            className="w-20 px-3 py-2 border border-emerald-300 bg-white rounded-lg text-center focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                          />
                          <span className="text-emerald-700 font-semibold">
                            {variable}
                          </span>
                        </div>
                      ))}
                      <select
                        value={constraint.operador}
                        onChange={(e) =>
                          updateConstraintoperador(cIndex, e.target.value)
                        }
                        className="border border-emerald-300 bg-white rounded-lg px-3 py-2 text-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                      >
                        <option value="<=">≤</option>
                        <option value=">=">≥</option>
                        <option value="=">=</option>
                      </select>
                      <input
                        type="text"
                        inputMode="tel"
                        value={constraint.rhs}
                        onChange={(e) => {
                          const val = handleNumberInput(e.target.value);
                          e.target.value = val;
                          updateConstraintRHS(cIndex, val);
                        }}
                        onBlur={(e) => {
                          const valid = validateNumber(e.target.value);
                          e.target.value = valid;
                          updateConstraintRHS(cIndex, valid);
                        }}
                        onPaste={handlePaste}
                        placeholder="0"
                        className="w-20 px-3 py-2 border border-emerald-300 bg-white rounded-lg text-center focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                      />
                      {restricciones.length > 1 && (
                        <button
                          onClick={() => removeConstraint(cIndex)}
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addConstraint}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  Nueva Restricción
                </button>
              </div>
            </div>
          </div>

          {/* Panel Lateral */}
          <div className="space-y-8">
            {/* Botón Resolver */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <button
                onClick={solveBigM}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold px-6 py-4 rounded-xl text-lg flex items-center justify-center gap-3 shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <Calculator size={24} />
                <span>Resolver Problema</span>
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} />
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Resultado */}
            {solution && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Solución Óptima
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {variables.map((v, i) => (
                      <div
                        key={i}
                        className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex justify-between items-center"
                      >
                        <span className="text-slate-700 font-medium">{v}</span>
                        <span className="text-slate-800 font-bold text-lg">
                          {Math.round(solution.variables[i] * 1000) / 1000}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 rounded-lg text-center">
                    <div className="text-sm opacity-90 mb-1">Valor Óptimo</div>
                    <div className="text-2xl font-bold">
                      Z = {Math.abs(solution.objectiveValue)}
                    </div>
                  </div>

                  <button
                    onClick={() => setMostrarTabla(!mostrarTabla)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg border border-slate-300 transition-colors"
                  >
                    {mostrarTabla ? "Ocultar" : "Ver"} Tabla Final
                  </button>
                </div>
              </div>
            )}

            {/* Información */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h4 className="font-semibold text-slate-800 mb-3">
                ℹ️ Información
              </h4>
              <div className="text-sm text-slate-600 space-y-2">
                <p>• Método especializado para restricciones ≥ y =</p>
                <p>• Admite coeficientes negativos</p>
                <p>• Admite coeficientes enteros</p>
                <p>• Para decimales usar punto (.)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla Final */}
        {mostrarTabla && tablaFinal && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
              Tabla Simplex Final
              {tablaFinal.wasNormalized && (
                <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  Normalizada
                </span>
              )}
            </h3>

            <div className="overflow-x-auto bg-slate-50 rounded-xl border border-slate-200">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                      Base
                    </th>
                    {variables.map((v, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-center text-slate-700 font-semibold"
                      >
                        {v}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-slate-600 text-sm">
                      Artificiales
                    </th>
                    <th className="px-4 py-3 text-center text-slate-700 font-semibold">
                      RHS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tablaFinal.tabla.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 hover:bg-slate-25"
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {i === 0
                          ? "Z"
                          : tablaFinal.basicVariables[i - 1] || `R${i}`}
                      </td>
                      {row.slice(0, variables.length).map((val, j) => (
                        <td
                          key={j}
                          className="px-4 py-3 text-center text-slate-600"
                        >
                          {val}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        [{row.slice(variables.length, -1).join(", ")}]
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {row[row.length - 1]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-slate-500 mt-3 space-y-2">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="font-medium text-slate-700 mb-1">
                  variables:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    • <strong>Variables originales:</strong>{" "}
                    {variables.join(", ")}
                  </div>
                  <div>
                    • <strong>Variables de holgura/exceso:</strong> s1, s2, ...
                  </div>
                  <div>
                    • <strong>Variables artificiales:</strong> a1, a2, ...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BigMSolver;
