//
// Code generation (currently Python/NumPy supported)
//
// A tensor network program is specified as list of sequential operations.
//
// Each tensor is assumed to be immutable, e.g., a transposition yields
// a new tensor instead of overwriting the existing tensor. This should
// simplify the resolution of dependencies and future optimization algorithms.
//
//
// MIT License
//
// Copyright (c) 2018 Christian B. Mendl
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


'use strict';


function generateSymbolTable(ops) {

	// The symbol table is a mapping from IDs to dictionaries with entries
	//     type: datatype, e.g., 'tensor'
	//     progin:  true or false, whether variable is a program input
	//     progout: true or false, whether variable is a program output
	// Currently the IDs are simply the unique tensor IDs.
	let symtab = {};

	for (let i = 0; i < ops.length; i++) {
		if (ops[i] instanceof ContractionOp) {
			// input tensors of contraction operation
			for (let tid of ops[i].tensors) {
				if (tid in symtab) {
					// cannot be an output tensor
					symtab[tid].progout = false;
				}
				else {
					symtab[tid] = { type: 'tensor', progin: true, progout: false };
				}
			}

			// output tensor of contraction operation
			if (ops[i].outtensor in symtab) {
				// must not be yet in symbol table
				throw Error('Output tensor ID ' + ops[i].outtensor + ' appeared previously');
			}
			symtab[ops[i].outtensor] = { type: 'tensor', progin: false, progout: true };
		}
		else if (ops[i] instanceof TranspositionOp) {
			if (ops[i].tensor in symtab) {
				// cannot be an output tensor
				symtab[ops[i].tensor].progout = false;
			}
			else {
				symtab[ops[i].tensor] = { type: 'tensor', progin: true, progout: false };
			}

			// output tensor of transposition operation
			if (ops[i].outtensor in symtab) {
				// must not be yet in symbol table
				throw Error('Output tensor ID ' + ops[i].outtensor + ' appeared previously');
			}
			symtab[ops[i].outtensor] = { type: 'tensor', progin: false, progout: true };
		}
		else if (ops[i] instanceof QRDecompositionOp) {
			if (ops[i].tensor in symtab) {
				// cannot be an output tensor
				symtab[ops[i].tensor].progout = false;
			}
			else {
				symtab[ops[i].tensor] = { type: 'tensor', progin: true, progout: false };
			}

			// Q and R output tensors of splitting operation
			if (ops[i].Qtensor in symtab) {
				// must not be yet in symbol table
				throw Error('Output tensor ID ' + ops[i].Qtensor + ' appeared previously');
			}
			if (ops[i].Rtensor in symtab) {
				// must not be yet in symbol table
				throw Error('Output tensor ID ' + ops[i].Rtensor + ' appeared previously');
			}
			symtab[ops[i].Qtensor] = { type: 'tensor', progin: false, progout: true };
			symtab[ops[i].Rtensor] = { type: 'tensor', progin: false, progout: true };

		}
		else {
			throw new Error('Operation class type not supported.');
		}
	}

	return symtab;
}


function listToPythonTuple(list, prefix='', postfix='') {
	let t = '(';
	for (let i = 0; i < list.length; i++)
	{
		t += prefix + list[i].toString() + postfix + ', ';
	}
	if (list.length === 1) {
		// remove trailing ' ' (but keep ',')
		t = t.substring(0, t.length - 1);
	}
	else if (list.length > 1) {
		// remove trailing ', '
		t = t.substring(0, t.length - 2);
	}
	t += ')';

	return t;
}


function generatePythonCode(ops) {

	let symtab = generateSymbolTable(ops);

	// common tokens as strings
	const newline = '\n';
	const indent = '    ';

	let str = '';

	// import NumPy
	str += 'import numpy as np' + newline + newline;

	// function header
	str += 'def f(';
	let argcount = 0;
	for (let id in symtab) {
		if (symtab[id].progin) {
			if (symtab[id].type === 'tensor') {
				str += 'T' + id;
			}
			else {
				throw Error('Argument type "' + symtab[id].type + '" not supported yet.');
			}

			str += ', ';

			argcount++;
		}
	}
	if (argcount > 0) {
		// remove trailing ', '
		str = str.substring(0, str.length - 2);
	}
	str += '):';
	str += newline;

	for (let i = 0; i < ops.length; i++) {
		// simple sequential execution of operations (optimizations still to be done)

		let op = ops[i];
		if (op instanceof ContractionOp) {
			str += indent + 'T' + op.outtensor + ' = np.einsum(';
			for (let i = 0; i < op.tensors.length; i++) {
				str += 'T' + op.tensors[i] + ', ' + listToPythonTuple(op.subscripts[i]) + ', ';
			}
			str += listToPythonTuple(op.outdims);
			// closing bracket of np.einsum
			str += ')' + newline;
		}
		else if (op instanceof TranspositionOp) {
			str += indent + 'T' + op.outtensor + ' = np.transpose(T' + op.tensor + ', ' + listToPythonTuple(op.perm) + ')' + newline;
		}
		else if (op instanceof QRDecompositionOp) {
			if (op.ndims === 2) {
				// conventional QR decomposition of matrices
				str += indent + 'T' + op.Qtensor + ', T' + op.Rtensor + ' = np.linalg.qr(T' + op.tensor + ', mode=\'reduced\')' + newline;
			}
			else {
				// reshape tensors into matrices, perform QR decomposition, reshape back into tensors
				str += indent + 'T' + op.Qtensor + ', T' + op.Rtensor + ' = np.linalg.qr(T' + op.tensor + '.reshape((np.prod(T' + op.tensor + '.shape[:' + op.nleftdims + ']), np.prod(T' + op.tensor + '.shape[' + op.nleftdims + ':]))), mode=\'reduced\')' + newline;
				if (op.nleftdims > 1) {
					str += indent + 'T' + op.Qtensor + ' = T' + op.Qtensor + '.reshape(T' + op.tensor + '.shape[:' + op.nleftdims + '] + (T' + op.Qtensor + '.shape[1],))' + newline;
				}
				if (op.ndims - op.nleftdims > 1) {
					str += indent + 'T' + op.Rtensor + ' = T' + op.Rtensor + '.reshape((T' + op.Rtensor + '.shape[0],) + T' + op.tensor + '.shape[' + op.nleftdims + ':])' + newline;
				}
			}
		}
		else {
			throw new Error('Operation class type not supported.');
		}
	}

	let outIds = [];
	for (let id in symtab) {
		if (symtab[id].progout) {
			if (symtab[id].type === 'tensor') {
				outIds.push(id);
			}
			else {
				throw Error('Argument type "' + symtab[id].type + '" not supported yet.');
			}
		}
	}
	if (outIds.length === 0) {
		throw Error('At least one output variable expected.');
	}
	else if (outIds.length === 1) {
		// return a single variable
		str += indent + 'return T' + outIds[0];
	}
	else {
		// return a tuple of variables
		str += indent + 'return ' + listToPythonTuple(outIds, 'T');
	}
	str += newline;

	return str;
}
