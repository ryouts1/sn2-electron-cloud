export function identityMatrix(size) {
  return Array.from({ length: size }, (_, rowIndex) =>
    Array.from({ length: size }, (_, columnIndex) => (rowIndex === columnIndex ? 1 : 0))
  );
}

export function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

export function transpose(matrix) {
  return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
}

export function multiplyMatrices(left, right) {
  const rowCount = left.length;
  const innerCount = right.length;
  const columnCount = right[0].length;
  const result = Array.from({ length: rowCount }, () => Array(columnCount).fill(0));

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (let pivotIndex = 0; pivotIndex < innerCount; pivotIndex += 1) {
      const leftValue = left[rowIndex][pivotIndex];
      if (Math.abs(leftValue) < 1e-15) {
        continue;
      }
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        result[rowIndex][columnIndex] += leftValue * right[pivotIndex][columnIndex];
      }
    }
  }

  return result;
}

export function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + (value * vector[index]), 0));
}

export function scaleMatrix(matrix, scalar) {
  return matrix.map((row) => row.map((value) => value * scalar));
}

export function addMatrices(left, right) {
  return left.map((row, rowIndex) => row.map((value, columnIndex) => value + right[rowIndex][columnIndex]));
}

export function subtractMatrices(left, right) {
  return left.map((row, rowIndex) => row.map((value, columnIndex) => value - right[rowIndex][columnIndex]));
}

export function dotProduct(left, right) {
  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    sum += left[index] * right[index];
  }
  return sum;
}

export function column(matrix, columnIndex) {
  return matrix.map((row) => row[columnIndex]);
}

export function setColumn(matrix, columnIndex, values) {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    matrix[rowIndex][columnIndex] = values[rowIndex];
  }
}

export function diagonalMatrix(values) {
  return values.map((value, rowIndex) => values.map((_, columnIndex) => (rowIndex === columnIndex ? value : 0)));
}

export function maxAbsOffDiagonal(matrix) {
  let maxValue = 0;
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    for (let columnIndex = rowIndex + 1; columnIndex < matrix.length; columnIndex += 1) {
      maxValue = Math.max(maxValue, Math.abs(matrix[rowIndex][columnIndex]));
    }
  }
  return maxValue;
}

export function jacobiEigenDecomposition(matrix, tolerance = 1e-12, maxSweeps = 100) {
  if (!Array.isArray(matrix) || matrix.length === 0 || matrix.some((row) => row.length !== matrix.length)) {
    throw new Error('jacobiEigenDecomposition expects a non-empty square matrix.');
  }

  const size = matrix.length;
  const a = cloneMatrix(matrix);
  const eigenvectors = identityMatrix(size);
  const iterationLimit = maxSweeps * size * size;

  for (let iteration = 0; iteration < iterationLimit; iteration += 1) {
    let pivotRow = 0;
    let pivotColumn = 1;
    let pivotValue = Math.abs(a[pivotRow][pivotColumn]);

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      for (let columnIndex = rowIndex + 1; columnIndex < size; columnIndex += 1) {
        const candidate = Math.abs(a[rowIndex][columnIndex]);
        if (candidate > pivotValue) {
          pivotValue = candidate;
          pivotRow = rowIndex;
          pivotColumn = columnIndex;
        }
      }
    }

    if (pivotValue < tolerance) {
      break;
    }

    const app = a[pivotRow][pivotRow];
    const aqq = a[pivotColumn][pivotColumn];
    const apq = a[pivotRow][pivotColumn];
    const angle = 0.5 * Math.atan2(2 * apq, aqq - app);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex === pivotRow || rowIndex === pivotColumn) {
        continue;
      }

      const aip = a[rowIndex][pivotRow];
      const aiq = a[rowIndex][pivotColumn];
      const rotatedP = (cosine * aip) - (sine * aiq);
      const rotatedQ = (sine * aip) + (cosine * aiq);

      a[rowIndex][pivotRow] = rotatedP;
      a[pivotRow][rowIndex] = rotatedP;
      a[rowIndex][pivotColumn] = rotatedQ;
      a[pivotColumn][rowIndex] = rotatedQ;
    }

    a[pivotRow][pivotRow] = (cosine * cosine * app) - (2 * sine * cosine * apq) + (sine * sine * aqq);
    a[pivotColumn][pivotColumn] = (sine * sine * app) + (2 * sine * cosine * apq) + (cosine * cosine * aqq);
    a[pivotRow][pivotColumn] = 0;
    a[pivotColumn][pivotRow] = 0;

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      const vip = eigenvectors[rowIndex][pivotRow];
      const viq = eigenvectors[rowIndex][pivotColumn];
      eigenvectors[rowIndex][pivotRow] = (cosine * vip) - (sine * viq);
      eigenvectors[rowIndex][pivotColumn] = (sine * vip) + (cosine * viq);
    }
  }

  const eigenpairs = Array.from({ length: size }, (_, index) => ({
    value: a[index][index],
    vector: column(eigenvectors, index)
  })).sort((left, right) => left.value - right.value);

  return {
    eigenvalues: eigenpairs.map((pair) => pair.value),
    eigenvectors: eigenpairs[0].vector.map((_, rowIndex) => eigenpairs.map((pair) => pair.vector[rowIndex]))
  };
}

export function symmetricOrthogonalization(overlapMatrix, minEigenvalue = 1e-8) {
  const decomposition = jacobiEigenDecomposition(overlapMatrix);
  const scaling = decomposition.eigenvalues.map((value) => 1 / Math.sqrt(Math.max(value, minEigenvalue)));
  const u = decomposition.eigenvectors;
  const ut = transpose(u);
  return multiplyMatrices(u, multiplyMatrices(diagonalMatrix(scaling), ut));
}

export function traceProduct(left, right) {
  let sum = 0;
  for (let rowIndex = 0; rowIndex < left.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < left.length; columnIndex += 1) {
      sum += left[rowIndex][columnIndex] * right[columnIndex][rowIndex];
    }
  }
  return sum;
}

export function normalizeColumnSet(coefficients, overlapMatrix) {
  const normalized = cloneMatrix(coefficients);
  for (let columnIndex = 0; columnIndex < normalized[0].length; columnIndex += 1) {
    const vector = column(normalized, columnIndex);
    const overlapVector = multiplyMatrixVector(overlapMatrix, vector);
    const norm = Math.sqrt(Math.max(dotProduct(vector, overlapVector), 1e-16));
    for (let rowIndex = 0; rowIndex < normalized.length; rowIndex += 1) {
      normalized[rowIndex][columnIndex] /= norm;
    }
  }
  return normalized;
}
