import React, { useState } from "react";
import { Plus, Trash2, Calculator, AlertCircle } from "lucide-react";

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

  // Función para cargar ejemplo con valores negativos
  const loadNegativeExample = () => {
    setVariables(["x1", "x2"]);
    setObjective({ coefficients: [-2, 3], isMaximize: false });
    setConstraints([
      { coefficients: [1, -1], operator: ">=", rhs: -2 },
      { coefficients: [-1, 2], operator: "<=", rhs: -1 },
      { coefficients: [2, 1], operator: "=", rhs: 4 },
    ]);
    setSolution(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8 text-center">
            Solucionador - Método de la Gran M
          </h1>

          {/* Botones de ejemplo */}
          <div className="mb-6 text-center space-x-2 sm:space-x-4">
            <button
              onClick={loadExample}
              className="bg-purple-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm sm:text-base"
            >
              Ejemplo Positivo
            </button>
            <button
              onClick={loadNegativeExample}
              className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base"
            >
              Ejemplo con Negativos
            </button>
          </div>

          {/* Variables */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">
              Variables
            </h2>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => (
                <div
                  key={index}
                  className="flex items-center bg-blue-50 px-3 py-2 rounded-lg"
                >
                  <span className="font-medium text-blue-700">{variable}</span>
                  {variables.length > 2 && (
                    <button
                      onClick={() => removeVariable(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addVariable}
                className="flex items-center gap-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Agregar Variable</span>
                <span className="sm:hidden">+Var</span>
              </button>
            </div>
          </div>

          {/* Función Objetivo */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">
              Función Objetivo
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <select
                  value={objective.isMaximize ? "max" : "min"}
                  onChange={(e) =>
                    setObjective({
                      ...objective,
                      isMaximize: e.target.value === "max",
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  <option value="min">Minimizar</option>
                  <option value="max">Maximizar</option>
                </select>
                <span className="text-lg font-medium">Z =</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {variables.map((variable, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {index > 0 && <span className="text-gray-500">+</span>}
                    <input
                      type="text"
                      inputMode="decimal"
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
                      className="w-16 sm:w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="text-blue-600 font-medium text-sm">
                      {variable}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Restricciones */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">
              Restricciones
            </h2>
            <div className="space-y-4">
              {constraints.map((constraint, constraintIndex) => (
                <div
                  key={constraintIndex}
                  className="bg-gray-50 p-3 sm:p-4 rounded-lg"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {variables.map((variable, varIndex) => (
                      <div key={varIndex} className="flex items-center gap-1">
                        {varIndex > 0 && (
                          <span className="text-gray-500">+</span>
                        )}
                        <input
                          type="text"
                          inputMode="decimal"
                           pattern="-?[0-9]*[.,]?[0-9]*"
                          value={constraint.coefficients[varIndex]}
                          onChange={(e) => {
                            const newValue = handleNumberInput(e.target.value);
                            e.target.value = newValue;
                            updateConstraintCoeff(
                              constraintIndex,
                              varIndex,
                              newValue
                            );
                          }}
                          onBlur={(e) => {
                            const validValue = validateNumber(e.target.value);
                            e.target.value = validValue;
                            updateConstraintCoeff(
                              constraintIndex,
                              varIndex,
                              validValue
                            );
                          }}
                          placeholder="0"
                          className="w-16 sm:w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <span className="text-blue-600 font-medium text-sm">
                          {variable}
                        </span>
                      </div>
                    ))}
                    <select
                      value={constraint.operator}
                      onChange={(e) =>
                        updateConstraintOperator(
                          constraintIndex,
                          e.target.value
                        )
                      }
                      className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                      className="w-16 sm:w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {constraints.length > 1 && (
                      <button
                        onClick={() => removeConstraint(constraintIndex)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addConstraint}
                className="flex items-center gap-1 bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Agregar Restricción</span>
                <span className="sm:hidden">+Restricción</span>
              </button>
            </div>
          </div>

          {/* Botón Resolver */}
          <div className="text-center mb-6 sm:mb-8">
            <button
              onClick={solveBigM}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 sm:px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors mx-auto text-base sm:text-lg font-semibold"
            >
              <Calculator size={20} />
              <span className="hidden sm:inline">
                Resolver con Método de la Gran M
              </span>
              <span className="sm:hidden">Resolver Gran M</span>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
              <span className="text-red-700 text-sm sm:text-base">{error}</span>
            </div>
          )}

          {/* Solución */}
          {solution && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-green-800 mb-4">
                Solución Óptima
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg shadow-sm"
                    >
                      <span className="font-medium text-gray-700 text-sm sm:text-base">
                        {variable} ={" "}
                      </span>
                      <span className="text-green-600 font-bold text-sm sm:text-base">
                        {Math.round(solution.variables[index] * 1000) / 1000}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-green-200">
                  <span className="font-medium text-gray-700 text-sm sm:text-base">
                    Valor Óptimo de Z ={" "}
                  </span>
                  <span className="text-green-600 font-bold text-lg sm:text-xl">
                    {Math.abs(solution.objectiveValue)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setShowTableau(!showTableau)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
                >
                  {showTableau ? "Ocultar" : "Ver"} Tabla Final
                </button>
              </div>
            </div>
          )}

          {/* Tableau Final */}
          {showTableau && finalTableau && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                Tabla Final
                {finalTableau.wasNormalized && (
                  <span className="text-xs sm:text-sm text-orange-600 ml-2">
                    (Restricciones normalizadas)
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-1 sm:px-2 py-1">
                        Fila
                      </th>
                      {variables.map((v, i) => (
                        <th
                          key={i}
                          className="border border-gray-300 px-1 sm:px-2 py-1"
                        >
                          {v}
                        </th>
                      ))}
                      <th className="border border-gray-300 px-1 sm:px-2 py-1">
                        Aux
                      </th>
                      <th className="border border-gray-300 px-1 sm:px-2 py-1">
                        RHS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalTableau.tableau.map((row, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-1 sm:px-2 py-1 font-medium">
                          {i === 0 ? "Z" : `R${i}`}
                        </td>
                        {row.slice(0, variables.length).map((val, j) => (
                          <td
                            key={j}
                            className="border border-gray-300 px-1 sm:px-2 py-1 text-center"
                          >
                            {val}
                          </td>
                        ))}
                        <td className="border border-gray-300 px-1 sm:px-2 py-1 text-center text-xs">
                          [{row.slice(variables.length, -1).join(", ")}]
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center font-bold">
                          {row[row.length - 1]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Variables artificiales en columnas{" "}
                {finalTableau.artificialStart} -{" "}
                {finalTableau.artificialStart + finalTableau.numArtificial - 1}
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Notas:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Todas las variables son no negativas (≥ 0)</li>
              <li>
                • El método de la Gran M se usa para restricciones de tipo ≥ o =
              </li>
              <li>• Se pueden usar valores negativos en coeficientes y RHS</li>
              <li>
                • Las restricciones con RHS negativo se normalizan
                automáticamente
              </li>
              <li>• La solución muestra solo el resultado final óptimo</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BigMSolver;
