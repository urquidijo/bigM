import React, { useState } from "react";
import { Target, Calculator, Settings, Trash2, Plus, Zap, AlertCircle, Eye, EyeOff, BookOpen } from "lucide-react";

const BigMSolver = () => {
  //variables a usar
  const [variables, setVariables] = useState(["x1", "x2"]);
  const [objective, setObjective] = useState({
    coefficients: [5, 4],
    isMaximize: false,
  });
  //un objeto para guardar las restricciones
  const [constraints, setConstraints] = useState([
    { coefficients: [1, 1], operator: ">=", rhs: 5 },
    { coefficients: [2, 1], operator: "<=", rhs: 10 },
    { coefficients: [1, 3], operator: "=", rhs: 12 },
  ]);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState("");
  const [showTableau, setShowTableau] = useState(false);
  const [finalTableau, setFinalTableau] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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

  //funcion para adicionar variables
  const addVariable = () => {
    const newVar = `x${variables.length + 1}`;
    setVariables([...variables, newVar]);
    setObjective({
      ...objective,
      coefficients: [...objective.coefficients, 0],
    });
    setConstraints(
      constraints.map((c) => ({
        ...c,
        coefficients: [...c.coefficients, 0],
      }))
    );
  };
  //funcion para eliminar una variable
  const removeVariable = (index) => {
    if (variables.length <= 2) return;
    setVariables(variables.filter((_, i) => i !== index));
    setObjective({
      ...objective,
      coefficients: objective.coefficients.filter((_, i) => i !== index),
    });
    setConstraints(
      constraints.map((c) => ({
        ...c,
        coefficients: c.coefficients.filter((_, i) => i !== index),
      }))
    );
  };
  //adicionar restriccion
  const addConstraint = () => {
    setConstraints([
      ...constraints,
      {
        coefficients: new Array(variables.length).fill(0),
        operator: ">=",
        rhs: 0,
      },
    ]);
  };
  //eliminar restriccion
  const removeConstraint = (index) => {
    if (constraints.length <= 1) return;
    setConstraints(constraints.filter((_, i) => i !== index));
  };
  //actualizar los coeficientes
  const updateObjectiveCoeff = (index, value) => {
    const newCoeffs = [...objective.coefficients];
    newCoeffs[index] = validateNumber(value);
    setObjective({ ...objective, coefficients: newCoeffs });
  };
  //actualizar las restricciones
  const updateConstraintCoeff = (constraintIndex, varIndex, value) => {
    const newConstraints = [...constraints];
    newConstraints[constraintIndex].coefficients[varIndex] =
      validateNumber(value);
    setConstraints(newConstraints);
  };
  //actualizar el operador de las restricciones
  const updateConstraintOperator = (index, operator) => {
    const newConstraints = [...constraints];
    newConstraints[index].operator = operator;
    setConstraints(newConstraints);
  };
  //actualizar el RHS de la restriccion
  const updateConstraintRHS = (index, value) => {
    const newConstraints = [...constraints];
    newConstraints[index].rhs = validateNumber(value);
    setConstraints(newConstraints);
  };

  // Función para normalizar restricciones con RHS negativo
  const normalizeConstraints = (constraints) => {
    return constraints.map((constraint) => {
      if (constraint.rhs < 0) {
        // Multiplicar toda la restricción por -1 e invertir el operador
        const newCoefficients = constraint.coefficients.map((c) => -c);
        const newRhs = -constraint.rhs;
        let newOperator;

        if (constraint.operator === "<=") {
          newOperator = ">=";
        } else if (constraint.operator === ">=") {
          newOperator = "<=";
        } else {
          // "="
          newOperator = "=";
        }

        return {
          coefficients: newCoefficients,
          operator: newOperator,
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
      const normalizedConstraints = normalizeConstraints(constraints);

      let M = 1000000; // Valor grande para M

      // Contar variables auxiliares necesarias
      let numSlack = 0;
      let numArtificial = 0;

      for (let i = 0; i < normalizedConstraints.length; i++) {
        if (normalizedConstraints[i].operator === "<=") {
          numSlack++;
        } else if (normalizedConstraints[i].operator === ">=") {
          numSlack++; // variable de exceso
          numArtificial++; // variable artificial
        } else {
          // =
          numArtificial++; // solo variable artificial
        }
      }

      // Dimensiones del tableau
      let numVars = variables.length + numSlack + numArtificial;
      let numRows = normalizedConstraints.length + 1; // +1 para función objetivo

      // Crear tabla inicial
      let tableau = Array(numRows)
        .fill()
        .map(() => Array(numVars + 1).fill(0));

      // Configurar función objetivo (fila 0)
      for (let i = 0; i < variables.length; i++) {
        if (objective.isMaximize) {
          tableau[0][i] = -objective.coefficients[i];
        } else {
          tableau[0][i] = objective.coefficients[i];
        }
      }

      // Agregar penalización M para variables artificiales
      let artificialIndex = variables.length + numSlack;
      for (let i = 0; i < numArtificial; i++) {
        tableau[0][artificialIndex + i] = M;
      }

      // Configurar restricciones
      let slackIndex = variables.length;
      artificialIndex = variables.length + numSlack;
      let currentSlack = 0;
      let currentArtificial = 0;

      for (let i = 0; i < normalizedConstraints.length; i++) {
        let row = i + 1; // +1 porque fila 0 es función objetivo

        // Coeficientes de variables originales
        for (let j = 0; j < variables.length; j++) {
          tableau[row][j] = normalizedConstraints[i].coefficients[j];
        }

        // Variables auxiliares según tipo de restricción
        if (normalizedConstraints[i].operator === "<=") {
          tableau[row][slackIndex + currentSlack] = 1; // variable de holgura
          currentSlack++;
        } else if (normalizedConstraints[i].operator === ">=") {
          tableau[row][slackIndex + currentSlack] = -1; // variable de exceso
          tableau[row][artificialIndex + currentArtificial] = 1; // variable artificial
          currentSlack++;
          currentArtificial++;
        } else {
          // =
          tableau[row][artificialIndex + currentArtificial] = 1; // variable artificial
          currentArtificial++;
        }

        // RHS (ya normalizado para ser >= 0)
        tableau[row][numVars] = normalizedConstraints[i].rhs;
      }

      // Eliminar variables artificiales de la función objetivo
      artificialIndex = variables.length + numSlack;
      currentArtificial = 0;

      for (let i = 0; i < normalizedConstraints.length; i++) {
        if (
          normalizedConstraints[i].operator === ">=" ||
          normalizedConstraints[i].operator === "="
        ) {
          let row = i + 1;
          for (let j = 0; j <= numVars; j++) {
            tableau[0][j] -= M * tableau[row][j];
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
          if (tableau[0][j] < minValue) {
            minValue = tableau[0][j];
            pivotCol = j;
          }
        }

        if (pivotCol === -1) break; // Óptimo encontrado

        // Encontrar fila pivote (prueba de razón mínima)
        let pivotRow = -1;
        let minRatio = Infinity;

        for (let i = 1; i < numRows; i++) {
          if (tableau[i][pivotCol] > 1e-10) {
            let ratio = tableau[i][numVars] / tableau[i][pivotCol];
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
        let pivotElement = tableau[pivotRow][pivotCol];

        // Normalizar fila pivote
        for (let j = 0; j <= numVars; j++) {
          tableau[pivotRow][j] /= pivotElement;
        }

        // Eliminar columna pivote en otras filas
        for (let i = 0; i < numRows; i++) {
          if (i !== pivotRow && Math.abs(tableau[i][pivotCol]) > 1e-10) {
            let factor = tableau[i][pivotCol];
            for (let j = 0; j <= numVars; j++) {
              tableau[i][j] -= factor * tableau[pivotRow][j];
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
            if (Math.abs(tableau[row][j]) > 1e-10) {
              count++;
              if (row !== i || Math.abs(tableau[row][j] - 1) > 1e-10) {
                isBasicInThisRow = false;
                break;
              }
            }
          }

          if (isBasicInThisRow && count === 1 && tableau[i][numVars] > 1e-6) {
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
            if (Math.abs(tableau[row][j]) > 1e-10) {
              count++;
              if (row !== i || Math.abs(tableau[row][j] - 1) > 1e-10) {
                isBasicInThisRow = false;
                break;
              }
            }
          }

          if (isBasicInThisRow && count === 1) {
            solutionValues[j] = Math.max(0, tableau[i][numVars]);
            break;
          }
        }
      }

      // Calcular valor objetivo
      let objectiveValue = tableau[0][numVars];
      if (objective.isMaximize) {
        objectiveValue = -objectiveValue;
      }

      setSolution({
        variables: solutionValues.map((v) => Math.round(v * 1000) / 1000),
        objectiveValue: Math.round(objectiveValue * 1000) / 1000,
        isOptimal: true,
      });

      // Guardar tableau final para debugging
      setFinalTableau({
        tableau: tableau.map((row) =>
          row.map((val) => Math.round(val * 1000) / 1000)
        ),
        numVars,
        artificialStart: variables.length + numSlack,
        numArtificial,
        wasNormalized: constraints.some((c) => c.rhs < 0),
      });
    } catch (err) {
      setError("Error al resolver el problema: " + err.message);
    }
  };

  //funcion para cargar el 2do ejemplo
  const loadExample = () => {
    setVariables(["x1", "x2"]);
    setObjective({ coefficients: [5, 6], isMaximize: true });
    setConstraints([
      { coefficients: [1, 1], operator: ">=", rhs: 4 },
      { coefficients: [2, 3], operator: "=", rhs: 12 },
    ]);
    setSolution(null);
    setError("");
  };


 return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 relative overflow-hidden">
    {/* Background decorative elements */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
    </div>

    <div className="max-w-7xl mx-auto relative z-10">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <Calculator className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-4">
          Solucionador Gran M
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          Método de la Gran M para Programación Lineal con interfaz profesional
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8 justify-center">
              <button
                onClick={loadExample}
                className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-purple-800 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Ejemplo Positivo Max
                </span>
              </button>
            </div>

            {/* Variables Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Variables de Decisión</h2>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex flex-wrap gap-3 mb-4">
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      className="group relative bg-white rounded-lg px-4 py-3 shadow-sm border border-blue-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-700 text-lg">{variable}</span>
                        {variables.length > 2 && (
                          <button
                            onClick={() => removeVariable(index)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all duration-200 hover:scale-110"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={addVariable}
                  className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>Agregar Variable</span>
                </button>
              </div>
            </div>

            {/* Objective Function */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Función Objetivo</h2>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                  <select
                    value={objective.isMaximize ? "max" : "min"}
                    onChange={(e) =>
                      setObjective({
                        ...objective,
                        isMaximize: e.target.value === "max",
                      })
                    }
                    className="px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white font-semibold text-gray-700 shadow-sm"
                  >
                    <option value="min">Minimizar</option>
                    <option value="max">Maximizar</option>
                  </select>
                  <div className="text-2xl font-bold text-gray-800">Z =</div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {variables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-sm border border-green-200">
                      {index > 0 && <span className="text-gray-400 font-medium">+</span>}
                      <input
                        type="text"
                        inputMode="tel"
                        pattern="-?[0-9]*[.,]?[0-9]*"
                        value={objective.coefficients[index]}
                        onChange={(e) => {
                          const newValue = handleNumberInput(e.target.value);
                          e.target.value = newValue;
                          updateObjectiveCoeff(index, newValue);
                        }}
                        onBlur={(e) => {
                          const validValue = validateNumber(e.target.value);
                          e.target.value = validValue;
                          updateObjectiveCoeff(index, validValue);
                        }}
                        placeholder="0"
                        className="w-16 sm:w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-semibold"
                      />
                      <span className="text-green-700 font-bold">{variable}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Restricciones</h2>
              </div>
              
              <div className="space-y-4">
                {constraints.map((constraint, constraintIndex) => (
                  <div
                    key={constraintIndex}
                    className="group bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {variables.map((variable, varIndex) => (
                        <div key={varIndex} className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-sm border border-purple-200">
                          {varIndex > 0 && <span className="text-gray-400 font-medium">+</span>}
                          <input
                            type="text"
                            inputMode="tel"
                            pattern="-?[0-9]*[.,]?[0-9]*"
                            value={constraint.coefficients[varIndex]}
                            onChange={(e) => {
                              const newValue = handleNumberInput(e.target.value);
                              e.target.value = newValue;
                              updateConstraintCoeff(constraintIndex, varIndex, newValue);
                            }}
                            onBlur={(e) => {
                              const validValue = validateNumber(e.target.value);
                              e.target.value = validValue;
                              updateConstraintCoeff(constraintIndex, varIndex, validValue);
                            }}
                            placeholder="0"
                            className="w-16 sm:w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-semibold"
                          />
                          <span className="text-purple-700 font-bold">{variable}</span>
                        </div>
                      ))}
                      
                      <select
                        value={constraint.operator}
                        onChange={(e) =>
                          updateConstraintOperator(constraintIndex, e.target.value)
                        }
                        className="px-4 py-3 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white font-bold text-purple-700 shadow-sm"
                      >
                        <option value="<=">≤</option>
                        <option value=">=">≥</option>
                        <option value="=">=</option>
                      </select>
                      
                      <input
                        type="text"
                        inputMode="decimal"
                        value={constraint.rhs}
                        onChange={(e) => {
                          const newValue = handleNumberInput(e.target.value);
                          e.target.value = newValue;
                          updateConstraintRHS(constraintIndex, newValue);
                        }}
                        onBlur={(e) => {
                          const validValue = validateNumber(e.target.value);
                          e.target.value = validValue;
                          updateConstraintRHS(constraintIndex, validValue);
                        }}
                        placeholder="0"
                        className="w-20 sm:w-24 px-3 py-3 border-2 border-purple-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-bold bg-white shadow-sm"
                      />
                      
                      {constraints.length > 1 && (
                        <button
                          onClick={() => removeConstraint(constraintIndex)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all duration-200 hover:scale-110 p-2 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addConstraint}
                  className="group flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:-translate-y-0.5 font-semibold"
                >
                  <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>Agregar Restricción</span>
                </button>
              </div>
            </div>

            {/* Solve Button */}
            <div className="text-center mb-8">
              <button
                onClick={solveBigM}
                disabled={isLoading}
                className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-indigo-500/25 transition-all duration-500 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <span className="relative flex items-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Resolviendo...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                      <span>Resolver con Gran M</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-8 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
                  <span className="text-red-800 font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Solution */}
            {solution && (
              <div className="mb-8 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 border border-green-200 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-800">Solución Óptima</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {variables.map((variable, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-4 shadow-md border border-green-200 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-600 mb-1">Variable</div>
                          <div className="text-xl font-bold text-gray-800 mb-2">{variable}</div>
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(solution.variables[index] * 1000) / 1000}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="text-center">
                      <div className="text-green-100 font-medium mb-2">Valor Óptimo</div>
                      <div className="text-4xl font-bold">
                        Z = {Math.abs(solution.objectiveValue)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowTableau(!showTableau)}
                    className="group flex items-center gap-2 bg-blue-600/90 backdrop-blur text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 hover:shadow-lg mx-auto"
                  >
                    {showTableau ? <EyeOff size={20} /> : <Eye size={20} />}
                    <span>{showTableau ? 'Ocultar' : 'Ver'} Tabla Final</span>
                  </button>
                </div>
              </div>
            )}

            {/* Final Tableau */}
            {showTableau && finalTableau && (
              <div className="mb-8 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-gray-600 to-slate-700 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Tabla Final del Simplex
                    {finalTableau.wasNormalized && (
                      <span className="text-sm text-orange-600 ml-2 font-normal">
                        (Restricciones normalizadas)
                      </span>
                    )}
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <div className="min-w-full bg-white rounded-xl shadow-sm border border-gray-200">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-slate-100">
                        <tr>
                          <th className="border-b border-gray-200 px-4 py-3 text-left font-bold text-gray-700">
                            Fila
                          </th>
                          {variables.map((v, i) => (
                            <th
                              key={i}
                              className="border-b border-gray-200 px-4 py-3 text-center font-bold text-gray-700"
                            >
                              {v}
                            </th>
                          ))}
                          <th className="border-b border-gray-200 px-4 py-3 text-center font-bold text-gray-700">
                            Variables Auxiliares
                          </th>
                          <th className="border-b border-gray-200 px-4 py-3 text-center font-bold text-gray-700">
                            RHS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalTableau.tableau.map((row, i) => (
                          <tr key={i} className={i === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                            <td className="border-b border-gray-100 px-4 py-3 font-bold text-gray-800">
                              {i === 0 ? 'Z' : `R${i}`}
                            </td>
                            {row.slice(0, variables.length).map((val, j) => (
                              <td
                                key={j}
                                className="border-b border-gray-100 px-4 py-3 text-center font-medium"
                              >
                                {val}
                              </td>
                            ))}
                            <td className="border-b border-gray-100 px-4 py-3 text-center text-sm text-gray-600 font-mono">
                              [{row.slice(variables.length, -1).join(', ')}]
                            </td>
                            <td className="border-b border-gray-100 px-4 py-3 text-center font-bold text-lg">
                              {row[row.length - 1]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Variables artificiales:</strong> Columnas {finalTableau.artificialStart} - {finalTableau.artificialStart + finalTableau.numArtificial - 1}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            {/* Info Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Información</h3>
              </div>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>El método de la Gran M se usa para restricciones ≥ o =</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Se pueden usar coeficientes y RHS negativos</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Permite valores enteros</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>La solución muestra el resultado óptimo final</p>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Consejos Rápidos</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="bg-white/60 rounded-lg p-3 border border-white/40">
                  <p className="font-semibold text-indigo-700 mb-1">Maximización vs Minimización</p>
                  <p className="text-gray-600">Cambia fácilmente entre maximizar y minimizar la función objetivo</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-white/40">
                  <p className="font-semibold text-purple-700 mb-1">Variables Dinámicas</p>
                  <p className="text-gray-600">Agrega o elimina variables según tu problema</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 border border-white/40">
                  <p className="font-semibold text-pink-700 mb-1">Restricciones Flexibles</p>
                  <p className="text-gray-600">Soporta ≤, ≥ y = en las restricciones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default BigMSolver;
