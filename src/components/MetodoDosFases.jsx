import React, { useState } from "react";
import { Plus, Trash2, Calculator, AlertCircle } from "lucide-react";

const MetodoDosFases = () => {
  const [variables, setVariables] = useState(["x1", "x2", "x3"]);
  const [objective, setObjective] = useState({
    esMaximizacion: false,
    coeficientes: ["2", "3", "1"],
  });
  const [restricciones, setRestricciones] = useState([
    { coeficientes: ["1", "4", "2"], operador: ">=", rhs: "8" },
    { coeficientes: ["3", "2", "0"], operador: ">=", rhs: "6" },
  ]);

  const [tablaFinal, setTablaFinal] = useState(null);
  const [solution, setSolution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mostrarTabla, setMostrarTabla] = useState(false);

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
    const pastedText = e.clipboardData.getData("text");

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
      const changeEvent = new Event("input", { bubbles: true });
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

  const fraction = (num) => {
    if (Math.abs(num) < 1e-10) return "0";
    if (Math.abs(num - Math.round(num)) < 1e-10)
      return Math.round(num).toString();

    const sign = num < 0 ? "-" : "";
    const absNum = Math.abs(num);

    const fractions = [
      [0.5, "1/2"],
      [1.5, "3/2"],
      [2.5, "5/2"],
      [0.25, "1/4"],
      [0.75, "3/4"],
      [1.25, "5/4"],
      [1.75, "7/4"],
      [0.2, "1/5"],
      [0.4, "2/5"],
      [0.6, "3/5"],
      [0.8, "4/5"],
      [1.2, "6/5"],
      [1.4, "7/5"],
      [1.6, "8/5"],
      [1.8, "9/5"],
      [0.333, "1/3"],
      [0.667, "2/3"],
      [1.333, "4/3"],
      [1.667, "5/3"],
    ];

    for (let [val, frac] of fractions) {
      if (Math.abs(absNum - val) < 0.01) {
        return sign + frac;
      }
    }

    return num.toFixed(2);
  };

  // Algoritmo de Dos Fases (manteniendo la funcionalidad original)
  const createPhase1InitialTable = () => {
    const numVars = variables.length;
    const numConstraints = restricciones.length;

    const constraints = restricciones.map((r) => ({
      coefficients: r.coeficientes.map((c) => parseFloat(c) || 0),
      type: r.operador,
      rhs: parseFloat(r.rhs) || 0,
    }));

    const stdConstraints = constraints.map((constraint) => ({
      coefficients: [...constraint.coefficients],
      rhs: constraint.rhs,
      needsSlack: true,
      needsArtificial: constraint.type === ">=" || constraint.type === "=",
    }));

    const slackVars = constraints.filter(
      (c) => c.type === "<=" || c.type === ">="
    ).length;
    const artificialVars = constraints.filter(
      (c) => c.type === ">=" || c.type === "="
    ).length;
    const totalCols = numVars + slackVars + artificialVars + 1;
    const totalRows = numConstraints + 1;

    let table = Array(totalRows)
      .fill()
      .map(() => Array(totalCols).fill(0));

    let slackIndex = numVars;
    let artificialIndex = numVars + slackVars;

    stdConstraints.forEach((constraint, i) => {
      constraint.coefficients.forEach((coeff, j) => {
        table[i][j] = coeff;
      });

      if (constraints[i].type === "<=") {
        table[i][slackIndex] = 1;
      } else if (constraints[i].type === ">=") {
        table[i][slackIndex] = -1;
      }

      if (constraints[i].type === "<=" || constraints[i].type === ">=") {
        slackIndex++;
      }

      if (constraint.needsArtificial) {
        table[i][artificialIndex] = 1;
        artificialIndex++;
      }

      table[i][totalCols - 1] = constraint.rhs;
    });

    let artIndex = numVars + slackVars;
    for (let j = 0; j < artificialVars; j++) {
      table[numConstraints][artIndex + j] = 1;
    }

    const basicVars = [];
    let artVarIndex = numVars + slackVars;
    let slackVarIndex = numVars;

    stdConstraints.forEach((constraint, i) => {
      if (constraint.needsArtificial) {
        basicVars.push(artVarIndex);
        artVarIndex++;
      } else {
        basicVars.push(slackVarIndex);
        slackVarIndex++;
      }
    });

    return {
      table,
      basicVars,
      numVars,
      slackVars,
      artificialVars,
      phase: 1,
      iteration: 0,
    };
  };

  const eliminateArtificialVars = (tableData) => {
    const { table, basicVars } = tableData;
    const newTable = table.map((row) => [...row]);
    const objRow = newTable.length - 1;

    basicVars.forEach((basicVar, i) => {
      if (basicVar >= tableData.numVars + tableData.slackVars) {
        if (Math.abs(newTable[objRow][basicVar]) > 1e-10) {
          const factor = newTable[objRow][basicVar];
          for (let j = 0; j < newTable[objRow].length; j++) {
            newTable[objRow][j] -= factor * newTable[i][j];
          }
        }
      }
    });

    return {
      ...tableData,
      table: newTable,
      iteration: 1,
    };
  };

  const findPivot = (table, isPhase1 = true) => {
    const objRow = table.length - 1;

    let pivotCol = -1;
    let bestValue = Infinity;

    for (let j = 0; j < table[0].length - 1; j++) {
      if (table[objRow][j] < bestValue && table[objRow][j] < -1e-10) {
        bestValue = table[objRow][j];
        pivotCol = j;
      }
    }

    if (pivotCol === -1) return null;

    let pivotRow = -1;
    let minRatio = Infinity;

    for (let i = 0; i < table.length - 1; i++) {
      if (table[i][pivotCol] > 1e-10) {
        const ratio = table[i][table[0].length - 1] / table[i][pivotCol];
        if (ratio >= 0 && ratio < minRatio) {
          minRatio = ratio;
          pivotRow = i;
        }
      }
    }

    if (pivotRow === -1) return null;

    return { pivotRow, pivotCol };
  };

  const performPivot = (tableData, pivot) => {
    const { table, basicVars } = tableData;
    const { pivotRow, pivotCol } = pivot;
    const newTable = table.map((row) => [...row]);
    const newBasicVars = [...basicVars];

    const pivotElement = newTable[pivotRow][pivotCol];

    for (let j = 0; j < newTable[pivotRow].length; j++) {
      newTable[pivotRow][j] /= pivotElement;
    }

    for (let i = 0; i < newTable.length; i++) {
      if (i !== pivotRow && Math.abs(newTable[i][pivotCol]) > 1e-10) {
        const factor = newTable[i][pivotCol];
        for (let j = 0; j < newTable[i].length; j++) {
          newTable[i][j] -= factor * newTable[pivotRow][j];
        }
      }
    }

    newBasicVars[pivotRow] = pivotCol;

    return {
      ...tableData,
      table: newTable,
      basicVars: newBasicVars,
      iteration: tableData.iteration + 1,
    };
  };

  const solvePhase1 = () => {
    let currentTable = createPhase1InitialTable();
    currentTable = eliminateArtificialVars(currentTable);

    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const pivot = findPivot(currentTable.table, true);
      if (!pivot) break;

      currentTable = performPivot(currentTable, pivot);
      iterations++;
    }

    return currentTable;
  };

  const createPhase2InitialTable = (phase1FinalTable) => {
    const { table: phase1Table, basicVars } = phase1FinalTable;
    const numVars = variables.length;
    const numConstraints = restricciones.length;

    const realSlackVars = restricciones.filter(
      (c) => c.operador === "<=" || c.operador === ">="
    ).length;
    const phase2Cols = numVars + realSlackVars + 1;
    const newTable = Array(numConstraints + 1)
      .fill()
      .map(() => Array(phase2Cols).fill(0));

    for (let i = 0; i < numConstraints; i++) {
      for (let j = 0; j < numVars; j++) {
        newTable[i][j] = phase1Table[i][j];
      }
      for (let j = numVars; j < numVars + realSlackVars; j++) {
        newTable[i][j] = phase1Table[i][j];
      }
      newTable[i][phase2Cols - 1] = phase1Table[i][phase1Table[0].length - 1];
    }

    const objRow = numConstraints;
    const objCoeffs = objective.coeficientes.map((c) => parseFloat(c) || 0);
    for (let j = 0; j < numVars; j++) {
      newTable[objRow][j] = objective.esMaximizacion
        ? -objCoeffs[j]
        : objCoeffs[j];
    }

    const newBasicVars = [];
    for (let i = 0; i < basicVars.length; i++) {
      if (basicVars[i] < numVars + realSlackVars) {
        newBasicVars.push(basicVars[i]);
      } else {
        newBasicVars.push(numVars + i);
      }
    }

    return {
      table: newTable,
      basicVars: newBasicVars,
      numVars,
      slackVars: realSlackVars,
      artificialVars: 0,
      phase: 2,
      iteration: 0,
    };
  };

  const eliminateBasicVarsFromObjective = (tableData) => {
    const { table, basicVars } = tableData;
    const newTable = table.map((row) => [...row]);
    const objRow = newTable.length - 1;

    basicVars.forEach((basicVar, i) => {
      if (
        basicVar < tableData.numVars &&
        Math.abs(newTable[objRow][basicVar]) > 1e-10
      ) {
        const factor = newTable[objRow][basicVar];
        for (let j = 0; j < newTable[objRow].length; j++) {
          newTable[objRow][j] -= factor * newTable[i][j];
        }
      }
    });

    return {
      ...tableData,
      table: newTable,
      iteration: 1,
    };
  };

  const solvePhase2 = (phase1FinalTable) => {
    let currentTable = createPhase2InitialTable(phase1FinalTable);
    currentTable = eliminateBasicVarsFromObjective(currentTable);

    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const pivot = findPivot(currentTable.table, false);
      if (!pivot) break;

      currentTable = performPivot(currentTable, pivot);
      iterations++;
    }

    return currentTable;
  };

  const solveProblem = () => {
    setIsLoading(true);
    setTablaFinal(null);
    setSolution(null);
    setError(null);

    try {
      // Fase 1
      const phase1Result = solvePhase1();
      const objValue =
        phase1Result.table[phase1Result.table.length - 1][
          phase1Result.table[0].length - 1
        ];

      if (Math.abs(objValue) > 1e-6) {
        setSolution({ feasible: false, message: "No hay solución factible" });
        setIsLoading(false);
        return;
      }

      // Fase 2
      const phase2Result = solvePhase2(phase1Result);

      // Columnas: variables originales + variables de holgura/exceso + RHS
      const colNames = [...variables];
      const realSlackVars = restricciones.filter(
        (c) => c.operador === "<=" || c.operador === ">="
      ).length;
      for (let i = 0; i < realSlackVars; i++) colNames.push(`s${i + 1}`);
      colNames.push("RHS");

      // Filas: nombres de las variables básicas en orden + Z al final
      const rowNames = phase2Result.basicVars.map((varIndex) =>
        varIndex < variables.length
          ? variables[varIndex]
          : `s${varIndex - variables.length + 1}`
      );
      rowNames.push("Z");

      // Formatear tabla con fracciones
      const tablaFormateada = phase2Result.table.map((row) =>
        row.map((val) => fraction(val))
      );

      // Calcular solución básica
      const basicSolution = Array(variables.length).fill(0);
      phase2Result.basicVars.forEach((varIndex, i) => {
        if (varIndex < variables.length) {
          basicSolution[varIndex] =
            phase2Result.table[i][phase2Result.table[0].length - 1];
        }
      });

      // Valor objetivo
      let finalObjValue =
        phase2Result.table[phase2Result.table.length - 1][
          phase2Result.table[0].length - 1
        ];

      if (!objective.esMaximizacion) {
        finalObjValue = -finalObjValue;
      }

      // Guardar tabla final
      setTablaFinal({
        tabla: tablaFormateada,
        basicVariables: rowNames.slice(0, -1),
        colNames,
        rowNames,
        wasNormalized: false,
        numArtificial: 0,
        artificialStart: 0,
      });

      // Guardar solución final
      setSolution({
        feasible: true,
        variables: basicSolution,
        objectiveValue: finalObjValue,
      });
    } catch (error) {
      console.error("Error:", error);
      setError("Error en el cálculo: " + error.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Solucionador - Método de las Dos Fases
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Resuelve problemas de programación lineal con restricciones de
            igualdad y desigualdad
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Panel Principal */}
          <div className="xl:col-span-2 space-y-8">
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
                onClick={solveProblem}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold px-6 py-4 rounded-xl text-lg flex items-center justify-center gap-3 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Calculator size={24} />
                <span>
                  {isLoading ? "Resolviendo..." : "Resolver Problema"}
                </span>
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
                <p>• Método de dos fases para PL</p>
                <p>• Maneja restricciones ≥ y =</p>
                <p>• Admite coeficientes negativos</p>
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
                      Holgura/Exceso
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
                        {tablaFinal.rowNames[i]}
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
                  Variables:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    • <strong>Variables originales:</strong>{" "}
                    {variables.join(", ")}
                  </div>
                  <div>
                    • <strong>Variables auxiliares:</strong> s1, s2, a1, a2, ...
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <strong>Método de las Dos Fases:</strong> Resuelve primero el
                problema auxiliar (Fase I) y luego el problema original (Fase
                II)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetodoDosFases;
