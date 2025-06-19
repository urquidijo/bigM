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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-8 text-center">
            Solucionador - Método de la Gran M
          </h1>

          {/* Botones de Ejemplo */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button
              onClick={loadExample}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Ejemplo Positivo Max
            </button>
          </div>

          {/* Variables */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Variables
            </h2>
            <div className="flex flex-wrap gap-3">
              {variables.map((variable, index) => (
                <div
                  key={index}
                  className="flex items-center bg-blue-100 text-blue-800 px-3 py-2 rounded-lg"
                >
                  <span className="font-semibold">{variable}</span>
                  {variables.length > 2 && (
                    <button
                      onClick={() => removeVariable(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addVariable}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <Plus size={16} />
                <span>Agregar Variable</span>
              </button>
            </div>
          </section>

          {/* Función Objetivo */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Función Objetivo
            </h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                <select
                  value={objective.isMaximize ? "max" : "min"}
                  onChange={(e) =>
                    setObjective({
                      ...objective,
                      isMaximize: e.target.value === "max",
                    })
                  }
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="min">Minimizar</option>
                  <option value="max">Maximizar</option>
                </select>
                <span className="text-lg font-medium">Z =</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {variables.map((variable, index) => (
                  <div key={index} className="flex items-center gap-1">
                    {index > 0 && <span className="text-gray-500">+</span>}
                    <input
                      type="text"
                      inputMode="tel"
                      value={objective.coefficients[index]}
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
                      placeholder="0"
                      className="w-20 px-2 py-1 text-center border rounded-md focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-blue-700 font-semibold">
                      {variable}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Restricciones */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Restricciones
            </h2>
            <div className="space-y-4">
              {constraints.map((constraint, cIndex) => (
                <div key={cIndex} className="bg-gray-100 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {variables.map((variable, vIndex) => (
                      <div key={vIndex} className="flex items-center gap-1">
                        {vIndex > 0 && <span className="text-gray-500">+</span>}
                        <input
                          type="text"
                          inputMode="tel"
                          value={constraint.coefficients[vIndex]}
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
                          placeholder="0"
                          className="w-20 px-2 py-1 border rounded text-center"
                        />
                        <span className="text-blue-700 font-semibold">
                          {variable}
                        </span>
                      </div>
                    ))}
                    <select
                      value={constraint.operator}
                      onChange={(e) =>
                        updateConstraintOperator(cIndex, e.target.value)
                      }
                      className="border rounded px-2 py-1"
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
                      placeholder="0"
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                    {constraints.length > 1 && (
                      <button
                        onClick={() => removeConstraint(cIndex)}
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
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
              >
                <Plus size={16} />
                Agregar Restricción
              </button>
            </div>
          </section>

          {/* Botón Resolver */}
          <div className="text-center mb-8">
            <button
              onClick={solveBigM}
              className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold px-6 py-3 rounded-lg text-lg flex items-center justify-center gap-2 mx-auto"
            >
              <Calculator size={20} />
              <span>Resolver con Método de la Gran M</span>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Resultado */}
          {solution && (
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 space-y-4">
              <h3 className="text-xl font-semibold text-green-800">
                Solución Óptima
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {variables.map((v, i) => (
                  <div
                    key={i}
                    className="bg-white p-3 rounded shadow text-center"
                  >
                    <span className="text-gray-700 font-medium">{v} = </span>
                    <span className="text-green-700 font-bold">
                      {Math.round(solution.variables[i] * 1000) / 1000}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <span className="text-lg text-gray-800 font-semibold">
                  Valor óptimo Z =
                </span>{" "}
                <span className="text-green-700 text-xl font-bold">
                  {Math.abs(solution.objectiveValue)}
                </span>
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={() => setShowTableau(!showTableau)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  {showTableau ? "Ocultar" : "Ver"} Tabla Final
                </button>
              </div>
            </div>
          )}

          {/* Tabla Final */}
          {showTableau && finalTableau && (
            <div className="mt-6 bg-gray-100 p-4 rounded-xl border border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Tabla Final
                {finalTableau.wasNormalized && (
                  <span className="text-sm text-orange-600 ml-2">
                    (Normalizada)
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm bg-white rounded-lg shadow-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-2 py-1 border">Fila</th>
                      {variables.map((v, i) => (
                        <th key={i} className="px-2 py-1 border">
                          {v}
                        </th>
                      ))}
                      <th className="px-2 py-1 border">Aux</th>
                      <th className="px-2 py-1 border">RHS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalTableau.tableau.map((row, i) => (
                      <tr key={i} className="hover:bg-blue-50">
                        <td className="px-2 py-1 border font-medium">
                          {i === 0 ? "Z" : `R${i}`}
                        </td>
                        {row.slice(0, variables.length).map((val, j) => (
                          <td key={j} className="px-2 py-1 border text-center">
                            {val}
                          </td>
                        ))}
                        <td className="px-2 py-1 border text-xs text-center">
                          [{row.slice(variables.length, -1).join(", ")}]
                        </td>
                        <td className="px-2 py-1 border text-center font-bold">
                          {row[row.length - 1]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Variables artificiales: columnas {finalTableau.artificialStart}{" "}
                -{" "}
                {finalTableau.artificialStart + finalTableau.numArtificial - 1}
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="mt-8 bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <h4 className="font-semibold mb-2">Notas:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>
                El método de la Gran M se usa para restricciones de tipo ≥ o =
              </li>
              <li>Se permiten valores negativos</li>
              <li>Permite valores enteros</li>
              <li>Se muestra solo el resultado óptimo final</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BigMSolver;
