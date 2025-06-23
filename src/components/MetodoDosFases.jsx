import React, { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const MetodoDosFases = () => {
  const [numVars, setNumVars] = useState(3);
  const [numConstraints, setNumConstraints] = useState(2);
  const [isMaximization, setIsMaximization] = useState(false);
  const [objective, setObjective] = useState([2, 3, 1]);
  const [constraints, setConstraints] = useState([
    { coefficients: [1, 4, 2], type: '>=', rhs: 8 },
    { coefficients: [3, 2, 0], type: '>=', rhs: 6 }
  ]);
  const [finalTable, setFinalTable] = useState(null);
  const [solution, setSolution] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateNumVars = (newNum) => {
    setNumVars(newNum);
    setObjective(prev => {
      const newObj = [...prev];
      while (newObj.length < newNum) newObj.push(0);
      return newObj.slice(0, newNum);
    });
    setConstraints(prev => prev.map(constraint => {
      const newCoeff = [...constraint.coefficients];
      while (newCoeff.length < newNum) newCoeff.push(0);
      return { ...constraint, coefficients: newCoeff.slice(0, newNum) };
    }));
  };

  const updateNumConstraints = (newNum) => {
    setNumConstraints(newNum);
    setConstraints(prev => {
      const newConstraints = [...prev];
      while (newConstraints.length < newNum) {
        newConstraints.push({
          coefficients: new Array(numVars).fill(0),
          type: '>=',
          rhs: 0
        });
      }
      return newConstraints.slice(0, newNum);
    });
  };

  const updateObjective = (index, value) => {
    setObjective(prev => {
      const newObj = [...prev];
      newObj[index] = parseFloat(value) || 0;
      return newObj;
    });
  };

  const updateConstraint = (constraintIndex, field, value, coeffIndex = null) => {
    setConstraints(prev => {
      const newConstraints = [...prev];
      if (field === 'coefficients') {
        newConstraints[constraintIndex].coefficients[coeffIndex] = parseFloat(value) || 0;
      } else {
        newConstraints[constraintIndex][field] = field === 'rhs' ? (parseFloat(value) || 0) : value;
      }
      return newConstraints;
    });
  };

  const fraction = (num) => {
    if (Math.abs(num) < 1e-10) return '0';
    if (Math.abs(num - Math.round(num)) < 1e-10) return Math.round(num).toString();
    
    const sign = num < 0 ? '-' : '';
    const absNum = Math.abs(num);
    
    const fractions = [
      [0.5, '1/2'], [1.5, '3/2'], [2.5, '5/2'],
      [0.25, '1/4'], [0.75, '3/4'], [1.25, '5/4'], [1.75, '7/4'],
      [0.2, '1/5'], [0.4, '2/5'], [0.6, '3/5'], [0.8, '4/5'],
      [1.2, '6/5'], [1.4, '7/5'], [1.6, '8/5'], [1.8, '9/5'],
      [0.333, '1/3'], [0.667, '2/3'], [1.333, '4/3'], [1.667, '5/3']
    ];
    
    for (let [val, frac] of fractions) {
      if (Math.abs(absNum - val) < 0.01) {
        return sign + frac;
      }
    }
    
    return num.toFixed(2);
  };

  const createPhase1InitialTable = () => {
    const stdConstraints = constraints.map(constraint => ({
      coefficients: [...constraint.coefficients],
      rhs: constraint.rhs,
      needsSlack: true,
      needsArtificial: constraint.type === '>=' || constraint.type === '='
    }));

    const slackVars = constraints.filter(c => c.type === '<=' || c.type === '>=').length;
    const artificialVars = constraints.filter(c => c.type === '>=' || c.type === '=').length;
    const totalCols = numVars + slackVars + artificialVars + 1;
    const totalRows = numConstraints + 1;
    
    let table = Array(totalRows).fill().map(() => Array(totalCols).fill(0));
    
    let slackIndex = numVars;
    let artificialIndex = numVars + slackVars;
    
    stdConstraints.forEach((constraint, i) => {
      // Coeficientes de las variables originales
      constraint.coefficients.forEach((coeff, j) => {
        table[i][j] = coeff;
      });
      
      // Variables de holgura
      if (constraints[i].type === '<=') {
        table[i][slackIndex] = 1;
      } else if (constraints[i].type === '>=') {
        table[i][slackIndex] = -1;
      }
      
      if (constraints[i].type === '<=' || constraints[i].type === '>=') {
        slackIndex++;
      }
      
      // Variables artificiales
      if (constraint.needsArtificial) {
        table[i][artificialIndex] = 1;
        artificialIndex++;
      }
      
      table[i][totalCols - 1] = constraint.rhs;
    });

    // Función objetivo de la Fase 1: minimizar suma de variables artificiales
    let artIndex = numVars + slackVars;
    for (let j = 0; j < artificialVars; j++) {
      table[numConstraints][artIndex + j] = 1;
    }

    // Variables básicas iniciales
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
      iteration: 0
    };
  };

  const eliminateArtificialVars = (tableData) => {
    const { table, basicVars } = tableData;
    const newTable = table.map(row => [...row]);
    const objRow = newTable.length - 1;
    
    basicVars.forEach((basicVar, i) => {
      if (basicVar >= numVars + tableData.slackVars) {
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
      iteration: 1
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
    const newTable = table.map(row => [...row]);
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
      iteration: tableData.iteration + 1
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
    
    const realSlackVars = constraints.filter(c => c.type === '<=' || c.type === '>=').length;
    const phase2Cols = numVars + realSlackVars + 1;
    const newTable = Array(numConstraints + 1).fill().map(() => Array(phase2Cols).fill(0));
    
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
    for (let j = 0; j < numVars; j++) {
      newTable[objRow][j] = isMaximization ? -objective[j] : objective[j];
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
      iteration: 0
    };
  };

  const eliminateBasicVarsFromObjective = (tableData) => {
    const { table, basicVars } = tableData;
    const newTable = table.map(row => [...row]);
    const objRow = newTable.length - 1;
    
    basicVars.forEach((basicVar, i) => {
      if (basicVar < numVars && Math.abs(newTable[objRow][basicVar]) > 1e-10) {
        const factor = newTable[objRow][basicVar];
        for (let j = 0; j < newTable[objRow].length; j++) {
          newTable[objRow][j] -= factor * newTable[i][j];
        }
      }
    });
    
    return {
      ...tableData,
      table: newTable,
      iteration: 1
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
    setFinalTable(null);
    setSolution(null);
    
    try {
      const phase1Result = solvePhase1();
      const objValue = phase1Result.table[phase1Result.table.length - 1][phase1Result.table[0].length - 1];
      
      if (Math.abs(objValue) > 1e-6) {
        setSolution({ feasible: false, message: "No hay solución factible" });
        setIsLoading(false);
        return;
      }
      
      const phase2Result = solvePhase2(phase1Result);
      setFinalTable(phase2Result);
      
      const basicSolution = Array(numVars).fill(0);
      
      phase2Result.basicVars.forEach((varIndex, i) => {
        if (varIndex < numVars) {
          basicSolution[varIndex] = phase2Result.table[i][phase2Result.table[0].length - 1];
        }
      });
      
      let finalObjValue = phase2Result.table[phase2Result.table.length - 1][phase2Result.table[0].length - 1];
      
      if (!isMaximization) {
        finalObjValue = -finalObjValue;
      }
      
      setSolution({
        feasible: true,
        variables: basicSolution,
        objectiveValue: finalObjValue
      });
      
    } catch (error) {
      console.error('Error:', error);
      setSolution({ feasible: false, message: "Error en el cálculo: " + error.message });
    }
    
    setIsLoading(false);
  };

  const reset = () => {
    setFinalTable(null);
    setSolution(null);
  };

  const renderFinalTable = (tableData) => {
    if (!tableData) return null;

    const { table, basicVars } = tableData;
    
    const colNames = [];
    for (let i = 0; i < numVars; i++) colNames.push(`x${i + 1}`);
    
    const realSlackVars = constraints.filter(c => c.type === '<=' || c.type === '>=').length;
    for (let i = 0; i < realSlackVars; i++) colNames.push(`s${i + 1}`);
    
    colNames.push('RHS');

    const rowNames = [];
    basicVars.forEach((varIndex, i) => {
      if (varIndex < numVars) {
        rowNames.push(`x${varIndex + 1}`);
      } else {
        rowNames.push(`s${varIndex - numVars + 1}`);
      }
    });
    
    rowNames.push('Z');

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Tabla Final </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-sm font-medium">Variable Básica</th>
                {colNames.map((name, i) => (
                  <th key={i} className="border border-gray-300 px-3 py-2 text-sm font-medium">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => (
                <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                  i === table.length - 1 ? 'bg-blue-50 font-medium' : ''
                }`}>
                  <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                    {rowNames[i]}
                  </td>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-gray-300 px-3 py-2 text-sm text-center">
                      {fraction(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Método de las Dos Fases - Resultado Final</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Configuración del Problema</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Variables:</label>
              <input
                type="number"
                min="2"
                max="6"
                value={numVars}
                onChange={(e) => updateNumVars(parseInt(e.target.value) || 2)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Restricciones:</label>
              <input
                type="number"
                min="1"
                max="6"
                value={numConstraints}
                onChange={(e) => updateNumConstraints(parseInt(e.target.value) || 1)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Tipo de Optimización:</label>
            <select
              value={isMaximization ? 'max' : 'min'}
              onChange={(e) => setIsMaximization(e.target.value === 'max')}
              className="w-full p-2 border rounded-lg text-sm"
            >
              <option value="max">Maximización</option>
              <option value="min">Minimización</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Función Objetivo:</label>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Z =</span>
              {objective.map((coeff, i) => (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-sm">+</span>}
                  <input
                    type="number"
                    step="0.1"
                    value={coeff}
                    onChange={(e) => updateObjective(i, e.target.value)}
                    className="w-16 p-1 border rounded text-center text-sm"
                  />
                  <span className="text-sm font-medium">x<sub>{i + 1}</sub></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Restricciones</h2>
          
          {constraints.map((constraint, i) => (
            <div key={i} className="mb-3 p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 flex-wrap">
                {constraint.coefficients.map((coeff, j) => (
                  <div key={j} className="flex items-center gap-1">
                    {j > 0 && <span className="text-sm">+</span>}
                    <input
                      type="number"
                      step="0.1"
                      value={coeff}
                      onChange={(e) => updateConstraint(i, 'coefficients', e.target.value, j)}
                      className="w-16 p-1 border rounded text-center text-sm"
                    />
                    <span className="text-sm font-medium">x<sub>{j + 1}</sub></span>
                  </div>
                ))}
                <select
  value={constraint.type}
  onChange={(e) => updateConstraint(i, 'type', e.target.value)}
  className="p-1 border rounded text-sm"
>
  <option value="<=">≤</option>
  <option value=">=">≥</option>
  <option value="=">=</option>
</select>

                <input
                  type="number"
                  step="0.1"
                  value={constraint.rhs}
                  onChange={(e) => updateConstraint(i, 'rhs', e.target.value)}
                  className="w-16 p-1 border rounded text-center text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={solveProblem}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          <Play size={18} />
          {isLoading ? 'Resolviendo...' : 'Resolver Problema'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
        >
          <RotateCcw size={18} />
          Limpiar Resultados
        </button>
      </div>

      {finalTable && renderFinalTable(finalTable)}

      {solution && (
        <div className={`p-6 rounded-lg ${solution.feasible ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
          <h2 className={`text-2xl font-bold mb-4 ${solution.feasible ? 'text-green-700' : 'text-red-700'}`}>
            {solution.feasible ? ' Solución ' : '✗ Sin Solución Factible'}
          </h2>
          {solution.feasible ? (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Valores de las Variables:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {solution.variables.map((value, i) => (
                    <div key={i} className="bg-gray-100 p-3 rounded text-center">
                      <div className="font-medium">x<sub>{i + 1}</sub></div>
                      <div className="text-lg font-bold text-blue-600">{fraction(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Valor Óptimo de la Función Objetivo:</h3>
                <div className="text-center">
                  <span className="text-3xl font-bold text-green-600">Z = {fraction(solution.objectiveValue)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-700 text-lg">
              <strong>{solution.message}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MetodoDosFases;